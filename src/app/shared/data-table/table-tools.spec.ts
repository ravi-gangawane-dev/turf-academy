import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportService } from '../export/export.service';
import { TableTools } from './table-tools';

describe('TableTools', () => {
  let fixture: ComponentFixture<TableTools>;
  let exporter: { export: ReturnType<typeof vi.fn> };

  const buildTable = (rows: number): HTMLTableElement => {
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Receipt</th><th>Student</th><th>Action</th></tr></thead>
      <tbody>${Array.from({ length: rows }, (_, index) => `<tr><td>R-${index}</td><td>Student ${index}</td><td><button>Print</button></td></tr>`).join('')}</tbody>`;
    return table;
  };

  const buildActionDataTable = (): HTMLTableElement => {
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Date</th><th>Action</th></tr></thead>
      <tbody><tr><td>2026-10-01</td><td>created</td></tr></tbody>`;
    return table;
  };

  beforeEach(async () => {
    exporter = { export: vi.fn().mockResolvedValue(undefined) };
    await TestBed.configureTestingModule({
      imports: [TableTools],
      providers: [{ provide: ExportService, useValue: exporter }],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  const create = async (table: HTMLTableElement, inputs: Record<string, unknown> = {}) => {
    fixture = TestBed.createComponent(TableTools);
    fixture.componentRef.setInput('table', table);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  const exportButton = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('.table-tools-actions button') as HTMLButtonElement;

  const dialogButton = (label: string): HTMLButtonElement => {
    const match = [...fixture.nativeElement.querySelectorAll('.export-dialog button')].find((button) =>
      (button.textContent ?? '').includes(label),
    );
    if (!match) throw new Error(`Dialog button ${label} was not rendered.`);
    return match as HTMLButtonElement;
  };

  const selectScope = (label: string): void => {
    const option = [...fixture.nativeElement.querySelectorAll('.export-option')].find((element) =>
      (element.textContent ?? '').includes(label),
    ) as HTMLElement | undefined;
    if (!option) throw new Error(`Scope ${label} was not rendered.`);
    (option.querySelector('input') as HTMLInputElement).click();
    fixture.detectChanges();
  };

  it('should create', async () => {
    await create(buildTable(1));
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('counts the rendered rows', async () => {
    await create(buildTable(3));
    const count: HTMLElement = fixture.nativeElement.querySelector('.table-tools-count');
    expect(count.textContent?.trim()).toBe('3');
    expect(count.getAttribute('aria-label')).toBe('3 displayed records');
  });

  it('prefers an explicit total over the rendered row count', async () => {
    await create(buildTable(3), { title: 'Payments', total: 120 });
    const count: HTMLElement = fixture.nativeElement.querySelector('.table-tools-count');
    expect(count.textContent?.trim()).toBe('120');
    expect(count.getAttribute('aria-label')).toBe('120 total records');
    expect(fixture.nativeElement.textContent).toContain('Payments');
  });

  it('disables the export button when there is nothing to export', async () => {
    await create(buildTable(0));
    expect(exportButton().disabled).toBe(true);
  });

  it('offers filtered rows and the current page in the export dialog', async () => {
    await create(buildTable(2), { title: 'Payments', total: 24 });

    exportButton().click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent ?? '';
    expect(fixture.nativeElement.querySelector('.export-dialog')).toBeTruthy();
    expect(text).toContain('All filtered rows');
    expect(text).toContain('Current page');
    expect(text).toContain('CSV');
    expect(text).toContain('JSON');
    expect(text).toContain('PDF');
  });

  it('exports the current page with stable column keys', async () => {
    await create(buildTable(2), { title: 'Payments' });
    exportButton().click();
    fixture.detectChanges();

    selectScope('Current page');
    dialogButton('Download CSV').click();
    await fixture.whenStable();

    expect(exporter.export).toHaveBeenCalledOnce();
    const [request, choice] = exporter.export.mock.calls[0];
    expect(choice).toEqual({ scope: 'page', format: 'csv' });
    expect(request.title).toBe('Payments');
    expect(request.columns.map((column: { label: string }) => column.label)).toEqual([
      'Receipt',
      'Student',
    ]);
    expect(request.rows).toEqual([
      { receipt: 'R-0', student: 'Student 0' },
      { receipt: 'R-1', student: 'Student 1' },
    ]);
  });

  it('uses the server loader for all filtered rows', async () => {
    const exportLoader = vi.fn().mockResolvedValue([{ receipt: 'R-99', student: 'Student 99' }]);
    await create(buildTable(1), { title: 'Payments', total: 90, exportLoader });
    exportButton().click();
    fixture.detectChanges();

    dialogButton('JSON').click();
    fixture.detectChanges();
    dialogButton('Download JSON').click();
    await fixture.whenStable();

    expect(exportLoader).toHaveBeenCalledOnce();
    const [request, choice] = exporter.export.mock.calls[0];
    expect(choice).toEqual({ scope: 'filtered', format: 'json' });
    expect(request.rows).toEqual([{ receipt: 'R-99', student: 'Student 99' }]);
  });

  it('offers selected rows only when a selection exists', async () => {
    await create(buildTable(2), {
      title: 'Payments',
      selectedRows: [{ receipt: 'R-1', student: 'Student 1' }],
    });
    exportButton().click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Selected rows');
    selectScope('Selected rows');
    dialogButton('Download CSV').click();
    await fixture.whenStable();

    const [request, choice] = exporter.export.mock.calls[0];
    expect(choice).toEqual({ scope: 'selected', format: 'csv' });
    expect(request.rows).toEqual([{ receipt: 'R-1', student: 'Student 1' }]);
  });

  it('remaps the visible page to real export keys and honours data-export-value', async () => {
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Student</th><th>Monthly fee</th><th>Actions</th></tr></thead>
      <tbody><tr>
        <td data-export-value="Aarav Sharma (TCA-1001)"><button class="student-link">Aarav Sharma</button></td>
        <td data-export-value="1250">₹1,250.00</td>
        <td><button>Edit</button></td>
      </tr></tbody>`;
    await create(table, {
      title: 'Enrollments',
      total: 1,
      exportColumns: [
        { key: 'student', label: 'Student' },
        { key: 'fee', label: 'Monthly fee', align: 'right' },
      ],
    });

    exportButton().click();
    fixture.detectChanges();
    selectScope('Current page');
    dialogButton('Download CSV').click();
    await fixture.whenStable();

    const [request, choice] = exporter.export.mock.calls[0];
    expect(choice).toEqual({ scope: 'page', format: 'csv' });
    expect(request.columns).toEqual([
      { key: 'student', label: 'Student' },
      { key: 'fee', label: 'Monthly fee', align: 'right' },
    ]);
    expect(request.rows).toEqual([
      { student: 'Aarav Sharma (TCA-1001)', fee: '1250' },
    ]);
  });

  it('keeps a column that holds data even when it is called Action', async () => {
    await create(buildActionDataTable(), { title: 'Parent activity' });
    exportButton().click();
    fixture.detectChanges();
    dialogButton('Download CSV').click();
    await fixture.whenStable();

    const [request] = exporter.export.mock.calls[0];
    expect(request.columns.map((column: { label: string }) => column.label)).toEqual([
      'Date',
      'Action',
    ]);
    expect(request.rows).toEqual([{ date: '2026-10-01', action: 'created' }]);
  });

  it('shows an error and keeps the dialog open when export fails', async () => {
    exporter.export.mockRejectedValueOnce(new Error('Export service unavailable'));
    await create(buildTable(1));
    exportButton().click();
    fixture.detectChanges();

    dialogButton('Download CSV').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.export-error')?.textContent).toContain(
      'Export service unavailable',
    );
    expect(fixture.nativeElement.querySelector('.export-dialog')).toBeTruthy();
  });

  it('hides the built-in export when a custom export is provided', async () => {
    await create(buildTable(2), { customExport: true });
    expect(fixture.nativeElement.querySelector('.table-tools-actions button')).toBeNull();
  });
});
