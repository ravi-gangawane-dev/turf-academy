import { TestBed } from '@angular/core/testing';
import { EnrollmentMetrics, EnrollmentMetricsModel } from './enrollment-metrics';

describe('EnrollmentMetrics', () => {
  afterEach(() => TestBed.resetTestingModule());

  const render = (metrics: Partial<EnrollmentMetricsModel>) => {
    const fixture = TestBed.createComponent(EnrollmentMetrics);
    fixture.componentRef.setInput('metrics', {
      total: 0,
      active: 0,
      paused: 0,
      cancelled: 0,
      expiring: 0,
      ...metrics,
    });
    fixture.detectChanges();
    return fixture;
  };

  it('renders one card per enrollment metric', () => {
    const fixture = render({ total: 10, active: 5, paused: 2, cancelled: 1, expiring: 2 });
    const cards = fixture.nativeElement.querySelectorAll('app-summary-metric-card');
    expect(cards.length).toBe(5);
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Total Enrollments');
    expect(text).toContain('Active Enrollments');
    expect(text).toContain('Paused Enrollments');
    expect(text).toContain('Cancelled Enrollments');
    expect(text).toContain('Expiring Soon');
  });

  it('shows each status as a share of the total', () => {
    const fixture = render({ total: 10, active: 5, paused: 2, cancelled: 1, expiring: 2 });
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('50.0% of total');
    expect(text).toContain('20.0% of total');
    expect(text).toContain('10.0% of total');
  });

  it('never divides by zero when the academy has no enrollments', () => {
    const fixture = render({});
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('0% of total');
    expect(text).not.toContain('NaN');
  });

  it('describes the expiring window instead of a percentage', () => {
    const fixture = render({ total: 4, expiring: 1 });
    expect(fixture.nativeElement.textContent).toContain('Next 30 days');
  });
});
