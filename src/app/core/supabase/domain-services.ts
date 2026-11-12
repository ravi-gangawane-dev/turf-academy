import { inject, Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AcademyPreferencesService } from './academy-preferences.service';
import { DataRequestError } from './data-error';
import { DatabaseService } from './database.service';
import { BatchRosterRecord, BatchRosterStudentRecord } from './batch-workspace.service';
import { EnrollmentBatch, EnrollmentConfirmationGuardian, EnrollmentConfirmationRecord, EnrollmentHistoryFilters, EnrollmentHistoryRow, EnrollmentPlan, EnrollmentRecord, EnrollmentStudent, EnrollmentWorkspace } from './enrollment.models';
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
  readonly discount_amount?: number;
  readonly late_fee_amount?: number;
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

export type AttendanceRegisterStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'checked_out'
  | 'not_recorded';

/** One student on a batch/day attendance register, whether or not a record exists. */
export interface AttendanceRegisterRow {
  readonly studentId: string;
  readonly studentCode: string;
  readonly studentName: string;
  readonly status: AttendanceRegisterStatus;
  readonly checkInAt: string | null;
  readonly checkOutAt: string | null;
  readonly remarks: string | null;
  readonly source: string | null;
}

export interface AttendanceRegisterCounts {
  readonly expected: number;
  readonly present: number;
  readonly late: number;
  readonly absent: number;
  readonly checkedOut: number;
  readonly notRecorded: number;
}

/** Batch/day register built from real enrolments and attendance records. */
export interface AttendanceRegisterRecord {
  readonly date: string;
  readonly batchId: string;
  readonly batchCode: string;
  readonly batchName: string;
  readonly batchTime: string;
  readonly coaches: readonly string[];
  readonly rows: readonly AttendanceRegisterRow[];
  readonly counts: AttendanceRegisterCounts;
}

export type AttendanceMatrixCell =
  | 'present'
  | 'late'
  | 'absent'
  | 'checked_out'
  | 'not_recorded'
  | 'off'
  | 'not_enrolled';

export interface AttendanceMatrixDay {
  readonly date: string;
  readonly day: number;
  readonly weekday: string;
  readonly scheduled: boolean;
}

/** One student across every day of a month, including days they were not enrolled. */
export interface AttendanceMatrixRow {
  readonly studentId: string;
  readonly studentCode: string;
  readonly studentName: string;
  readonly cells: readonly AttendanceMatrixCell[];
  readonly present: number;
  readonly late: number;
  readonly absent: number;
  readonly checkedOut: number;
  readonly recorded: number;
  readonly attended: number;
  readonly percentage: number | null;
}

/** Month x student attendance grid for one batch, built from real records. */
export interface AttendanceMatrixRecord {
  readonly month: string;
  readonly monthLabel: string;
  readonly batchId: string;
  readonly batchCode: string;
  readonly batchName: string;
  readonly batchTime: string;
  readonly schedule: string;
  readonly coaches: readonly string[];
  readonly days: readonly AttendanceMatrixDay[];
  readonly rows: readonly AttendanceMatrixRow[];
}

export interface PaymentHistoryRecord {
  readonly refunded_amount?: number;
  readonly id: string;
  readonly student_id: string;
  readonly monthly_charge_id: string | null;
  readonly amount: number;
  readonly payment_mode: string;
  readonly provider_reference?: string | null;
  readonly client_reference?: string | null;
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

export interface FeeStatementLine {
  readonly date: string;
  readonly type: 'charge' | 'payment' | 'refund';
  readonly description: string;
  readonly reference: string;
  readonly debit: number;
  readonly credit: number;
  readonly balance: number;
}

export interface FeeStatementAgeingBucket {
  readonly label: string;
  readonly amount: number;
}

export interface FeeStatementRecord {
  readonly statementNumber: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly batchName?: string;
  readonly openingBalance: number;
  readonly closingBalance: number;
  readonly totalCharges: number;
  readonly totalPayments: number;
  readonly totalRefunds: number;
  readonly lines: readonly FeeStatementLine[];
  readonly ageing: readonly FeeStatementAgeingBucket[];
}

/** One refund, already linked to the payment and receipt it was issued against. */
export interface RefundReceiptRecord {
  readonly id: string;
  readonly paymentId: string;
  readonly refundReceiptNumber: string;
  readonly originalReceiptNumber: string;
  readonly studentName: string;
  readonly studentCode: string;
  readonly refundAmount: number;
  readonly originalAmount: number;
  readonly paymentMode: string;
  readonly refundedAt: string;
  readonly paidAt: string;
  readonly reason: string;
  readonly reference: string;
  readonly approvedBy?: string;
  readonly batchName?: string;
  readonly period?: string;
}

interface StatementChargeRow {
  readonly id: string;
  readonly charge_month: string;
  readonly due_date: string;
  readonly final_amount: number;
  readonly balance_amount: number;
  readonly status: string;
  readonly enrollment?: unknown;
}

interface StatementPaymentRow {
  readonly id: string;
  readonly amount: number;
  readonly payment_mode: string;
  readonly paid_at: string;
  readonly provider_reference?: string | null;
  readonly client_reference?: string | null;
  readonly receipt?: unknown;
}

interface StatementRefundRow {
  readonly id: string;
  readonly amount: number;
  readonly reason: string;
  readonly refunded_at: string;
}

interface StatementDraft {
  readonly date: string;
  readonly dateKey: string;
  readonly type: 'charge' | 'payment' | 'refund';
  readonly description: string;
  readonly reference: string;
  readonly debit: number;
  readonly credit: number;
}

const STATEMENT_SETTLED_STATUSES = ['successful', 'partially_refunded', 'refunded'] as const;
const STATEMENT_PAYMENT_MODES: Readonly<Record<string, string>> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank transfer',
  online: 'Online',
};
const STATEMENT_AGEING_LABELS = [
  'Not due',
  '1–30 days',
  '31–60 days',
  '61–90 days',
  'Over 90 days',
] as const;
const STATEMENT_TYPE_ORDER: Readonly<Record<StatementDraft['type'], number>> = {
  charge: 0,
  payment: 1,
  refund: 2,
};

