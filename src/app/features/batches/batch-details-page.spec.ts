import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BatchDetailsPage } from './batch-details-page';
import { BatchWorkspaceService } from '../../core/supabase/batch-workspace.service';

describe('BatchDetailsPage', () => {
  it('loads the selected batch, roster counts, coaches, waitlist and activity', async () => {
    const batch = { id: 'b1', code: 'B1', name: 'Morning', age_group: null, skill_level: null, capacity: 10, waitlist_capacity: 2, start_date: null, end_date: null, start_time: '06:00:00', end_time: '08:00:00', fee_plan_id: null, status: 'active', description: null, batch_days: [], batch_coaches: [{ coach_id: 'c1', is_primary: true }] };
    const api = { load: vi.fn().mockResolvedValue({ batches: [batch], coaches: [{ id: 'c1', full_name: 'Coach One', status: 'active' }], students: [{ id: 's1', full_name: 'Student One', student_code: 'S1' }], plans: [], enrollments: [{ id: 'e1', student_id: 's1', batch_id: 'b1', status: 'active' }], waiting: [{ id: 'w1', batch_id: 'b1', student_id: 's2', status: 'waiting' }] }), activity: vi.fn().mockResolvedValue([{ id: 'a1', event_type: 'created', effective_on: '2026-11-01', reason: null, student_name: 'Student One', created_at: '2026-11-01' }]) };
    TestBed.configureTestingModule({ imports: [BatchDetailsPage], providers: [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'b1' } } } }, { provide: BatchWorkspaceService, useValue: api }] });
    const fixture = TestBed.createComponent(BatchDetailsPage);
    await fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance['batch']()?.id).toBe('b1');
    expect(fixture.componentInstance['activeStudents']()).toHaveLength(1);
    expect(fixture.componentInstance['waitingStudents']()).toHaveLength(1);
    expect(fixture.componentInstance['activity']()).toHaveLength(1);
    expect(api.activity).toHaveBeenCalledWith('b1');
    fixture.detectChanges();
    const manageLinks = ['/batches/student-allocation', '/batches/coach-assignment', '/batches/schedule', '/batches/capacity'];
    for (const tab of ['students', 'coaches', 'schedule', 'capacity'] as const) {
      fixture.componentInstance['activeTab'].set(tab);
      fixture.detectChanges();
      const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a')).map((link) => link.getAttribute('href'));
      expect(links.some(link => link?.includes(manageLinks[['students', 'coaches', 'schedule', 'capacity'].indexOf(tab)]))).toBeTruthy();
    }
  });
});
