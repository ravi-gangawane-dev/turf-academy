import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { ModalFocus } from '../../interaction-dialog/modal-focus';
import { ExportFormat, ExportScope } from '../export.models';

interface ScopeOption {
  readonly value: ExportScope;
  readonly label: string;
  readonly description: string;
  readonly count: number;
}

const FORMAT_LABELS: Readonly<Record<ExportFormat, string>> = {
  csv: 'CSV',
  json: 'JSON',
  pdf: 'PDF',
};

/**
 * Shared export dialog: the user chooses how many rows and which file type.
 * It renders its own accessible overlay, matching the rest of the custom dialog
 * system, and never opens a PrimeNG dialog.
 */
@Component({
  selector: 'app-export-dialog',
  imports: [ModalFocus],
  templateUrl: './export-dialog.html',
  styleUrl: './export-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportDialog {
  readonly open = input(false);
  readonly title = input('Export records');
  readonly subtitle = input('');
  readonly scopes = input<readonly ExportScope[]>(['filtered', 'page']);
  readonly filteredCount = input(0);
  readonly pageCount = input(0);
  readonly selectedCount = input(0);
  readonly busy = input(false);
  readonly error = input('');

  readonly export = output<{ scope: ExportScope; format: ExportFormat }>();
  readonly closed = output<void>();

  protected readonly scope = signal<ExportScope>('filtered');
  protected readonly format = signal<ExportFormat>('csv');

  protected readonly options = computed<readonly ScopeOption[]>(() => {
    const definitions: Readonly<Record<ExportScope, Omit<ScopeOption, 'count'>>> = {
      filtered: {
        value: 'filtered',
        label: 'All filtered rows',
        description: 'Every record matching the current search and filters.',
      },
      page: {
        value: 'page',
        label: 'Current page',
        description: 'Only the rows currently visible in the table.',
      },
      selected: {
        value: 'selected',
        label: 'Selected rows',
        description: 'Only the rows you selected.',
      },
    };
    const counts: Record<ExportScope, number> = {
      filtered: this.filteredCount(),
      page: this.pageCount(),
      selected: this.selectedCount(),
    };
    return this.scopes()
      .filter((value) => counts[value] > 0)
      .map((value) => ({ ...definitions[value], count: counts[value] }));
  });

  protected readonly formats = computed<readonly { value: ExportFormat; label: string; hint: string }[]>(
    () => [
      { value: 'csv', label: FORMAT_LABELS.csv, hint: 'Opens in Excel or Sheets.' },
      { value: 'json', label: FORMAT_LABELS.json, hint: 'Structured copy for backup or scripts.' },
      { value: 'pdf', label: FORMAT_LABELS.pdf, hint: 'Branded document; choose Save as PDF.' },
    ],
  );

  protected readonly canExport = computed(
    () => !this.busy() && this.options().some((option) => option.value === this.scope()),
  );
  protected readonly formatLabel = computed(
    () => `Download ${FORMAT_LABELS[this.format()]}`,
  );

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const options = this.options();
      if (!options.some((option) => option.value === this.scope())) {
        this.scope.set(options[0]?.value ?? 'filtered');
      }
    });
  }

  protected selectScope(scope: ExportScope): void {
    if (this.busy()) return;
    this.scope.set(scope);
  }

  protected selectFormat(format: ExportFormat): void {
    if (this.busy()) return;
    this.format.set(format);
  }

  protected request(): void {
    if (!this.canExport()) return;
    this.export.emit({ scope: this.scope(), format: this.format() });
  }

  protected close(): void {
    if (this.busy()) return;
    this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
