import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { AcademyFacade } from '../../core/state/academy.facade';
import { ModulePage } from './module-page';

const payments = [
  {
    id: 'p1',
    chargeId: 'c1',
    studentId: 's1',
    amountPaise: 250000,
    mode: 'cash' as const,
    paidAt: '2026-10-01',
    receiptNumber: 'R-1',
  },
  {
    id: 'p2',
    chargeId: 'c2',
    studentId: 's2',
    amountPaise: 100000,
    mode: 'upi' as const,
    paidAt: '2026-10-02',
    receiptNumber: 'R-2',
  },
];

const feeRows = [
  { id: 'c1', studentName: 'Aarav', period: '2026-10', amountPaise: 300000, balancePaise: 50000, status: 'Partial' },
  { id: 'c2', studentName: 'Diya', period: '2026-10', amountPaise: 300000, balancePaise: 200000, status: 'Overdue' },
  { id: 'c3', studentName: 'Ishaan', period: '2026-10', amountPaise: 300000, balancePaise: 0, status: 'Paid' },
];

function setup(data: Record<string, string>) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { data } } },
      {
        provide: AcademyFacade,
        useValue: {
          payments: () => payments,
          feeRows: () => feeRows,
          notifications: () => [],
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(ModulePage);
  fixture.detectChanges();
  return fixture;
}

describe('ModulePage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const fixture = setup({ section: 'Payments', title: 'Payments' });
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('uses the route data for the title and description', () => {
    const fixture = setup({
      section: 'Payments',
      title: 'Payments',
      description: 'Track every receipt.',
    });
    const page = fixture.componentInstance;
    expect(page['title']).toBe('Payments');
    expect(page['description']).toBe('Track every receipt.');
    expect(fixture.nativeElement.textContent).toContain('Track every receipt.');
  });

  it('summarises collected, outstanding, transaction and overdue counts', () => {
    const fixture = setup({ section: 'Payments', title: 'Payments' });
    const metrics = fixture.componentInstance['paymentMetrics']();
    expect(metrics.collected).toBe(350000);
    expect(metrics.outstanding).toBe(250000);
    expect(metrics.transactions).toBe(2);
    expect(metrics.overdue).toBe(1);
  });

  it('lists the payment transactions with their receipt numbers', () => {
    const fixture = setup({ section: 'Payments', title: 'Payments' });
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('R-1');
    expect(fixture.nativeElement.textContent).toContain('R-2');
  });

  it('lists fee charges instead of payments for the fees section', () => {
    const fixture = setup({ section: 'Fees', title: 'Monthly Charges' });
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Aarav');
  });

  it('explains that a screen without a backend endpoint is not yet actionable', () => {
    const fixture = setup({ section: 'Misc', title: 'Misc' });
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Screen ready for integration');
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
  });
});
