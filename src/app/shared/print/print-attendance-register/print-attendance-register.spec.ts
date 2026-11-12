import { TestBed } from '@angular/core/testing';
import { PrintAttendanceRegisterDocument } from '../print-document.models';
import { PrintAttendanceRegister } from './print-attendance-register';

const register: PrintAttendanceRegisterDocument = {
  kind: 'attendance-register',
  brand: {
    name: 'Turf Cricket Academy',
    code: 'TCA',
    logoUrl: 'https://cdn.example/logo.png',
    address: 'Sector 21, Kharadi',
    phone: '+91 98765 43210',
    email: 'accounts@example.com',
    currencyCode: 'INR',
    timezone: 'Asia/Kolkata',
  },
  registerNumber: 'ATR-MORNING-20261103',
  issuedAt: '2026-11-03T05:30:00Z',
  date: '2026-11-03',
  batchName: 'Morning Elite',
  batchCode: 'B-MOR',
  batchTime: '06:30 – 08:00',
  coaches: ['Coach Rao', 'Coach Iyer'],
  showRemarks: true,
  counts: {
    expected: 3,
    present: 1,
    late: 1,
    absent: 0,
    checkedOut: 1,
    notRecorded: 0,
  },
  rows: [
    {
      studentCode: 'TCA-1001',
      studentName: 'Aarav Sharma',
      status: 'present',
      checkInAt: '2026-11-03T01:00:00Z',
      checkOutAt: '2026-11-03T02:30:00Z',
      remarks: 'Focused session',
    },
    {
      studentCode: 'TCA-1002',
      studentName: 'Diya Patel',
      status: 'late',
      checkInAt: '2026-11-03T01:45:00Z',
      checkOutAt: null,
      remarks: null,
    },
    {
      studentCode: 'TCA-1003',
      studentName: 'Kabir Nair',
      status: 'checked_out',
      checkInAt: '2026-11-03T01:10:00Z',
      checkOutAt: '2026-11-03T02:40:00Z',
      remarks: null,
    },
  ],
};

describe('PrintAttendanceRegister', () => {
  const render = async (document: PrintAttendanceRegisterDocument) => {
    await TestBed.configureTestingModule({ imports: [PrintAttendanceRegister] }).compileComponents();
    const fixture = TestBed.createComponent(PrintAttendanceRegister);
    fixture.componentRef.setInput('register', document);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders an A4 register with batch, coaches, counts and statuses', async () => {
    const fixture = await render(register);
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent as string;

    expect(element.querySelector('.print-sheet--attendance')).toBeTruthy();
    expect(text).toContain('Daily Attendance Register');
    expect(text).toContain('ATR-MORNING-20261103');
    expect(text).toContain('Morning Elite');
    expect(text).toContain('B-MOR');
    expect(text).toContain('06:30 – 08:00');
    expect(text).toContain('03 Nov 2026');
    expect(text).toContain('Coach Rao');
    expect(text).toContain('Coach Iyer');
    expect(text).toContain('Present');
    expect(text).toContain('Late');
    expect(text).toContain('Checked out');
    expect(text).toContain('Aarav Sharma');
    expect(text).toContain('TCA-1001');
    expect(text).toContain('Focused session');
    expect(text).toContain('6:30');
    expect(text).toContain('8:00');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      'https://cdn.example/logo.png',
    );

    const counts = [...element.querySelectorAll('.register-counts article')].map((item) =>
      [item.querySelector('span'), item.querySelector('strong')]
        .map((node) => (node?.textContent ?? '').trim())
        .join(' '),
    );
    expect(counts).toEqual([
      'Expected 3',
      'Present 1',
      'Late 1',
      'Absent 0',
      'Checked out 1',
      'Not recorded 0',
    ]);
  });

  it('drops the remarks column when the print permission withholds it', async () => {
    const fixture = await render({ ...register, showRemarks: false });
    const element = fixture.nativeElement as HTMLElement;
    const headers = [...element.querySelectorAll('thead th')].map((cell) =>
      (cell.textContent ?? '').trim(),
    );

    expect(headers).not.toContain('Remarks');
    expect(element.textContent).not.toContain('Focused session');
  });

  it('keeps unrecorded students on the register and shows an empty state without enrolments', async () => {
    const unrecorded = await render({
      ...register,
      counts: {
        expected: 1,
        present: 0,
        late: 0,
        absent: 0,
        checkedOut: 0,
        notRecorded: 1,
      },
      rows: [
        {
          studentCode: 'TCA-1004',
          studentName: 'Meera Joshi',
          status: 'not_recorded',
          checkInAt: null,
          checkOutAt: null,
          remarks: null,
        },
      ],
    });
    expect(unrecorded.nativeElement.textContent).toContain('Not recorded');
    expect(unrecorded.nativeElement.textContent).toContain('Meera Joshi');
    TestBed.resetTestingModule();

    const empty = await render({
      ...register,
      counts: {
        expected: 0,
        present: 0,
        late: 0,
        absent: 0,
        checkedOut: 0,
        notRecorded: 0,
      },
      rows: [],
    });
    expect(empty.nativeElement.textContent).toContain(
      'No active enrollments were found for this batch on the selected date.',
    );
  });

  it('splits a large batch into pages with continuous numbering and repeated footers', async () => {
    const rows = Array.from({ length: 15 }, (_, index) => ({
      ...register.rows[0],
      studentCode: `TCA-${2001 + index}`,
      studentName: `Student ${index + 1}`,
    }));
    const fixture = await render({ ...register, rows });
    const element = fixture.nativeElement as HTMLElement;
    const pages = [...element.querySelectorAll('.print-page')] as HTMLElement[];

    expect(pages).toHaveLength(2);
    expect(element.querySelectorAll('.letterhead')).toHaveLength(2);
    expect(pages[0].querySelector('.register-counts')).toBeTruthy();
    expect(pages[1].querySelector('.register-counts')).toBeNull();
    expect(pages[0].querySelector('.register-signoff')).toBeNull();
    expect(pages[1].querySelector('.register-signoff')).toBeTruthy();
    expect(
      [...element.querySelectorAll('.print-page-footer-page')].map((node) =>
        (node.textContent ?? '').trim(),
      ),
    ).toEqual(['Page 1 of 2', 'Page 2 of 2']);
    const indexes = [...element.querySelectorAll<HTMLElement>('.register-table .index')]
      .map((cell) => cell.textContent?.trim())
      .filter((value) => value && value !== '#');
    expect(indexes).toEqual(Array.from({ length: 15 }, (_, index) => String(index + 1)));
  });
});
