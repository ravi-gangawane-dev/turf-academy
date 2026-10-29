import { DEFAULT_PAGE_SIZE } from '../../shared/pagination/pagination.config';
import { DataRequestError } from '../../core/supabase/data-error';
import { readAllPages } from '../../core/supabase/read-all-pages';
import { Injectable, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../core/auth/auth.service';
import { ParentsService } from '../../core/supabase/domain-services';
import { StorageService } from '../../core/supabase/storage.service';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { StudentListService } from '../students/student-list.service';
import {
  ParentCoachLinkRecord,
  ParentPortalData,
  ParentPortalQuery,
  ParentPortalRecord,
} from './parent-portal.models';
export type {
  ParentChildData,
  ParentPage,
  ParentPortalData,
  ParentPortalQuery,
} from './parent-portal.models';

@Injectable({ providedIn: 'root' })
export class ParentPortalService {
  private readonly auth = inject(AuthService);
  private readonly parents = inject(ParentsService);
  private readonly students = inject(StudentListService);
  private readonly supabase = inject(SupabaseClientService);
  private readonly storage = inject(StorageService);
  readonly selectedChildId = signal(localStorage.getItem('parent-selected-child') ?? '');

  selectChild(id: string): void {
    this.selectedChildId.set(id);
    localStorage.setItem('parent-selected-child', id);
  }

  async load(query?: Partial<ParentPortalQuery>): Promise<ParentPortalData> {
    const profileId = this.auth.profile()?.id;
    if (!profileId) throw new Error('The signed-in parent profile is unavailable.');
    const parent = await this.parents.getByProfile(profileId);
    const children = await Promise.all(
      parent.student_parents.map(async (link) => ({
        link,
        workspace: await this.students.getStudentWorkspace(link.student.id),
      })),
    );
    const allowed = children.some((child) => child.workspace.student.id === this.selectedChildId());
    if (!allowed) this.selectChild(children[0]?.workspace.student.id ?? '');
    const selected =
      children.find((child) => child.workspace.student.id === this.selectedChildId()) ??
      children[0] ??
      null;
    if (!selected)
      return {
        parent,
        children,
        selected: null,
        charges: [],
        notifications: [],
        batchDays: [],
        coaches: [],
        sessions: [],
        attendancePage: { rows: [], total: 0 },
        paymentPage: { rows: [], total: 0 },
        notificationPage: { rows: [], total: 0 },
      };
    const client = this.supabase.requireClient();
    const batchId = String(selected.workspace.enrollment?.['batch_id'] ?? '');
    const attendancePage = Math.max(1, query?.attendancePage ?? 1);
    const attendancePageSize = Math.max(1, query?.attendancePageSize ?? DEFAULT_PAGE_SIZE);
    const paymentPage = Math.max(1, query?.paymentPage ?? 1);
    const paymentPageSize = Math.max(1, query?.paymentPageSize ?? DEFAULT_PAGE_SIZE);
    const notificationPage = Math.max(1, query?.notificationPage ?? 1);
    const notificationPageSize = Math.max(1, query?.notificationPageSize ?? DEFAULT_PAGE_SIZE);
    let attendanceQuery = client
      .from('attendance_records')
      .select('*,batch:batches(name)', { count: 'exact' })
      .eq('student_id', selected.workspace.student.id);
    if (query?.attendanceStatus)
      attendanceQuery = attendanceQuery.eq('status', query.attendanceStatus);
    if (query?.attendanceFrom)
      attendanceQuery = attendanceQuery.gte('attendance_date', query.attendanceFrom);
    if (query?.attendanceTo)
      attendanceQuery = attendanceQuery.lte('attendance_date', query.attendanceTo);
    const attendanceTerm = this.searchTerm(query?.attendanceSearch);
    if (attendanceTerm) {
      attendanceQuery = attendanceQuery.or(
        `status.ilike.%${attendanceTerm}%,remarks.ilike.%${attendanceTerm}%`,
      );
    }
    const attendanceSortColumns = {
      date: 'attendance_date',
      checkIn: 'check_in_at',
      status: 'status',
    } as const;
    attendanceQuery = attendanceQuery
      .order(attendanceSortColumns[query?.attendanceSortBy ?? 'date'], {
        ascending: query?.attendanceSortDirection === 'asc',
      })
      .order('id')
      .range((attendancePage - 1) * attendancePageSize, attendancePage * attendancePageSize - 1);
    let notificationQuery = client
      .from('notifications')
      .select('*,student:students(full_name,photo_path,photo_url),coach:coaches(full_name,photo_path,photo_url)', {
        count: 'exact',
      })
      .eq('parent_id', parent.id)
      .order('created_at', { ascending: false })
      .range(
        (notificationPage - 1) * notificationPageSize,
        notificationPage * notificationPageSize - 1,
      );
    if (query?.notificationUnreadOnly) notificationQuery = notificationQuery.is('read_at', null);
    if (query?.notificationType)
      notificationQuery = notificationQuery.ilike('template_key', `%${query.notificationType}%`);
    let paymentQuery = client
      .from('payments')
      .select('*,monthly_charge:monthly_charges(*),receipt:receipts(*)', { count: 'exact' })
      .eq('student_id', selected.workspace.student.id);
    if (query?.paymentStatus) paymentQuery = paymentQuery.eq('status', query.paymentStatus);
    const paymentTerm = this.searchTerm(query?.paymentSearch);
    if (paymentTerm) {
      paymentQuery = paymentQuery.or(
        `payment_mode.ilike.%${paymentTerm}%,provider_reference.ilike.%${paymentTerm}%,client_reference.ilike.%${paymentTerm}%`,
      );
    }
    const paymentSortColumns = {
      date: 'paid_at',
      amount: 'amount',
      mode: 'payment_mode',
      reference: 'provider_reference',
      status: 'status',
    } as const;
    paymentQuery = paymentQuery
      .order(paymentSortColumns[query?.paymentSortBy ?? 'date'], {
        ascending: query?.paymentSortDirection === 'asc',
      })
      .order('id')
      .range((paymentPage - 1) * paymentPageSize, paymentPage * paymentPageSize - 1);
    const [
      charges,
      notifications,
      batchDays,
      coaches,
      sessions,
      attendanceRows,
      paymentRowsResult,
    ] = await Promise.all([
      readAllPages('Load child fees', (offset, limit) => client
        .from('monthly_charge_balances')
        .select('*', { count: 'exact' })
        .eq('student_id', selected.workspace.student.id)
        .order('due_date', { ascending: false }).order('id')
        .range(offset, offset + limit - 1)).then(data => ({ data, error: null })),
      notificationQuery,
      batchId
        ? client.from('batch_days').select('*').eq('batch_id', batchId).order('day_of_week')
        : Promise.resolve({ data: [], error: null }),
      batchId
        ? client
            .from('batch_coaches')
            .select('is_primary,coach:coaches(*)')
            .eq('batch_id', batchId)
            .order('is_primary', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      batchId
        ? client
            .from('training_sessions')
            .select('*,coach:coaches(full_name,email)')
            .eq('batch_id', batchId)
            .gte('session_date', new Date().toISOString().slice(0, 10))
            .order('session_date')
            .order('start_time')
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
      attendanceQuery,
      paymentQuery,
    ]);
    const error =
      charges.error ??
      notifications.error ??
      batchDays.error ??
      coaches.error ??
      sessions.error ??
      attendanceRows.error ??
      paymentRowsResult.error;
    if (error) throw new DataRequestError('Load academy data', error);
    const paymentRows = await Promise.all(
      ((paymentRowsResult.data ?? []) as unknown as ParentPortalRecord[]).map(async (payment) => {
        const receiptValue = Array.isArray(payment.receipt) ? payment.receipt[0] : payment.receipt;
        const url = receiptValue?.storage_path
          ? await this.storage.signedUrl('receipts', receiptValue.storage_path).catch(() => null)
          : null;
        return { ...payment, receipt: receiptValue ? { ...receiptValue, url } : null };
      }),
    );
    const coachRows: ParentCoachLinkRecord[] = await Promise.all(
      ((coaches.data ?? []) as unknown as ParentPortalRecord[]).map(async (link) => {
        const coach = Array.isArray(link.coach) ? (link.coach[0] ?? null) : (link.coach ?? null);
        return {
          ...link,
          coach: coach
            ? {
                ...coach,
                photo_url: coach.photo_path
                  ? await this.storage
                      .signedUrl('coach-photos', coach.photo_path, 3600)
                      .catch(() => null)
                  : null,
              }
            : null,
        } as ParentCoachLinkRecord;
      }),
    );
    const notificationRows = await Promise.all(
      ((notifications.data ?? []) as unknown as ParentPortalRecord[]).map(async (notification) => {
        const student = Array.isArray(notification.student)
          ? (notification.student[0] ?? null)
          : (notification.student ?? null);
        const coach = Array.isArray(notification.coach)
          ? (notification.coach[0] ?? null)
          : (notification.coach ?? null);
        const profile = student ?? coach;
        const photoPath = profile?.photo_path;
        const photoUrl = photoPath
          ? await this.storage
              .signedUrl(student ? 'student-photos' : 'coach-photos', photoPath, 3600)
              .catch(() => null)
          : (profile?.photo_url ?? null);
        return {
          ...notification,
          profile_name: profile?.full_name ?? null,
          profile_photo_url: photoUrl,
        };
      }),
    );
    return {
      parent,
      children,
      selected,
      charges: (charges.data ?? []) as unknown as ParentPortalRecord[],
      notifications: notificationRows,
      batchDays: (batchDays.data ?? []) as unknown as ParentPortalRecord[],
      coaches: coachRows,
      sessions: (sessions.data ?? []) as unknown as ParentPortalRecord[],
      attendancePage: {
        rows: (attendanceRows.data ?? []) as unknown as ParentPortalRecord[],
        total: attendanceRows.count ?? 0,
      },
      paymentPage: { rows: paymentRows, total: paymentRowsResult.count ?? 0 },
      notificationPage: {
        rows: notificationRows,
        total: notifications.count ?? 0,
      },
    };
  }

  subscribe(data: ParentPortalData, onChange: () => void): readonly RealtimeChannel[] {
    const studentId = data.selected?.workspace.student.id;
    if (!studentId) return [];
    return this.subscribeToChild(String(data.parent['id']), studentId, onChange);
  }

  subscribeToChild(
    parentId: string,
    studentId: string,
    onChange: () => void,
  ): readonly RealtimeChannel[] {
    const client = this.supabase.requireClient();
    const suffix = crypto.randomUUID();
    return [
      client
        .channel(`parent-attendance-${suffix}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'attendance_records',
            filter: `student_id=eq.${studentId}`,
          },
          onChange,
        )
        .subscribe(),
      client
        .channel(`parent-payments-${suffix}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
            filter: `student_id=eq.${studentId}`,
          },
          onChange,
        )
        .subscribe(),
      client
        .channel(`parent-notifications-${suffix}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `parent_id=eq.${parentId}`,
          },
          onChange,
        )
        .subscribe(),
      client
        .channel(`parent-sessions-${suffix}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'training_sessions' },
          onChange,
        )
        .subscribe(),
    ];
  }

  async unsubscribe(channels: readonly RealtimeChannel[]): Promise<void> {
    const client = this.supabase.requireClient();
    await Promise.all(channels.map((channel) => client.removeChannel(channel)));
  }

  private searchTerm(value?: string): string {
    return (value ?? '').replace(/[^a-zA-Z0-9 -]/g, ' ').trim();
  }
}
