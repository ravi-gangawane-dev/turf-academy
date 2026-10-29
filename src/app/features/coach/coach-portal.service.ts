import { readAllPages } from '../../core/supabase/read-all-pages';
import { DataRequestError } from '../../core/supabase/data-error';
import { Injectable, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AuthService } from '../../core/auth/auth.service';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { StorageService } from '../../core/supabase/storage.service';

export interface CoachBatch {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly age_group: string | null;
  readonly skill_level: string | null;
  readonly capacity: number;
  readonly start_date: string | null;
  readonly end_date: string | null;
  readonly start_time: string | null;
  readonly end_time: string | null;
  readonly description: string | null;
  readonly status: string;
  readonly batch_days: readonly { day_of_week: number }[];
}
export interface CoachStudent {
  readonly id: string;
  readonly student_code: string;
  readonly full_name: string;
  readonly date_of_birth: string;
  readonly gender: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly photo_url: string | null;
  readonly joined_on: string;
  readonly address: CoachRow;
  readonly notes: string | null;
  readonly student_parents?: readonly {
    readonly is_primary: boolean;
    readonly parent: CoachRow | null;
  }[];
  readonly student_medical_records?: readonly CoachRow[];
  readonly status: string;
  readonly enrollment_id: string;
  readonly batch_id: string;
  readonly batch_name: string;
}
export type CoachRow = Readonly<Record<string, unknown>>;
export interface CoachProfile extends CoachRow {
  readonly id: string;
  readonly full_name: string;
  readonly phone?: string | null;
  readonly photo_path?: string | null;
  readonly photo_url?: string | null;
}
export interface CoachAttendanceRecord extends CoachRow {
  readonly id: string;
  readonly student_id: string;
  readonly batch_id: string;
  readonly attendance_date: string;
  readonly status: string;
  readonly check_in_at: string | null;
  readonly check_out_at: string | null;
}
export interface CoachSession extends CoachRow {
  readonly id: string;
  readonly batch_id: string;
  readonly session_date: string;
  readonly start_time: string | null;
  readonly end_time: string | null;
}
export interface CoachNotification extends CoachRow {
  readonly id: string;
  readonly subject: string;
  readonly body: string;
  readonly created_at: string;
  readonly read_at: string | null;
}
export interface CoachPortalData {
  readonly coach: CoachProfile;
  readonly batches: readonly CoachBatch[];
  readonly students: readonly CoachStudent[];
  readonly attendance: readonly CoachAttendanceRecord[];
  readonly sessions: readonly CoachSession[];
  readonly notifications: readonly CoachNotification[];
}
export interface CoachPage<T> { readonly rows: readonly T[]; readonly total: number; }

