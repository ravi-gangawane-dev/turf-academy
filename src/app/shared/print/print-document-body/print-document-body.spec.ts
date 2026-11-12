import { TestBed } from '@angular/core/testing';
import {
  PrintAttendanceMatrixDocument,
  PrintBatchRosterDocument,
  PrintBrand,
  PrintDocument,
  PrintEnrollmentConfirmationDocument,
  PrintIdCardDocument,
  PrintInvoiceDocument,
  PrintProfileSheetDocument,
  PrintReceiptDocument,
} from '../print-document.models';
import { PrintDocumentBody } from './print-document-body';

const brand: PrintBrand = {
  name: 'Turf Cricket Academy',
  code: 'TCA',
  logoUrl: 'https://cdn.example/logo.png',
  address: 'Sector 21, Kharadi',
  phone: '+91 98765 43210',
  email: 'accounts@example.com',
  currencyCode: 'INR',
  timezone: 'Asia/Kolkata',
};

const receipt: PrintReceiptDocument = {
  kind: 'receipt',
  brand,
  receiptNumber: 'RCP-42',
  studentName: 'Aarav Sharma',
  studentCode: 'TCA-1001',
  amount: 1250.5,
  paymentMode: 'UPI',
  paidAt: '2026-10-05T09:15:00Z',
};

const invoice: PrintInvoiceDocument = {
  kind: 'invoice',
  brand,
  invoiceNumber: 'INV-CHARGE-1',
  issuedAt: '2026-10-01T00:00:00Z',
  dueDate: '2026-10-05',
  studentName: 'Aarav Sharma',
  studentCode: 'TCA-1001',
  period: 'October 2026',
  status: 'pending',
  items: [{ description: 'Monthly fee', quantity: 1, rate: 1250.5, amount: 1250.5 }],
  totals: { subtotal: 1250.5, discount: 0, lateFee: 0, total: 1250.5, paid: 0, balance: 1250.5 },
};

const idCard: PrintIdCardDocument = {
  kind: 'id-card',
  brand,
  issuedAt: '2026-11-03T06:00:00Z',
  cardNumber: 'ID-STU-TCA1001',
  holderType: 'student',
  holderId: 's1',
  fullName: 'Aarav Sharma',
  holderCode: 'TCA-1001',
  subtitle: 'Morning Elite',
  photoUrl: null,
  qrPayload: 'TCA:s1',
  qrDataUrl: 'data:image/png;base64,AAAA',
  details: [{ label: 'Guardian', value: 'Ravi Sharma' }],
  validityNote: 'Valid while actively enrolled',
};

const enrollmentConfirmation: PrintEnrollmentConfirmationDocument = {
  kind: 'enrollment-confirmation',
  brand,
  confirmationNumber: 'ENR-TCA1001',
  issuedAt: '2026-11-03T06:00:00Z',
  action: 'created',
  effectiveOn: '2026-11-03',
  studentName: 'Aarav Sharma',
  studentCode: 'TCA-1001',
  batchName: 'Morning Elite',
  batchCode: 'B-MOR',
  batchSchedule: 'Mon, Wed, Fri',
  batchCoaches: ['Coach Rao'],
  planName: 'Monthly Training',
  monthlyFee: 1250.5,
  validFrom: '2026-11-03',
  status: 'active',
  terms: [{ label: 'Enrollment status', value: 'active' }],
};

const batchRoster: PrintBatchRosterDocument = {
  kind: 'batch-roster',
  brand,
  rosterNumber: 'RST-BMOR',
  issuedAt: '2026-11-03T06:00:00Z',
  batchName: 'Morning Elite',
  batchCode: 'B-MOR',
  batchStatus: 'active',
  schedule: 'Mon, Wed, Fri',
  coaches: ['Coach Rao'],
  capacity: 20,
  enrolled: 1,
  includeMedical: false,
  rows: [
    {
      studentId: 's1',
      studentCode: 'TCA-1001',
      studentName: 'Aarav Sharma',
      status: 'active',
      guardians: [],
    },
  ],
};

