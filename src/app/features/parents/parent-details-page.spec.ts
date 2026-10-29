import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ParentDetailsPage } from './parent-details-page';
import { ParentsService, PaymentsService, NotificationsService } from '../../core/supabase/domain-services';
import { StaffDetailsService } from '../../core/supabase/staff-details.service';
import { DatabaseService } from '../../core/supabase/database.service';

function setup() {
  const activity = vi.fn().mockResolvedValue({ rows: [], total: 60 });
  const ledgerPage = vi.fn().mockResolvedValue({ rows: [], total: 60 });
  const page = vi.fn().mockResolvedValue({ rows: [], total: 60 });
  TestBed.configureTestingModule({
    imports: [ParentDetailsPage],
    providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'p1']]) } } },
      { provide: ParentsService, useValue: { getById: async () => ({ id: 'p1', full_name: 'Parent', status: 'active', student_parents: [] }) } },
      { provide: PaymentsService, useValue: { ledgerPage } },
      { provide: NotificationsService, useValue: { page } },
      { provide: StaffDetailsService, useValue: { activity } },
      { provide: DatabaseService, useValue: {} },
    ],
  });
  return { fixture: TestBed.createComponent(ParentDetailsPage), activity, ledgerPage, page };
}

describe('Parent details shared pagination and states', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each(['activity', 'payments', 'notifications'])('changes page size for %s', async tab => {
    const { fixture, activity, ledgerPage, page } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance['selectTab'](tab, 2);
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('app-pagination select');
    expect(select.value).toBe('5');
    select.value = '50';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance['page']()).toBe(1);
    if (tab === 'activity') expect(activity).toHaveBeenLastCalledWith('p1', 1, 50);
    if (tab === 'payments') expect(ledgerPage).toHaveBeenLastCalledWith('list', 1, 50, []);
    if (tab === 'notifications') expect(page).toHaveBeenLastCalledWith(1, 50, undefined, undefined, 'p1');
  });
  it('does not show empty results during loading or after an error', async () => {
    const { fixture, activity } = setup();
    fixture.detectChanges();
    await fixture.whenStable();
    let reject!: (error: Error) => void;
    activity.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    const pending = fixture.componentInstance['selectTab']('activity');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading details');
    expect(fixture.nativeElement.textContent).not.toContain('No activity recorded');
    reject(new Error('Please try again.'));
    await pending;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Please try again.');
    expect(fixture.nativeElement.textContent).not.toContain('No activity recorded');
  });
});