function statementMinor(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function statementDateKey(value: string, timezone: string): string {
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function statementPeriod(value: string): string {
  const month = String(value ?? '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return month || 'Monthly fee';
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function statementReference(prefix: string, id: string): string {
  return `${prefix}-${String(id).replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}`;
}

function statementFirst(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) ?? null;
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

const ATTENDANCE_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const ATTENDANCE_WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const ATTENDANCE_MONTH_FORMAT = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Calendar days for the month; `scheduledDays` uses 0 = Sunday like `batch_days.day_of_week`. */
function attendanceMonthDays(
  month: string,
  scheduledDays: readonly number[],
): AttendanceMatrixDay[] {
  const [year, monthNumber] = month.split('-').map(Number);
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const scheduled = new Set(scheduledDays);
  const everyDay = scheduled.size === 0;
  return Array.from({ length: dayCount }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, '0')}`;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    return {
      date,
      day: index + 1,
      weekday: ATTENDANCE_WEEKDAYS[weekday],
      scheduled: everyDay || scheduled.has(weekday),
    };
  });
}

function attendanceScheduleLabel(days: readonly number[]): string {
  if (!days.length) return 'Every day';
  return ATTENDANCE_WEEK_ORDER.filter((day) => days.includes(day))
    .map((day) => ATTENDANCE_WEEKDAYS[day])
    .join(', ');
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
    const current = await this.db.client.from('parents').select('photo_path').eq('id', id).single();
    this.fail('Get parent photo', current.error);
    const oldPath = current.data?.photo_path as string | null;
    let newPath: string | null = null;
    try {
      if (photo) newPath = await this.storage.upload('parent-photos', id, photo);
      const r = await this.db.client.from('parents').update({ ...value, ...(newPath ? { photo_path: newPath } : {}) }).eq('id', id).select().single();
      this.fail('Update parent', r.error);
      if (newPath && oldPath && oldPath !== newPath) await this.storage.remove('parent-photos', oldPath).catch(() => undefined);
      return r.data;
    } catch (error) {
      if (newPath) await this.storage.remove('parent-photos', newPath).catch(() => undefined);
      throw error;
    }
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
    const current = await this.db.client.from('coaches').select('photo_path').eq('id', id).single();
    this.fail('Get coach photo', current.error);
    const oldPath = current.data?.photo_path as string | null;
    let newPath: string | null = null;
    try {
      if (photo) newPath = await this.storage.upload('coach-photos', id, photo);
      const r = await this.db.client.from('coaches').update({ ...value, ...(newPath ? { photo_path: newPath } : {}) }).eq('id', id).select().single();
      this.fail('Update coach', r.error);
      await this.saveSpecializations(id, specializations);
      if (newPath && oldPath && oldPath !== newPath) await this.storage.remove('coach-photos', oldPath).catch(() => undefined);
      return r.data;
    } catch (error) {
      if (newPath) await this.storage.remove('coach-photos', newPath).catch(() => undefined);
      throw error;
    }
  }
  async updatePhoto(id: string, photo: File): Promise<string | null> {
    const current = await this.db.client.from('coaches').select('photo_path').eq('id', id).single();
    this.fail('Get coach photo', current.error);
    const oldPath = current.data?.photo_path as string | null;
    const newPath = await this.storage.upload('coach-photos', id, photo);
    try {
      const result = await this.db.client.from('coaches').update({ photo_path: newPath, photo_url: null }).eq('id', id).select('photo_path').single();
      this.fail('Save coach photo', result.error);
      if (oldPath && oldPath !== newPath) await this.storage.remove('coach-photos', oldPath).catch(() => undefined);
      return result.data?.photo_path ?? newPath;
    } catch (error) {
      await this.storage.remove('coach-photos', newPath).catch(() => undefined);
      throw error;
    }
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

  /**
   * Live roster for one batch. Guardian contacts are always included for staff
   * who can open the batch page; medical notes are only queried when the caller
   * has confirmed the students:read permission, matching the medical RLS gate.
   */
  async roster(batchId: string, includeMedical = false): Promise<BatchRosterRecord> {
    const id = String(batchId ?? '').trim();
    if (!id) throw new Error('Choose a batch to print the roster.');
    const batchResult = await this.db.client
      .from('batches')
      .select(
        'id,code,name,age_group,skill_level,capacity,start_date,end_date,start_time,end_time,status,batch_days(day_of_week),batch_coaches(coach:coaches(full_name))',
      )
      .eq('id', id)
      .single();
    this.fail('Load batch roster', batchResult.error);
    const batch = batchResult.data as unknown as BatchRosterRecord['batch'];

    const enrollmentResult = await this.db.client
      .from('enrollments')
      .select(
        'student_id,status,student:students!inner(id,student_code,full_name,date_of_birth,status)',
      )
      .eq('batch_id', id)
      .eq('status', 'active');
    this.fail('Load batch enrollment roster', enrollmentResult.error);
    const students = (
      (enrollmentResult.data ?? []) as unknown as {
        student: {
          id: string;
          student_code: string;
          full_name: string;
          date_of_birth: string | null;
          status: string;
        } | null;
      }[]
    )
      .map((row) => row.student)
      .filter((student): student is NonNullable<typeof student> => Boolean(student));

    const studentIds = students.map((student) => student.id);
    const guardiansByStudent = new Map<string, BatchRosterStudentRecord['guardians']>();
    const medicalByStudent = new Map<string, string>();

    if (studentIds.length) {
      const guardianResult = await this.db.client
        .from('student_parents')
        .select(
          'student_id,is_primary,can_pick_up,parent:parents!inner(full_name,relation,phone,whatsapp)',
        )
        .in('student_id', studentIds);
      this.fail('Load roster guardians', guardianResult.error);
      const links = (guardianResult.data ?? []) as unknown as {
        student_id: string;
        is_primary: boolean;
        can_pick_up: boolean;
        parent: {
          full_name: string;
          relation: string | null;
          phone: string;
          whatsapp: string | null;
        } | null;
      }[];
      for (const link of links) {
        if (!link.parent) continue;
        const list = guardiansByStudent.get(link.student_id) ?? [];
        list.push({
          name: link.parent.full_name,
          relation: link.parent.relation,
          phone: link.parent.phone,
          whatsapp: link.parent.whatsapp,
          isPrimary: link.is_primary,
          canPickUp: link.can_pick_up,
        });
        guardiansByStudent.set(link.student_id, list);
      }

      if (includeMedical) {
        const medicalResult = await this.db.client
          .from('student_medical_records')
          .select('student_id,blood_group,allergies,conditions,medications,emergency_notes')
          .in('student_id', studentIds);
        this.fail('Load roster medical notes', medicalResult.error);
        for (const record of (medicalResult.data ?? []) as unknown as {
          student_id: string;
          blood_group: string | null;
          allergies: string | null;
          conditions: string | null;
          medications: string | null;
          emergency_notes: string | null;
        }[]) {
          const parts = [
            record.blood_group ? `Blood group ${record.blood_group}` : '',
            record.allergies ? `Allergies: ${record.allergies}` : '',
            record.conditions ? `Conditions: ${record.conditions}` : '',
            record.medications ? `Medications: ${record.medications}` : '',
            record.emergency_notes ? `Emergency: ${record.emergency_notes}` : '',
          ].filter(Boolean);
          if (parts.length) medicalByStudent.set(record.student_id, parts.join(' · '));
        }
      }
    }

    const rows: BatchRosterStudentRecord[] = students
      .map((student) => ({
        studentId: student.id,
        studentCode: student.student_code,
        studentName: student.full_name,
        dateOfBirth: student.date_of_birth,
        status: student.status,
        guardians: [...(guardiansByStudent.get(student.id) ?? [])].sort(
          (left, right) =>
            Number(right.isPrimary) - Number(left.isPrimary) ||
            left.name.localeCompare(right.name),
        ),
        medical: includeMedical ? (medicalByStudent.get(student.id) ?? null) : null,
      }))
      .sort((left, right) => left.studentName.localeCompare(right.studentName));

    const coaches = (batch.batch_coaches ?? [])
      .map((entry) => entry.coach?.full_name)
      .filter((name): name is string => Boolean(name));
    return { batch, coaches, rows };
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

  /**
   * Reads the live enrollment, student, batch, plan and guardian records used by
   * the printable confirmation. Nothing is copied from page state so a document
   * printed after a write always matches the database.
   */
  async confirmation(id: string): Promise<EnrollmentConfirmationRecord> {
    const enrollmentId = String(id ?? '').trim();
    if (!enrollmentId) throw new Error('Choose an enrollment to print.');
    const result = await this.db.client
      .from('enrollments')
      .select(
        'id,student_id,batch_id,fee_plan_id,status,valid_from,valid_till,monthly_fee,notes,student:students!inner(id,student_code,full_name,date_of_birth,phone,status),batch:batches!inner(id,code,name,age_group,skill_level,start_date,end_date,start_time,end_time,status,capacity,batch_days(day_of_week),batch_coaches(coach:coaches(full_name))),plan:fee_plans!inner(id,name,monthly_fee,registration_fee,duration_months,status)',
      )
      .eq('id', enrollmentId)
      .single();
    this.fail('Load enrollment confirmation', result.error);
    const row = result.data as unknown as {
      id: string;
      student_id: string;
      batch_id: string;
      fee_plan_id: string;
      status: EnrollmentRecord['status'];
      valid_from: string;
      valid_till: string | null;
      monthly_fee: number;
      notes: string | null;
      student: EnrollmentStudent;
      batch: EnrollmentConfirmationRecord['batch'];
      plan: EnrollmentConfirmationRecord['plan'];
    };

    const [guardianResult, transferResult] = await Promise.all([
      this.db.client
        .from('student_parents')
        .select(
          'is_primary,can_pick_up,parent:parents!inner(id,full_name,relation,phone,whatsapp,email,status)',
        )
        .eq('student_id', row.student_id),
      this.db.client
        .from('enrollment_history')
        .select('from_batch:batches!from_batch_id(name,code)')
        .eq('enrollment_id', enrollmentId)
        .eq('event_type', 'transferred')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    this.fail('Load enrollment guardians', guardianResult.error);
    this.fail('Load enrollment transfer history', transferResult.error);

    const guardianLinks = (guardianResult.data ?? []) as unknown as {
      is_primary: boolean;
      can_pick_up: boolean;
      parent: {
        id: string;
        full_name: string;
        relation: string | null;
        phone: string;
        whatsapp: string | null;
        email: string | null;
        status: string;
      } | null;
    }[];
    const guardians: EnrollmentConfirmationGuardian[] = [];
    for (const link of guardianLinks) {
      if (!link.parent || link.parent.status !== 'active') continue;
      guardians.push({
        id: link.parent.id,
        full_name: link.parent.full_name,
        relation: link.parent.relation,
        phone: link.parent.phone,
        whatsapp: link.parent.whatsapp,
        email: link.parent.email,
        is_primary: link.is_primary,
        can_pick_up: link.can_pick_up,
      });
    }
    guardians.sort(
      (left, right) =>
        Number(right.is_primary) - Number(left.is_primary) ||
        left.full_name.localeCompare(right.full_name),
    );

    const previous = transferResult.data as unknown as {
      from_batch: { name: string; code: string } | null;
    } | null;

    return {
      enrollment: {
        id: row.id,
        student_id: row.student_id,
        batch_id: row.batch_id,
        fee_plan_id: row.fee_plan_id,
        status: row.status,
        valid_from: row.valid_from,
        valid_till: row.valid_till,
        monthly_fee: row.monthly_fee,
        notes: row.notes,
      },
      student: row.student,
      batch: row.batch,
      plan: row.plan,
      guardians,
      previousBatch: previous?.from_batch ?? null,
    };
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
    const search = filters.search
      ?.trim()
      .replace(/[%_,()\\"']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,student_code.ilike.%${search}%`,
        { referencedTable: 'student' },
      );
    }
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

  /**
   * Build a batch/day sign-off register from the real enrolment roster and the
   * attendance records for that date. Students without a record stay on the
   * sheet as "not recorded" so absences cannot be hidden by missing data.
   */
  async register(
    batchId: string,
    date: string,
    options: { includeRemarks?: boolean } = {},
  ): Promise<AttendanceRegisterRecord> {
    const id = String(batchId ?? '').trim();
    if (!id) throw new Error('Choose a batch to print the register.');
    const day = String(date ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new Error('Choose a valid date for the register.');
    }

    const [batchResult, coachResult, enrollmentRows, attendanceRows] = await Promise.all([
      this.db.client
        .from('batches')
        .select('id,code,name,start_time,end_time')
        .eq('id', id)
        .single(),
      this.db.client.from('batch_coaches').select('coach:coaches(id,full_name)').eq('batch_id', id),
      readAllPages<Record<string, unknown>>('Load register students', (offset, limit) =>
        this.db.client
          .from('enrollments')
          .select('student:students!inner(id,full_name,student_code)', { count: 'exact' })
          .eq('batch_id', id)
          .eq('status', 'active')
          .lte('valid_from', day)
          .or(`valid_till.is.null,valid_till.gte.${day}`)
          .order('full_name', { referencedTable: 'student', ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + limit - 1),
      ),
      readAllPages<Record<string, unknown>>('Load register attendance', (offset, limit) =>
        this.db.client
          .from('attendance_records')
          .select('student_id,status,check_in_at,check_out_at,remarks,source', {
            count: 'exact',
          })
          .eq('batch_id', id)
          .eq('attendance_date', day)
          .order('id', { ascending: true })
          .range(offset, offset + limit - 1),
      ),
    ]);
    this.fail('Load attendance register batch', batchResult.error);
    this.fail('Load attendance register coaches', coachResult.error);
    if (!batchResult.data) throw new Error('The selected batch could not be loaded.');

    const students = [
      ...new Map(
        enrollmentRows
          .map((row) => statementFirst(row['student']))
          .filter((student): student is Record<string, unknown> => Boolean(student?.['id']))
          .map((student) => [
            String(student['id']),
            {
              id: String(student['id']),
              name: String(student['full_name'] ?? 'Unknown student').trim(),
              code: String(student['student_code'] ?? '').trim(),
            },
          ]),
      ).values(),
    ];

    const attendance = new Map<string, Record<string, unknown>>();
    for (const row of attendanceRows) {
      const studentId = String(row['student_id'] ?? '').trim();
      if (studentId) attendance.set(studentId, row);
    }

    const known: readonly string[] = ['present', 'late', 'absent', 'checked_out'];
    const rows = students.map((student) => {
      const record = attendance.get(student.id);
      const status = String(record?.['status'] ?? '');
      return {
        studentId: student.id,
        studentCode: student.code,
        studentName: student.name,
        status: (known.includes(status) ? status : 'not_recorded') as AttendanceRegisterStatus,
        checkInAt: record?.['check_in_at'] ? String(record['check_in_at']) : null,
        checkOutAt: record?.['check_out_at'] ? String(record['check_out_at']) : null,
        remarks:
          options.includeRemarks && record?.['remarks']
            ? String(record['remarks']).trim()
            : null,
        source: record?.['source'] ? String(record['source']) : null,
      } satisfies AttendanceRegisterRow;
    });

    const counts = {
      expected: rows.length,
      present: rows.filter((row) => row.status === 'present').length,
      late: rows.filter((row) => row.status === 'late').length,
      absent: rows.filter((row) => row.status === 'absent').length,
      checkedOut: rows.filter((row) => row.status === 'checked_out').length,
      notRecorded: rows.filter((row) => row.status === 'not_recorded').length,
    };

    const batch = batchResult.data as Record<string, unknown>;
    const startTime = String(batch['start_time'] ?? '').slice(0, 5);
    const endTime = String(batch['end_time'] ?? '').slice(0, 5);
    const coaches = coachResult.data
      ?.map((row) => statementFirst((row as Record<string, unknown>)['coach']))
      .map((coach) => String(coach?.['full_name'] ?? '').trim())
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right)) ?? [];

    return {
      date: day,
      batchId: String(batch['id'] ?? id),
      batchCode: String(batch['code'] ?? '').trim(),
      batchName: String(batch['name'] ?? 'Selected batch').trim(),
      batchTime: [startTime, endTime].filter(Boolean).join(' – '),
      coaches,
      rows,
      counts,
    };
  }

  /**
   * Build a month x student attendance grid for one batch. Every calendar day is
   * present, non-session weekdays come from `batch_days`, and only recorded days
   * count towards the per-student percentage so missing marks cannot inflate or
   * deflate it silently.
   */
  async matrix(batchId: string, month: string): Promise<AttendanceMatrixRecord> {
    const id = String(batchId ?? '').trim();
    if (!id) throw new Error('Choose a batch to print the matrix.');
    const key = String(month ?? '').trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) {
      throw new Error('Choose a valid month for the matrix.');
    }

    const [year, monthNumber] = key.split('-').map(Number);
    const monthStart = `${key}-01`;
    const monthEnd = `${key}-${String(
      new Date(Date.UTC(year, monthNumber, 0)).getUTCDate(),
    ).padStart(2, '0')}`;

    const [batchResult, daysResult, coachResult, enrollmentRows, attendanceRows] =
      await Promise.all([
        this.db.client
          .from('batches')
          .select('id,code,name,start_time,end_time')
          .eq('id', id)
          .single(),
        this.db.client.from('batch_days').select('day_of_week').eq('batch_id', id),
        this.db.client.from('batch_coaches').select('coach:coaches(id,full_name)').eq('batch_id', id),
        readAllPages<Record<string, unknown>>('Load matrix students', (offset, limit) =>
          this.db.client
            .from('enrollments')
            .select('valid_from,valid_till,student:students!inner(id,full_name,student_code)', {
              count: 'exact',
            })
            .eq('batch_id', id)
            .eq('status', 'active')
            .lte('valid_from', monthEnd)
            .or(`valid_till.is.null,valid_till.gte.${monthStart}`)
            .order('full_name', { referencedTable: 'student', ascending: true })
            .order('id', { ascending: true })
            .range(offset, offset + limit - 1),
        ),
        readAllPages<Record<string, unknown>>('Load matrix attendance', (offset, limit) =>
          this.db.client
            .from('attendance_records')
            .select('student_id,attendance_date,status', { count: 'exact' })
            .eq('batch_id', id)
            .gte('attendance_date', monthStart)
            .lte('attendance_date', monthEnd)
            .order('id', { ascending: true })
            .range(offset, offset + limit - 1),
        ),
      ]);
    this.fail('Load attendance matrix batch', batchResult.error);
    this.fail('Load attendance matrix schedule', daysResult.error);
    this.fail('Load attendance matrix coaches', coachResult.error);
    if (!batchResult.data) throw new Error('The selected batch could not be loaded.');

    const scheduleDays = (daysResult.data ?? [])
      .map((row) => Number((row as Record<string, unknown>)['day_of_week']))
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
    const days = attendanceMonthDays(key, scheduleDays);
    const scheduled = new Set(days.filter((day) => day.scheduled).map((day) => day.date));

    const students = new Map<
      string,
      { id: string; name: string; code: string; from: string; till: string }
    >();
    for (const row of enrollmentRows) {
      const student = statementFirst(row['student']);
      const studentId = String(student?.['id'] ?? '').trim();
      if (!studentId) continue;
      const from = String(row['valid_from'] ?? '').slice(0, 10);
      const till = String(row['valid_till'] ?? '').slice(0, 10);
      const existing = students.get(studentId);
      if (!existing) {
        students.set(studentId, {
          id: studentId,
          name: String(student?.['full_name'] ?? 'Unknown student').trim(),
          code: String(student?.['student_code'] ?? '').trim(),
          from,
          till,
        });
        continue;
      }
      if (from && (!existing.from || from < existing.from)) existing.from = from;
      // An open-ended enrolment dominates any closed one for the same month.
      if (existing.till !== '') {
        if (!till) existing.till = '';
        else if (!existing.till || till > existing.till) existing.till = till;
      }
    }

    const known: ReadonlySet<string> = new Set([
      'present',
      'late',
      'absent',
      'checked_out',
    ]);
    const attendance = new Map<string, AttendanceMatrixCell>();
    for (const row of attendanceRows) {
      const studentId = String(row['student_id'] ?? '').trim();
      const date = String(row['attendance_date'] ?? '').slice(0, 10);
      const status = String(row['status'] ?? '');
      if (studentId && date && known.has(status)) {
        attendance.set(`${studentId}|${date}`, status as AttendanceMatrixCell);
      }
    }

    const rows = [...students.values()]
      .sort(
        (left, right) =>
          left.name.localeCompare(right.name) || left.code.localeCompare(right.code),
      )
      .map((student) => {
        let present = 0;
        let late = 0;
        let absent = 0;
        let checkedOut = 0;
        const cells = days.map((day): AttendanceMatrixCell => {
          const record = attendance.get(`${student.id}|${day.date}`);
          if (record) {
            if (record === 'present') present += 1;
            else if (record === 'late') late += 1;
            else if (record === 'absent') absent += 1;
            else if (record === 'checked_out') checkedOut += 1;
            return record;
          }
          const enrolled =
            (!student.from || day.date >= student.from) && (!student.till || day.date <= student.till);
          if (!enrolled) return 'not_enrolled';
          if (!scheduled.has(day.date)) return 'off';
          return 'not_recorded';
        });
        const recorded = present + late + absent + checkedOut;
        const attended = present + late + checkedOut;
        return {
          studentId: student.id,
          studentCode: student.code,
          studentName: student.name,
          cells,
          present,
          late,
          absent,
          checkedOut,
          recorded,
          attended,
          percentage: recorded ? Math.round((attended / recorded) * 100) : null,
        } satisfies AttendanceMatrixRow;
      });

    const batch = batchResult.data as Record<string, unknown>;
    const startTime = String(batch['start_time'] ?? '').slice(0, 5);
    const endTime = String(batch['end_time'] ?? '').slice(0, 5);
    const coaches =
      coachResult.data
        ?.map((row) => statementFirst((row as Record<string, unknown>)['coach']))
        .map((coach) => String(coach?.['full_name'] ?? '').trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)) ?? [];

    return {
      month: key,
      monthLabel: ATTENDANCE_MONTH_FORMAT.format(new Date(`${monthStart}T00:00:00Z`)),
      batchId: String(batch['id'] ?? id),
      batchCode: String(batch['code'] ?? '').trim(),
      batchName: String(batch['name'] ?? 'Selected batch').trim(),
      batchTime: [startTime, endTime].filter(Boolean).join(' – '),
      schedule: attendanceScheduleLabel(scheduleDays),
      coaches,
      days,
      rows,
    };
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
  async statement(
    studentId: string,
    fromDate: string,
    toDate: string,
    timezone: string,
  ): Promise<FeeStatementRecord> {
    if (
      !studentId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(fromDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(toDate)
    ) {
      throw new Error('Select a valid statement period.');
    }
    if (fromDate > toDate) {
      throw new Error('The statement end date must be on or after the start date.');
    }
    const [studentResult, charges, payments, refunds] = await Promise.all([
      this.db.client
        .from('students')
        .select('id,full_name,student_code')
        .eq('id', studentId)
        .single(),
      readAllPages<StatementChargeRow>('Load fee statement charges', (offset, limit) =>
        this.db.client
          .from('monthly_charge_balances')
          .select(
            'id,charge_month,due_date,final_amount,balance_amount,status,enrollment:enrollments(batch:batches(name))',
            { count: 'exact' },
          )
          .eq('student_id', studentId)
          .order('due_date')
          .order('id')
          .range(offset, offset + limit - 1),
      ),
      readAllPages<StatementPaymentRow>('Load fee statement payments', (offset, limit) =>
        this.db.client
          .from('payments')
          .select(
            'id,amount,payment_mode,paid_at,provider_reference,client_reference,receipt:receipts(receipt_number)',
            { count: 'exact' },
          )
          .eq('student_id', studentId)
          .in('status', [...STATEMENT_SETTLED_STATUSES])
          .order('paid_at')
          .order('id')
          .range(offset, offset + limit - 1),
      ),
      readAllPages<StatementRefundRow>('Load fee statement refunds', (offset, limit) =>
        this.db.client
          .from('payment_refunds')
          .select(
            'id,amount,reason,refunded_at,payment:payments!inner(student_id,status)',
            { count: 'exact' },
          )
          .eq('payment.student_id', studentId)
          .in('payment.status', [...STATEMENT_SETTLED_STATUSES])
          .order('refunded_at')
          .order('id')
          .range(offset, offset + limit - 1),
      ),
    ]);
    this.fail('Load fee statement student', studentResult.error);
    const student = studentResult.data as {
      id: string;
      full_name: string;
      student_code: string;
    } | null;
    if (!student) throw new Error('Student not found.');

    const chargesRows = charges as unknown as readonly StatementChargeRow[];
    const paymentRows = payments as unknown as readonly StatementPaymentRow[];
    const refundRows = refunds as unknown as readonly StatementRefundRow[];
    const drafts: StatementDraft[] = [];

    for (const charge of chargesRows) {
      const enrollment = statementFirst(charge.enrollment);
      const batch = statementFirst(enrollment?.['batch']);
      const batchName = String(batch?.['name'] ?? '').trim();
      const period = statementPeriod(charge.charge_month);
      drafts.push({
        date: charge.due_date,
        dateKey: statementDateKey(charge.due_date, timezone),
        type: 'charge',
        description: `Monthly fee — ${period}${batchName ? ` · ${batchName}` : ''}`,
        reference: statementReference('INV', charge.id),
        // A waived charge stays visible but no longer increases the amount owed.
        debit: charge.status === 'waived' ? 0 : statementMinor(charge.final_amount),
        credit: 0,
      });
    }
    for (const payment of paymentRows) {
      const receipt = statementFirst(payment.receipt);
      const reference =
        String(
          receipt?.['receipt_number'] ??
            payment.provider_reference ??
            payment.client_reference ??
            '',
        ).trim() || statementReference('PAY', payment.id);
      drafts.push({
        date: payment.paid_at,
        dateKey: statementDateKey(payment.paid_at, timezone),
        type: 'payment',
        description: `Payment received — ${
          STATEMENT_PAYMENT_MODES[payment.payment_mode] ?? payment.payment_mode
        }`,
        reference,
        debit: 0,
        credit: statementMinor(payment.amount),
      });
    }
    for (const refund of refundRows) {
      drafts.push({
        date: refund.refunded_at,
        dateKey: statementDateKey(refund.refunded_at, timezone),
        type: 'refund',
        description: `Refund — ${String(refund.reason ?? '').trim() || 'Fee refund'}`,
        reference: statementReference('REF', refund.id),
        debit: statementMinor(refund.amount),
        credit: 0,
      });
    }
    drafts.sort(
      (left, right) =>
        left.dateKey.localeCompare(right.dateKey) ||
        STATEMENT_TYPE_ORDER[left.type] - STATEMENT_TYPE_ORDER[right.type] ||
        left.reference.localeCompare(right.reference),
    );

    const openingCents = drafts
      .filter((draft) => draft.dateKey < fromDate)
      .reduce((total, draft) => total + draft.debit - draft.credit, 0);
    const periodDrafts = drafts.filter(
      (draft) => draft.dateKey >= fromDate && draft.dateKey <= toDate,
    );
    let runningCents = openingCents;
    const lines = periodDrafts.map((draft) => {
      runningCents += draft.debit - draft.credit;
      return {
        date: draft.date,
        type: draft.type,
        description: draft.description,
        reference: draft.reference,
        debit: draft.debit / 100,
        credit: draft.credit / 100,
        balance: runningCents / 100,
      };
    });
    const totalCharges =
      periodDrafts
        .filter((draft) => draft.type === 'charge')
        .reduce((total, draft) => total + draft.debit, 0) / 100;
    const totalPayments =
      periodDrafts.reduce((total, draft) => total + draft.credit, 0) / 100;
    const totalRefunds =
      periodDrafts
        .filter((draft) => draft.type === 'refund')
        .reduce((total, draft) => total + draft.debit, 0) / 100;

    const today = statementDateKey(new Date().toISOString(), timezone);
    const todayMs = Date.parse(`${today}T00:00:00Z`);
    const ageingCents = STATEMENT_AGEING_LABELS.map(() => 0);
    for (const charge of chargesRows) {
      if (charge.status === 'waived') continue;
      const balanceCents = statementMinor(charge.balance_amount);
      if (balanceCents <= 0) continue;
      const dueKey = statementDateKey(charge.due_date, timezone);
      const dueMs = Date.parse(`${dueKey}T00:00:00Z`);
      const days = Number.isFinite(dueMs)
        ? Math.max(0, Math.floor((todayMs - dueMs) / 86_400_000))
        : 0;
      const bucket = days === 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
      ageingCents[bucket] += balanceCents;
    }
    let latestBatch = '';
    for (let index = chargesRows.length - 1; index >= 0 && !latestBatch; index--) {
      const enrollment = statementFirst(chargesRows[index]?.enrollment);
      const batch = statementFirst(enrollment?.['batch']);
      latestBatch = String(batch?.['name'] ?? '').trim();
    }

    return {
      statementNumber: `FES-${String(student.student_code || student.id)
        .replace(/[^A-Za-z0-9]/g, '')
        .toUpperCase()}-${fromDate.replace(/-/g, '')}-${toDate.replace(/-/g, '')}`,
      fromDate,
      toDate,
      studentName: student.full_name,
      studentCode: student.student_code,
      batchName: latestBatch || undefined,
      openingBalance: openingCents / 100,
      closingBalance: runningCents / 100,
      totalCharges,
      totalPayments,
      totalRefunds,
      lines,
      ageing: STATEMENT_AGEING_LABELS.map((label, index) => ({
        label,
        amount: ageingCents[index]! / 100,
      })),
    };
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
    const existing = await this.db.client.from('monthly_charges').select('id').eq('enrollment_id', enrollmentId).eq('charge_month', `${month}-01`).maybeSingle();
    this.fail('Check existing monthly charge', existing.error);
    if (existing.data) throw new Error('A charge already exists for this enrollment and month.');
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

  /** Load every refund issued against a payment with original receipt and student context. */
  async refundReceipts(paymentId: string): Promise<RefundReceiptRecord[]> {
    if (!paymentId) return [];
    const rows = await readAllPages<Record<string, unknown>>(
      'Load refund receipts',
      (offset, limit) =>
        this.db.client
          .from('payment_refunds')
          .select(
            'id,amount,reason,client_reference,refunded_by,refunded_at,payment:payments!inner(id,amount,payment_mode,paid_at,student_id,monthly_charge_id,provider_reference,client_reference,student:students(id,full_name,student_code),receipt:receipts(receipt_number),charge:monthly_charges(charge_month,enrollment:enrollments(batch:batches(name)))),approver:profiles(full_name)',
            { count: 'exact' },
          )
          .eq('payment_id', paymentId)
          .order('refunded_at')
          .order('id')
          .range(offset, offset + limit - 1),
    );
    return rows
      .map((row) => {
        const record = row as Record<string, unknown>;
        const payment = statementFirst(record['payment']) as Record<string, unknown> | null;
        const student = payment ? statementFirst(payment['student']) : null;
        const receipt = payment ? statementFirst(payment['receipt']) : null;
        const charge = payment ? statementFirst(payment['charge']) : null;
        const enrollment = charge ? statementFirst(charge['enrollment']) : null;
        const batch = enrollment ? statementFirst(enrollment['batch']) : null;
        const approver = statementFirst(record['approver']);
        const originalReceiptNumber = String(receipt?.['receipt_number'] ?? '').trim();
        const refundId = String(record['id'] ?? '');
        const reference = String(
          payment?.['provider_reference'] ||
            payment?.['client_reference'] ||
            record['client_reference'] ||
            '',
        ).trim();
        const refundedAt = String(record['refunded_at'] ?? '');
        const paidAt = String(payment?.['paid_at'] ?? '');
        const period = statementPeriod(String(charge?.['charge_month'] ?? ''));
        const mode = String(payment?.['payment_mode'] ?? '');
        return {
          id: refundId,
          paymentId: String(payment?.['id'] ?? paymentId),
          refundReceiptNumber: originalReceiptNumber
            ? `RFR-${originalReceiptNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-${refundId.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase()}`
            : `RFR-${refundId.replace(/[^A-Za-z0-9]/g, '').slice(-10).toUpperCase()}`,
          originalReceiptNumber: originalReceiptNumber || reference,
          studentName: String(student?.['full_name'] ?? 'Unknown student'),
          studentCode: String(student?.['student_code'] ?? ''),
          refundAmount: statementMinor(record['amount']) / 100,
          originalAmount: statementMinor(payment?.['amount']) / 100,
          paymentMode: STATEMENT_PAYMENT_MODES[mode] ?? mode.replaceAll('_', ' '),
          refundedAt,
          paidAt,
          reason: String(record['reason'] ?? '').trim(),
          reference,
          approvedBy: approver?.['full_name'] ? String(approver['full_name']).trim() : undefined,
          batchName: batch?.['name'] ? String(batch['name']).trim() : undefined,
          period: period === 'Monthly fee' ? undefined : period,
        };
      })
      .filter((row) => row.refundAmount > 0);
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
    const {
      academy_code: _academyCode,
      academy_logo_url: _academyLogoUrl,
      academy_description: _academyDescription,
      theme_preference: _themePreference,
      ...deployedSettings
    } = value;
    const r = await this.db.client
      .from('academy_settings')
      .update({ ...deployedSettings, updated_at: new Date().toISOString() })
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
