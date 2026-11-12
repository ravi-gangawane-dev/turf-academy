import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PrintProfileSheetDocument } from '../print-document.models';
import { printDateOnly } from '../print-format';

/**
 * A4 profile summary for a student, parent or coach. Every value in the sheet
 * is supplied by the details page from the live record; the template only adds
 * labels and layout.
 */
@Component({
  selector: 'app-print-profile-sheet',
  imports: [DatePipe],
  templateUrl: './print-profile-sheet.html',
  styleUrl: './print-profile-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintProfileSheet {
  readonly sheet = input.required<PrintProfileSheetDocument>();

  protected readonly title = computed(() => {
    const kind = this.sheet().profileKind;
    if (kind === 'parent') return 'Parent Profile';
    if (kind === 'coach') return 'Coach Profile';
    return 'Student Profile';
  });

  protected readonly codeLabel = computed(() => {
    const kind = this.sheet().profileKind;
    if (kind === 'parent') return 'Parent ID';
    if (kind === 'coach') return 'Employee code';
    return 'Student ID';
  });

  protected readonly initials = computed(() =>
    this.sheet()
      .fullName.split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  );

  protected readonly recordedCount = computed(
    () => this.sheet().checklist.filter((item) => item.recorded).length,
  );

  protected readonly statusActive = computed(
    () => this.sheet().status.trim().toLowerCase() === 'active',
  );

  /** Parents and coaches have no upload table, so only students show documents. */
  protected readonly showDocuments = computed(() => this.sheet().profileKind === 'student');

  protected readonly documentsLabel = computed(() => {
    const count = this.sheet().documents.length;
    return `${count} file${count === 1 ? '' : 's'} shown`;
  });

  protected formatDay(value: string | null | undefined): string {
    return printDateOnly(value);
  }
}
