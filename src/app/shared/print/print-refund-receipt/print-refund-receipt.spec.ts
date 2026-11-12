import { TestBed } from '@angular/core/testing';
import { PrintRefundReceiptDocument } from '../print-document.models';
import { PrintRefundReceipt } from './print-refund-receipt';

const refund: PrintRefundReceiptDocument = {
  kind: 'refund-receipt',
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
  refundReceiptNumber: 'RFR-RCP42-A1B2C3',
  originalReceiptNumber: 'RCP-42',
  studentName: 'Aarav Sharma',
  studentCode: 'TCA-1001',
  guardianName: 'Neha Sharma',
  refundAmount: 750.5,
  originalAmount: 1250.5,
  paymentMode: 'UPI',
  refundedAt: '2026-10-08T11:45:00Z',
  paidAt: '2026-10-05T09:15:00Z',
  reason: 'Session cancelled by coach',
  reference: 'UPI-7788',
  approvedBy: 'Academy Admin',
  batchName: 'Morning Elite',
  period: 'October 2026',
};

describe('PrintRefundReceipt', () => {
  const render = async (document: PrintRefundReceiptDocument) => {
    await TestBed.configureTestingModule({ imports: [PrintRefundReceipt] }).compileComponents();
    const fixture = TestBed.createComponent(PrintRefundReceipt);
    fixture.componentRef.setInput('refund', document);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders the A5 refund receipt with the original receipt and approver', async () => {
    const fixture = await render(refund);
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Turf Cricket Academy');
    expect(text).toContain('Refund Receipt');
    expect(text).toContain('RFR-RCP42-A1B2C3');
    expect(text).toContain('RCP-42');
    expect(text).toContain('Neha Sharma');
    expect(text).toContain('Aarav Sharma');
    expect(text).toContain('TCA-1001');
    expect(text).toContain('₹1,250.50');
    expect(text).toContain('₹750.50');
    expect(text).toContain('UPI');
    expect(text).toContain('UPI-7788');
    expect(text).toContain('Session cancelled by coach');
    expect(text).toContain('Academy Admin');
    expect(text).toContain('October 2026');
    expect(text).toContain('Morning Elite');
    expect(text).toContain('Seven hundred fifty rupees and fifty paise only');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      'https://cdn.example/logo.png',
    );
  });

  it('does not invent a guardian or approver when the API has none', async () => {
    const fixture = await render({ ...refund, guardianName: undefined, approvedBy: undefined });
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Aarav Sharma');
    expect(text).toContain('Approved by');
    expect(text).toContain('—');
  });
});