const profileSheet: PrintProfileSheetDocument = {
  kind: 'profile-sheet',
  brand,
  reference: 'PRF-STU-TCA1001',
  issuedAt: '2026-11-12T06:00:00Z',
  profileKind: 'student',
  fullName: 'Aarav Sharma',
  profileCode: 'TCA-1001',
  subtitle: 'Morning Elite',
  status: 'active',
  photoUrl: null,
  sections: [{ title: 'Personal details', fields: [{ label: 'Blood group', value: 'B+' }] }],
  checklistTitle: 'Document checklist',
  checklist: [{ label: 'Profile photograph', recorded: true }],
  documents: [],
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
  schedule: 'Mon, Wed, Fri',
  coaches: ['Coach Rao'],
  days: [{ date: '2026-10-05', day: 5, weekday: 'Mon', scheduled: true }],
  rows: [
    {
      studentId: 's1',
      studentCode: 'TCA-1001',
      studentName: 'Aarav Sharma',
      cells: ['present'],
      present: 1,
      late: 0,
      absent: 0,
      checkedOut: 0,
      recorded: 1,
      attended: 1,
      percentage: 100,
    },
  ],
};

describe('PrintDocumentBody', () => {
  const render = async (document: PrintDocument) => {
    await TestBed.configureTestingModule({ imports: [PrintDocumentBody] }).compileComponents();
    const fixture = TestBed.createComponent(PrintDocumentBody);
    fixture.componentRef.setInput('document', document);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders the matching template for the document kind', async () => {
    const receiptElement = await render(receipt);
    expect(receiptElement.querySelector('app-print-receipt')).toBeTruthy();
    expect(receiptElement.querySelector('.print-sheet--receipt')).toBeTruthy();
    expect(receiptElement.querySelector('app-print-invoice')).toBeNull();
    TestBed.resetTestingModule();

    const invoiceElement = await render(invoice);
    expect(invoiceElement.querySelector('app-print-invoice')).toBeTruthy();
    expect(invoiceElement.querySelector('.print-sheet--invoice')).toBeTruthy();
    expect(invoiceElement.querySelector('app-print-receipt')).toBeNull();
    TestBed.resetTestingModule();

    const matrixElement = await render(matrix);
    expect(matrixElement.querySelector('app-print-attendance-matrix')).toBeTruthy();
    expect(matrixElement.querySelector('.print-sheet--attendance-matrix')).toBeTruthy();
    expect(matrixElement.querySelector('app-print-attendance-register')).toBeNull();
    TestBed.resetTestingModule();

    const idCardElement = await render(idCard);
    expect(idCardElement.querySelector('app-print-id-card')).toBeTruthy();
    expect(idCardElement.querySelector('.print-sheet--id-card')).toBeTruthy();
    expect(idCardElement.querySelector('app-print-invoice')).toBeNull();
    TestBed.resetTestingModule();

    const confirmationElement = await render(enrollmentConfirmation);
    expect(confirmationElement.querySelector('app-print-enrollment-confirmation')).toBeTruthy();
    expect(confirmationElement.querySelector('.print-sheet--enrollment')).toBeTruthy();
    expect(confirmationElement.querySelector('app-print-batch-roster')).toBeNull();
    TestBed.resetTestingModule();

    const rosterElement = await render(batchRoster);
    expect(rosterElement.querySelector('app-print-batch-roster')).toBeTruthy();
    expect(rosterElement.querySelector('.print-sheet--roster')).toBeTruthy();
    expect(rosterElement.querySelector('app-print-enrollment-confirmation')).toBeNull();
    TestBed.resetTestingModule();

    const profileElement = await render(profileSheet);
    expect(profileElement.querySelector('app-print-profile-sheet')).toBeTruthy();
    expect(profileElement.querySelector('.print-sheet--profile')).toBeTruthy();
    expect(profileElement.querySelector('app-print-batch-roster')).toBeNull();
  });

  it('never renders more than one document for a single input', async () => {
    const element = await render(invoice);
    expect(element.querySelectorAll('.print-sheet').length).toBe(1);
  });
});
