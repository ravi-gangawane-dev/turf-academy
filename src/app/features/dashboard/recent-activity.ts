import { AsyncState } from '../../shared/async-state/async-state';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { API_CONFIG } from '../../core/config/api.config';
import { DatabaseService } from '../../core/supabase/database.service';

interface ActivityEvent {
  readonly id: number;
  readonly action: string;
  readonly table_name: string;
  readonly occurred_at: string;
}

const subjects: Record<string, string> = {
  students: 'Student', parents: 'Parent', coaches: 'Coach', batches: 'Batch',
  enrollments: 'Enrollment', attendance_records: 'Attendance record',
  monthly_charges: 'Monthly charge', payments: 'Payment',
  student_medical_records: 'Student medical record',
};
const actions: Record<string, string> = {
  INSERT: 'created', UPDATE: 'updated', DELETE: 'deleted', REFUND: 'refund recorded',
};

@Component({
  selector: 'app-recent-activity',
  imports: [AsyncState, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl:'./recent-activity.html',
  styleUrl:'./recent-activity.scss',
})
export class RecentActivity implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly auth = inject(AuthService);
  private readonly config = inject(API_CONFIG);
  protected readonly events = signal<readonly ActivityEvent[]>([]);
  protected readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  private loading = false;

  ngOnInit(): void { void this.load(); }

  protected label(event: ActivityEvent): string {
    return `${subjects[event.table_name] ?? 'Academy record'} ${actions[event.action] ?? 'changed'}`;
  }

  protected async load(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.status.set('loading');
    try {
      // Audit events are admin-only under the existing database policies.
      if (this.auth.role() !== 'admin') throw new Error('Activity access unavailable');
      if (this.config.useMockApi) {
        this.events.set([]);
      } else {
        const result = await this.db.client.from('audit_logs')
          .select('id,action,table_name,occurred_at')
          .order('occurred_at', { ascending: false })
          .order('id', { ascending: false }).limit(5);
        if (result.error) throw result.error;
        this.events.set((result.data ?? []) as ActivityEvent[]);
      }
      this.status.set('ready');
    } catch {
      this.events.set([]);
      this.status.set('error');
    } finally {
      this.loading = false;
    }
  }
}
