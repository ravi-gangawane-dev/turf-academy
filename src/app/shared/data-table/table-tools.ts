import { AfterViewInit, ChangeDetectionStrategy, Component, Input, OnDestroy, inject, signal } from '@angular/core';
import { DataTable } from './data-table';

/** Consistent controls for both paginated directories and standalone tables. */
@Component({
  selector: 'app-table-tools',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="table-tools-heading">
      <h2>{{ title }}</h2>
      <span class="table-tools-count" [attr.aria-label]="count + ' ' + (hasTotal ? 'total records' : 'displayed records')">{{ count }}</span>
      @if (!hasTotal) { <small>shown</small> }
    </div>
    <div class="table-tools-actions">
      <ng-content />
      @if (!customExport) {
        <button type="button" (click)="exportPage()" [disabled]="!rowCount()" title="Download the currently displayed rows as CSV"
          aria-label="Export page (Export current page CSV)">
          <i class="pi pi-download" aria-hidden="true"></i> Export page
        </button>
      }
    </div>
  `,
})
export class TableTools implements AfterViewInit, OnDestroy {
  @Input({ required: true }) table!: HTMLTableElement;
  @Input() title = 'Records';
  @Input() total: number | null = null;
  @Input() customExport = false;
  protected readonly directory = inject(DataTable, { optional: true });
  protected readonly rowCount = signal(0);
  private observer?: MutationObserver;

  protected get hasTotal(): boolean { return this.total !== null || this.directory !== null; }
  protected get count(): number { return this.total ?? this.directory?.total ?? this.rowCount(); }

  ngAfterViewInit(): void {
    const update = () => this.rowCount.set(this.rows().length);
    update();
    this.observer = new MutationObserver(update);
    this.observer.observe(this.table, { childList: true, subtree: true, characterData: true });
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }

  private rows(): HTMLTableRowElement[] {
    return Array.from(this.table.tBodies).flatMap(body => Array.from(body.rows))
      .filter(row => !row.matches('.skeleton-row, [hidden]') && row.cells.length > 0
        && !Array.from(row.cells).some(cell => cell.colSpan > 1)
        && !row.querySelector('app-async-state'));
  }

  /** A column whose cells only hold buttons carries no value to export, whatever its header says. */
  private isButtonColumn(index: number): boolean {
    const cells = this.rows()
      .map(row => row.cells[index])
      .filter((cell): cell is HTMLTableCellElement => Boolean(cell));
    if (!cells.length) return false;
    return cells.every(cell => {
      if (!cell.querySelector('button')) return false;
      const own = Array.from(cell.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent ?? '')
        .join('')
        .trim();
      return own === '';
    });
  }

  protected exportPage(): void {
    const header = Array.from(this.table.tHead?.rows ?? []).find(row => !row.classList.contains('column-filters'));
    const columns = header ? Array.from(header.cells).map((cell, index) => ({
      label: cell.textContent?.replace(/[↕↑↓]/g, '').trim() ?? '', index,
    })).filter(column => column.label && !/^(select|#)$/i.test(column.label) && !this.isButtonColumn(column.index)) : [];
    const safe = (value: string) => {
      const text = value.replace(/\s+/g, ' ').trim();
      return '"' + (/^[=+\-@]/.test(text) ? "'" : '') + text.replaceAll('"', '""') + '"';
    };
    const csv = [columns.map(column => safe(column.label)).join(','), ...this.rows().map(row =>
      columns.map(column => safe(row.cells[column.index]?.innerText ?? row.cells[column.index]?.textContent ?? '')).join(','),
    )].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-page.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
