import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TableTools } from './table-tools';

describe('TableTools', () => {
  let fixture: ComponentFixture<TableTools>;

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
    await TestBed.configureTestingModule({
      imports: [TableTools],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    // The unit-test builder runs with `isolate: false`, so every spec file in this
    // worker shares one jsdom global. Spies must be restored here or they leak into
    // the next file (a stubbed `URL.createObjectURL` would be reused by later specs).
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
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.table-tools-actions button');
    expect(button.disabled).toBe(true);
  });

  it('exports the displayed rows as CSV', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:table-tools');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await create(buildTable(2), { title: 'Payments' });

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.table-tools-actions button');
    expect(button.disabled).toBe(false);
    button.click();

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    const csv = await blob.text();
    expect(csv).toContain('"Receipt","Student"');
    expect(csv).toContain('"R-0","Student 0"');
    expect(csv).not.toContain('Action');
    expect(click).toHaveBeenCalledOnce();
  });

  it('keeps a column that holds data even when it is called Action', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:table-tools');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await create(buildActionDataTable(), { title: 'Parent activity' });

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.table-tools-actions button');
    button.click();

    const csv = await (createObjectURL.mock.calls[0][0] as Blob).text();
    expect(csv).toContain('"Date","Action"');
    expect(csv).toContain('"2026-10-01","created"');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('hides the built-in export when a custom export is provided', async () => {
    await create(buildTable(2), { customExport: true });
    expect(fixture.nativeElement.querySelector('.table-tools-actions button')).toBeNull();
  });
});
