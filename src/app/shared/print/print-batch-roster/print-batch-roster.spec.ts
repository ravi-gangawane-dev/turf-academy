import { TestBed } from '@angular/core/testing';
import { PrintBatchRosterDocument } from '../print-document.models';
import { PrintBatchRoster } from './print-batch-roster';

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

const roster: PrintBatchRosterDocument = {
  kind: 'batch-roster',
  brand,
  rosterNumber: 'RST-BMOR',
  issuedAt: '2026-11-03T06:30:00Z',
  batchName: 'Morning Elite',
  batchCode: 'B-MOR',
  batchStatus: 'active',
  ageGroup: 'Under 14',
  skillLevel: 'Intermediate',
  schedule: 'Mon, Wed, Fri',
  batchTime: '06:30 – 08:00',
  batchDates: '2026-11-01 – 2027-03-31',
  coaches: ['Coach Rao'],
  capacity: 20,
  enrolled: 2,
  includeMedical: true,
  rows: [
    {
      studentId: 's1',
      studentCode: 'TCA-1001',
      studentName: 'Aarav Sharma',
      dateOfBirth: '2014-02-01',
      status: 'active',
      guardians: [
        {
          name: 'Ravi Sharma',
          relation: 'Father',
          phone: '+91 98765 43211',
          whatsapp: '+91 98765 43212',
          isPrimary: true,
          canPickUp: true,
        },
        {
          name: 'Neha Sharma',
          relation: 'Mother',
          phone: '+91 98765 43213',
          isPrimary: false,
          canPickUp: false,
        },
      ],
      medical: 'Blood group B+ · Allergies: None',
    },
    {
      studentId: 's2',
      studentCode: 'TCA-1002',
      studentName: 'Diya Patel',
      dateOfBirth: '2015-06-12',
      status: 'active',
      guardians: [],
      medical: undefined,
    },
  ],
};

describe('PrintBatchRoster', () => {
  const render = async (document: PrintBatchRosterDocument) => {
    await TestBed.configureTestingModule({ imports: [PrintBatchRoster] }).compileComponents();
    const fixture = TestBed.createComponent(PrintBatchRoster);
    fixture.componentRef.setInput('roster', document);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('prints the batch summary, guardian contacts, pickup rights and medical notes', async () => {
    const fixture = await render(roster);
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent as string;

    expect(element.querySelector('.print-sheet--roster')).toBeTruthy();
    expect(text).toContain('Batch Roster');
    expect(text).toContain('RST-BMOR');
    expect(text).toContain('Morning Elite');
    expect(text).toContain('B-MOR');
    expect(text).toContain('Under 14');
    expect(text).toContain('Intermediate');
    expect(text).toContain('2 of 20 places filled');
    expect(text).toContain('Mon, Wed, Fri');
    expect(text).toContain('06:30 – 08:00');
    expect(text).toContain('2026-11-01 – 2027-03-31');
    expect(text).toContain('Coach Rao');
    expect(text).toContain('Medical notes are included');
    expect(text).toContain('Ravi Sharma');
    expect(text).toContain('(Father)');
    expect(text).toContain('Primary');
    expect(text).toContain('+91 98765 43211');
    expect(text).toContain('WhatsApp +91 98765 43212');
    expect(text).toContain('Ravi Sharma: Authorised for pickup');
    expect(text).toContain('Neha Sharma: Not authorised for pickup');
    expect(text).toContain('Blood group B+');
    expect(text).toContain('No guardian linked');
    expect(text).toContain('No medical notes recorded');
    expect(text).toContain('01 Feb 2014');
    expect(text).toContain('Page 1 of 1');
  });

  it('withholds medical columns and text when the viewer cannot read medical records', async () => {
    const fixture = await render({ ...roster, includeMedical: false });
    const element = fixture.nativeElement as HTMLElement;
    const headers = [...element.querySelectorAll('thead th')].map((cell) =>
      (cell.textContent ?? '').trim(),
    );

    expect(headers).not.toContain('Medical notes');
    expect(element.textContent).toContain('Medical notes are not included on this copy.');
    expect(element.textContent).not.toContain('Blood group B+');
    expect(element.textContent).not.toContain('Medical notes are included');
  });

  it('splits a large roster into pages with continuous numbering and repeated footers', async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      ...roster.rows[0],
      studentId: `s-${index}`,
      studentCode: `TCA-${3001 + index}`,
      studentName: `Student ${index + 1}`,
    }));
    const fixture = await render({ ...roster, rows, enrolled: rows.length });
    const element = fixture.nativeElement as HTMLElement;
    const pages = [...element.querySelectorAll('.print-page')] as HTMLElement[];

    expect(pages).toHaveLength(2);
    expect(element.querySelectorAll('.letterhead')).toHaveLength(2);
    expect(pages[0].querySelectorAll('tbody tr')).toHaveLength(11);
    expect(pages[1].querySelectorAll('tbody tr')).toHaveLength(1);
    expect(
      [...element.querySelectorAll('.print-page-footer-page')].map((node) =>
        (node.textContent ?? '').trim(),
      ),
    ).toEqual(['Page 1 of 2', 'Page 2 of 2']);
    const indexes = [...element.querySelectorAll<HTMLElement>('.roster-table .index')]
      .map((cell) => cell.textContent?.trim())
      .filter((value) => value && value !== '#');
    expect(indexes).toEqual(Array.from({ length: 12 }, (_, index) => String(index + 1)));
  });

  it('states when the batch has no active enrollments', async () => {
    const fixture = await render({ ...roster, rows: [], enrolled: 0 });
    expect(fixture.nativeElement.textContent).toContain(
      'No active enrollments were found for this batch.',
    );
  });
});
