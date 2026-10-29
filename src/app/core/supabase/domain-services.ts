import { inject, Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AcademyPreferencesService } from './academy-preferences.service';
import { DataRequestError } from './data-error';
import { DatabaseService } from './database.service';
import { EnrollmentBatch, EnrollmentHistoryFilters, EnrollmentHistoryRow, EnrollmentPlan, EnrollmentRecord, EnrollmentStudent, EnrollmentWorkspace } from './enrollment.models';
import { notificationDayRange } from './notification-time';
import { loadPaymentBalances } from './payment-balances';
import { readAllPages } from './read-all-pages';
import { StorageService } from './storage.service';

abstract class TableService {
  protected readonly db = inject(DatabaseService);
  protected fail(operation: string, error: { message: string } | null): void {
    if (error) throw new DataRequestError(operation, error);
  }
}

export interface StudentWrite {
  readonly id?: string;
  readonly student_code?: string;
  readonly admission_number?: string;
  readonly full_name?: string;
  readonly date_of_birth?: string;
  readonly gender?: string | null;
  readonly skill_level?: string;
  readonly phone?: string | null;
  readonly email?: string | null;
  readonly status?: string;
  readonly photo_path?: string | null;
  readonly notes?: string | null;
  readonly version?: number;
}
export interface ParentWrite {
  readonly id?: string;
  readonly profile_id?: string | null;
  readonly full_name?: string;
  readonly relation?: string | null;
  readonly phone?: string;
  readonly whatsapp?: string | null;
  readonly email?: string | null;
  readonly occupation?: string | null;
  readonly address?: object;
  readonly status?: string;
  readonly communication_preferences?: object;
  readonly photo_path?: string | null;
}
export interface CoachWrite {
  readonly id?: string;
  readonly profile_id?: string | null;
  readonly employee_code?: string;
  readonly full_name?: string;
  readonly phone?: string;
  readonly email?: string | null;
  readonly date_of_birth?: string | null;
  readonly experience_years?: number;
  readonly qualification?: string | null;
  readonly biography?: string | null;
  readonly status?: string;
  readonly photo_path?: string | null;
}
export interface BatchWrite {
  readonly id?: string;
  readonly code?: string;
  readonly name?: string;
  readonly age_group?: string | null;
  readonly skill_level?: string | null;
  readonly capacity?: number;
  readonly waitlist_capacity?: number;
  readonly start_date?: string | null;
  readonly end_date?: string | null;
  readonly start_time?: string | null;
  readonly end_time?: string | null;
  readonly fee_plan_id?: string | null;
  readonly status?: string;
  readonly description?: string | null;
}
export interface FeePlanWrite {
  readonly id?: string | null;
  readonly name?: string;
  readonly description?: string | null;
  readonly duration_months?: number;
  readonly monthly_fee?: number;
  readonly registration_fee?: number;
  readonly status?: string;
}
export interface DiscountWrite {
  readonly id?: string | null;
  readonly name?: string;
  readonly kind?: string;
  readonly value?: number;
  readonly valid_from?: string | null;
  readonly valid_till?: string | null;
  readonly status?: string;
}
export interface LateFeeRuleWrite {
  readonly id?: string | null;
  readonly name?: string;
  readonly kind?: string;
  readonly value?: number;
  readonly grace_days?: number;
  readonly maximum_amount?: number | null;
  readonly status?: string;
}
export interface NotificationWrite {
  readonly id?: string;
  readonly student_id?: string | null;
  readonly parent_id?: string | null;
  readonly channel?: string;
  readonly template_key?: string | null;
  readonly recipient?: string;
  readonly subject?: string | null;
  readonly body?: string;
  readonly status?: string;
}
export interface NotificationTemplateWrite {
  readonly id?: string | null;
  readonly name?: string;
  readonly template_key?: string;
  readonly channel?: string;
  readonly subject?: string | null;
  readonly body?: string;
  readonly status?: string;
}

export interface PageResult<T> {
  readonly rows: readonly T[];
  readonly total: number;
}

export interface FeeChargeRecord {
  readonly id: string;
  readonly student_id: string;
  readonly enrollment_id: string;
  readonly charge_month: string;
  readonly due_date: string;
  readonly final_amount: number;
  readonly paid_amount: number;
  readonly balance_amount: number;
  readonly status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
  readonly student: { readonly full_name: string } | null;
  readonly batch_id: string;
  readonly batch_name: string;
  readonly plan_name?: string;
}

export interface BatchDirectoryRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly age_group: string | null;
  readonly skill_level: string | null;
  readonly capacity: number;
  readonly waitlist_capacity: number;
  readonly start_date: string | null;
  readonly end_date: string | null;
  readonly start_time: string | null;
  readonly end_time: string | null;
  readonly status: string;
  readonly description: string | null;
  readonly monthly_fee: number;
  readonly registration_fee: number;
  readonly coach_id: string | null;
  readonly coach_name: string | null;
  readonly coach_specialization: string;
  readonly active_count: number;
  readonly days: readonly number[];
  readonly total_count: number;
}

export interface AttendanceHistoryRecord {
  readonly id: string;
  readonly attendance_date: string;
  readonly check_in_at: string | null;
  readonly check_out_at: string | null;
  readonly status: string;
  readonly source: string | null;
  readonly remarks: string | null;
  readonly student: {
    readonly id: string;
    readonly student_code: string;
    readonly full_name: string;
  } | null;
  readonly batch: { readonly id: string; readonly name: string } | null;
}

export interface AttendanceCorrectionRecord {
  readonly id: string;
  readonly reason: string;
  readonly resolution_status: 'pending' | 'approved' | 'rejected';
  readonly corrected_values: { readonly status?: string };
  readonly attendance: {
    readonly id: string;
    readonly attendance_date: string;
    readonly status: string;
    readonly student: {
      readonly id: string;
      readonly student_code: string;
      readonly full_name: string;
    } | null;
    readonly batch: { readonly id: string; readonly name: string } | null;
  } | null;
}

export interface PaymentHistoryRecord {
  readonly refunded_amount?: number;
  readonly id: string;
  readonly student_id: string;
  readonly monthly_charge_id: string | null;
  readonly amount: number;
  readonly payment_mode: string;
  readonly status: string;
  readonly paid_at: string;
  readonly student:
  | { readonly full_name: string; readonly student_code: string }
  | readonly { readonly full_name: string; readonly student_code: string }[]
  | null;
  readonly receipt:
  | { readonly id: string; readonly receipt_number: string; readonly storage_path: string | null }
  | readonly {
    readonly id: string;
    readonly receipt_number: string;
    readonly storage_path: string | null;
  }[]
  | null;
}

export interface ChargeBalanceRecord {
  readonly id: string;
  readonly student_id: string;
  readonly charge_month: string;
  readonly base_amount: number;
  readonly discount_amount: number;
  readonly late_fee_amount: number;
  readonly final_amount: number;
  readonly paid_amount: number;
  readonly balance_amount: number;
  readonly status: string;
  readonly student:
  { readonly full_name: string } | readonly { readonly full_name: string }[] | null;
}

export interface ParentDirectoryRecord {
  readonly id: string;
  readonly full_name: string;
  readonly relation: string | null;
  readonly phone: string;
  readonly whatsapp: string | null;
  readonly email: string | null;
  readonly occupation: string | null;
  readonly address: Readonly<Record<string, string>> | null;
  readonly status: 'active' | 'inactive';
  readonly created_at: string;
  readonly photo_path: string | null;
  readonly student_parents: readonly {
    readonly is_primary: boolean;
    readonly student: { readonly id: string; readonly full_name: string } | null;
  }[];
}

export interface ParentDetailRecord {
  readonly id: string;
  readonly profile_id: string | null;
  readonly full_name: string;
  readonly relation: string | null;
  readonly phone: string;
  readonly whatsapp: string | null;
  readonly email: string | null;
  readonly occupation: string | null;
  readonly address: Readonly<{
    formatted?: string;
    address?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    pin_code?: string;
  }>;
  readonly communication_preferences: Readonly<{ channel?: string; contactTime?: string }>;
  readonly status: 'active' | 'inactive';
  readonly photo_path: string | null;
  readonly photo_url: string | null;
  readonly created_at: string;
  readonly student_parents: readonly {
    readonly is_primary: boolean;
    readonly can_pick_up: boolean;
    readonly student: {
      readonly id: string;
      readonly student_code: string;
      readonly full_name: string;
      readonly date_of_birth: string;
      readonly phone: string | null;
      readonly status: string;
      readonly photo_path: string | null;
    };
  }[];
}

