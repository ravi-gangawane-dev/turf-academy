import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  PrintAttendanceMatrixCell,
  PrintAttendanceMatrixDocument,
} from '../print-document.models';
import { PrintPage, printPages } from '../print-page';
import { PrintPageFooter } from '../print-page-footer/print-page-footer';

/** The first sheet carries the batch summary and legend, so it holds fewer rows. */
const FIRST_PAGE_ROWS = 16;
const NEXT_PAGE_ROWS = 22;

const CELL_LABELS: Readonly<Record<PrintAttendanceMatrixCell, string>> = {
  present: 'P',
  late: 'L',
  absent: 'A',
  checked_out: 'CO',
  not_recorded: '·',
  off: '–',
  not_enrolled: '–',
};

const CELL_TONES: Readonly<Record<PrintAttendanceMatrixCell, string>> = {
  present: 'present',
  late: 'late',
  absent: 'absent',
  checked_out: 'out',
  not_recorded: 'unmarked',
  off: 'off',
  not_enrolled: 'off',
};

@Component({
  selector: 'app-print-attendance-matrix',
  imports: [DatePipe, PrintPageFooter],
  templateUrl: './print-attendance-matrix.html',
  styleUrl: './print-attendance-matrix.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintAttendanceMatrix {
  readonly matrix = input.required<PrintAttendanceMatrixDocument>();

  protected readonly pages = computed<readonly PrintPage<PrintAttendanceMatrixDocument['rows'][number]>[]>(
    () => printPages(this.matrix().rows, FIRST_PAGE_ROWS, NEXT_PAGE_ROWS),
  );

  protected cellLabel(cell: PrintAttendanceMatrixCell): string {
    return CELL_LABELS[cell] ?? '·';
  }

  protected cellTone(cell: PrintAttendanceMatrixCell): string {
    return CELL_TONES[cell] ?? 'unmarked';
  }

  protected cellTitle(day: string, cell: PrintAttendanceMatrixCell): string {
    const label =
      cell === 'off'
        ? 'No session'
        : cell === 'not_enrolled'
          ? 'Not enrolled'
          : cell === 'not_recorded'
            ? 'Not recorded'
            : cell.replaceAll('_', ' ');
    return `${day}: ${label}`;
  }

  protected dayTitle(index: number, cell: PrintAttendanceMatrixCell): string {
    return this.cellTitle(this.matrix().days[index]?.date ?? '', cell);
  }

  protected percentageLabel(percentage: number | null): string {
    return percentage === null ? '—' : `${percentage}%`;
  }
}
