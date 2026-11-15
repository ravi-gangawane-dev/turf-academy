import { computed, Signal, signal, WritableSignal } from '@angular/core';
import { DEFAULT_PAGE_SIZE } from './pagination/pagination.config';

export type SortDirection = 'asc' | 'desc';

interface ListQueryOptions<SortKey extends string> {
  /** Column the list is ordered by before the user changes it. */
  readonly sortBy: SortKey;
  readonly sortDirection?: SortDirection;
  readonly pageSize?: number;
  /** The server total, when the page shows a page count. */
  readonly total?: Signal<number>;
}

/**
 * Paging and sorting state for a server-driven list.
 *
 * Pages keep their own filters and loading; this owns only what every list
 * got wrong in its own way — resetting to page 1 when the result set changes
 * shape, and toggling a column sort.
 */
export class ListQueryState<SortKey extends string = string> {
  readonly page = signal(1);
  readonly pageSize: WritableSignal<number>;
  readonly sortBy: WritableSignal<SortKey>;
  readonly sortDirection = signal<SortDirection>('asc');
  readonly pageCount: Signal<number>;
  private readonly hasTotal: boolean;

  constructor(options: ListQueryOptions<SortKey>) {
    this.hasTotal = !!options.total;
    this.sortBy = signal(options.sortBy);
    this.sortDirection.set(options.sortDirection ?? 'asc');
    this.pageSize = signal(options.pageSize ?? DEFAULT_PAGE_SIZE);
    this.pageCount = computed(() =>
      Math.max(1, Math.ceil((options.total?.() ?? 0) / this.pageSize())),
    );
  }

  /** Go to a page, clamped to what the server reported. */
  setPage(page: number): void {
    const upper = this.hasTotal ? this.pageCount() : Number.MAX_SAFE_INTEGER;
    this.page.set(Math.min(upper, Math.max(1, page)));
  }

  /** A new page size always restarts the list at the first page. */
  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
  }

  /** Ascending on a new column, toggled on the current one. */
  sortByColumn(key: SortKey): void {
    this.sortDirection.set(
      this.sortBy() === key && this.sortDirection() === 'asc' ? 'desc' : 'asc',
    );
    this.sortBy.set(key);
    this.page.set(1);
  }

  setSortDirection(direction: SortDirection): void {
    this.sortDirection.set(direction);
    this.page.set(1);
  }
}
