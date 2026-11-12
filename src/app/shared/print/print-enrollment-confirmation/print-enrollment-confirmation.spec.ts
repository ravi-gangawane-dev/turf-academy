import { TestBed } from '@angular/core/testing';
import { PrintEnrollmentConfirmationDocument } from '../print-document.models';
import { PrintEnrollmentConfirmation } from './print-enrollment-confirmation';

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

const confirmation: PrintEnrollmentConfirmationDocument = {
  kind: 'enrollment-confirmation',
  brand,
  confirmationNumber: 'ENR-TCASTU0001',
  issuedAt: '2026-11-03T06:30:00Z',
  action: 'created',
  effectiveOn: '2026-11-03',
  studentName: 'Aarav Patil',
  studentCode: 'TCA-STU-0001',
  studentDateOfBirth: '2014-02-01',
  guardianName: 'Ravi Patil',
  guardianPhone: '+91 98765 43211',
  guardianRelation: 'Father',
  batchName: 'Morning Elite',
  batchCode: 'B-MOR',
  batchSchedule: 'Mon, Wed, Fri',
  batchTime: '06:30 – 08:00',
  batchCoaches: ['Coach Rao', 'Coach Iyer'],
  planName: 'Quarterly Training',
  monthlyFee: 4500,
  registrationFee: 1000,
  durationMonths: 3,
  validFrom: '2026-11-03',
  validTill: '2027-02-02',
  status: 'active',
  terms: [
    { label: 'Enrollment status', value: 'active' },
    { label: 'Monthly fee', value: '₹4,500.00' },
  ],
};

describe('PrintEnrollmentConfirmation', () => {
  const render = async (document: PrintEnrollmentConfirmationDocument) => {
    await TestBed.configureTestingModule({ imports: [PrintEnrollmentConfirmation] }).compileComponents();
    const fixture = TestBed.createComponent(PrintEnrollmentConfirmation);
    fixture.componentRef.setInput('confirmation', document);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders the live enrollment, guardian, batch, plan and fee as a single A4 sheet', async () => {
    const fixture = await render(confirmation);
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent as string;

    expect(element.querySelector('.print-sheet--enrollment')).toBeTruthy();
    expect(element.querySelectorAll('.print-page')).toHaveLength(1);
    expect(text).toContain('Enrollment Confirmation');
    expect(text).toContain('ENR-TCASTU0001');
    expect(text).toContain('Effective 03 Nov 2026');
    expect(text).toContain('Aarav Patil');
    expect(text).toContain('TCA-STU-0001');
    expect(text).toContain('Born 01 Feb 2014');
    expect(text).toContain('Guardian: Ravi Patil');
    expect(text).toContain('(Father)');
    expect(text).toContain('+91 98765 43211');
    expect(text).toContain('Morning Elite');
    expect(text).toContain('B-MOR');
    expect(text).toContain('06:30 – 08:00');
    expect(text).toContain('Mon, Wed, Fri');
    expect(text).toContain('Coach Rao');
    expect(text).toContain('Coach Iyer');
    expect(text).toContain('Quarterly Training');
    expect(text).toContain('₹4,500.00');
    expect(text).toContain('₹1,000.00');
    expect(text).toContain('3 months');
    expect(text).toContain('03 Nov 2026 → 02 Feb 2027');
    expect(text).toContain('Enrollment status');
    expect(text).toContain('Student / guardian signature');
    expect(text).toContain('Academy representative');
    expect(text).toContain('Page 1 of 1');
    expect(element.querySelector('img')?.getAttribute('src')).toBe(brand.logoUrl);
  });

  it('shows the previous and new batch for a transfer confirmation', async () => {
    const fixture = await render({
      ...confirmation,
      action: 'transferred',
      previousBatchName: 'Evening Development',
      previousBatchCode: 'B-EVE',
      terms: [
        { label: 'Previous batch', value: 'Evening Development (B-EVE)' },
        ...confirmation.terms,
      ],
    });
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent as string;

    expect(text).toContain('Transfer Confirmation');
    expect(text).toContain('Batch transfer');
    expect(text).toContain('Evening Development');
    expect(text).toContain('From B-EVE to B-MOR');
    expect(element.querySelector('.enrollment-transfer')).toBeTruthy();
  });

  it('renders a cancellation with the recorded reason and no transfer block', async () => {
    const fixture = await render({
      ...confirmation,
      action: 'cancelled',
      status: 'cancelled',
      reason: 'Family relocated',
    });
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent as string;

    expect(text).toContain('Cancellation Confirmation');
    expect(text).toContain('Enrollment cancelled');
    expect(text).toContain('Reason');
    expect(text).toContain('Family relocated');
    expect(element.querySelector('.enrollment-transfer')).toBeNull();
  });

  it('states when no additional terms were recorded', async () => {
    const fixture = await render({ ...confirmation, terms: [] });
    expect(fixture.nativeElement.textContent).toContain('No additional terms were recorded.');
  });

  it('keeps date-only values pinned to the calendar date in a positive timezone', async () => {
    const fixture = await render({ ...confirmation, validFrom: '2026-11-03', validTill: undefined });
    expect(fixture.nativeElement.textContent).toContain('03 Nov 2026 → No end date');
  });
});
