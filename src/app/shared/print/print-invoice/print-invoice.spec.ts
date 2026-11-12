import { TestBed } from '@angular/core/testing';
import { PrintInvoiceDocument } from '../print-document.models';
import { PrintInvoice } from './print-invoice';

const invoice: PrintInvoiceDocument = {
  kind: 'invoice',
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
  invoiceNumber: 'INV-001',
  issuedAt: '2026-10-01T00:00:00Z',
  dueDate: '2026-10-10T00:00:00Z',
  studentName: 'Aarav Sharma',
  studentCode: 'TCA-1001',
  batchName: 'Morning Elite',
  enrollmentReference: 'ENR-9',
  period: 'October 2026',
  status: 'partial',
  items: [
    {
      description: 'Monthly coaching fee — Morning Elite',
      reference: 'ENR-9',
      quantity: 1,
      rate: 2500,
      amount: 2500,
    },
  ],
  totals: {
    subtotal: 2500,
    discount: 200,
    lateFee: 100,
    total: 2400,
    paid: 1000,
    balance: 1400,
  },
};

describe('PrintInvoice', () => {
  const render = async (document: PrintInvoiceDocument) => {
    await TestBed.configureTestingModule({ imports: [PrintInvoice] }).compileComponents();
    const fixture = TestBed.createComponent(PrintInvoice);
    fixture.componentRef.setInput('invoice', document);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders branded invoice details, line items and totals', async () => {
    const fixture = await render(invoice);
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Turf Cricket Academy');
    expect(text).toContain('INV-001');
    expect(text).toContain('Aarav Sharma');
    expect(text).toContain('TCA-1001');
    expect(text).toContain('Monthly coaching fee — Morning Elite');
    expect(text).toContain('Partially paid');
    expect(text).toContain('Discounts applied');
    expect(text).toContain('Late fee');
    expect(text).toContain('Balance due');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      'https://cdn.example/logo.png',
    );
  });

  it('omits empty adjustments and paid lines for a fully outstanding invoice', async () => {
    const fixture = await render({
      ...invoice,
      status: 'pending',
      totals: { subtotal: 2500, discount: 0, lateFee: 0, total: 2500, paid: 0, balance: 2500 },
    });
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Pending');
    expect(text).not.toContain('Discounts applied');
    expect(text).not.toContain('Amount paid');
    expect(text).not.toContain('Late fee');
  });
});
