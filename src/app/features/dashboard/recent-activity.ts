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
  template: `
    <header>
      <span class="activity-icon"><i class="pi pi-history" aria-hidden="true"></i></span>
      <h2>Recent Activity</h2>
      <button type="button" (click)="load()" [disabled]="status() === 'loading'" aria-label="Refresh recent activity">
        <i class="pi pi-refresh" aria-hidden="true"></i>
      </button>
    </header>
    <div class="activity-content" [attr.aria-busy]="status() === 'loading'">
      @if (status() === 'loading') {
        <app-async-state title="Loading recent activity..." />
      } @else if (status() === 'error') {
        <app-async-state kind="error" title="Recent activity could not be loaded." actionLabel="Try again" (action)="load()" />
      } @else if (events().length === 0) {
        <app-async-state kind="empty" title="No recent activity" message="Recorded academy changes will appear here." />
      } @else {
        <ol aria-label="Recent academy changes">
          @for (event of events(); track event.id) {
            <li><strong>{{ label(event) }}</strong>
              <time [attr.datetime]="event.occurred_at">{{ event.occurred_at | date:'MMM d, y, h:mm a' }}</time>
            </li>
          }
        </ol>
      }
    </div>
    <a routerLink="/settings/audit-logs">View audit log <i class="pi pi-arrow-right" aria-hidden="true"></i></a>
  `,
  styles: [`
    :host{display:flex;flex-direction:column;min-height:0;height:100%;font-size:12px}
    header{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-shrink:0}
    h2{margin:0;font-size:15px}header button{margin-left:auto}
    .activity-icon{display:grid;place-items:center;flex:0 0 40px;height:40px;border-radius:50%;color:#0b8e46;background:#dcf5e7}
    button,a{color:#096c3c;font:inherit;font-weight:700}button{min-width:36px;min-height:36px;border:1px solid #dce8e2;border-radius:8px;background:#f6faf8;cursor:pointer}
    button:disabled{opacity:.5;cursor:wait}button:focus-visible,a:focus-visible{outline:2px solid #096c3c;outline-offset:3px}
    .activity-content{min-height:0;overflow:auto;flex:1}.activity-state{padding:20px 0;color:var(--app-muted);line-height:1.6}.activity-state p{margin:4px 0 10px}
    ol{list-style:none;padding:0;margin:0}li{padding:10px 0;border-bottom:1px solid #edf1ef;overflow-wrap:anywhere}li:last-child{border:0}
    strong,time{display:block}time{margin-top:5px;color:var(--app-muted);font-size:11px}
    a{display:block;padding-top:12px;flex-shrink:0}
  `],
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