export interface CoachDetailRecord {
  readonly id: string;
  readonly profile_id: string | null;
  readonly employee_code: string;
  readonly full_name: string;
  readonly phone: string;
  readonly email: string | null;
  readonly date_of_birth: string | null;
  readonly experience_years: number;
  readonly qualification: string | null;
  readonly biography: string | null;
  readonly photo_path: string | null;
  readonly photo_url: string | null;
  readonly status: 'active' | 'inactive';
  readonly created_at: string;
  readonly coach_specializations: readonly { readonly specialization: string }[];
  readonly batch_coaches: readonly {
    readonly is_primary: boolean;
    readonly batch: {
      readonly id: string;
      readonly code: string;
      readonly name: string;
      readonly age_group: string | null;
      readonly skill_level: string | null;
      readonly start_time: string | null;
      readonly end_time: string | null;
      readonly status: string;
    };
  }[];
}

@Injectable({ providedIn: 'root' })
export class StudentsService extends TableService {
  async list(search = '', from = 0, to = 49) {
    let query = this.db.client
      .from('students')
      .select('*', { count: 'exact' })
      .order('full_name')
      .range(from, to);
    if (search.trim()) query = query.ilike('full_name', `%${search.trim()}%`);
    const result = await query;
    this.fail('List students', result.error);
    return result;
  }
  async get(id: string) {
    const r = await this.db.client
      .from('students')
      .select('*, student_parents(parent:parents(*)), enrollments(*)')
      .eq('id', id)
      .single();
    this.fail('Get student', r.error);
    return r.data;
  }
  async create(value: StudentWrite) {
    const r = await this.db.client.from('students').insert(value).select().single();
    this.fail('Create student', r.error);
    return r.data;
  }
  async update(id: string, value: StudentWrite, version: number) {
    const r = await this.db.client
      .from('students')
      .update({ ...value, version: version + 1 })
      .eq('id', id)
      .eq('version', version)
      .select()
      .single();
    this.fail('Update student', r.error);
    return r.data;
  }
}

@Injectable({ providedIn: 'root' })
export class ParentsService extends TableService {
  private readonly storage = inject(StorageService);
  async list() {
    const r = await this.db.client
      .from('parents')
      .select('*, student_parents(student:students(*))')
      .order('full_name');
    this.fail('List parents', r.error);
    return r.data ?? [];
  }
  async save(value: ParentWrite) {
    const r = await this.db.client.from('parents').upsert(value).select().single();
    this.fail('Save parent', r.error);
    return r.data;
  }
  async link(studentId: string, parentId: string, primary = false) {
    const r = await this.db.client
      .from('student_parents')
      .upsert({ student_id: studentId, parent_id: parentId, is_primary: primary });
    this.fail('Link parent', r.error);
  }

