import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { FeesService } from '../../core/supabase/domain-services';
import { ServerListService } from '../../core/supabase/server-list.service';
import { FeeOperationsPage } from './fee-operations-page';

function listPage(rows: unknown[] = [], total = rows.length, page = 1, balance = 0) {
  return {
    rows, total, page,
    metrics: {},
    options: {},
    totals: { count: total, base: 0, discount: 0, late: 0, final: 0, paid: 0, balance },
  };
}

function setup(view: string) {
  const api = {
    charges: vi.fn().mockResolvedValue([]),
    discounts: vi.fn().mockResolvedValue([]),
    lateFeeRules: vi.fn().mockResolvedValue([]),
    saveDiscount: vi.fn().mockResolvedValue({}),
    saveLateFeeRule: vi.fn().mockResolvedValue({}),
  };
  const lists = { page: vi.fn().mockResolvedValue(listPage()) };
  TestBed.configureTestingModule({
    imports: [FeeOperationsPage],
    providers: [
      provideRouter([]),
      { provide: FeesService, useValue: api },
      { provide: ServerListService, useValue: lists },
      { provide: ActivatedRoute, useValue: { snapshot: { data: { feeView: view } } } },
    ],
  });
  const fixture = TestBed.createComponent(FeeOperationsPage);
  return { component: fixture.componentInstance, api, lists, fixture };
}

describe('Fee operations', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('requests paged search results and uses server totals', async () => {
    const { component, lists, fixture } = setup('summary');
    const records = Array.from({ length: 23 }, (_, i) => ({
        id: String(i),
        student: { full_name: i === 22 ? 'Asha' : 'Ravi' },
        charge_month: '2026-09-01',
        status: 'partial',
        final_amount: 100,
        paid_amount: 25,
        balance_amount: 75,
      }));
    lists.page.mockResolvedValueOnce(listPage(records.slice(0, 5), 23, 1, 172500));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(5);
    lists.page.mockResolvedValueOnce(listPage(records.slice(20), 23, 5, 172500));
    component['changePage'](5);
    await fixture.whenStable();
    expect(component['visibleRows']().length).toBe(3);
    expect(component['totals']().balance).toBe(172500);
    lists.page.mockResolvedValueOnce(listPage([records[22]], 1, 1, 7500));
    component['query'].set('asha');
    component['filterChanged']();
    await fixture.whenStable();
    expect(component['totals']().count).toBe(1);
    expect(component['totals']().balance).toBe(7500);
    lists.page.mockResolvedValueOnce(listPage([], 0, 1, 0));
    component['month'].set('2026-08');
    component['filterChanged']();
    await fixture.whenStable();
    expect(component['visibleRows']()).toEqual([]);
  });

  it('loads the pending fee page from the server', async () => {
    const { component, lists } = setup('pending');
    lists.page.mockResolvedValue(listPage([
      { id: '1', status: 'pending', balance_amount: 0 },
      { id: '3', status: 'partial', balance_amount: 50 },
    ]));
    await component.ngOnInit();
    expect(lists.page).toHaveBeenCalledWith('pending', 1, expect.any(Number), expect.any(Object));
    expect(component['rows']().map((row) => row.id)).toEqual(['1', '3']);
  });

  it('rejects invalid discounts and shows server errors inside the dialog', async () => {
    const { component, api, fixture } = setup('discounts');
    fixture.detectChanges();
    await fixture.whenStable();
    component['open']();
    component['form'].patchValue({ name: 'Discount', kind: 'percentage', value: 101 });
    await component['save']();
    expect(api.saveDiscount).not.toHaveBeenCalled();
    component['form'].patchValue({ value: 10, validFrom: '2026-09-10', validTill: '2026-09-01' });
    await component['save']();
    expect(api.saveDiscount).not.toHaveBeenCalled();
    component['form'].patchValue({ validTill: '2026-09-30' });
    api.saveDiscount.mockRejectedValueOnce(new Error('Save failed'));
    await component['save']();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[role="dialog"] [role="alert"]').textContent,
    ).toContain('Save failed');
    component['saving'].set(true);
    component['close']();
    expect(component['dialogOpen']()).toBe(true);
  });
});
