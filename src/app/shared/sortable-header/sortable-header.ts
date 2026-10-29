import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type TableSortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-sortable-header',
  standalone: true,
  template: `
    <button
      type="button"
      class="table-sort-header"
      [attr.aria-pressed]="activeSort() === sortKey()"
      (click)="sortChange.emit(sortKey())"
    >
      <ng-content />
      <span class="table-sort-indicator" aria-hidden="true">
        {{ activeSort() === sortKey() ? (direction() === 'asc' ? '↑' : '↓') : '↕' }}
      </span>
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }

      .table-sort-header {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0;
        border: 0;
        color: inherit;
        background: transparent;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }

      .table-sort-header:focus-visible {
        outline: 2px solid var(--app-primary, #08743c);
        outline-offset: 3px;
        border-radius: 2px;
      }

      .table-sort-indicator {
        color: var(--app-text-muted, #748097);
        font-size: 1.1em;
        line-height: 1;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SortableHeader {
  readonly sortKey = input.required<string>();
  readonly activeSort = input('');
  readonly direction = input<TableSortDirection>('asc');
  readonly sortChange = output<string>();

}
