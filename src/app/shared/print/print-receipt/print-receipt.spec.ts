import { TestBed } from '@angular/core/testing';
import { PrintReceiptDocument } from '../print-document.models';
import { PrintReceipt } from './print-receipt';

const receipt: PrintReceiptDocument = {
  kind: 'receipt',
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
  receiptNumber: 'RCP-42',
  studentName: 'Aarav Sharma',
  studentCode: 'TCA-1001',
  guardianName: 'Neha Sharma',
  amount: 1250.5,
  paymentMode: 'upi',
  paidAt: '2026-10-05T09:15:00Z',
  reference: 'UPI-7788',
  status: 'successful',
  period: 'October 2026',
  batchName: 'Morning Elite',
};

describe('PrintReceipt', () => {
  const render = async (document: PrintReceiptDocument) => {
    await TestBed.configureTestingModule({ imports: [PrintReceipt] }).compileComponents();
    const fixture = TestBed.createComponent(PrintReceipt);
    fixture.componentRef.setInput('receipt', document);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders the branded A5 receipt with payer, amount and words', async () => {
    const fixture = await render(receipt);
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Turf Cricket Academy');
    expect(text).toContain('RCP-42');
    expect(text).toContain('Neha Sharma');
    expect(text).toContain('Aarav Sharma');
    expect(text).toContain('TCA-1001');
    expect(text).toContain('October 2026');
    expect(text).toContain('UPI-7788');
    expect(text).toContain('Paid');
    expect(text).toContain(
      'One thousand two hundred fifty rupees and fifty paise only',
    );
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      'https://cdn.example/logo.png',
    );
  });

  it('falls back to the student name when no guardian is recorded', async () => {
    const fixture = await render({ ...receipt, guardianName: undefined });
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Aarav Sharma');
  });
});
