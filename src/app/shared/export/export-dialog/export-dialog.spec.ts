import { TestBed } from '@angular/core/testing';
import { ExportFormat, ExportScope } from '../export.models';
import { ExportDialog } from './export-dialog';

function setup(inputs: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({ imports: [ExportDialog] });
  const fixture = TestBed.createComponent(ExportDialog);
  fixture.componentRef.setInput('open', true);
  fixture.componentRef.setInput('title', 'Export students');
  fixture.componentRef.setInput('scopes', ['filtered', 'page', 'selected']);
  fixture.componentRef.setInput('filteredCount', 24);
  fixture.componentRef.setInput('pageCount', 10);
  fixture.componentRef.setInput('selectedCount', 0);
  for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
  fixture.detectChanges();
  return fixture;
}

function option(fixture: ReturnType<typeof setup>, label: string): HTMLElement {
  const match = [...fixture.nativeElement.querySelectorAll('.export-option')].find((element) =>
    (element.textContent ?? '').includes(label),
  ) as HTMLElement | undefined;
  if (!match) throw new Error(`Scope ${label} was not rendered.`);
  return match;
}

function formatButton(fixture: ReturnType<typeof setup>, label: string): HTMLButtonElement {
  const match = [...fixture.nativeElement.querySelectorAll('.export-formats button')].find((element) =>
    (element.textContent ?? '').includes(label),
  ) as HTMLButtonElement | undefined;
  if (!match) throw new Error(`Format ${label} was not rendered.`);
  return match;
}

function downloadButton(fixture: ReturnType<typeof setup>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('.export-dialog footer .primary');
}

describe('ExportDialog', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders nothing until it is opened', () => {
    const fixture = setup({ open: false });
    expect(fixture.nativeElement.querySelector('.export-dialog')).toBeNull();
  });

  it('offers only scopes that have rows, with their real counts', () => {
    const fixture = setup();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Export students');
    expect(element.textContent).toContain('All filtered rows');
    expect(element.textContent).toContain('Current page');
    expect(element.textContent).not.toContain('Selected rows');
    const counts = [...element.querySelectorAll('.export-option b')].map((node) =>
      (node.textContent ?? '').trim(),
    );
    expect(counts).toEqual(['24', '10']);
    expect(option(fixture, 'All filtered rows').querySelector('input')?.checked).toBe(true);
  });

  it('uses a four-row selection scope when rows are ticked', () => {
    const fixture = setup({ selectedCount: 4 });
    const text = fixture.nativeElement.textContent ?? '';

    expect(text).toContain('Selected rows');
    expect(option(fixture, 'Selected rows').textContent).toContain('4');
  });

  it('emits the chosen scope and format', () => {
    const fixture = setup();
    const emitted: { scope: ExportScope; format: ExportFormat }[] = [];
    fixture.componentInstance.export.subscribe((choice) => emitted.push(choice));

    (option(fixture, 'Current page').querySelector('input') as HTMLInputElement).click();
    fixture.detectChanges();
    formatButton(fixture, 'JSON').click();
    fixture.detectChanges();
    downloadButton(fixture).click();

    expect(emitted).toEqual([{ scope: 'page', format: 'json' }]);
  });

  it('defaults to the full filtered CSV export', () => {
    const fixture = setup();
    const emitted: { scope: ExportScope; format: ExportFormat }[] = [];
    fixture.componentInstance.export.subscribe((choice) => emitted.push(choice));

    downloadButton(fixture).click();

    expect(emitted).toEqual([{ scope: 'filtered', format: 'csv' }]);
    expect(downloadButton(fixture).textContent).toContain('Download CSV');
  });

  it('labels the primary action for the selected file type', () => {
    const fixture = setup();
    formatButton(fixture, 'PDF').click();
    fixture.detectChanges();

    expect(downloadButton(fixture).textContent).toContain('Download PDF');
  });

  it('disables every action and blocks closes while the export runs', () => {
    const fixture = setup({ busy: true });
    const emitted: unknown[] = [];
    let closed = 0;
    fixture.componentInstance.export.subscribe((choice) => emitted.push(choice));
    fixture.componentInstance.closed.subscribe(() => ++closed);

    downloadButton(fixture).click();
    (fixture.nativeElement.querySelector('.export-close') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.export-dialog footer button') as HTMLButtonElement).click();

    expect(emitted).toEqual([]);
    expect(closed).toBe(0);
    expect((fixture.nativeElement.querySelector('.export-close') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('shows an error without closing the dialog', () => {
    const fixture = setup({ error: 'The records could not be exported.' });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.export-error')?.textContent).toContain(
      'The records could not be exported.',
    );
    expect(element.querySelector('.export-dialog')).toBeTruthy();
  });

  it('moves to the first available scope when the chosen one has no rows', () => {
    const fixture = setup({ scopes: ['filtered', 'page'], pageCount: 0 });
    expect(option(fixture, 'All filtered rows').querySelector('input')?.checked).toBe(true);

    fixture.componentRef.setInput('filteredCount', 0);
    fixture.componentRef.setInput('pageCount', 3);
    fixture.detectChanges();

    expect(option(fixture, 'Current page').querySelector('input')?.checked).toBe(true);
  });

  it('closes from Cancel and the backdrop unless busy', () => {
    const fixture = setup();
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => ++closed);

    (fixture.nativeElement.querySelector('.export-dialog footer button') as HTMLButtonElement).click();
    (fixture.nativeElement.querySelector('.export-backdrop') as HTMLElement).click();

    expect(closed).toBe(2);
  });
});
