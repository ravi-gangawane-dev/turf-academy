import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-filter-bar',
  template: `<section>
    @if (showSearch()) { <label class="filter-search"
      ><i aria-hidden="true" class="pi pi-search"></i><span class="sr-only">Search</span
      ><input [attr.aria-label]="searchLabel()" [placeholder]="placeholder()" [value]="search()" (input)="onInput($event)" /></label
    >}<ng-content /><button type="button" (click)="resetFilters.emit()">
      <i aria-hidden="true" class="pi pi-filter-slash"></i>Reset
    </button>
  </section>`,
  styles: [
    `
      :host { display: block; min-width: 0; max-width: 100%; }
      section {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        min-width: 0;
        width: 100%;
      }
      label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: min(var(--filter-search-min-width, 300px), 100%);
        max-width: 100%;
        border: 1px solid #cbd6d1;
        border-radius: 8px;
        padding: 0 0.7rem;
        background: #fff;
      }
      input {
        min-width: 0;
        border: 0;
        outline: 0;
        min-height: 40px;
        width: 100%;
      }
      label:focus-within { border-color: var(--app-primary); box-shadow: var(--app-focus); }
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        flex-shrink: 0;
        white-space: nowrap;
        min-height: 40px;
        border: 1px solid #cbd6d1;
        border-radius: 8px;
        background: #fff;
        padding: 0 0.8rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterBar {
  readonly search = input('');
  readonly placeholder = input('Search…');
  readonly searchChange = output<string>();
  readonly searchLabel = input('Search');
  readonly showSearch = input(true);
  readonly resetFilters = output<void>();
  protected onInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.searchChange.emit(event.target.value);
  }
}
