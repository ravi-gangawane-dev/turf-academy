import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BatchesService, EnrollmentsService, ReportsService } from '../../core/supabase/domain-services';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import { ReportsPage } from './reports-page';
import { reportToCsv } from './report-csv';

function setup(reportScope = '') {
  const reports = {
    attendance: vi.fn().mockResolvedValue([]),
    coaches: vi.fn().mockResolvedValue([]),
    collections: vi.fn().mockResolvedValue([
      { id: 'p1', paid_at: '2026-09-01', student: { full_name: 'Partial refund' }, amount: 1000.55, refunded_amount: 200.35, net_amount: 800.2 },
      { id: 'p2', paid_at: '2026-09-30', student: { full_name: 'Full refund' }, amount: 42.1, refunded_amount: 42.1, net_amount: 0 },
    ]),
    charges: vi.fn().mockResolvedValue([{ student: { full_name: 'Fee student' }, charge_month: '2026-09-01', final_amount: 1000, paid_amount: 800, balance_amount: 200, status: 'partial' }]),
  };
  const batches = { list: vi.fn().mockResolvedValue([
    { id: 'batch-a', name: 'Morning', status: 'active' },
    { id: 'batch-b', name: 'Evening', status: 'active' },
  ]) };
  const enrollments = { list: vi.fn().mockResolvedValue([
    { batch_id: 'batch-a', valid_from: '2026-09-01', status: 'active', student: { full_name: 'Morning student' } },
    { batch_id: 'batch-b', valid_from: '2026-09-01', status: 'active', student: { full_name: 'Evening student' } },
  ]) };
  const preferences = { load: vi.fn().mockResolvedValue(undefined), money: (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'USD' }).format(amount) };
  TestBed.configureTestingModule({ imports: [ReportsPage], providers: [
    provideRouter([]), { provide: ReportsService, useValue: reports },
    { provide: ActivatedRoute, useValue: { snapshot: { data: { reportScope } } } },
    { provide: BatchesService, useValue: batches },
    { provide: EnrollmentsService, useValue: enrollments },
    { provide: AcademyPreferencesService, useValue: preferences },
  ] });
  const component = TestBed.createComponent(ReportsPage).componentInstance;
  component['form'].setValue({ type: 'revenue', period: 'custom', from: '2026-09-01', to: '2026-09-30', batchId: 'batch-a' });
  return { component, reports, preferences };
}
describe('Report money and filters', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('renders and exports gross, refunded and net amounts using the academy currency', async () => {
    const { component, reports, preferences } = setup();
    await component['generate']();
    expect(preferences.load).toHaveBeenCalled();
    expect(reports.collections).toHaveBeenCalledWith('2026-09-01', '2026-09-30', 'batch-a');
    const result = component['report']()!;
    expect(result.summary).toContainEqual({ label: 'Net collected', value: '$800.20' });
    expect(result.summary).toContainEqual({ label: 'Refunded', value: '$242.45' });
    expect(result.rows[1]?.['amount']).toBe('$0.00');
    expect(reportToCsv(result)).toContain('"$800.20"');
    expect(reportToCsv(result)).not.toContain('₹');
  });
  it('builds chart bars from formatted currency columns', async () => {
    const { component } = setup();
    await component['generate']();
    expect(component['chartColumns'].map(column => column.key)).toEqual([
      'gross',
      'refunded',
      'amount',
    ]);
    expect(component['chartBars'].map(bar => bar.value)).toEqual([1000.55, 42.1]);
    expect(component['chartBars'][0]?.height).toBe(100);
  });
  it('groups fee chart values by payment status to keep charts readable', async () => {
    const { component, reports } = setup();
    reports.charges.mockResolvedValue([
      { student: { full_name: 'Student A' }, charge_month: '2026-09-01', final_amount: 1000, paid_amount: 800, balance_amount: 200, status: 'partial' },
      { student: { full_name: 'Student B' }, charge_month: '2026-09-01', final_amount: 1500, paid_amount: 1500, balance_amount: 0, status: 'paid' },
      { student: { full_name: 'Student C' }, charge_month: '2026-09-01', final_amount: 500, paid_amount: 400, balance_amount: 100, status: 'partial' },
    ]);
    component['form'].patchValue({ type: 'fees' });
    await component['generate']();
    expect(component['selectedChartGroup']?.key).toBe('status');
    expect(component['chartBars'].map(bar => [bar.label, bar.value])).toEqual([
      ['partial', 1500],
      ['paid', 1500],
    ]);
    component['chartGroup'].set('');
    expect(component['chartBars']).toHaveLength(3);
  });
  it('supports line, multi-line, and pie visualizations', async () => {
    const { component } = setup();
    await component['generate']();
    component['chartType'].set('line');
    expect(component['chartSeries']).toHaveLength(1);
    expect(component['chartSeries'][0]?.points).toContain(',');
    component['chartType'].set('multiline');
    expect(component['chartSeries']).toHaveLength(3);
    component['chartType'].set('pie');
    expect(component['pieSegments']).toHaveLength(2);
    expect(component['pieSegments'].reduce((sum, segment) => sum + segment.percent, 0)).toBeCloseTo(100);
    expect(component['pieGradient']).toContain('conic-gradient(');
  });
  it('uses category counts for reports without numeric columns', async () => {
    const { component, reports } = setup();
    reports.attendance.mockResolvedValue([
      { attendance_date: '2026-09-02', status: 'present' },
      { attendance_date: '2026-09-03', status: 'checked_out' },
      { attendance_date: '2026-09-04', status: 'late' },
      { attendance_date: '2026-09-05', status: 'absent' },
    ]);
    component['form'].patchValue({ type: 'attendance' });
    await component['generate']();
    expect(component['report']()!.summary).toEqual([
      { label: 'Records', value: '4' },
      { label: 'Present', value: '2' },
      { label: 'Absent', value: '1' },
      { label: 'Late', value: '1' },
    ]);
    expect(component['chartColumns']).toEqual([{ key: '__count', label: 'Record count' }]);
    expect(component['chartBars'].map(bar => [bar.label, bar.value])).toEqual([
      ['present', 1],
      ['checked_out', 1],
      ['late', 1],
      ['absent', 1],
    ]);
  });
  it('generates Batch report from the Reports dropdown as well as its dedicated route', async () => {
    const { component } = setup();
    component['form'].patchValue({ type: 'batch', batchId: '' });
    await component['generate']();
    expect(component['report']()!.title).toBe('Batch report');
    expect(component['chartColumns'].map(column => column.key)).toEqual([
      'capacity',
      'coaches',
    ]);
  });
  it('passes the selected batch and month range for fees and pending balances', async () => {
    const { component, reports } = setup();
    for (const type of ['fees', 'pending'] as const) {
      component['form'].patchValue({ type });
      await component['generate']();
      expect(reports.charges).toHaveBeenLastCalledWith('2026-09-01', '2026-09-30', 'batch-a', type === 'pending');
      expect(component['report']()!.summary).toContainEqual({ label: 'Outstanding', value: '$200.00' });
    }
  });
  it('does not display an old or default-currency report after a settings/read failure', async () => {
    const { component, preferences, reports } = setup();
    await component['generate']();
    preferences.load.mockRejectedValueOnce(new Error('Settings unavailable'));
    await component['generate']();
    expect(component['report']()).toBeNull();
    expect(component['error']()).toBe('Settings unavailable');
    expect(reports.collections).toHaveBeenCalledTimes(1);
  });

  it('applies batch selection to attendance and enrollment and supports all batches', async () => {
    const { component, reports } = setup();
    component['form'].patchValue({ type: 'attendance' });
    await component['generate']();
    expect(reports.attendance).toHaveBeenLastCalledWith('2026-09-01', '2026-09-30', 'batch-a');
    component['form'].patchValue({ type: 'enrollment' });
    await component['generate']();
    expect(component['report']()!.rows.map(row => row['student'])).toEqual(['Morning student']);
    component['form'].patchValue({ batchId: '' });
    await component['generate']();
    expect(component['report']()!.rows).toHaveLength(2);
    for (const type of ['attendance', 'fees', 'pending', 'revenue'] as const) {
      component['form'].patchValue({ type });
      await component['generate']();
      if (type === 'attendance') expect(reports.attendance).toHaveBeenLastCalledWith('2026-09-01', '2026-09-30', undefined);
      else if (type === 'revenue') expect(reports.collections).toHaveBeenLastCalledWith('2026-09-01', '2026-09-30', undefined);
      else expect(reports.charges).toHaveBeenLastCalledWith('2026-09-01', '2026-09-30', undefined, type === 'pending');
    }
  });

  it('preserves the Batch report and applies its selected batch when generated again', async () => {
    const { component, reports } = setup('batch');
    await component.ngOnInit();
    expect(component['form'].controls.from.disabled).toBe(true);
    expect(component['form'].controls.to.disabled).toBe(true);
    expect(component['report']()!.title).toBe('Batch report');
    expect(component['report']()!.rows.map(row => row['name'])).toEqual(['Morning']);
    component['form'].patchValue({ batchId: 'batch-b' });
    await component['generate']();
    expect(component['report']()!.rows.map(row => row['name'])).toEqual(['Evening']);
    component['form'].patchValue({ batchId: '' });
    await component['generate']();
    expect(component['report']()!.rows).toHaveLength(2);
    expect(reports.attendance).not.toHaveBeenCalled();
    expect(reports.collections).not.toHaveBeenCalled();
  });

  it('disables unsupported batch filtering and preserves Coach report date filtering', async () => {
    const { component, reports } = setup('coach');
    await component.ngOnInit();
    expect(component['form'].controls.batchId.disabled).toBe(true);
    expect(component['report']()!.title).toBe('Coach performance report');
    component['form'].patchValue({ from: '2026-08-01' });
    await component['generate']();
    expect(reports.coaches).toHaveBeenLastCalledWith('2026-08-01', '2026-09-30');
    expect(reports.attendance).not.toHaveBeenCalled();
    expect(reports.collections).not.toHaveBeenCalled();
  });

  it('uses the updated academy currency on subsequent reports and exports', async () => {
    const { component, preferences } = setup();
    await component['generate']();
    preferences.money = amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'EUR' }).format(amount);
    for (const type of ['fees', 'pending', 'revenue'] as const) {
      component['form'].patchValue({ type });
      await component['generate']();
      const result = component['report']()!;
      expect(result.summary.some(item => item.value.includes('€'))).toBe(true);
      expect(reportToCsv(result)).toContain('€');
      expect(reportToCsv(result)).not.toContain('$');
    }
  });
});
