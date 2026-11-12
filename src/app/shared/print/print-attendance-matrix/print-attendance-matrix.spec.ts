import { TestBed } from '@angular/core/testing';
import { PrintAttendanceMatrixDocument } from '../print-document.models';
import { PrintAttendanceMatrix } from './print-attendance-matrix';

const brand = {
  name: 'Turf Cricket Academy',
  code: 'TCA',
  logoUrl: 'https://cdn.example/logo.png',
  address: 'Sector 21, Kharadi',
  phone: '+91 98765 43210',
  email: 'accounts@example.com',
  currencyCode: 'INR',
  timezone: 'Asia/Kolkata',
};

const matrix: PrintAttendanceMatrixDocument = {
  kind: 'attendance-matrix',
  brand,
  registerNumber: 'ATM-BMOR-202610',
  issuedAt: '2026-11-01T06:00:00Z',
  month: '2026-10',
  monthLabel: 'October 2026',
  batchName: 'Morning Elite',
  batchCode: 'B-MOR',
  batchTime: '06:30 – 08:00',
  schedule: 'Mon, Wed, Fri',
  coaches: ['Coach Rao'],
  days: [
    { date: '2026-10-05', day: 5, weekday: 'Mon', scheduled: true },
    { date: '2026-10-06', day: 6, weekday: 'Tue', scheduled: false },
    { date: '2026-10-07', day: 7, weekday: 'Wed', scheduled: true },
  ],
  rows: [
    {
      studentId: 's1',
      studentCode: 'TCA-1',
      studentName: 'Aarav Patil',
      cells: ['present', 'off', 'late'],
      present: 1,
      late: 1,
      absent: 0,
      checkedOut: 0,
      recorded: 2,
      attended: 2,
      percentage: 100,
    },
    {
      studentId: 's2',
      studentCode: 'TCA-2',
      studentName: 'Diya Patel',
      cells: ['not_enrolled', 'not_recorded', 'absent'],
      present: 0,
      late: 0,
      absent: 1,
      checkedOut: 0,
      recorded: 1,
      attended: 0,
      percentage: 0,
    },
  ],
};

function render(document: PrintAttendanceMatrixDocument = matrix) {
  TestBed.configureTestingModule({ imports: [PrintAttendanceMatrix] });
  const fixture = TestBed.createComponent(PrintAttendanceMatrix);
  fixture.componentRef.setInput('matrix', document);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PrintAttendanceMatrix', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders the month, batch, legend and one column per day', () => {
    const element = render();
    const text = element.textContent ?? '';

    expect(element.querySelector('.print-sheet--attendance-matrix')).toBeTruthy();
    expect(text).toContain('Monthly Attendance Matrix');
    expect(text).toContain('ATM-BMOR-202610');
    expect(text).toContain('October 2026');
    expect(text).toContain('Morning Elite');
    expect(text).toContain('Mon, Wed, Fri');
    expect(text).toContain('Coach Rao');
    expect(text).toContain('Not recorded');
    expect(element.querySelectorAll('.day-col').length).toBe(3);
    expect(element.querySelector('.day-col--off')?.textContent).toContain('6');
  });

  it('renders P/L/A/CO cells with totals and attendance percentages', () => {
    const element = render();
    const rows = [...element.querySelectorAll('tbody tr')] as HTMLElement[];

    expect(rows).toHaveLength(2);
    const cells = [...rows[0].querySelectorAll('.matrix-cell')].map((cell) =>
      (cell.textContent ?? '').trim(),
    );
    expect(cells).toEqual(['P', '–', 'L']);
    expect(rows[0].querySelector('.matrix-cell--present')).toBeTruthy();
    expect(rows[0].querySelector('.matrix-cell--off')).toBeTruthy();
    expect(rows[0].querySelector('.matrix-cell--late')).toBeTruthy();
    expect(rows[0].textContent).toContain('100%');

    const secondCells = [...rows[1].querySelectorAll('.matrix-cell')].map((cell) =>
      (cell.textContent ?? '').trim(),
    );
    expect(secondCells).toEqual(['–', '·', 'A']);
    expect(rows[1].querySelector('.matrix-cell--unmarked')).toBeTruthy();
    expect(rows[1].textContent).toContain('0%');
  });

  it('shows an empty state when the batch has no enrolled students', () => {
    const element = render({ ...matrix, rows: [] });

    expect(element.querySelector('.matrix-table .empty')?.textContent).toContain(
      'No active enrollments',
    );
  });

  it('shows a dash for a student with no recorded sessions', () => {
    const element = render({
      ...matrix,
      rows: [
        {
          ...matrix.rows[0],
          cells: ['not_recorded', 'off', 'not_recorded'],
          present: 0,
          late: 0,
          absent: 0,
          checkedOut: 0,
          recorded: 0,
          attended: 0,
          percentage: null,
        },
      ],
    });

    expect(element.querySelector('tbody .percentage-col')?.textContent?.trim()).toBe('—');
  });

  it('splits a large batch into pages with repeated legend and page footers', () => {
    const rows = Array.from({ length: 17 }, (_, index) => ({
      ...matrix.rows[0],
      studentId: `s-${index + 1}`,
      studentCode: `TCA-${index + 1}`,
      studentName: `Student ${index + 1}`,
    }));
    const element = render({ ...matrix, rows });
    const pages = [...element.querySelectorAll('.print-page')] as HTMLElement[];

    expect(pages).toHaveLength(2);
    expect(element.querySelectorAll('.letterhead')).toHaveLength(2);
    expect(element.querySelectorAll('.matrix-legend')).toHaveLength(2);
    expect(element.querySelectorAll('.matrix-table tbody tr')).toHaveLength(17);
    expect(
      [...element.querySelectorAll('.print-page-footer-page')].map((node) =>
        (node.textContent ?? '').trim(),
      ),
    ).toEqual(['Page 1 of 2', 'Page 2 of 2']);
    expect(pages[1].textContent).toContain('Student 17');
    expect(pages[1].querySelector('.matrix-footnote')).toBeTruthy();
  });
});
