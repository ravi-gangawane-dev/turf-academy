import { DataRequestError } from '../supabase/data-error';
import { inject, Injectable } from '@angular/core';
import { AttendanceRecord, Batch, Enrollment, QrIdentity, Student } from '../models/academy.model';
import { SupabaseClientService } from '../supabase/supabase-client.service';
import { AttendanceWhatsApp } from '../services/whatsapp.service';

interface AttendanceRow {
  id: string;
  student_id: string;
  batch_id: string;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: string;
}
interface AttendanceWorkspaceRow {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_date_of_birth: string;
  student_skill_level: string | null;
  student_status: string;
  batch_id: string;
  batch_name: string;
  batch_capacity: number;
  batch_start_time: string | null;
  batch_end_time: string | null;
  monthly_fee: string | number | null;
  valid_from: string;
  valid_till: string | null;
  attendance_id: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  attendance_status: string | null;
  total: number;
}

export function mapAttendance(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    batchId: row.batch_id,
    businessDate: row.attendance_date,
    checkInAt: row.check_in_at ?? '',
    checkOutAt: row.check_out_at ?? undefined,
    status:
      row.status === 'checked_out' ? 'checked-out' : (row.status as AttendanceRecord['status']),
  };
}

@Injectable({ providedIn: 'root' })
export class SupabaseAttendanceRepository {
  private readonly supabase = inject(SupabaseClientService);
  private get client() {
    return this.supabase.requireClient();
  }
  async whatsappMessage(studentId: string, batchId: string, action: 'check_in' | 'check_out'): Promise<AttendanceWhatsApp> {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const [attendance, links, student, batch] = await Promise.all([
      this.client.from('attendance_records').select('check_in_at,check_out_at').eq('student_id', studentId).eq('batch_id', batchId).eq('attendance_date', date).single(),
      this.client.from('student_parents').select('is_primary,parents(*)').eq('student_id', studentId).order('is_primary', { ascending: false }),
      this.client.from('students').select('full_name').eq('id', studentId).single(),
      this.client.from('batches').select('name').eq('id', batchId).single(),
    ]);
    for (const result of [attendance, links, student, batch]) if (result.error) throw new DataRequestError('Prepare attendance notification', result.error);
    const parents = (links.data ?? []).flatMap(link => Array.isArray(link.parents) ? link.parents : [link.parents]) as unknown as { full_name: string; status: string; whatsapp: string; phone: string; communication_preferences: Record<string, unknown> }[];
    const parent = parents.find(parent => parent?.status === 'active');
    if (!parent) throw new Error('No active parent is linked to this student.');
    if (parent.communication_preferences?.['whatsapp'] === false) throw new Error('Parent WhatsApp notifications are disabled.');
    const timestamp = action === 'check_in' ? attendance.data!.check_in_at : attendance.data!.check_out_at;
    if (!timestamp) throw new Error('Attendance has not been saved yet.');
    return { studentName: student.data!.full_name, parentName: parent.full_name, batchName: batch.data!.name, parentPhone: parent.whatsapp || parent.phone, action, timestamp };
  }
  // One bounded server-side page (max 500 rows) instead of the former client-side loop
  // over every 500-row enrollment page plus a separate full attendance read. The joined
  // rows arrive under the caller's own RLS policies with an exact backend total.
  async workspace() {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const result = await this.client.rpc('get_attendance_workspace_page', {
      p_date: today,
      p_limit: 500,
      p_offset: 0,
    });
    if (result.error) throw new DataRequestError('Load academy data', result.error);
    const students: Student[] = [],
      batches: Batch[] = [],
      enrollments: Enrollment[] = [],
      attendance: AttendanceRecord[] = [];
    for (const row of (result.data ?? []) as AttendanceWorkspaceRow[]) {
      const feePaise = Math.round(Number(row.monthly_fee ?? 0) * 100);
      students.push({
        id: row.student_id,
        parentId: '',
        name: row.student_name,
        dateOfBirth: row.student_date_of_birth,
        skillLevel: row.student_skill_level ?? '',
        status: row.student_status as Student['status'],
      });
      batches.push({
        id: row.batch_id,
        name: row.batch_name,
        capacity: row.batch_capacity,
        schedule: `${row.batch_start_time ?? ''} – ${row.batch_end_time ?? ''}`,
        monthlyFeePaise: feePaise,
      });
      enrollments.push({
        id: row.enrollment_id,
        studentId: row.student_id,
        batchId: row.batch_id,
        startDate: row.valid_from,
        dueDate: row.valid_till ?? '',
        monthlyFeePaise: feePaise,
        status: 'active',
      });
      if (row.attendance_id)
        attendance.push(
          mapAttendance({
            id: row.attendance_id,
            student_id: row.student_id,
            batch_id: row.batch_id,
            attendance_date: today,
            check_in_at: row.check_in_at,
            check_out_at: row.check_out_at,
            status: row.attendance_status ?? 'present',
          }),
        );
    }
    return {
      students: [...new Map(students.map((student) => [student.id, student])).values()],
      batches: [...new Map(batches.map((batch) => [batch.id, batch])).values()],
      enrollments,
      attendance: [...new Map(attendance.map((record) => [record.id, record])).values()],
    };
  }
  async list(date: string, batchId?: string): Promise<readonly AttendanceRecord[]> {
    const rows: AttendanceRecord[] = [];
    for (let offset = 0; ; offset += 500) {
      let query = this.client
        .from('attendance_records')
        .select('*')
        .eq('attendance_date', date)
        .order('id')
        .range(offset, offset + 499);
      if (batchId) query = query.eq('batch_id', batchId);
      const result = await query;
      if (result.error) throw new DataRequestError('Load academy data', result.error);
      rows.push(...(result.data ?? []).map(mapAttendance));
      if ((result.data?.length ?? 0) < 500) return rows;
    }
  }
  // Targeted reads for one student instead of downloading the whole workspace per scan.
  async identifyQr(code: string): Promise<QrIdentity> {
    const token = code.trim();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const qr = await this.client
      .from('qr_profiles')
      .select('student_id')
      .eq('public_token', token)
      .eq('active', true)
      .maybeSingle();
    if (qr.error) throw new DataRequestError('Load academy data', qr.error);
    if (!qr.data) throw new Error('QR code is invalid or inactive.');
    const [studentResult, enrollmentResult] = await Promise.all([
      this.client
        .from('students')
        .select('id,full_name,date_of_birth,skill_level,status')
        .eq('id', qr.data.student_id)
        .maybeSingle(),
      this.client
        .from('enrollments')
        .select('*,batch:batches(id,name,capacity,start_time,end_time)')
        .eq('student_id', qr.data.student_id)
        .eq('status', 'active')
        .lte('valid_from', today)
        .or(`valid_till.is.null,valid_till.gte.${today}`),
    ]);
    if (studentResult.error) throw new DataRequestError('Load academy data', studentResult.error);
    if (enrollmentResult.error)
      throw new DataRequestError('Load academy data', enrollmentResult.error);
    const enrollments = enrollmentResult.data ?? [];
    if (enrollments.length > 1)
      throw new Error(
        'Student has multiple active batches. Select the batch on the manual attendance page.',
      );
    const studentRow = studentResult.data;
    const enrollmentRow = enrollments[0];
    const batchRow = enrollmentRow?.batch;
    if (!studentRow || !enrollmentRow || !batchRow)
      throw new Error('Student has no active enrollment.');
    const attendanceResult = await this.client
      .from('attendance_records')
      .select('*')
      .eq('student_id', studentRow.id)
      .eq('batch_id', batchRow.id)
      .eq('attendance_date', today)
      .not('check_in_at', 'is', null)
      .limit(1)
      .maybeSingle();
    if (attendanceResult.error)
      throw new DataRequestError('Load academy data', attendanceResult.error);
    const feePaise = Math.round(Number(enrollmentRow.monthly_fee) * 100);
    return {
      student: {
        id: studentRow.id,
        parentId: '',
        name: studentRow.full_name,
        dateOfBirth: studentRow.date_of_birth,
        skillLevel: studentRow.skill_level,
        status: studentRow.status,
      },
      enrollment: {
        id: enrollmentRow.id,
        studentId: enrollmentRow.student_id,
        batchId: enrollmentRow.batch_id,
        startDate: enrollmentRow.valid_from,
        dueDate: enrollmentRow.valid_till ?? '',
        monthlyFeePaise: feePaise,
        status: 'active',
      },
      batch: {
        id: batchRow.id,
        name: batchRow.name,
        capacity: batchRow.capacity,
        schedule: `${batchRow.start_time ?? ''} – ${batchRow.end_time ?? ''}`,
        monthlyFeePaise: feePaise,
      },
      attendance: attendanceResult.data ? mapAttendance(attendanceResult.data) : undefined,
    };
  }
  async checkIn(
    studentId: string,
    batchId: string,
    source: 'manual' | 'qr',
    key: string = crypto.randomUUID(),
  ): Promise<AttendanceRecord> {
    // C-03: pass the student id straight through so manual attendance works even
    // when the student has no active QR profile. The RPC resolves the student from
    // p_student_id and still enforces enrollment and duplicate rules server-side.
    const result = await this.client.rpc('attendance_check_in', {
      p_qr_token: null,
      p_batch_id: batchId,
      p_source: source,
      p_idempotency_key: key,
      p_student_id: studentId,
    });
    if (result.error) throw new DataRequestError('Load academy data', result.error);
    return mapAttendance(result.data);
  }
  async checkOut(
    attendanceId: string,
    key: string = crypto.randomUUID(),
  ): Promise<AttendanceRecord> {
    const result = await this.client.rpc('attendance_check_out', {
      p_attendance_id: attendanceId,
      p_idempotency_key: key,
    });
    if (result.error) throw new DataRequestError('Load academy data', result.error);
    return mapAttendance(result.data);
  }
}
