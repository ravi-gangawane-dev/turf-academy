import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  PrintDocument,
  PrintIdCardDocument,
  PrintInvoiceDocument,
  PrintReceiptDocument,
} from '../print-document.models';
import { PrintDocumentService } from '../print-document.service';
import { PrintPreview } from './print-preview';

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
  holderType: 'coach',
  holderId: 'c1',
  fullName: 'Coach Rao',
  holderCode: 'EMP-42',
  subtitle: 'Batting',
  photoUrl: null,
  qrPayload: 'TCA:coach:c1',
  qrDataUrl: 'data:image/png;base64,AAAA',
  details: [{ label: 'Phone', value: '+91 98765 43210' }],
  validityNote: 'Valid while employed at the academy',
};

function setup(
  document: PrintDocument | null = receipt,
  options: { open?: boolean; preparing?: boolean; error?: string } = {},
) {
  const service = {
    preview: signal<PrintDocument | null>(document),
    previewOpen: signal(options.open ?? document !== null),
    preparing: signal(options.preparing ?? false),
    error: signal(options.error ?? ''),
    closePreview: vi.fn(),
    printPreviewed: vi.fn().mockResolvedValue(undefined),
    retryPreview: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    imports: [PrintPreview],
    providers: [{ provide: PrintDocumentService, useValue: service }],
  });
  const fixture = TestBed.createComponent(PrintPreview);
  fixture.detectChanges();
  return { fixture, service };
}

describe('PrintPreview', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('shows the prepared document at paper size with its actions', () => {
    const { fixture } = setup();
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';

    expect(element.querySelector('.preview-panel')).toBeTruthy();
    expect(text).toContain('Print preview · A5');
    expect(text).toContain('Payment receipt');
    expect(element.querySelector('.print-sheet--receipt')).toBeTruthy();
    expect(element.querySelector('.preview-paper--a5')).toBeTruthy();
    expect(element.querySelector('.preview-paper')?.getAttribute('data-kind')).toBe('receipt');
    expect(
      [...element.querySelectorAll('.preview-actions button')].map((button) =>
        (button.textContent ?? '').trim(),
      ),
    ).toEqual(['Close', 'Download PDF', 'Print']);
  });

  it('switches to A4 for a full-page document', () => {
    const { fixture } = setup(invoice);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Print preview · A4');
    expect(element.textContent).toContain('Fee invoice');
    expect(element.querySelector('.preview-paper--a5')).toBeNull();
    expect(element.querySelector('.print-sheet--invoice')).toBeTruthy();
  });

  it('labels coach ID cards and previews the A4 duplex sheet', () => {
    const { fixture } = setup(idCard);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Print preview · A4');
    expect(element.textContent).toContain('Coach ID card');
    expect(element.querySelector('.preview-paper')?.getAttribute('data-kind')).toBe('id-card');
    expect(element.querySelector('.print-sheet--id-card')).toBeTruthy();
    expect(element.querySelectorAll('.id-card-sheet')).toHaveLength(2);
  });

  it('prints and saves the previewed document through the shared service', async () => {
    const { fixture, service } = setup();
    const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '.preview-actions button',
    )];

    buttons[2].click();
    await fixture.whenStable();
    expect(service.printPreviewed).toHaveBeenCalledWith('print');

    buttons[1].click();
    await fixture.whenStable();
    expect(service.printPreviewed).toHaveBeenCalledWith('pdf');

    buttons[0].click();
    expect(service.closePreview).toHaveBeenCalled();
  });

  it('renders nothing when no document is queued', () => {
    const { fixture } = setup(null);
    expect((fixture.nativeElement as HTMLElement).querySelector('.preview-panel')).toBeNull();
  });

  it('shows a loading state and disables print actions while preparing', () => {
    const { fixture } = setup(null, { open: true, preparing: true });
    const element = fixture.nativeElement as HTMLElement;
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('.preview-actions button')];

    expect(element.textContent).toContain('Preparing document…');
    expect(element.querySelector('.preview-paper')).toBeNull();
    expect(buttons.find((button) => button.textContent?.includes('Print'))?.disabled).toBe(true);
    expect(buttons.find((button) => button.textContent?.includes('Download PDF'))?.disabled).toBe(
      true,
    );
    expect(buttons.find((button) => button.textContent?.includes('Close'))?.disabled).toBe(false);
  });

  it('shows the preparation error and retries the same document', async () => {
    const { fixture, service } = setup(null, {
      open: true,
      error: 'Academy settings unavailable',
    });
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.preview-state--error')?.textContent).toContain(
      'Academy settings unavailable',
    );
    const retry = [...element.querySelectorAll<HTMLButtonElement>('.preview-state button')].find(
      (button) => button.textContent?.includes('Try again'),
    );
    retry?.click();
    await fixture.whenStable();

    expect(service.retryPreview).toHaveBeenCalledOnce();
    expect(
      [...element.querySelectorAll<HTMLButtonElement>('.preview-actions button')].find((button) =>
        button.textContent?.includes('Print'),
      )?.disabled,
    ).toBe(true);
  });
});
