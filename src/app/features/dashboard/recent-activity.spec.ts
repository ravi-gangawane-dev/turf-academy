import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { API_CONFIG } from '../../core/config/api.config';
import { DatabaseService } from '../../core/supabase/database.service';
import { RecentActivity } from './recent-activity';

function setup(role = 'admin', useMockApi = false) {
  const result = vi.fn();
  const query = { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: result };
  const from = vi.fn(() => query);
  TestBed.configureTestingModule({
    imports: [RecentActivity],
    providers: [provideRouter([]),
      { provide: AuthService, useValue: { role: () => role } },
      { provide: API_CONFIG, useValue: { useMockApi } },
      { provide: DatabaseService, useValue: { client: { from } } },
    ],
  });
  const fixture = TestBed.createComponent(RecentActivity);
  return { fixture, result, query, from };
}

describe('Recent activity', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('shows loading then renders the latest recorded actions and timestamps', async () => {
    const { fixture, result, query } = setup();
    let resolve!: (value: unknown) => void;
    result.mockReturnValue(new Promise(r => { resolve = r; }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading recent activity');
    resolve({ data: [{ id: 1, action: 'INSERT', table_name: 'students', occurred_at: '2026-10-12T10:30:00Z' }], error: null });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Student created');
    expect(fixture.nativeElement.querySelector('time').getAttribute('datetime')).toBe('2026-10-12T10:30:00Z');
    expect(query.order.mock.calls).toEqual([['occurred_at', { ascending: false }], ['id', { ascending: false }]]);
    expect(result).toHaveBeenCalledWith(5);
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/settings/audit-logs');
  });

  it('shows an empty state only after a successful empty response', async () => {
    const { fixture, result } = setup();
    result.mockResolvedValue({ data: [], error: null });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No recent activity');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('hides database errors and retries the query successfully', async () => {
    const { fixture, result } = setup();
    result.mockResolvedValueOnce({ data: null, error: { message: 'private database detail' } })
      .mockResolvedValueOnce({ data: [{ id: 2, action: 'REFUND', table_name: 'payments', occurred_at: '2026-10-12T10:30:00Z' }], error: null });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Recent activity could not be loaded');
    expect(fixture.nativeElement.textContent).not.toContain('private database detail');
    const retry = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>).find(button => button.textContent?.includes('Try again'))!;
    retry.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Payment refund recorded');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('does not query audit records for non-admins', async () => {
    const { fixture, from } = setup('coach');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(from).not.toHaveBeenCalled();
  });

  it('does not contact the database in mock mode', async () => {
    const { fixture, from } = setup('admin', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(from).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No recent activity');
  });
});
