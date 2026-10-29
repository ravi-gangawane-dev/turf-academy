import { TableTools } from '../../shared/data-table/table-tools';
import { PageHero } from '../../shared/page-hero/page-hero';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { DatePipe } from '@angular/common';
import { AcademyMoneyPipe } from '../../shared/academy-money.pipe';
import { AcademyPreferencesService } from '../../core/supabase/academy-preferences.service';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ParentDetailRecord, ParentsService } from '../../core/supabase/domain-services';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import {
  StudentDetailRecord,
  StudentListService,
  StudentWorkspace,
} from '../students/student-list.service';
import { latestChargeBalance } from './parent-fee-summary';
import { ParentPortalService } from './parent-portal.service';
import { AsyncState } from '../../shared/async-state/async-state';
import { SummaryMetricCard } from '../../shared/summary-metric-card/summary-metric-card';

interface ChildWorkspace {
  readonly link: ParentDetailRecord['student_parents'][number];
  readonly workspace: StudentWorkspace;
  readonly balances: readonly StudentDetailRecord[];
  readonly sessions: readonly StudentDetailRecord[];
}
interface ProfileCompletion {
  readonly percentage: number;
  readonly completed: number;
  readonly total: number;
  readonly missing: readonly string[];
}

@Component({
  selector: 'app-parent-dashboard-page',
  imports: [TableTools, PageHero, StatusBadge, DatePipe, AcademyMoneyPipe, AsyncState, SummaryMetricCard],
  templateUrl: './parent-dashboard-page.html',
  styleUrl: './parent-dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentDashboardPage implements OnInit, OnDestroy {
  private readonly preferences = inject(AcademyPreferencesService);
  protected readonly auth = inject(AuthService);
  private readonly parents = inject(ParentsService);
  private readonly students = inject(StudentListService);
  private readonly supabase = inject(SupabaseClientService);
  private readonly portal = inject(ParentPortalService);
  private readonly router = inject(Router);
  protected readonly parent = signal<ParentDetailRecord | null>(null);
  protected readonly children = signal<readonly ChildWorkspace[]>([]);
  protected readonly selectedChildId = signal('');
  private channels: readonly RealtimeChannel[] = [];
  private reloadTimer?: ReturnType<typeof setTimeout>;
  protected readonly selectedChild = computed(() => {
    const rows = this.children();
    return (
      rows.find((child) => child.workspace.student.id === this.selectedChildId()) ?? rows[0] ?? null
    );
  });
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly profileCompletion = computed<ProfileCompletion>(() => {
    const parent = this.parent();
    if (!parent) return { percentage: 0, completed: 0, total: 9, missing: [] };
    const address = parent.address;
    const fields = [
      { label: 'Profile photo', complete: Boolean(parent.photo_url || parent.photo_path) },
      { label: 'Full name', complete: Boolean(String(parent.full_name ?? '').trim()) },
      { label: 'Relationship', complete: Boolean(String(parent.relation ?? '').trim()) },
      { label: 'Phone number', complete: Boolean(String(parent.phone ?? '').trim()) },
      { label: 'WhatsApp number', complete: Boolean(String(parent.whatsapp ?? '').trim()) },
      { label: 'Email address', complete: Boolean(String(parent.email ?? '').trim()) },
      { label: 'Occupation', complete: Boolean(String(parent.occupation ?? '').trim()) },
      {
        label: 'Address',
        complete: Boolean(
          address && Object.values(address).some((value) => String(value ?? '').trim()),
        ),
      },
      { label: 'Linked child', complete: this.children().length > 0 },
    ];
    const completed = fields.filter((field) => field.complete).length;
    return {
      percentage: Math.round((completed / fields.length) * 100),
      completed,
      total: fields.length,
      missing: fields.filter((field) => !field.complete).map((field) => field.label),
    };
  });
  async ngOnInit(): Promise<void> {
    const profileId = this.auth.profile()?.id;
    if (!profileId) {
      this.error.set('Your account profile could not be loaded.');
      this.loading.set(false);
      return;
    }
    try {
      await this.preferences.load();
      const parent = await this.parents.getByProfile(profileId);
      this.parent.set(parent);
      const client = this.supabase.requireClient();
      const childRows = await Promise.all(
        parent.student_parents.map(async (link) => {
          const workspace = await this.students.getStudentWorkspace(link.student.id);
          const batchId = String(workspace.enrollment?.['batch_id'] ?? '');
          const [balances, sessions] = await Promise.all([
            client
              .from('monthly_charge_balances')
              .select('*')
              .eq('student_id', link.student.id)
              .order('charge_month', { ascending: false }),
            batchId
              ? client
                  .from('training_sessions')
                  .select('*')
                  .eq('batch_id', batchId)
                  .gte('session_date', new Date().toISOString().slice(0, 10))
                  .in('status', ['upcoming', 'rescheduled'])
                  .order('session_date')
                  .order('start_time')
                  .limit(1)
              : Promise.resolve({ data: [], error: null }),
          ]);
          const childError = balances.error ?? sessions.error;
          if (childError) throw new Error(childError.message);
          return { link, workspace, balances: balances.data ?? [], sessions: sessions.data ?? [] };
        }),
      );
      this.children.set(childRows);
      const savedId = this.portal.selectedChildId();
      const selectedId = childRows.some((child) => child.workspace.student.id === savedId)
        ? savedId
        : (childRows[0]?.workspace.student.id ?? '');
      this.selectedChildId.set(selectedId);
      if (selectedId) {
        this.portal.selectChild(selectedId);
        await this.replaceSubscriptions(parent.id, selectedId);
      }
    } catch (error) {
      this.error.set(
        error instanceof Error ? error.message : 'Parent dashboard could not be loaded.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  ngOnDestroy(): void {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    void this.portal.unsubscribe(this.channels);
  }
  protected address(): string {
    const value = this.parent()?.address as Record<string, string> | undefined;
    return value?.['formatted'] ?? value?.['address'] ?? 'Not provided';
  }
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  protected batch(child: ChildWorkspace): string {
    return String(
      (child.workspace.enrollment?.['batch'] as StudentDetailRecord | undefined)?.['name'] ??
        'Not enrolled',
    );
  }
  protected attendance(child: ChildWorkspace): { total: number; present: number; rate: number } {
    const rows = child.workspace.attendance;
    const present = rows.filter((row) =>
      ['present', 'late', 'checked_out'].includes(String(row['status'])),
    ).length;
    return {
      total: rows.length,
      present,
      rate: rows.length ? Math.round((present / rows.length) * 100) : 0,
    };
  }
  protected selectChild(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.selectedChildId.set(id);
    this.portal.selectChild(id);
    const parentId = String(this.parent()?.id ?? '');
    if (parentId) void this.replaceSubscriptions(parentId, id);
  }
  private async replaceSubscriptions(parentId: string, studentId: string): Promise<void> {
    await this.portal.unsubscribe(this.channels);
    this.channels = this.portal.subscribeToChild(parentId, studentId, () => {
      if (this.reloadTimer) clearTimeout(this.reloadTimer);
      this.reloadTimer = setTimeout(() => void this.ngOnInit(), 150);
    });
  }
  protected age(dateOfBirth: string): number {
    const born = new Date(dateOfBirth);
    const today = new Date();
    let years = today.getFullYear() - born.getFullYear();
    if (today < new Date(today.getFullYear(), born.getMonth(), born.getDate())) years--;
    return Math.max(0, years);
  }
  protected batchRecord(child: ChildWorkspace): StudentDetailRecord {
    return (child.workspace.enrollment?.['batch'] as StudentDetailRecord | null) ?? {};
  }
  protected fee(child: ChildWorkspace): { monthly: number; paid: number; pending: number } {
    const balance = latestChargeBalance(child.balances);
    return { monthly: balance.total, paid: balance.paid, pending: balance.pending };
  }
  protected time(value: unknown): string {
    if (!value) return 'Not scheduled';
    const [hours, minutes] = String(value).split(':').map(Number);
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(
      new Date(2000, 0, 1, hours, minutes),
    );
  }
  protected nextSession(child: ChildWorkspace): StudentDetailRecord | null {
    return child.sessions[0] ?? null;
  }
  protected todayAttendance(child: ChildWorkspace): StudentDetailRecord | null {
    const today = new Date().toISOString().slice(0, 10);
    return child.workspace.attendance.find((row) => row['attendance_date'] === today) ?? null;
  }
  protected duration(record: StudentDetailRecord): string {
    if (!record['check_in_at'] || !record['check_out_at']) return 'In progress';
    const minutes = Math.max(
      0,
      Math.round(
        (new Date(String(record['check_out_at'])).getTime() -
          new Date(String(record['check_in_at'])).getTime()) /
          60000,
      ),
    );
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
  }
  protected recordDate(value: unknown): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(String(value)));
  }
  protected recordTime(value: unknown): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(
      new Date(String(value)),
    );
  }
  protected amount(value: unknown): number {
    return Number(value ?? 0);
  }
  protected openChild(id?: string): void {
    if (id) void this.router.navigate(['/parent/children', id]);
  }
  protected message(phone: string | null | undefined): void {
    if (phone) window.open(`https://wa.me/91${phone}`, '_blank', 'noopener');
  }
  protected retry(): void {
    void this.ngOnInit();
  }
}
