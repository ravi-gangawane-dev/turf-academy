import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './pagination.config';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  @Input() total = 0;
  @Input() page = 1;
  @Input() pageSize = DEFAULT_PAGE_SIZE;
  @Input() itemLabel = 'records';
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;
  @Input() showPageSize = true;

  @Output() readonly pageChange = new EventEmitter<number>();
  @Output() readonly pageSizeChange = new EventEmitter<number>();

  protected get availablePageSizes(): readonly number[] {
    return this.pageSizeOptions;
  }

  protected get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / Math.max(1, this.pageSize)));
  }

  protected get firstRecord(): number {
    return this.total ? (this.page - 1) * this.pageSize + 1 : 0;
  }

  protected get lastRecord(): number {
    return Math.min(this.page * this.pageSize, this.total);
  }

  protected get visiblePages(): readonly number[] {
    const start = Math.max(1, Math.min(this.page - 2, this.pageCount - 4));
    return Array.from({ length: Math.min(5, this.pageCount) }, (_, index) => start + index);
  }

  protected selectPage(page: number): void {
    if (page >= 1 && page <= this.pageCount && page !== this.page) this.pageChange.emit(page);
  }

  protected selectPageSize(value: string): void {
    const size = Number(value);
    if (size !== this.pageSize && this.availablePageSizes.includes(size)) this.pageSizeChange.emit(size);
  }
}
