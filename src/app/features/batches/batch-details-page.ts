import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BatchActivityRecord, BatchWorkspace, BatchWorkspaceService, WorkspaceBatch } from '../../core/supabase/batch-workspace.service';
import { AsyncState } from '../../shared/async-state/async-state';
import { StatusBadge } from '../../shared/status-badge/status-badge';

type DetailTab = 'overview' | 'students' | 'coaches' | 'schedule' | 'capacity' | 'activity';

@Component({
  selector: 'app-batch-details-page',
  standalone: true,
  imports: [RouterLink, DatePipe, AsyncState, StatusBadge],
  templateUrl:'./batch-details-page.html',
  styleUrl:'./batch-details-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(BatchWorkspaceService);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly batch = signal<WorkspaceBatch | null>(null);
  protected readonly activeStudents = signal<BatchWorkspace['students']>([]);
  protected readonly waitingStudents = signal<BatchWorkspace['waiting']>([]);
  protected readonly activeTab = signal<DetailTab>('overview');
  protected readonly activity = signal<BatchActivityRecord[]>([]);
  protected readonly coaches = signal<{ id: string; full_name: string }[]>([]);
  protected readonly tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'students', label: 'Students' }, { id: 'coaches', label: 'Coaches' },
    { id: 'schedule', label: 'Schedule' }, { id: 'capacity', label: 'Capacity & Waiting List' }, { id: 'activity', label: 'Activity' },
  ];
  async ngOnInit(): Promise<void> {
    try {
      const id = this.route.snapshot.paramMap.get('batchId');
      if (!id) throw new Error('Batch was not specified.');
      const workspace = await this.api.load();
      const item = workspace.batches.find(batch => batch.id === id);
      if (!item) throw new Error('Batch not found.');
      this.batch.set(item);
      this.coaches.set(workspace.coaches);
      this.activeStudents.set(workspace.enrollments.filter(enrollment => enrollment.batch_id === id && enrollment.status === 'active').map(enrollment => workspace.students.find(student => student.id === enrollment.student_id)).filter((student): student is BatchWorkspace['students'][number] => Boolean(student)));
      this.waitingStudents.set(workspace.waiting.filter(waiting => waiting.batch_id === id && waiting.status === 'waiting'));
      this.activity.set(await this.api.activity(id));
    } catch (e) { this.error.set(e instanceof Error ? e.message : 'Batch details could not be loaded.'); }
    finally { this.loading.set(false); }
  }
  protected coachName(id: string): string { return this.coaches().find(coach => coach.id === id)?.full_name ?? 'Unknown coach'; }
  protected schedule(batch: WorkspaceBatch): string { return batch.batch_days.map(day => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.day_of_week]).join(', ') || 'Not scheduled'; }
}



