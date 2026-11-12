import { AfterViewInit, ChangeDetectionStrategy, Component, Injector, Input, OnDestroy, computed, inject, signal } from '@angular/core';
import { DataTable } from './data-table';
import { ExportDialog } from '../export/export-dialog/export-dialog';
import { ExportChoice, ExportColumn, ExportRow, ExportScope } from '../export/export.models';
import { ExportService } from '../export/export.service';

/** Consistent controls for both paginated directories and standalone tables. */
@Component({
  selector: 'app-table-tools',
  imports: [ExportDialog],
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
        <button type="button" (click)="openExport()" [disabled]="!canExport()" title="Choose rows and file type"
          aria-label="Export records" aria-haspopup="dialog">
          <i class="pi pi-download" aria-hidden="true"></i> Export
        </button>
      }
    </div>
    <app-export-dialog
      [open]="exportOpen()"
      [title]="'Export ' + title.toLowerCase()"
      [subtitle]="exportSubtitle"
      [scopes]="scopes()"
      [filteredCount]="filteredCount()"
      [pageCount]="pageRows().length"
      [selectedCount]="selectedRows?.length ?? 0"
      [busy]="exporting()"
      [error]="exportError()"
      (export)="runExport($event)"
      (closed)="closeExport()"
    />
  `,
})
export class TableTools implements AfterViewInit, OnDestroy {
  @Input({ required: true }) table!: HTMLTableElement;
  @Input() title = 'Records';
  @Input() total: number | null = null;
  @Input() customExport = false;
  /** Real column keys for exports that must not depend on table markup. */
  @Input() exportColumns: readonly ExportColumn[] | null = null;
  /** Every filtered row, when the page already owns the full dataset. */
  @Input() exportRows: readonly ExportRow[] | null = null;
  /** Rows ticked in the table, when the page supports selection. */
  @Input() selectedRows: readonly ExportRow[] | null = null;
  /** Loads all filtered rows from the server when only one page is rendered. */
  @Input() exportLoader: (() => Promise<readonly ExportRow[]>) | null = null;
  @Input() exportReference = '';
  @Input() exportSubtitle = '';

  protected readonly directory = inject(DataTable, { optional: true });
  private readonly injector = inject(Injector);
  protected readonly rowCount = signal(0);
  protected readonly exportOpen = signal(false);
  protected readonly exporting = signal(false);
  protected readonly exportError = signal('');
  protected readonly pageRows = signal<readonly ExportRow[]>([]);
  protected readonly pageColumns = signal<readonly ExportColumn[]>([]);
  private observer?: MutationObserver;

  protected readonly scopes = computed<readonly ExportScope[]>(() => {
    const scopes: ExportScope[] = [];
    if (this.filteredCount() > 0) scopes.push('filtered');
    if (this.pageRows().length > 0) scopes.push('page');
    if ((this.selectedRows?.length ?? 0) > 0) scopes.push('selected');
    return scopes;
  });

  protected get hasTotal(): boolean { return this.total !== null || this.directory !== null; }
  protected get count(): number { return this.total ?? this.directory?.total ?? this.rowCount(); }

  protected filteredCount(): number {
    if (this.exportRows?.length) return this.exportRows.length;
    if (this.total !== null) return this.total;
    return this.rowCount();
  }

  protected canExport(): boolean {
    return this.rowCount() > 0 || (this.exportRows?.length ?? 0) > 0 || (this.selectedRows?.length ?? 0) > 0;
  }

  ngAfterViewInit(): void {
    const update = () => this.rowCount.set(this.rows().length);
    update();
    this.observer = new MutationObserver(update);
    this.observer.observe(this.table, { childList: true, subtree: true, characterData: true });
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }

  protected openExport(): void {
    if (!this.canExport()) return;
    this.exportError.set('');
    this.pageColumns.set(this.scanColumns());
    this.pageRows.set(this.scanRows());
    this.exportOpen.set(true);
  }

  protected closeExport(): void {
    if (this.exporting()) return;
    this.exportOpen.set(false);
    this.exportError.set('');
  }

  protected async runExport(choice: ExportChoice): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.exportError.set('');
    try {
      const rows = await this.rowsFor(choice.scope);
      const columns = this.exportColumns?.length ? this.exportColumns : this.pageColumns();
      const base = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'records';
      const exporter = this.injector.get(ExportService);
      await exporter.export(
        {
          title: this.title,
          subtitle: this.exportSubtitle || undefined,
          reference: this.exportReference || base,
          filename: `${base}-${choice.scope}`,
          columns,
          rows,
        },
        choice,
      );
      this.exportOpen.set(false);
    } catch (error) {
      this.exportError.set(
        error instanceof Error ? error.message : 'The records could not be exported.',
      );
    } finally {
      this.exporting.set(false);
    }
  }

  private async rowsFor(scope: ExportScope): Promise<readonly ExportRow[]> {
    if (scope === 'selected') return this.selectedRows ?? [];
    if (scope === 'page') return this.alignPageRows();
    if (this.exportRows?.length) return this.exportRows;
    if (this.exportLoader) return this.exportLoader();
    return this.alignPageRows();
  }

  /**
   * The visible page is scraped from table markup with generated keys, while
   * the page's own export columns use real field keys. Remap by column label so
   * the current-page scope produces the same shape as the other scopes.
   */
  private alignPageRows(): readonly ExportRow[] {
    const columns = this.exportColumns;
    if (!columns?.length) return this.pageRows();
    const scanned = this.pageColumns();
    const byLabel = new Map(scanned.map(column => [this.normalize(column.label), column.key]));
    const byKey = new Map(scanned.map(column => [this.normalize(column.key), column.key]));
    return this.pageRows().map(row => {
      const record: Record<string, string> = {};
      for (const column of columns) {
        const source = byLabel.get(this.normalize(column.label)) ?? byKey.get(this.normalize(column.key));
        record[column.key] = source ? String(row[source] ?? '') : '';
      }
      return record;
    });
  }

  private normalize(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }

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
      // An explicit export value means the cell is data, even when its visible
      // content is a link or button wrapped around the label.
      if (cell.dataset?.['exportValue'] !== undefined) return false;
      if (!cell.querySelector('button')) return false;
      const own = Array.from(cell.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent ?? '')
        .join('')
        .trim();
      return own === '';
    });
  }

  private headerCells(): HTMLTableCellElement[] {
    const header = Array.from(this.table.tHead?.rows ?? []).find(row => !row.classList.contains('column-filters'));
    return header ? Array.from(header.cells) : [];
  }

  /** Map header labels to stable keys, skipping selection, index and action-only columns. */
  private scanned(): { columns: readonly ExportColumn[]; positions: readonly number[] } {
    const used = new Set<string>();
    const columns: ExportColumn[] = [];
    const positions: number[] = [];
    this.headerCells().forEach((cell, index) => {
      const label = cell.textContent?.replace(/[↕↑↓]/g, '').trim() ?? '';
      if (!label || /^(select|#)$/i.test(label) || this.isButtonColumn(index)) return;
      const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `column_${index + 1}`;
      let key = base;
      for (let suffix = 2; used.has(key); suffix++) key = `${base}_${suffix}`;
      used.add(key);
      columns.push({ key, label });
      positions.push(index);
    });
    return { columns, positions };
  }

  private scanColumns(): readonly ExportColumn[] {
    return this.scanned().columns;
  }

  private scanRows(): readonly ExportRow[] {
    const { columns, positions } = this.scanned();
    return this.rows().map((row) => {
      const record: Record<string, string> = {};
      columns.forEach((column, index) => {
        const cell = row.cells[positions[index]];
        record[column.key] = cell?.dataset?.['exportValue'] ?? cell?.innerText ?? cell?.textContent ?? '';
      });
      return record;
    });
  }
}
