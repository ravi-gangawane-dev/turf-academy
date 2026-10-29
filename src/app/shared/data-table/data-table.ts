import { DEFAULT_PAGE_SIZE } from '../pagination/pagination.config';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { Pagination } from '../pagination/pagination';

@Component({
  selector: 'app-data-table',
  imports: [Pagination],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable {
  private readonly totalValue = signal(0);
  @Input() set total(value: number) { this.totalValue.set(value); }
  get total(): number { return this.totalValue(); }
  @Input() page = 1;
  @Input() pageSize = DEFAULT_PAGE_SIZE;
  @Input() itemLabel = 'records';

  @Output() readonly pageChange = new EventEmitter<number>();
  @Output() readonly pageSizeChange = new EventEmitter<number>();
}
