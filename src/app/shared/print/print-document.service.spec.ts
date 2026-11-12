import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PrintAuditService } from './print-audit.service';
import { PrintBrandService } from './print-brand.service';
import {
  PrintAttendanceMatrixDocument,
  PrintBatchRosterDocument,
  PrintEnrollmentConfirmationDocument,
  PrintIdCardInput,
  PrintProfileSheetInput,
  PrintReceiptDocument,
} from './print-document.models';
import { PrintDocumentService, printFileName } from './print-document.service';
import { PrintPageSetupService } from './print-page-setup.service';
import { ToastService } from '../toast/toast.service';

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

const receipt: Omit<PrintReceiptDocument, 'kind' | 'brand'> = {
  receiptNumber: 'RCP-42',
  studentName: 'Aarav Sharma',
  studentCode: 'TCA-1001',
  amount: 1250.5,
  paymentMode: 'UPI',
  paidAt: '2026-10-05T09:15:00Z',
};

const matrix: Omit<PrintAttendanceMatrixDocument, 'kind' | 'brand'> = {
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

function setup() {
  const toast = { info: vi.fn(), error: vi.fn() };
  const audit = { recordInBackground: vi.fn() };
  const brandService = { load: vi.fn().mockResolvedValue(brand) };
  TestBed.configureTestingModule({
    providers: [
      { provide: PrintBrandService, useValue: brandService },
      { provide: PrintAuditService, useValue: audit },
      { provide: ToastService, useValue: toast },
      { provide: ApplicationRef, useValue: { tick: vi.fn() } },
    ],
  });
  return {
    service: TestBed.inject(PrintDocumentService),
    pageSetup: TestBed.inject(PrintPageSetupService),
    toast,
    brandService,
    audit,
  };
}

const idCard: PrintIdCardInput = {
  issuedAt: '2026-11-03T06:00:00Z',
  cardNumber: 'ID-STU-TCA1001',
  holderType: 'student',
  holderId: 's1',
  fullName: 'Aarav Sharma',
  holderCode: 'TCA-1001',
  subtitle: 'Morning Elite',
  photoUrl: null,
  details: [{ label: 'Guardian', value: 'Ravi Sharma' }],
  validityNote: 'Valid while actively enrolled',
};

const confirmation: Omit<PrintEnrollmentConfirmationDocument, 'kind' | 'brand'> = {
  confirmationNumber: 'ENR-TCASTU0001',
  issuedAt: '2026-11-03T06:30:00Z',
  action: 'created',
  effectiveOn: '2026-11-03',
  studentName: 'Aarav Patil',
  studentCode: 'TCA-STU-0001',
  batchName: 'Morning Elite',
  batchCode: 'B-MOR',
  batchSchedule: 'Mon, Wed, Fri',
  batchCoaches: ['Coach Rao'],
  planName: 'Quarterly Training',
  monthlyFee: 4500,
  validFrom: '2026-11-03',
  status: 'active',
  terms: [{ label: 'Enrollment status', value: 'active' }],
};

const profileSheet: PrintProfileSheetInput = {
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

const roster: Omit<PrintBatchRosterDocument, 'kind' | 'brand'> = {
  rosterNumber: 'RST-BMOR',
  issuedAt: '2026-11-03T06:30:00Z',
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

describe('PrintDocumentService preview', () => {
  let print: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.removeItem('academy-print-page-setup');
    document.getElementById('academy-print-page-setup-style')?.remove();
    print = vi.spyOn(globalThis.window, 'print').mockImplementation(() => undefined);
  });

  afterEach(() => {
    print.mockRestore();
    localStorage.removeItem('academy-print-page-setup');
    document.getElementById('academy-print-page-setup-style')?.remove();
    TestBed.resetTestingModule();
  });

  it('queues a document for preview without opening the print dialog', async () => {
    const { service } = setup();

    await service.printReceipt(receipt, 'preview');

    expect(service.preview()).toMatchObject({
      kind: 'receipt',
      receiptNumber: 'RCP-42',
      brand,
    });
    expect(service.document()).toBeNull();
    expect(print).not.toHaveBeenCalled();
  });

  it('prepares a monthly attendance matrix with the shared brand', async () => {
    const { service } = setup();

    await service.printAttendanceMatrix(matrix, 'preview');

    expect(service.preview()).toMatchObject({
      kind: 'attendance-matrix',
      registerNumber: 'ATM-BMOR-202610',
      month: '2026-10',
      brand,
    });
    expect(print).not.toHaveBeenCalled();
  });

  it('derives the scannable payload and QR image for an ID card', async () => {
    const { service } = setup();

    await service.printIdCard(idCard, 'preview');

    expect(service.preview()).toMatchObject({
      kind: 'id-card',
      cardNumber: 'ID-STU-TCA1001',
      qrPayload: 'TCA:s1',
      brand,
    });
    const prepared = service.preview();
    expect(prepared?.kind === 'id-card' ? prepared.qrDataUrl : '').toMatch(
      /^data:image\/png;base64,/,
    );
    expect(print).not.toHaveBeenCalled();
  });

  it('namespaces guardian card payloads so they cannot match a student id', async () => {
    const { service } = setup();

    await service.printIdCard(
      {
        ...idCard,
        cardNumber: 'ID-PAR-P1',
        holderType: 'parent',
        holderId: 'p1',
        fullName: 'Ravi Patil',
      },
      'preview',
    );

    expect(service.preview()).toMatchObject({
      kind: 'id-card',
      holderType: 'parent',
      qrPayload: 'TCA:parent:p1',
      cardNumber: 'ID-PAR-P1',
      brand,
    });
    expect(print).not.toHaveBeenCalled();
  });

  it('prepares a live enrollment confirmation with the shared brand', async () => {
    const { service } = setup();

    await service.printEnrollmentConfirmation(confirmation, 'preview');

    expect(service.preview()).toMatchObject({
      kind: 'enrollment-confirmation',
      confirmationNumber: 'ENR-TCASTU0001',
      studentName: 'Aarav Patil',
      brand,
    });
    expect(print).not.toHaveBeenCalled();
  });

  it('prepares a batch roster and audits its reference for download', async () => {
    const { service, audit } = setup();

    await service.printBatchRoster(roster, 'pdf');

    expect(print).toHaveBeenCalledTimes(1);
    expect(audit.recordInBackground).toHaveBeenCalledWith({
      action: 'download',
      documentKind: 'batch-roster',
      reference: 'RST-BMOR',
      format: 'pdf',
    });
  });

  it('prepares a profile sheet and audits its reference for print', async () => {
    const { service, audit } = setup();

    await service.printProfileSheet(profileSheet, 'print');

    expect(print).toHaveBeenCalledTimes(1);
    expect(audit.recordInBackground).toHaveBeenCalledWith({
      action: 'print',
      documentKind: 'profile-sheet',
      reference: 'PRF-STU-TCA1001',
      format: 'print',
    });
  });

  it('prints the previewed document and clears the preview', async () => {
    const { service } = setup();
    await service.printReceipt(receipt, 'preview');

    await service.printPreviewed('print');

    expect(print).toHaveBeenCalledTimes(1);
    expect(service.preview()).toBeNull();
    expect(service.document()).toBeNull();
  });

  it('reuses the print pipeline for Save as PDF and explains the dialog', async () => {
    const { service, toast } = setup();
    await service.printReceipt(receipt, 'preview');

    await service.printPreviewed('pdf');

    expect(print).toHaveBeenCalledTimes(1);
    expect(toast.info).toHaveBeenCalledWith(
      'Choose “Save as PDF” in the browser print dialog to download this document.',
    );
  });

  it('clears the preview without printing when dismissed', async () => {
    const { service } = setup();
    await service.printReceipt(receipt, 'preview');

    service.closePreview();

    expect(service.preview()).toBeNull();
    expect(print).not.toHaveBeenCalled();
  });

  it('ignores print from an empty preview', async () => {
    const { service } = setup();

    await service.printPreviewed('print');

    expect(print).not.toHaveBeenCalled();
  });

  it('records a print event after the browser dialog closes', async () => {
    const { service, audit } = setup();

    await service.printReceipt(receipt, 'print');

    expect(audit.recordInBackground).toHaveBeenCalledWith({
      action: 'print',
      documentKind: 'receipt',
      reference: 'RCP-42',
      format: 'print',
    });
  });

  it('records a PDF event as a download', async () => {
    const { service, audit } = setup();

    await service.printReceipt(receipt, 'pdf');

    expect(audit.recordInBackground).toHaveBeenCalledWith({
      action: 'download',
      documentKind: 'receipt',
      reference: 'RCP-42',
      format: 'pdf',
    });
  });

  it('applies the remembered paper setup for the print run and cleans it up', async () => {
    const { service, pageSetup } = setup();
    pageSetup.save('receipt', { size: 'a4', orientation: 'landscape' });
    let ruleAtPrint = '';
    print.mockImplementation(() => {
      ruleAtPrint =
        globalThis.document.getElementById('academy-print-page-setup-style')?.textContent ?? '';
    });

    await service.printReceipt(receipt, 'print');

    expect(ruleAtPrint).toContain('@page receipt-page { size: 297mm 210mm; margin: 8mm; }');
    expect(globalThis.document.getElementById('academy-print-page-setup-style')).toBeNull();
  });

  it('suggests a stable file name while the print dialog is open', async () => {
    const originalTitle = globalThis.document.title;
    let titleAtPrint = '';
    print.mockImplementation(() => {
      titleAtPrint = globalThis.document.title;
    });
    const { service } = setup();

    await service.printReceipt(receipt, 'pdf');

    expect(titleAtPrint).toBe('Receipt-RCP-42');
    expect(globalThis.document.title).toBe(originalTitle);
  });

  it('builds readable file names for every document kind', () => {
    expect(
      printFileName({
        ...receipt,
        kind: 'receipt',
        brand,
      }),
    ).toBe('Receipt-RCP-42');
    expect(
      printFileName({
        kind: 'batch-roster',
        brand,
        ...roster,
      }),
    ).toBe('Batch-roster-RST-BMOR');
    expect(
      printFileName({
        kind: 'profile-sheet',
        brand,
        ...profileSheet,
      }),
    ).toBe('Profile-PRF-STU-TCA1001');
    expect(
      printFileName({
        kind: 'id-card',
        brand,
        ...idCard,
        qrDataUrl: '',
        qrPayload: 'TCA:s1',
      }),
    ).toBe('ID-card-ID-STU-TCA1001');
    expect(
      printFileName({
        kind: 'table',
        brand,
        generatedAt: '2026-11-11T00:00:00Z',
        title: 'Payments',
        columns: [],
        rows: [],
        reference: 'payments/2026-11',
      }),
    ).toBe('Report-payments-2026-11');
  });

  it('opens the preview shell while branding is still loading', async () => {
    const { service, brandService } = setup();
    let finish!: (value: typeof brand) => void;
    brandService.load.mockReturnValueOnce(
      new Promise<typeof brand>((resolve) => {
        finish = resolve;
      }),
    );

    const preparing = service.printReceipt(receipt, 'preview');

    expect(service.previewOpen()).toBe(true);
    expect(service.preparing()).toBe(true);
    expect(service.preview()).toBeNull();

    finish(brand);
    await preparing;

    expect(service.preparing()).toBe(false);
    expect(service.preview()).toMatchObject({ kind: 'receipt', receiptNumber: 'RCP-42' });
  });

  it('shows a preparation error in the preview and retries on request', async () => {
    const { service, brandService, toast } = setup();
    brandService.load.mockRejectedValueOnce(new Error('Academy settings unavailable'));

    await expect(service.printReceipt(receipt, 'preview')).rejects.toThrow(
      'Academy settings unavailable',
    );

    expect(service.previewOpen()).toBe(true);
    expect(service.preparing()).toBe(false);
    expect(service.error()).toBe('Academy settings unavailable');
    expect(toast.error).toHaveBeenCalledWith('Academy settings unavailable');

    await service.retryPreview();

    expect(service.error()).toBe('');
    expect(service.preview()).toMatchObject({ kind: 'receipt', receiptNumber: 'RCP-42' });
  });

  it('clears a failed preview without leaving a stale retry action', async () => {
    const { service, brandService } = setup();
    brandService.load.mockRejectedValueOnce(new Error('No connection'));
    await expect(service.printReceipt(receipt, 'preview')).rejects.toThrow('No connection');

    service.closePreview();
    expect(service.previewOpen()).toBe(false);
    expect(service.error()).toBe('');

    brandService.load.mockClear();
    await service.retryPreview();
    expect(brandService.load).not.toHaveBeenCalled();
  });
});
