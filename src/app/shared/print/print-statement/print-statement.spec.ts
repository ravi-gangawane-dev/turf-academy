import { TestBed } from '@angular/core/testing';
import { PrintStatementDocument } from '../print-document.models';
import { PrintStatement } from './print-statement';

const statement: PrintStatementDocument = {
  kind: 'statement',
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
  statementNumber: 'FES-TCA1001-20260401-20260430',
  issuedAt: '2026-05-01T00:00:00Z',
  fromDate: '2026-04-01',
  toDate: '2026-04-30',
  studentName: 'Aarav Sharma',
  studentCode: 'TCA-1001',
  batchName: 'Morning Elite',
  openingBalance: 1000,
  closingBalance: 1500,
  totalCharges: 2500,
  totalPayments: 2500,
  totalRefunds: 500,
  lines: [
    {
      date: '2026-04-05',
      type: 'charge',
      description: 'Monthly fee — April 2026 · Morning Elite',
      reference: 'INV-C2',
      debit: 2500,
      credit: 0,
      balance: 3500,
    },
    {
      date: '2026-04-10T10:30:00+05:30',
      type: 'payment',
      description: 'Payment received — UPI',
      reference: 'RCP-2',
      debit: 0,
      credit: 2500,
      balance: 1000,
    },
    {
      date: '2026-04-15T10:30:00+05:30',
      type: 'refund',
      description: 'Refund — Session cancelled',
      reference: 'REF-R1',
      debit: 500,
      credit: 0,
      balance: 1500,
    },
  ],
  ageing: [
    { label: 'Not due', amount: 0 },
    { label: '1–30 days', amount: 0 },
    { label: '31–60 days', amount: 0 },
    { label: '61–90 days', amount: 0 },
    { label: 'Over 90 days', amount: 3500 },
  ],
};

describe('PrintStatement', () => {
  const render = async (document: PrintStatementDocument) => {
    await TestBed.configureTestingModule({ imports: [PrintStatement] }).compileComponents();
    const fixture = TestBed.createComponent(PrintStatement);
    fixture.componentRef.setInput('statement', document);
    fixture.detectChanges();
    return fixture;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('renders the opening balance, ledger, totals and ageing', async () => {
    const fixture = await render(statement);
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Turf Cricket Academy');
    expect(text).toContain('FES-TCA1001-20260401-20260430');
    expect(text).toContain('Aarav Sharma');
    expect(text).toContain('TCA-1001');
    expect(text).toContain('Opening balance');
    expect(text).toContain('₹1,000.00');
    expect(text).toContain('Monthly fee — April 2026 · Morning Elite');
    expect(text).toContain('RCP-2');
    expect(text).toContain('Session cancelled');
    expect(text).toContain('Closing balance');
    expect(text).toContain('₹1,500.00');
    expect(text).toContain('Outstanding ageing');
    expect(text).toContain('Over 90 days');
    expect(text).toContain('₹3,500.00');
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(
      'https://cdn.example/logo.png',
    );
  });

  it('hides empty ageing and explains an empty period', async () => {
    const fixture = await render({
      ...statement,
      openingBalance: 0,
      closingBalance: 0,
      totalCharges: 0,
      totalPayments: 0,
      totalRefunds: 0,
      lines: [],
      ageing: statement.ageing.map((bucket) => ({ ...bucket, amount: 0 })),
    });
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('No fee activity in this period.');
    expect(fixture.nativeElement.querySelector('.ageing-table')).toBeNull();
  });

  it('splits a long ledger into explicit pages with footers and repeated letterhead', async () => {
    const lines = Array.from({ length: 13 }, (_, index) => ({
      date: '2026-04-05',
      type: 'charge' as const,
      description: `Monthly charge ${index + 1}`,
      reference: `INV-${index + 1}`,
      debit: 2500,
      credit: 0,
      balance: 3500,
    }));
    const fixture = await render({ ...statement, lines });
    const element = fixture.nativeElement as HTMLElement;
    const pages = [...element.querySelectorAll('.print-page')] as HTMLElement[];

    expect(pages).toHaveLength(2);
    expect(element.querySelectorAll('.letterhead')).toHaveLength(2);
    expect(
      [...element.querySelectorAll('.print-page-footer-page')].map((node) =>
        (node.textContent ?? '').trim(),
      ),
    ).toEqual(['Page 1 of 2', 'Page 2 of 2']);
    expect(pages[0].textContent).toContain('Account summary');
    expect(pages[0].textContent).toContain('Monthly charge 12');
    expect(pages[0].textContent).not.toContain('Monthly charge 13');
    expect(pages[1].textContent).not.toContain('Account summary');
    expect(pages[1].textContent).toContain('Monthly charge 13');
    expect(pages[1].textContent).toContain('Outstanding ageing');
    expect(element.querySelectorAll('.statement-table tbody tr')).toHaveLength(13);
  });
});