@Injectable({ providedIn: 'root' })
export class CoachPortalService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseClientService);
  private readonly storage = inject(StorageService);

  async load(): Promise<CoachPortalData> {
    const profileId = this.auth.profile()?.id;
    if (!profileId) throw new Error('The signed-in coach profile is unavailable.');
    const client = this.supabase.requireClient();
    const coachResult = await client
      .from('coaches')
      .select('*,coach_specializations(*)')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .maybeSingle();
    if (coachResult.error) throw new DataRequestError('Load academy data', coachResult.error);
    if (!coachResult.data) throw new Error('No active coach record is linked to this account.');
    let coach = { ...coachResult.data } as unknown as CoachProfile;
    if (coach['photo_path'])
      coach = {
        ...coach,
        photo_url: await this.storage.signedUrl('coach-photos', String(coach['photo_path']), 3600),
      };
    return { coach, batches: [], students: [], attendance: [], sessions: [], notifications: [] };
  }

  async loadBatches(coachId: string): Promise<readonly CoachBatch[]> {
    const links = await this.supabase.requireClient()
      .from('batch_coaches')
      .select('is_primary,batch:batches(*,batch_days(*))')
      .eq('coach_id', coachId);
    if (links.error) throw new DataRequestError('Load academy data', links.error);
    return (links.data ?? [])
      .map((link) => link.batch as unknown as CoachBatch)
      .filter(Boolean);
  }

  async loadStudents(batchIds: readonly string[], batches: readonly CoachBatch[]): Promise<readonly CoachStudent[]> {
    if (!batchIds.length) return [];
    const enrollments = await this.supabase.requireClient()
        .from('enrollments')
        .select(
          'id,batch_id,student:students(id,student_code,full_name,date_of_birth,gender,phone,email,photo_url,joined_on,address,notes,status,student_parents(is_primary,parent:parents(id,full_name,relation,phone,email,address)),student_medical_records(blood_group,allergies,conditions,medications,emergency_notes,doctor_name,doctor_phone))',
        )
        .in('batch_id', batchIds)
        .eq('status', 'active');
    if (enrollments.error) throw new DataRequestError('Load academy data', enrollments.error);
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));
    return (enrollments.data ?? []).map((row) => {
      const student = row.student as unknown as Omit<
        CoachStudent,
        'enrollment_id' | 'batch_id' | 'batch_name'
      >;
      return {
        ...student,
        enrollment_id: row.id,
        batch_id: row.batch_id,
        batch_name: batchById.get(row.batch_id)?.name ?? 'Assigned batch',
      };
    });
  }

  async loadDashboardAttendance(batchIds: readonly string[], days = 30): Promise<readonly CoachAttendanceRecord[]> {
    if (!batchIds.length) return [];
    const from = new Date();
    from.setDate(from.getDate() - Math.max(1, days) + 1);
    const client = this.supabase.requireClient();
    const rows = await readAllPages('Load coach attendance summary', (offset, limit) => client
        .from('attendance_records')
        .select('*,student:students(id,student_code,full_name,photo_url),batch:batches(id,name)', { count: 'exact' })
        .in('batch_id', [...batchIds])
        .gte('attendance_date', from.toISOString().slice(0, 10))
        .order('attendance_date', { ascending: false }).order('id')
        .range(offset, offset + limit - 1));
    return rows as unknown as readonly CoachAttendanceRecord[];
  }

  async loadSessions(batchIds: readonly string[]): Promise<readonly CoachSession[]> {
    if (!batchIds.length) return [];
    const from = new Date(); from.setMonth(from.getMonth() - 1);
    const to = new Date(); to.setFullYear(to.getFullYear() + 1);
    const client = this.supabase.requireClient();
    const rows = await readAllPages('Load coach sessions', (offset, limit) => client.from('training_sessions')
      .select('*,batch:batches(id,name,code)', { count: 'exact' }).in('batch_id', [...batchIds])
      .gte('session_date', from.toISOString().slice(0, 10)).lte('session_date', to.toISOString().slice(0, 10))
      .order('session_date').order('start_time').order('id')
      .range(offset, offset + limit - 1));
    return rows as readonly CoachSession[];
  }

  async loadNotifications(coachId: string): Promise<readonly CoachNotification[]> {
    const result = await this.supabase.requireClient().from('notifications').select('*')
      .eq('coach_id', coachId).order('created_at', { ascending: false }).limit(100);
    if (result.error) throw new DataRequestError('Load academy data', result.error);
    return (result.data ?? []) as readonly CoachNotification[];
  }

  async notificationPage(coachId:string, page:number, size:number, filter:string):Promise<CoachPage<CoachNotification>> {
    let query=this.supabase.requireClient().from('notifications').select('*',{count:'exact'}).eq('coach_id',coachId);
    if(filter==='read')query=query.not('read_at','is',null);
    if(filter==='unread')query=query.is('read_at',null);
    const start=(page-1)*size;
    const result=await query.order('created_at',{ascending:false}).order('id').range(start,start+size-1);
    if(result.error)throw new DataRequestError('Load notifications',result.error);
    return {rows:(result.data??[]) as CoachNotification[],total:result.count??0};
  }

  async searchStudents(
    batchIds: readonly string[],
    search: string,
    batchId: string,
    status: string,
    page: number,
    pageSize: number,
  ): Promise<CoachPage<CoachStudent>> {
    if (!batchIds.length) return { rows: [], total: 0 };
    const start = Math.max(0, (page - 1) * pageSize);
    let query = this.supabase.requireClient().from('enrollments').select(
      'id,batch_id,student:students!inner(id,student_code,full_name,date_of_birth,gender,phone,email,photo_url,joined_on,address,notes,status)',
      { count: 'exact' },
    ).in('batch_id', batchId ? [batchId] : [...batchIds]).eq('status', 'active');
    if (status) query = query.eq('student.status', status);
    const term = search.trim().replace(/[%_,()]/g, ' ');
    if (term) query = query.or(
      `full_name.ilike.%${term}%,student_code.ilike.%${term}%,phone.ilike.%${term}%`,
      { foreignTable: 'students' },
    );
    const result = await query.order('full_name', { foreignTable: 'students' }).order('id').range(start, start + pageSize - 1);
    if (result.error) throw new DataRequestError('Load academy data', result.error);
    const batchNames = new Map((await this.supabase.requireClient().from('batches').select('id,name').in('id', batchId ? [batchId] : [...batchIds])).data?.map((b) => [b.id, b.name]) ?? []);
    return {
      total: result.count ?? 0,
      rows: (result.data ?? []).map((row) => ({
        ...(row.student as unknown as Omit<CoachStudent, 'enrollment_id' | 'batch_id' | 'batch_name'>),
        enrollment_id: row.id,
        batch_id: row.batch_id,
        batch_name: batchNames.get(row.batch_id) ?? '',
      })),
    };
  }

  async attendanceHistory(
    batchIds: readonly string[], batchId: string, studentId: string, status: string,
    page: number, pageSize: number,
  ): Promise<CoachPage<CoachAttendanceRecord>> {
    if (!batchIds.length) return { rows: [], total: 0 };
    const start = Math.max(0, (page - 1) * pageSize);
    let query = this.supabase.requireClient().from('attendance_records')
      .select('*,student:students(id,student_code,full_name,photo_url),batch:batches(id,name)', { count: 'exact' })
      .in('batch_id', batchId ? [batchId] : [...batchIds]);
    if (studentId) query = query.eq('student_id', studentId);
    if (status) query = query.eq('status', status);
    const result = await query.order('attendance_date', { ascending: false })
      .order('check_in_at', { ascending: false }).order('id').range(start, start + pageSize - 1);
    if (result.error) throw new DataRequestError('Load academy data', result.error);
    return { rows: (result.data ?? []) as unknown as readonly CoachAttendanceRecord[], total: result.count ?? 0 };
  }

  // Coach attendance records through the same hardened RPCs reception uses
  // (202610230004 / 202610230006): the server derives the business date in the
  // academy timezone, classifies late arrivals, enforces idempotency keys and
  // rejects double check-outs. Assigned-coach access is verified inside the
  // functions through coach_has_batch().
  async checkIn(studentId: string, batchId: string, idempotencyKey: string = crypto.randomUUID()) {
    const result = await this.supabase.requireClient().rpc('attendance_check_in', {
      p_student_id: studentId,
      p_batch_id: batchId,
      p_source: 'manual',
      p_idempotency_key: idempotencyKey,
    });
    if (result.error) throw new DataRequestError('Record attendance', result.error);
    return result.data;
  }

  async checkOut(attendanceId: string, idempotencyKey: string = crypto.randomUUID()) {
    const result = await this.supabase.requireClient().rpc('attendance_check_out', {
      p_attendance_id: attendanceId,
      p_idempotency_key: idempotencyKey,
    });
    if (result.error) throw new DataRequestError('Record attendance', result.error);
    return result.data;
  }

  /** Scanning is self-toggling: an open check-in closes, anything else checks in. */
  async scan(token: string, batchId: string): Promise<'checked-in' | 'checked-out'> {
    const client = this.supabase.requireClient();
    const trimmed = token.trim();
    const profile = await client
      .from('qr_profiles')
      .select('student_id')
      .eq('public_token', trimmed)
      .eq('active', true)
      .maybeSingle();
    if (profile.error) throw new DataRequestError('Record QR attendance', profile.error);
    if (!profile.data) throw new Error('QR code is invalid or inactive.');
    const today = new Date().toISOString().slice(0, 10);
    const open = await client
      .from('attendance_records')
      .select('id,check_out_at')
      .eq('student_id', profile.data.student_id)
      .eq('batch_id', batchId)
      .eq('attendance_date', today)
      .not('check_in_at', 'is', null)
      .limit(1)
      .maybeSingle();
    if (open.error) throw new DataRequestError('Record QR attendance', open.error);
    const idempotencyKey = crypto.randomUUID();
    if (!open.data) {
      const result = await client.rpc('attendance_check_in', {
        p_qr_token: trimmed,
        p_batch_id: batchId,
        p_source: 'qr',
        p_idempotency_key: idempotencyKey,
      });
      if (result.error) throw new DataRequestError('Record QR attendance', result.error);
      return 'checked-in';
    }
    if (open.data.check_out_at)
      throw new Error(
        'This student is already checked in and checked out for today. Use attendance corrections to adjust the record.',
      );
    const result = await client.rpc('attendance_check_out', {
      p_attendance_id: open.data.id,
      p_idempotency_key: idempotencyKey,
    });
    if (result.error) throw new DataRequestError('Record QR attendance', result.error);
    return 'checked-out';
  }

  async markBatchPresent(batchId: string, studentIds: readonly string[]): Promise<number> {
    // No client-side date: the function derives the business date in the academy
    // timezone (202610230006), so late-night sessions land on the right day.
    const result = await this.supabase.requireClient().rpc('coach_mark_batch_attendance', {
      p_batch_id: batchId,
      p_student_ids: studentIds,
      p_status: 'present',
    });
    if (result.error) throw new DataRequestError('Record attendance', result.error);
    return Number(result.data ?? 0);
  }

  async requestAttendanceCorrection(
    attendanceId: string,
    requestedValues: Readonly<{ status?: string; check_in_at?: string | null; check_out_at?: string | null; remarks?: string | null }>,
    reason: string,
  ): Promise<void> {
    const result = await this.supabase.requireClient().rpc('coach_request_attendance_correction', {
      p_attendance_id: attendanceId,
      p_values: requestedValues,
      p_reason: reason.trim(),
    });
    if (result.error) throw new DataRequestError('Load academy data', result.error);
  }

  async markNotificationRead(id: string): Promise<void> {
    const result = await this.supabase.requireClient().rpc('coach_mark_notification_read', {
      p_notification_id: id,
    });
    if (result.error) throw new DataRequestError('Load academy data', result.error);
  }

  async markAllNotificationsRead(): Promise<void> {
    const result = await this.supabase.requireClient().rpc('coach_mark_all_notifications_read');
    if (result.error) throw new DataRequestError('Load academy data', result.error);
  }

  async updateOwnProfile(coachId: string, phone: string, photo?: File | null): Promise<void> {
    const photoPath = photo ? await this.storage.upload('coach-photos', coachId, photo) : null;
    const result = await this.supabase.requireClient().rpc('coach_update_own_profile', {
      p_phone: phone.trim(),
      p_photo_path: photoPath,
    });
    if (result.error) throw new DataRequestError('Load academy data', result.error);
  }

  subscribe(
    coachId: string,
    onChange: (panel: 'attendance' | 'notifications') => void,
  ): readonly RealtimeChannel[] {
    const client = this.supabase.requireClient();
    const suffix = crypto.randomUUID();
    const channels: RealtimeChannel[] = [client
        .channel(`coach-notifications-${suffix}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `coach_id=eq.${coachId}`,
          },
          () => onChange('notifications'),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'coach_attendance_events', filter: `coach_id=eq.${coachId}` },
          () => onChange('attendance'),
        )
        .subscribe()];
    return channels;
  }

  async unsubscribe(channels: readonly RealtimeChannel[]): Promise<void> {
    await Promise.all(
      channels.map((channel) => this.supabase.requireClient().removeChannel(channel)),
    );
  }
}