  async directory() {
    const r = await this.db.client
      .from('parents')
      .select(
        'id,full_name,relation,phone,whatsapp,email,occupation,address,status,created_at,photo_path,student_parents(is_primary,student:students(id,full_name,student_code,photo_path,status))',
      )
      .order('full_name');
    this.fail('List parent directory', r.error);
    return r.data ?? [];
  }
  async directoryExport(filters: { readonly columns?: Record<string, string>; readonly search?: string; readonly relation?: string; readonly status?: string } = {}): Promise<ParentDirectoryRecord[]> {
    return readAllPages('Export parents', async (offset, limit) => {
      const result = await this.directoryPage(1, limit, filters, offset);
      return { data: result.rows, count: result.total, error: null };
    });
  }
  async directoryPage(
    page: number,
    pageSize: number,
    filters: {
      readonly columns?: Record<string, string>;
      readonly search?: string;
      readonly relation?: string;
      readonly status?: string;
      readonly sortBy?: string;
      readonly sortDirection?: 'asc' | 'desc';
    } = {},
    offset?: number,
  ): Promise<PageResult<ParentDirectoryRecord>> {
    const from = offset ?? Math.max(0, page - 1) * pageSize;
    const sortColumns = {
      name: 'full_name',
      relation: 'relation',
      status: 'status',
      joinedOn: 'created_at', phone: 'phone', email: 'email', children: 'children_text',
    } as const;
    const sortBy = filters.sortBy && Object.hasOwn(sortColumns, filters.sortBy)
      ? sortColumns[filters.sortBy as keyof typeof sortColumns]
      : 'full_name';
    let query = this.db.client
      .from(filters.columns ? 'parent_directory_columns' : 'parents')
      .select(
        filters.columns ? '*' : 'id,full_name,relation,phone,whatsapp,email,occupation,address,status,created_at,photo_path,student_parents(is_primary,student:students(id,full_name))',
        { count: 'exact' },
      )
      .order(sortBy, { ascending: filters.sortDirection === 'desc' ? false : true })
      .order('id', { ascending: true });
    const search = filters.search?.trim().replace(/[%_,()\\"]/g, ' ');
    if (search)
      query = query.or(
        `full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`,
      );
    if (filters.relation && filters.relation !== 'all')
      query = query.eq('relation', filters.relation);
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    for (const [key, value] of Object.entries(filters.columns ?? {})) {
      if (!value.trim()) continue;
      const column = ({ cf_name: 'full_name', cf_relation: 'relation', cf_phone: 'phone', cf_email: 'email', cf_children: 'children_text', cf_status: 'status_text', cf_joinedOn: 'joined_date' } as Record<string, string>)[key];
      if (column) query = column === 'joined_date' ? query.eq(column, value) : query.ilike(column, '%' + value.replace(/[%_]/g, '\\$&') + '%');
    }
    query = query.range(from, from + pageSize - 1);
    const result = await query;
    this.fail('List parent directory page', result.error);
    return {
      rows: (result.data ?? []) as unknown as ParentDirectoryRecord[],
      total: result.count ?? 0,
    };
  }

  async directoryCounts(): Promise<{
    readonly total: number;
    readonly active: number;
    readonly inactive: number;
    readonly children: number;
    readonly newThisMonth: number;
  }> {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const [total, active, inactive, children, recent] = await Promise.all([
      this.db.client.from('parents').select('id', { count: 'exact', head: true }),
      this.db.client
        .from('parents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      this.db.client
        .from('parents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'inactive'),
      this.db.client.from('student_parents').select('student_id', { count: 'exact', head: true }),
      this.db.client
        .from('parents')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString()),
    ]);
    for (const result of [total, active, inactive, children, recent])
      this.fail('Count parent directory', result.error);
    return {
      total: total.count ?? 0,
      active: active.count ?? 0,
      inactive: inactive.count ?? 0,
      children: children.count ?? 0,
      newThisMonth: recent.count ?? 0,
    };
  }
  async photoUrl(path: string): Promise<string> {
    return this.storage.signedUrl('parent-photos', path);
  }

  async getById(id: string): Promise<ParentDetailRecord> {
    const r = await this.db.client
      .from('parents')
      .select(
        '*,student_parents(is_primary,can_pick_up,student:students(id,student_code,full_name,date_of_birth,phone,status,photo_path))',
      )
      .eq('id', id)
      .single();
    this.fail('Get parent', r.error);
    const data = r.data as unknown as Omit<ParentDetailRecord, 'photo_url'>;
    return {
      ...data,
      photo_url: data['photo_path']
        ? await this.storage.signedUrl('parent-photos', data['photo_path'])
        : null,
    };
  }
  async getByProfile(profileId: string): Promise<ParentDetailRecord> {
    const r = await this.db.client
      .from('parents')
      .select('id')
      .eq('profile_id', profileId)
      .maybeSingle();
    this.fail('Get parent profile', r.error);
    if (!r.data) throw new Error('No parent record is linked to this account.');
    return this.getById(r.data.id);
  }

  async create(value: ParentWrite, photo?: File | null) {
    const r = await this.db.client.from('parents').insert(value).select().single();
    this.fail('Create parent', r.error);
    if (photo) {
      const photoPath = await this.storage.upload('parent-photos', r.data.id, photo);
      const updated = await this.db.client
        .from('parents')
        .update({ photo_path: photoPath })
        .eq('id', r.data.id)
        .select()
        .single();
      this.fail('Save parent photo', updated.error);
      return updated.data;
    }
    return r.data;
  }

  async update(id: string, value: ParentWrite, photo?: File | null) {
    const payload = { ...value };
    if (photo) payload['photo_path'] = await this.storage.upload('parent-photos', id, photo);
    const r = await this.db.client.from('parents').update(payload).eq('id', id).select().single();
    this.fail('Update parent', r.error);
    return r.data;
  }

  async updateOwnProfile(value: ParentWrite, photo?: File | null) {
    const user = await this.db.client.auth.getUser();
    this.fail('Get signed-in parent', user.error);
    if (!user.data.user) throw new Error('Get signed-in parent: session is unavailable.');
    const current = await this.db.client
      .from('parents')
      .select('id,photo_path')
      .eq('profile_id', user.data.user.id)
      .single();
    this.fail('Get parent profile', current.error);
    if (!current.data) throw new Error('Get parent profile: parent record is unavailable.');
    const oldPhotoPath = current.data.photo_path as string | null;
    let newPhotoPath: string | null = null;
    try {
      if (photo) newPhotoPath = await this.storage.upload('parent-photos', current.data.id, photo);
      const result = await this.db.client.rpc('parent_update_own_profile', {
        p_payload: { ...value, ...(newPhotoPath ? { photo_path: newPhotoPath } : {}) },
      });
      this.fail('Update parent profile', result.error);
      if (newPhotoPath && oldPhotoPath && oldPhotoPath !== newPhotoPath)
        await this.storage.remove('parent-photos', oldPhotoPath).catch(() => undefined);
      return result.data;
    } catch (error) {
      if (newPhotoPath)
        await this.storage.remove('parent-photos', newPhotoPath).catch(() => undefined);
      throw error;
    }
  }

  async deleteParent(id: string): Promise<void> {
    const r = await this.db.client.from('parents').delete().eq('id', id);
    this.fail('Delete parent', r.error);
  }


}

@Injectable({ providedIn: 'root' })
export class CoachesService extends TableService {

  private readonly storage = inject(StorageService);
  async list() {
    const rows = await readAllPages('List coaches', (offset, limit) => this.db.client
      .from('coaches').select('*, coach_specializations(*)', { count: 'exact' })
      .order('full_name').order('id').range(offset, offset + limit - 1));
    return Promise.all(
      rows.map(async (coach) => ({
        ...coach,
        photo_url: coach.photo_path
          ? await this.storage.signedUrl('coach-photos', coach.photo_path)
          : (coach.photo_url ?? null),
      })),
    );
  }
  async save(value: CoachWrite) {
    const r = await this.db.client.from('coaches').upsert(value).select().single();
    this.fail('Save coach', r.error);
    return r.data;
  }
  async getById(id: string): Promise<CoachDetailRecord> {
    const r = await this.db.client
      .from('coaches')
      .select(
        '*,coach_specializations(*),batch_coaches(is_primary,batch:batches(id,code,name,age_group,skill_level,start_time,end_time,status))',
      )
      .eq('id', id)
      .single();
    this.fail('Get coach', r.error);
    return {
      ...r.data,
      photo_url: r.data.photo_path
        ? await this.storage.signedUrl('coach-photos', r.data.photo_path)
        : (r.data.photo_url ?? null),
    } as unknown as CoachDetailRecord;
  }
  async create(value: CoachWrite, specializations: readonly string[], photo?: File | null) {
    const r = await this.db.client.from('coaches').insert(value).select().single();
    this.fail('Create coach', r.error);
    await this.saveSpecializations(r.data.id, specializations);
    if (photo) {
      const path = await this.storage.upload('coach-photos', r.data.id, photo);
      const updated = await this.db.client
        .from('coaches')
        .update({ photo_path: path })
        .eq('id', r.data.id)
        .select()
        .single();
      this.fail('Save coach photo', updated.error);
      return updated.data;
    }
    return r.data;
  }
  async update(
    id: string,
    value: CoachWrite,
    specializations: readonly string[],
    photo?: File | null,
  ) {
    const payload = { ...value };
    if (photo) payload['photo_path'] = await this.storage.upload('coach-photos', id, photo);
    const r = await this.db.client.from('coaches').update(payload).eq('id', id).select().single();
    this.fail('Update coach', r.error);
    await this.saveSpecializations(id, specializations);
    return r.data;
  }
  private async saveSpecializations(coachId: string, values: readonly string[]): Promise<void> {
    const removed = await this.db.client
      .from('coach_specializations')
      .delete()
      .eq('coach_id', coachId);
    this.fail('Update coach specializations', removed.error);
    const rows = [...new Set(values.map((value) => value.trim()).filter(Boolean))].map(
      (specialization) => ({ coach_id: coachId, specialization }),
    );
    if (!rows.length) return;
    const inserted = await this.db.client.from('coach_specializations').insert(rows);
    this.fail('Save coach specializations', inserted.error);
  }
  async deleteCoach(id: string): Promise<void> {
    const r = await this.db.client.from('coaches').delete().eq('id', id);
    this.fail('Delete coach', r.error);
  }
}

@Injectable({ providedIn: 'root' })
export class BatchesService extends TableService {
  async list() {
    return readAllPages('List batches', (offset, limit) => this.db.client
      .from('batches')
      .select('*, batch_days(*), batch_coaches(*, coach:coaches(*)), fee_plan:fee_plans(*)', { count: 'exact' })
      .order('name').order('id').range(offset, offset + limit - 1));
  }
  async save(value: BatchWrite) {
    const r = await this.db.client.from('batches').upsert(value).select().single();
    this.fail('Save batch', r.error);
    return r.data;
  }
  async listPage(
    page: number,
    pageSize: number,
    filters: {
      readonly search?: string;
      readonly age?: string;
      readonly type?: string;
      readonly status?: string;
    } = {},
  ): Promise<PageResult<BatchDirectoryRecord>> {
    const result = await this.db.client.rpc('get_admin_batch_page', {
      p_search: filters.search?.trim() ?? '',
      p_age: filters.age ?? 'all',
      p_type: filters.type ?? 'all',
      p_status: filters.status ?? 'all',
      p_offset: Math.max(0, page - 1) * pageSize,
      p_limit: pageSize,
    });
    this.fail('List batch directory page', result.error);
    const rows = (result.data ?? []) as BatchDirectoryRecord[];
    return { rows, total: Number(rows[0]?.total_count ?? 0) };
  }
}

@Injectable({ providedIn: 'root' })
export class EnrollmentsService extends TableService {
  private async allRows<T>(table: string, columns: string): Promise<T[]> {
    const rows: T[] = [];
    for (let offset = 0; ; offset += 500) {
      const result = await this.db.client.from(table).select(columns).order('id').range(offset, offset + 499);
      this.fail(`Load ${table}`, result.error);
      const page = (result.data ?? []) as unknown as T[];
      rows.push(...page);
      if (page.length < 500) return rows;
    }
  }
  async workspace(): Promise<EnrollmentWorkspace> {
    const [students, batches, plans, enrollments] = await Promise.all([
      this.allRows<EnrollmentStudent>('students', 'id,student_code,full_name,date_of_birth,phone,status'),
      this.allRows<EnrollmentBatch>('batches', 'id,code,name,status,capacity,fee_plan_id'),
      this.allRows<EnrollmentPlan>('fee_plans', 'id,name,monthly_fee,duration_months,status'),
      this.allRows<EnrollmentRecord>('enrollments', 'id,student_id,batch_id,fee_plan_id,status,valid_from,valid_till,monthly_fee,notes'),
    ]);
    return { students, batches, plans, enrollments };
  }
  async historyPage(filters: EnrollmentHistoryFilters, page = 1, pageSize = 5) {
    if (filters.columns) {
      const allowed = ['created_at', 'recorded_date', 'effective_on', 'student_text', 'action_text', 'batch_text', 'actor_text', 'reason'];
      let query = this.db.client.from('enrollment_history_columns').select('*', { count: 'exact' });
      for (const [key, value] of Object.entries(filters.columns)) {
        const field = key.replace(/^cf_/, ''); if (!value || !allowed.includes(field)) continue;
        query = ['recorded_date', 'effective_on'].includes(field) ? query.eq(field, value) : query.ilike(field, `%${value.replace(/[\\%_]/g, '\\$&')}%`);
      }
      const size = Math.min(500, Math.max(1, pageSize)), offset = (Math.max(1, page) - 1) * size;
      const result = await query.order(allowed.includes(filters.sortBy ?? '') ? filters.sortBy! : 'created_at', { ascending: filters.sortDirection === 'asc' }).order('id').range(offset, offset + size - 1);
      this.fail('Load enrollment history', result.error);
      return { rows: (result.data ?? []) as unknown as EnrollmentHistoryRow[], total: result.count ?? 0 };
    }
    let query = this.db.client.from('enrollment_history').select(
      'id,event_type,previous_status,new_status,effective_on,created_at,reason,changed_by,enrollment:enrollments!inner(student_id,student:students!inner(full_name,student_code)),from_batch:batches!from_batch_id(name),to_batch:batches!to_batch_id(name),actor:profiles!changed_by(full_name)',
      { count: 'exact' },
    );
    if (filters.search.trim()) query = query.ilike('enrollment.student.full_name', `%${filters.search.trim().replace(/[\\%_]/g, '\\$&')}%`);
    if (filters.studentId) query = query.eq('enrollment.student_id', filters.studentId);
    if (filters.batchId) query = query.or(`from_batch_id.eq.${filters.batchId},to_batch_id.eq.${filters.batchId}`);
    if (filters.action === 'created' || filters.action === 'transferred') query = query.eq('event_type', filters.action);
    else if (filters.action) query = query.eq('event_type', 'status_changed').eq('new_status', filters.action);
    if (filters.from) query = query.gte('effective_on', filters.from);
    if (filters.to) query = query.lte('effective_on', filters.to);
    const limit = Math.min(500, Math.max(1, pageSize));
    const offset = (Math.max(1, page) - 1) * limit;
    const result = await query.order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1);
    this.fail('Load enrollment history', result.error);
    return { rows: (result.data ?? []) as unknown as EnrollmentHistoryRow[], total: result.count ?? 0 };
  }
  async exportHistory(filters: EnrollmentHistoryFilters): Promise<EnrollmentHistoryRow[]> {
    const rows: EnrollmentHistoryRow[] = [];
    for (let page = 1; ; page++) {
      const result = await this.historyPage(filters, page, 500);
      rows.push(...result.rows);
      if (rows.length >= result.total || result.rows.length < 500) return rows;
    }
  }
  async list() {
    return readAllPages('List enrollments', (offset, limit) => this.db.client
      .from('enrollments')
      .select('*, student:students(*), batch:batches(*), fee_plan:fee_plans(*)', { count: 'exact' })
      .order('created_at', { ascending: false }).order('id').range(offset, offset + limit - 1));
  }
  async create(
    studentId: string,
    batchId: string,
    feePlanId: string,
    validFrom: string,
    validTill?: string,
    notes?: string,
  ) {
    const r = await this.db.client.rpc('create_enrollment', {
      p_student_id: studentId,
      p_batch_id: batchId,
      p_fee_plan_id: feePlanId,
      p_valid_from: validFrom,
      p_valid_till: validTill ?? null,
      p_notes: notes ?? null,
    });
    this.fail('Create enrollment', r.error);
    return r.data;
  }
  async changeStatus(id: string, status: 'active' | 'paused' | 'cancelled', reason?: string) {
    const r = await this.db.client.rpc('change_enrollment_status', {
      p_enrollment_id: id,
      p_status: status,
      p_reason: reason ?? null,
    });
    this.fail('Change enrollment status', r.error);
    return r.data;
  }
  async transfer(id: string, batchId: string, effectiveOn: string, reason?: string) {
    const r = await this.db.client.rpc('transfer_enrollment', {
      p_enrollment_id: id,
      p_batch_id: batchId,
      p_effective_on: effectiveOn,
      p_reason: reason ?? null,
    });
    this.fail('Transfer enrollment', r.error);
    return r.data;
  }
}

@Injectable({ providedIn: 'root' })
export class AttendanceService extends TableService {
  async history(
    from: string,
    to: string,
    page = 1,
    pageSize = 100,
    filters: {
      studentId?: string;
      batchId?: string;
      status?: string;
      search?: string;
      sortBy?: string; columns?: Record<string, string>;
      sortDirection?: 'asc' | 'desc';
    } = {},
  ) {
    if (filters.columns) { const r = await this.db.client.rpc('get_attendance_table_page', { p_resource: 'history', p_page: page, p_size: pageSize, p_columns: filters.columns, p_sort: ({ attendanceDate: 'attendance_date', checkIn: 'check_in_text' } as Record<string, string>)[filters.sortBy ?? 'attendanceDate'] ?? filters.sortBy, p_direction: filters.sortDirection ?? 'desc', p_scope: { studentId: filters.studentId, batchId: filters.batchId, from: filters.columns['cf_attendance_date'] ? '' : from, to: filters.columns['cf_attendance_date'] ? '' : to } }); this.fail('List attendance', r.error); return r.data as { rows: AttendanceHistoryRecord[]; total: number; page: number }; }
    const start = Math.max(0, (page - 1) * pageSize);
    let query = this.db.client
      .from('attendance_records')
      .select('*,student:students!inner(id,student_code,full_name),batch:batches(id,name)', {
        count: 'exact',
      })
      .gte('attendance_date', from)
      .lte('attendance_date', to);
    if (filters.studentId) query = query.eq('student_id', filters.studentId);
    if (filters.batchId) query = query.eq('batch_id', filters.batchId);
    if (filters.status) query = query.eq('status', filters.status);
    const search = filters.search?.trim().replace(/[%_,()\\"]/g, ' ');
    if (search) query = query.ilike('student.full_name', `%${search}%`);
    const ascending = filters.sortDirection === 'asc';
    const sortBy = filters.sortBy ?? 'attendanceDate';
    if (sortBy === 'student') query = query.order('full_name', { referencedTable: 'student', ascending });
    else {
      const sortColumns = {
        attendanceDate: 'attendance_date',
        checkIn: 'check_in_at',
        status: 'status',
      } as const;
      query = query.order(sortColumns[sortBy as keyof typeof sortColumns] ?? 'attendance_date', { ascending });
    }
    const r = await query.order('id', { ascending: true }).range(start, start + pageSize - 1);
    this.fail('List attendance history', r.error);
    return { rows: (r.data ?? []) as unknown as AttendanceHistoryRecord[], total: r.count ?? 0 };
  }
  async listCorrections(status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending') {
    let q = this.db.client
      .from('attendance_corrections')
      .select(
        '*,attendance:attendance_records(id,attendance_date,status,student:students(id,student_code,full_name),batch:batches(id,name))',
      )
      .order('created_at', { ascending: false });
    if (status !== 'all') q = q.eq('resolution_status', status);
    const r = await q;
    this.fail('List attendance corrections', r.error);
    return (r.data ?? []) as unknown as AttendanceCorrectionRecord[];
  }
  async correctionPage(
    page: number,
    pageSize: number,
    filters: {
      readonly status: 'pending' | 'approved' | 'rejected' | 'all';
      readonly search: string;
      readonly sortBy: string; readonly columns?: Record<string, string>;
      readonly sortDirection: 'asc' | 'desc';
    },
  ): Promise<{ rows: AttendanceCorrectionRecord[]; total: number; page: number }> {
    if (filters.columns) { const r = await this.db.client.rpc('get_attendance_table_page', { p_resource: 'corrections', p_page: page, p_size: pageSize, p_columns: filters.columns, p_sort: ({ createdAt: 'created_at', attendanceDate: 'attendance_date', status: 'resolution_status' } as Record<string, string>)[filters.sortBy] ?? filters.sortBy, p_direction: filters.sortDirection }); this.fail('List corrections', r.error); return r.data; }
    const result = await this.db.client.rpc('get_attendance_correction_page', {
      p_page: page,
      p_size: pageSize,
      p_status: filters.status,
      p_search: filters.search,
      p_sort_by: filters.sortBy,
      p_sort_direction: filters.sortDirection,
    });
    this.fail('List attendance corrections', result.error);
    return result.data as { rows: AttendanceCorrectionRecord[]; total: number; page: number };
  }
  async resolveCorrection(id: string, approve: boolean, reason?: string) {
    const r = await this.db.client.rpc('resolve_attendance_correction', {
      p_correction_id: id,
      p_approve: approve,
      p_resolution_reason: reason?.trim() || null,
    });
    this.fail(approve ? 'Approve attendance correction' : 'Reject attendance correction', r.error);
    return r.data;
  }
  async list(date: string, batchId?: string) {
    let q = this.db.client
      .from('attendance_records')
      .select('*, student:students(*), batch:batches(*)')
      .eq('attendance_date', date);
    if (batchId) q = q.eq('batch_id', batchId);
    const r = await q.order('check_in_at');
    this.fail('List attendance', r.error);
    return r.data ?? [];
  }
  async checkIn(qrToken: string, batchId: string, idempotencyKey = crypto.randomUUID()) {
    const r = await this.db.client.rpc('attendance_check_in', {
      p_qr_token: qrToken,
      p_batch_id: batchId,
      p_source: 'qr',
      p_idempotency_key: idempotencyKey,
    });
    this.fail('Check in', r.error);
    return r.data;
  }
  async checkOut(attendanceId: string, idempotencyKey = crypto.randomUUID()) {
    const r = await this.db.client.rpc('attendance_check_out', {
      p_attendance_id: attendanceId,
      p_idempotency_key: idempotencyKey,
    });
    this.fail('Check out', r.error);
    return r.data;
  }
  async correct(
    attendanceId: string,
    values: {
      readonly status?: string;
      readonly check_in_at?: string | null;
      readonly check_out_at?: string | null;
    },
    reason: string,
  ) {
    const r = await this.db.client.rpc('correct_attendance', {
      p_attendance_id: attendanceId,
      p_values: values,
      p_reason: reason,
    });
    this.fail('Correct attendance', r.error);
    return r.data;
  }
  subscribe(onChange: () => void): RealtimeChannel {
    return this.db.client
      .channel('attendance-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_records' },
        onChange,
      )
      .subscribe();
  }
}

@Injectable({ providedIn: 'root' })
export class FeesService extends TableService {
  async invoice(id: string) {
    const result = await this.db.client.from('monthly_charge_balances').select('*,student:students(full_name,student_code),enrollment:enrollments(batch:batches(name))').eq('id', id).single();
    this.fail('Load invoice', result.error); return result.data;
  }
  async createCharge(enrollmentId: string, month: string, dueDate: string, amount: number) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('Enter a valid month, due date and positive amount.');
    }
    const enrollment = await this.db.client.from('enrollments').select('student_id,status,valid_from,valid_till').eq('id', enrollmentId).single();
    this.fail('Load charge enrollment', enrollment.error);
    const row = enrollment.data;
    if (!row || row.status !== 'active') throw new Error('Select an active enrollment.');
    if (row.valid_from.slice(0, 7) > month || (row.valid_till && row.valid_till.slice(0, 7) < month)) throw new Error('The charge month must fall within the enrollment dates.');
    const result = await this.db.client.from('monthly_charges').insert({
      enrollment_id: enrollmentId, student_id: row.student_id, charge_month: `${month}-01`, due_date: dueDate, base_amount: Math.round(amount * 100) / 100,
    }).select('id').single();
    if (result.error?.code === '23505') throw new Error('A charge already exists for this enrollment and month.');
    this.fail('Create monthly charge', result.error);
    return result.data;
  }
  async plans() {
    const r = await this.db.client.from('fee_plans').select('*').order('name');
    this.fail('List fee plans', r.error);
    return r.data ?? [];
  }
  async savePlan(value: FeePlanWrite) {
    const r = await this.db.client.from('fee_plans').upsert(value).select().single();
    this.fail('Save fee plan', r.error);
    return r.data;
  }

  async savePlanAdmin(value: FeePlanWrite) {
    const r = await this.db.client.from('fee_plans').upsert(value).select().single();
    this.fail('Save fee plan (admin)', r.error);
    return r.data;
  }

  async deletePlan(id: string) {
    const r = await this.db.client.from('fee_plans').delete().eq('id', id);
    this.fail('Delete fee plan', r.error);
  }
  async charges(status?: string) {
    const rows = await readAllPages('List charges', (offset, limit) => {
      let q = this.db.client
        .from('monthly_charge_balances')
        .select('*, student:students(*)', { count: 'exact' })
        .order('due_date', { ascending: false }).order('id').range(offset, offset + limit - 1);
      if (status) q = q.eq('status', status);
      return q;
    });
    return rows as unknown as ChargeBalanceRecord[];
  }
  async chargePage(
    page: number,
    pageSize: number,
    filters: {
      readonly search?: string;
      readonly batchId?: string;
      readonly status?: string;
      readonly sortBy?: string;
      readonly columns?: Record<string, string>;
      readonly sortDirection?: 'asc' | 'desc';
    } = {},
  ): Promise<PageResult<FeeChargeRecord>> {
    if (filters.columns) {
      const r = await this.db.client.rpc('get_staff_list_page', { p_resource: 'charges', p_page: page, p_size: pageSize, p_filters: { ...filters.columns, sortBy: filters.sortBy === 'dueDate' ? 'date' : filters.sortBy, sortDirection: filters.sortDirection } });
      this.fail('List monthly charges', r.error); return r.data as PageResult<FeeChargeRecord>;
    }
    let studentIds: string[] | undefined;
    let enrollmentIds: string[] | undefined;
    const search = filters.search?.trim().replace(/[%_,()\\"]/g, ' ');
    if (search) {
      const students = await this.db.client
        .from('students')
        .select('id')
        .ilike('full_name', `%${search}%`);
      this.fail('Filter charges by student', students.error);
      studentIds = (students.data ?? []).map((row) => String(row.id));
      if (!studentIds.length) return { rows: [], total: 0 };
    }
    if (filters.batchId && filters.batchId !== 'all') {
      const enrollments = await this.db.client
        .from('enrollments')
        .select('id')
        .eq('batch_id', filters.batchId);
      this.fail('Filter charges by batch', enrollments.error);
      enrollmentIds = (enrollments.data ?? []).map((row) => String(row.id));
      if (!enrollmentIds.length) return { rows: [], total: 0 };
    }
    const from = Math.max(0, page - 1) * pageSize;
    let query = this.db.client
      .from('monthly_charge_balances')
      .select('*,student:students(full_name)', { count: 'exact' });
    if (studentIds) query = query.in('student_id', studentIds);
    if (enrollmentIds) query = query.in('enrollment_id', enrollmentIds);
    if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status);
    const ascending = filters.sortDirection === 'asc';
    const sortBy = filters.sortBy ?? 'dueDate';
    if (sortBy === 'student') query = query.order('full_name', { referencedTable: 'student', ascending });
    else {
      const columns = {
        dueDate: 'due_date',
        period: 'charge_month',
        amount: 'final_amount',
        balance: 'balance_amount',
        status: 'status',
      } as const;
      query = query.order(columns[sortBy as keyof typeof columns] ?? 'due_date', { ascending });
    }
    query = query.order('id', { ascending: true }).range(from, from + pageSize - 1);
    const result = await query;
    this.fail('List charge page', result.error);
    const rows = (result.data ?? []) as unknown as Omit<
      FeeChargeRecord,
      'batch_id' | 'batch_name'
    >[];
    const pageEnrollmentIds = [...new Set(rows.map((row) => row.enrollment_id))];
    const enrollmentResult = pageEnrollmentIds.length
      ? await this.db.client
        .from('enrollments')
        .select('id,batch_id,batch:batches(name),plan:fee_plans(name)')
        .in('id', pageEnrollmentIds)
      : { data: [], error: null };
    this.fail('Load charge batches', enrollmentResult.error);
    const batches = new Map(
      (enrollmentResult.data ?? []).map((row) => {
        const batch = row.batch as unknown as { name: string } | null;
        const plan = row.plan as unknown as { name: string } | null;
        return [
          String(row.id),
          { id: String(row.batch_id), name: batch?.name ?? 'Not assigned', planName: plan?.name ?? 'Not assigned' },
        ] as const;
      }),
    );
    return {
      rows: rows.map((row) => ({
        ...row,
        batch_id: batches.get(row.enrollment_id)?.id ?? '',
        batch_name: batches.get(row.enrollment_id)?.name ?? 'Not assigned',
        plan_name: batches.get(row.enrollment_id)?.planName ?? 'Not assigned',
      })),
      total: result.count ?? 0,
    };
  }

  async batchOptions(): Promise<readonly { readonly id: string; readonly name: string }[]> {
    const result = await this.db.client.from('batches').select('id,name').order('name');
    this.fail('List fee batch options', result.error);
    return result.data ?? [];
  }

  async chargeSummary(): Promise<{
    readonly students: number;
    readonly total: number;
    readonly pending: number;
    readonly overdue: number;
  }> {
    const result = await this.db.client.rpc('get_fee_charge_summary');
    this.fail('Load fee charge summary', result.error);
    const value = result.data as {
      students?: number;
      total?: number;
      pending?: number;
      overdue?: number;
    } | null;
    return {
      students: Number(value?.students ?? 0),
      total: Number(value?.total ?? 0),
      pending: Number(value?.pending ?? 0),
      overdue: Number(value?.overdue ?? 0),
    };
  }
  async generate(month: string, dueDay?: number) {
    const r = await this.db.client.rpc('generate_monthly_charges', {
      p_month: month,
      p_due_day: dueDay ?? null,
    });
    this.fail('Generate monthly charges', r.error);
    return r.data as number;
  }
  async discounts() {
    const r = await this.db.client.from('discounts').select('*').order('name');
    this.fail('List discounts', r.error);
    return r.data ?? [];
  }
  async saveDiscount(value: DiscountWrite) {
    const r = await this.db.client.from('discounts').upsert(value).select().single();
    this.fail('Save discount', r.error);
    return r.data;
  }
  async deleteDiscount(id: string) {
    const r = await this.db.client.from('discounts').delete().eq('id', id);
    this.fail('Delete discount', r.error);
  }
  async lateFeeRules() {
    const r = await this.db.client.from('late_fee_rules').select('*').order('name');
    this.fail('List late fee rules', r.error);
    return r.data ?? [];
  }
  async saveLateFeeRule(value: LateFeeRuleWrite) {
    const r = await this.db.client.from('late_fee_rules').upsert(value).select().single();
    this.fail('Save late fee rule', r.error);
    return r.data;
  }
  async deleteLateFeeRule(id: string) {
    const r = await this.db.client.from('late_fee_rules').delete().eq('id', id);
    this.fail('Delete late fee rule', r.error);
  }
}

@Injectable({ providedIn: 'root' })
export class PaymentsService extends TableService {
  async ledgerPage(
    view: string,
    page: number,
    pageSize: number,
    studentIds?: readonly string[],
    filters: {
      readonly columns?: Record<string, string>;
      readonly search?: string;
      readonly status?: string;
      readonly sortBy?: 'date' | 'student' | 'amount' | 'status' | 'mode' | 'receipt';
      readonly sortDirection?: 'asc' | 'desc';
    } = {},
  ) {
    const result = await this.db.client.rpc('get_payment_list_page', {
      ...(filters.columns ? { p_columns: filters.columns } : {}),
      p_view: view,
      p_offset: (page - 1) * pageSize,
      p_limit: pageSize,
      p_student_ids: studentIds ?? null,
      p_search: filters.search?.trim() ?? '',
      p_status: filters.status || 'all',
      p_sort_by: filters.sortBy ?? 'date',
      p_sort_direction: filters.sortDirection ?? 'desc',
    });
    this.fail('Load payment ledger', result.error);
    return result.data as { rows: PaymentHistoryRecord[]; total: number; metrics: { total: number; transactions: number; receipts: number; refunded: number } };
  }
  async record(
    chargeId: string,
    amount: number,
    mode: string,
    clientReference: string = crypto.randomUUID(),
    providerReference?: string,
  ) {
    const r = await this.db.client.rpc('record_payment', {
      p_charge_id: chargeId,
      p_amount: amount,
      p_mode: mode,
      p_client_reference: clientReference,
      p_provider_reference: providerReference ?? null,
    });
    // A response can be lost after the transaction commits. Recover only the
    // exact successful payment from the same attempt; never submit a new key.
    if (r.error) {
      const previous = await this.db.client.from('payments').select('*,receipt:receipts(*)').eq('client_reference', clientReference).maybeSingle();
      const payment = previous.data;
      if (!previous.error && payment && payment.status === 'successful' && payment.monthly_charge_id === chargeId && Number(payment.amount) === amount && payment.payment_mode === mode) {
        const { receipt, ...saved } = payment;
        return { payment: saved, receipt: Array.isArray(receipt) ? receipt[0] : receipt };
      }
    }
    this.fail('Record payment', r.error);
    return r.data;
  }
  async history(studentId?: string) {
    let q = this.db.client
      .from('payments')
      .select('*, student:students(full_name,student_code), receipt:receipts(*)')
      .order('paid_at', { ascending: false });
    if (studentId) q = q.eq('student_id', studentId);
    const r = await q;
    this.fail('Payment history', r.error);
    return r.data ?? [];
  }
  async historyPage(page: number, pageSize: number, statuses?: readonly string[]) {
    const from = (page - 1) * pageSize,
      to = from + pageSize - 1;
    let q = this.db.client
      .from('payments')
      .select('*, student:students(full_name,student_code), receipt:receipts(*)', {
        count: 'exact',
      })
      .order('paid_at', { ascending: false })
      .range(from, to);
    if (statuses?.length) q = q.in('status', statuses);
    const r = await q;
    this.fail('Payment history', r.error);
    return { rows: (r.data ?? []) as unknown as PaymentHistoryRecord[], total: r.count ?? 0 };
  }
  async refund(
    paymentId: string,
    amount: number,
    reason: string,
    clientReference: string = crypto.randomUUID(),
  ) {
    const r = await this.db.client.rpc('refund_payment', {
      p_payment_id: paymentId,
      p_amount: amount,
      p_reason: reason,
      p_client_reference: clientReference,
    });
    if (r.error) {
      const previous = await this.db.client.from('payment_refunds').select('*').eq('client_reference', clientReference).maybeSingle();
      if (!previous.error && previous.data?.payment_id === paymentId && Number(previous.data.amount) === amount && previous.data.reason === reason.trim()) return previous.data;
    }
    this.fail('Refund payment', r.error);
    return r.data;
  }
  async saveReceiptPath(receiptId: string, storagePath: string): Promise<void> {
    const r = await this.db.client
      .from('receipts')
      .update({ storage_path: storagePath })
      .eq('id', receiptId);
    this.fail('Save receipt file', r.error);
  }
}

export interface AcademySettingsRecord {
  readonly academy_name: string;
  readonly academy_code: string;
  readonly contact_email: string | null;
  readonly academy_logo_url: string;
  readonly contact_phone: string | null;
  readonly academy_description: string;
  readonly address: string | null;
  readonly timezone: string;
  readonly currency_code: string;
  readonly attendance_grace_minutes: number;
  readonly fee_due_day: number;
  readonly notification_channels: readonly string[];
  readonly theme_preference: string;
}

@Injectable({ providedIn: 'root' })
export class AcademySettingsService extends TableService {
  private readonly preferences = inject(AcademyPreferencesService);
  async get(): Promise<AcademySettingsRecord> {
    const r = await this.db.client.from('academy_settings').select('*').eq('id', true).single();
    this.fail('Load academy settings', r.error);
    this.preferences.value.set(r.data as AcademySettingsRecord);
    return r.data as AcademySettingsRecord;
  }
  async save(value: AcademySettingsRecord): Promise<AcademySettingsRecord> {
    const r = await this.db.client
      .from('academy_settings')
      .update({ ...value, updated_at: new Date().toISOString() })
      .eq('id', true)
      .select()
      .single();
    this.fail('Save academy settings', r.error);
    this.preferences.value.set(r.data as AcademySettingsRecord);
    return r.data as AcademySettingsRecord;
  }
}

export interface NotificationListFilters {
  readonly studentId?: string;
  readonly recipientId?: string;
  readonly batchId?: string;
  readonly from?: string;
  readonly to?: string;
  readonly studentName?: string;
  readonly columns?: Record<string, string>;
  readonly search?: string;
  readonly sortBy?: 'createdAt' | 'subject' | 'recipient' | 'status' | 'channel' | 'templateKey';
  readonly sortDirection?: 'asc' | 'desc';
}

export interface NotificationScope extends NotificationListFilters {
  readonly status?: string;
  readonly channel?: string;
  readonly parentId?: string;
  readonly templateCategory?: string;
}

export interface NotificationEvidence {
  readonly manual_state?: string | null;
  readonly manual_updated_at?: string | null;
  readonly status?: string;
  readonly provider_message_id?: string | null;
  readonly retry_count?: number;
  readonly failure_reason?: string | null;
  readonly delivery_uncertain?: boolean;
  readonly sent_at?: string | null;
  readonly read_at?: string | null;
}
export interface NotificationEvent {
  readonly id: string;
  readonly occurred_at: string;
  readonly actor_id: string | null;
  readonly event_type: 'created' | 'delivery_changed' | 'read' | 'manual_changed';
  readonly evidence: { readonly before: NotificationEvidence | null; readonly after: NotificationEvidence };
}

@Injectable({ providedIn: 'root' })
export class NotificationsService extends TableService {
  private readonly preferences = inject(AcademyPreferencesService);
  async filterOptions(kind: 'student' | 'recipient' | 'batch', search: string, selected = '') {
    const result = await this.db.client.rpc('notification_filter_options', { p_kind: kind, p_search: search, p_selected: selected });
    this.fail('Load notification filter choices', result.error);
    return (result.data ?? []) as { value: string; label: string }[];
  }
  async manualWhatsApp(id: string, action: 'request' | 'confirm' | 'cancel') {
    const result = await this.db.client.rpc('record_manual_whatsapp', { p_id: id, p_action: action });
    this.fail('Record manual WhatsApp activity', result.error);
    const saved = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!saved || typeof saved.recipient !== 'string' || typeof saved.body !== 'string'
      || typeof saved.manual_state !== 'string') throw new Error('Manual activity returned no valid saved message.');
    return saved as { recipient: string; body: string; manual_state: string };
  }
  async history(id: string) {
    const result = await this.db.client.from('notification_events')
      .select('id,occurred_at,actor_id,event_type,evidence')
      .eq('notification_id', id)
      .order('occurred_at', { ascending: false })
      .order('id', { ascending: false }).limit(100);
    this.fail('Load notification history', result.error);
    return (result.data ?? []) as NotificationEvent[];
  }
  async deliveryAction(action: 'configuration' | 'send' | 'status', id?: string): Promise<{ channels?: string[]; status?: string }> {
    const result = await this.db.client.functions.invoke('notification-delivery', { body: { action, id } });
    if (result.error) throw new DataRequestError('Notification delivery', result.error);
    if (result.data?.error) throw new DataRequestError('Notification delivery', result.data.error); return result.data;
  }
  async list(status?: string) {
    let q = this.db.client
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    const r = await q;
    this.fail('List notifications', r.error);
    return r.data ?? [];
  }
  async page(
    page: number,
    pageSize: number,
    status?: string,
    channel?: string,
    parentId?: string,
    templateCategory?: string,
    filters: NotificationListFilters = {},
  ) {
    const from = (page - 1) * pageSize,
      to = from + pageSize - 1;
    const sortColumns = {
      createdAt: 'created_at',
      recipient: 'recipient', subject: 'subject',
      status: 'status',
      channel: 'channel',
      templateKey: 'template_key',
    } as const;
    const sortBy = filters.sortBy ?? 'createdAt';
    const q = this.filteredNotificationQuery({ ...filters, status, channel, parentId, templateCategory })
      .order(sortColumns[sortBy], { ascending: filters.sortDirection === 'asc' })
      .order('id', { ascending: true })
      .range(from, to);
    const r = await q;
    this.fail('List notifications', r.error);
    return { rows: r.data ?? [], total: r.count ?? 0 };
  }

  /** The list and every summary use the same relational scope under caller RLS. */
  private filteredNotificationQuery(filters: NotificationScope, head = false) {
    const { status, channel, parentId, templateCategory } = filters;
    const studentName = filters.studentName?.trim();
    const selection = studentName ? '*,student:students!inner(full_name)' : '*,student:students(full_name)';
    let q = this.db.client.from('notifications').select(selection, { count: 'exact', head });
    if (filters.studentId) q = q.eq('student_id', filters.studentId);
    if (filters.recipientId) {
      const [kind, id] = filters.recipientId.split(':');
      if (kind === 'parent' || kind === 'coach') q = q.eq(kind === 'parent' ? 'parent_id' : 'coach_id', id);
    }
    if (filters.batchId) q = filters.batchId === 'unlinked' ? q.is('source_batch_id', null) : q.eq('source_batch_id', filters.batchId);
    if (studentName) q = q.ilike('student.full_name', '%' + studentName.replace(/[%_]/g, '\\$&') + '%');
    if (status === 'unread') q = q.is('read_at', null);
    else if (status) q = q.eq('status', status);
    if (channel) q = q.eq('channel', channel);
    if (parentId) q = q.eq('parent_id', parentId);
    const timeZone = (filters as NotificationScope & { timeZone?: string }).timeZone || this.preferences.value().timezone || 'Asia/Kolkata';
    const range = notificationDayRange(filters.from, filters.to, timeZone);
    if (range.gte) q = q.gte('created_at', range.gte);
    if (range.lt) q = q.lt('created_at', range.lt);
    if (templateCategory === 'birthday') q = q.ilike('template_key', '%birthday%');
    else if (templateCategory) q = q.eq('template_key', templateCategory);
    const search = filters.search?.trim().replace(/[%_,()\\"]/g, ' ');
    if (search) {
      q = q.or(
        `subject.ilike.%${search}%,body.ilike.%${search}%,recipient.ilike.%${search}%,template_key.ilike.%${search}%`,
      );
    }
    for (const [key, value] of Object.entries(filters.columns ?? {})) {
      if (!value.trim()) continue;
      if (key === 'cf_status') q = q.in('status', ['queued', 'sending', 'sent', 'delivered', 'failed'].filter(v => v.includes(value.toLowerCase())));
      else if (key === 'cf_channel') q = q.in('channel', ['in_app', 'email', 'whatsapp', 'sms'].filter(v => v.includes(value.toLowerCase())));
      else if (key === 'cf_createdAt') {
        const dayRange = notificationDayRange(value.trim(), value.trim(), timeZone);
        if (dayRange.gte) q = q.gte('created_at', dayRange.gte);
        if (dayRange.lt) q = q.lt('created_at', dayRange.lt);
      }
      else { const column = ({ cf_subject: 'subject', cf_recipient: 'recipient', cf_templateKey: 'template_key' } as Record<string, string>)[key]; if (column) q = q.ilike(column, '%' + value.replace(/[%_]/g, '\\$&') + '%'); }
    }
    return q;
  }
  /** Inbox unread count for a parent/coach; RLS scopes it to the signed-in recipient. */
  async unreadCount(): Promise<number> {
    const result = await this.db.client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null);
    this.fail('Count unread notifications', result.error);
    return result.count ?? 0;
  }

  /** Staff bell attention count: definite delivery failures that may need action. */
  async attentionCount(): Promise<number> {
    const result = await this.db.client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'failed');
    this.fail('Count failed notifications', result.error);
    return result.count ?? 0;
  }

  async counts(channel?: string, scope: Omit<NotificationScope, 'channel'> = {}) {
    let missingManualColumn: Promise<boolean> | undefined;
    const checkManualColumn = async () => {
      // HEAD errors have no response body; a zero-row GET identifies this one
      // compatibility case without hiding permission/network/query failures.
      const probe = await this.db.client.from('notifications').select('manual_state').limit(0);
      return probe.error?.code === '42703' && probe.error.message.includes('manual_state');
    };
    const count = async (statuses?: string[]) => {
      let q = this.filteredNotificationQuery({ ...scope, channel }, true);
      if (statuses) q = q.in('status', statuses).is('manual_state', null);
      let r = await q;
      // Keep the existing list usable before the additive manual-state migration.
      // Only this exact missing-column error permits fallback; other errors surface.
      if (statuses && r.error && await (missingManualColumn ??= checkManualColumn())) {
        r = await this.filteredNotificationQuery({ ...scope, channel }, true).in('status', statuses);
      }
      this.fail('Count notifications', r.error);
      return r.count ?? 0;
    };
    const [all, delivered, pending, failed] = await Promise.all([
      count(), count(['delivered']), count(['queued', 'sending']), count(['failed']),
    ]);
    return { all, delivered, pending, failed };
  }
  async markRead(id: string): Promise<void> {
    const r = await this.db.client.rpc('parent_mark_notification_read', {
      p_notification_id: id,
    });
    this.fail('Mark notification as read', r.error);
  }
  async markAllRead(): Promise<number> {
    const r = await this.db.client.rpc('parent_mark_all_notifications_read');
    this.fail('Mark all notifications as read', r.error);
    return Number(r.data ?? 0);
  }
  subscribe(onChange: () => void) {
    return this.db.client
      .channel('notifications-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, onChange)
      .subscribe();
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationTemplatesService extends TableService {
  async byKey(
    templateKey: string,
    channel = 'whatsapp',
  ): Promise<{ readonly subject: string | null; readonly body: string } | null> {
    const key = templateKey.trim();
    if (!key) return null;
    const result = await this.db.client
      .from('notification_templates')
      .select('subject,body')
      .eq('template_key', key)
      .eq('channel', channel)
      .eq('status', 'active')
      .maybeSingle();
    this.fail('Load notification template', result.error);
    if (!result.data) return null;
    return {
      subject: result.data['subject'] ?? null,
      body: String(result.data['body'] ?? ''),
    };
  }

  async birthdayPreviews() {
    const keys = ['student_birthday', 'student_birthday_email', 'student_birthday_whatsapp',
      'coach_birthday', 'coach_birthday_email', 'coach_birthday_whatsapp'];
    const result = await this.db.client.from('notification_templates')
      .select('template_key,subject,body').in('template_key', keys).limit(keys.length);
    this.fail('Load birthday previews', result.error);
    return result.data ?? [];
  }

  async page(
    page: number,
    pageSize: number,
    filters: { columns?: Record<string, string>; search?: string; channel?: string; status?: string; sortBy?: string; sortDirection?: 'asc' | 'desc' },
  ) {
    const sortColumns: Record<string, string> = {
      body: 'body', name: 'name',
      templateKey: 'template_key',
      channel: 'channel',
      status: 'status',
      updatedAt: 'updated_at',
    };
    const sortBy = filters.sortBy && Object.hasOwn(sortColumns, filters.sortBy)
      ? sortColumns[filters.sortBy]
      : 'name';
    let query = this.db.client
      .from('notification_templates')
      .select('*', { count: 'exact' })
      .neq('channel', 'sms');
    const search = filters.search?.trim().replace(/[%_,()\\"]/g, ' ');
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,template_key.ilike.%${search}%,subject.ilike.%${search}%,body.ilike.%${search}%`,
      );
    }
    if (filters.channel) query = query.eq('channel', filters.channel);
    if (filters.status) query = query.eq('status', filters.status);
    for (const [key, value] of Object.entries(filters.columns ?? {})) {
      if (!value.trim()) continue;
      if (key === 'cf_status') query = query.in('status', ['active', 'inactive'].filter(v => v.includes(value.toLowerCase())));
      else if (key === 'cf_channel') query = query.in('channel', ['in_app', 'email', 'whatsapp'].filter(v => v.includes(value.toLowerCase())));
      else { const column = ({ cf_name: 'name', cf_templateKey: 'template_key', cf_body: 'body' } as Record<string, string>)[key]; if (column) query = query.ilike(column, '%' + value.replace(/[%_]/g, '\\$&') + '%'); }
    }
    const from = (page - 1) * pageSize;
    const r = await query
      .order(sortBy, { ascending: filters.sortDirection !== 'desc' })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    this.fail('List notification templates', r.error);
    return { rows: r.data ?? [], total: r.count ?? 0 };
  }
  async save(value: NotificationTemplateWrite) {
    const r = await this.db.client.from('notification_templates').upsert(value).select().single();
    this.fail('Save notification template', r.error);
    return r.data;
  }
  async setStatus(id: string, status: 'active' | 'inactive') {
    const r = await this.db.client
      .from('notification_templates')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    this.fail('Update notification template', r.error);
  }
}

export interface AcademyEventRecord {
  readonly id: string;
  readonly event_type: 'holiday' | 'special_event';
  readonly title: string;
  readonly event_date: string;
  readonly description: string;
  readonly status: 'active' | 'inactive';
  readonly created_at: string;
}

export interface AcademyEventWrite {
  readonly id?: string;
  readonly event_type: AcademyEventRecord['event_type'];
  readonly title: string;
  readonly event_date: string;
  readonly description: string;
  readonly status?: AcademyEventRecord['status'];
}

@Injectable({ providedIn: 'root' })
export class AcademyEventsService extends TableService {
  async page(
    page: number,
    pageSize: number,
    filters: { columns?: Record<string, string>; search?: string; eventType?: string; status?: string; sortBy?: string; sortDirection?: 'asc' | 'desc' },
  ) {
    const sortColumns: Record<string, string> = {
      description: 'description', title: 'title',
      eventDate: 'event_date',
      eventType: 'event_type',
      status: 'status',
      createdAt: 'created_at',
    };
    const sortBy = filters.sortBy && Object.hasOwn(sortColumns, filters.sortBy)
      ? sortColumns[filters.sortBy]
      : 'event_date';
    let query = this.db.client
      .from('academy_events')
      .select('*', { count: 'exact' });
    const search = filters.search?.trim().replace(/[%_,()\\"]/g, ' ');
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    if (filters.eventType) query = query.eq('event_type', filters.eventType);
    if (filters.status) query = query.eq('status', filters.status);
    for (const [key, value] of Object.entries(filters.columns ?? {})) {
      if (!value.trim()) continue;
      if (key === 'cf_status') query = query.in('status', ['active', 'inactive'].filter(v => v.includes(value.toLowerCase()) || (v === 'inactive' && 'archived'.includes(value.toLowerCase()))));
      else if (key === 'cf_eventType') query = query.in('event_type', ['holiday', 'special_event'].filter(v => v.replace('_', ' ').includes(value.toLowerCase())));
      else if (key === 'cf_eventDate') query = query.eq('event_date', value);
      else { const column = ({ cf_title: 'title', cf_description: 'description' } as Record<string, string>)[key]; if (column) query = query.ilike(column, '%' + value.replace(/[%_]/g, '\\$&') + '%'); }
    }
    const from = (page - 1) * pageSize;
    const result = await query
      .order(sortBy, { ascending: filters.sortDirection === 'asc' })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    this.fail('List academy events', result.error);
    return {
      rows: (result.data ?? []) as AcademyEventRecord[],
      total: result.count ?? 0,
    };
  }

  async save(value: AcademyEventWrite) {
    const result = await this.db.client.from('academy_events').upsert(value).select().single();
    this.fail('Save academy event', result.error);
    return result.data as AcademyEventRecord;
  }

  async setStatus(id: string, status: AcademyEventRecord['status']): Promise<void> {
    const result = await this.db.client
      .from('academy_events')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    this.fail('Update academy event', result.error);
  }
}

@Injectable({ providedIn: 'root' })
export class ReportsService extends TableService {
  async coaches(from: string, to: string) {
    return readAllPages('Coach report', (offset, limit) => this.db.client
      .rpc('get_admin_coach_report', { p_from: from, p_to: to }, { count: 'exact' })
      .order('coach_id').range(offset, offset + limit - 1));
  }
  async attendance(from: string, to: string, batchId?: string) {
    return readAllPages('Attendance report', (offset, limit) => {
      let q = this.db.client
        .from('attendance_records')
        .select('*,student:students(full_name,student_code),batch:batches(name)', { count: 'exact' })
        .gte('attendance_date', from)
        .lte('attendance_date', to).order('attendance_date').order('id')
        .range(offset, offset + limit - 1);
      if (batchId) q = q.eq('batch_id', batchId);
      return q;
    });
  }
  async charges(from: string, to: string, batchId?: string, pending = false) {
    return readAllPages('Fee report', (offset, limit) => {
      let query = this.db.client.from('monthly_charge_balances')
        .select('*,student:students(full_name,student_code),enrollment:enrollments!inner(batch_id)', { count: 'exact' })
        .gte('charge_month', `${from.slice(0, 7)}-01`).lte('charge_month', `${to.slice(0, 7)}-01`)
        .order('charge_month').order('id').range(offset, offset + limit - 1);
      if (batchId) query = query.eq('enrollment.batch_id', batchId);
      if (pending) query = query.in('status', ['pending', 'partial', 'overdue']);
      return query;
    });
  }
  async collections(from: string, to: string, batchId?: string) {
    return loadPaymentBalances(this.db.client, { from, to, batchId });
  }
}
