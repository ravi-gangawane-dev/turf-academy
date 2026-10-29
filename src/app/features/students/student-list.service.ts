import { DataRequestError } from '../../core/supabase/data-error';
import { Injectable, inject } from '@angular/core';
import { PostgrestError } from '@supabase/supabase-js';
import { StorageService } from '../../core/supabase/storage.service';
import { SupabaseClientService } from '../../core/supabase/supabase-client.service';
import { loadPaymentBalances, sumMoney } from '../../core/supabase/payment-balances';

export type StudentListStatus = 'active' | 'inactive' | 'graduated';
export interface StudentListItem {
  readonly id: string;
  readonly studentCode: string;
  readonly fullName: string;
  readonly photoUrl: string | null;
  readonly batchId: string | null;
  readonly batchName: string | null;
  readonly programId: string | null;
  readonly programName: string | null;
  readonly coachId: string | null;
  readonly coachName: string | null;
  readonly coachPhotoUrl: string | null;
  readonly dateOfBirth: string;
  readonly phone: string | null;
  readonly status: StudentListStatus;
  readonly parentName: string | null;
  readonly parentPhone: string | null;
  readonly joinDate: string;
  readonly address: string | null;
  readonly pinCode: string | null;
}
export interface StudentSummary {
  readonly total: number;
  readonly active: number;
  readonly inactive: number;
  readonly newThisMonth: number;
  readonly graduated: number;
}
export interface StudentListFilters {
  readonly batches: readonly FilterOption[];
  readonly programs: readonly FilterOption[];
  readonly coaches: readonly FilterOption[];
}
export interface FilterOption {
  readonly id: string;
  readonly name: string;
}
export interface StudentFormRecord {
  readonly id: string;
  readonly studentCode: string;
  readonly status: StudentListStatus;
  readonly fullName: string;
  readonly dateOfBirth: string;
  readonly gender: string | null;
  readonly skillLevel: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly pinCode: string | null;
  readonly joinedOn: string;
  readonly photoUrl: string | null;
  readonly bloodGroup: string | null;
  readonly nationality: string | null;
  readonly aadhaar: string | null;
  readonly batchId: string | null;
  readonly coachId: string | null;
  readonly parentName: string | null;
  readonly parentRelation: string | null;
  readonly parentPhone: string | null;
  readonly parentEmail: string | null;
}
export interface StudentListQuery {
  readonly search: string;
  readonly batchId: string;
  readonly programId: string;
  readonly coachId: string;
  readonly status: string;
  readonly page: number;
  readonly pageSize: number;
  readonly sortBy: string;
  readonly columns?:Record<string,string>;
  readonly sortDirection: 'asc' | 'desc';
}

export interface StudentMutation {
  readonly fullName: string;
  readonly dateOfBirth: string;
  readonly gender: string;
  readonly bloodGroup: string;
  readonly phone: string;
  readonly email: string;
  readonly nationality: string;
  readonly aadhaar: string;
  readonly address: string;
  readonly city: string;
  readonly state: string;
  readonly pinCode: string;
  readonly skillLevel: string;
  readonly batchId: string;
  readonly joinedOn: string;
  readonly parentName: string;
  readonly parentRelation: string;
  readonly parentPhone: string;
  readonly parentEmail: string;
  readonly photo?: File | null;
}

export type ParentChildProfileMutation = Pick<
  StudentMutation,
  | 'fullName'
  | 'dateOfBirth'
  | 'gender'
  | 'bloodGroup'
  | 'phone'
  | 'email'
  | 'nationality'
  | 'aadhaar'
  | 'address'
  | 'city'
  | 'state'
  | 'pinCode'
  | 'photo'
>;

export interface StudentWorkspace {
  readonly student: StudentFormRecord;
  readonly enrollment: StudentDetailRecord | null;
  readonly attendance: readonly StudentDetailRecord[];
  readonly payments: readonly StudentDetailRecord[];
  readonly documents: readonly StudentDetailRecord[];
  readonly medical: StudentDetailRecord | null;
  readonly attendanceTotal: number;
  readonly paymentTotal: number;
  readonly paymentAmount: number;
  readonly documentTotal: number;
  readonly attendanceSummary: {
    readonly total: number;
    readonly present: number;
    readonly late: number;
    readonly absent: number;
  };
}

export interface StudentDetailRecord {
  readonly id?: string;
  readonly [key: string]: unknown;
}
export interface StudentDetailPage {
  readonly rows: readonly StudentDetailRecord[];
  readonly total: number;
}
interface StudentRpcPayload {
  readonly id?: string;
  readonly photo_path?: string | null;
  readonly full_name: string;
  readonly date_of_birth: string;
  readonly gender: string;
  readonly blood_group: string | null;
  readonly phone: string;
  readonly email: string | null;
  readonly nationality: string;
  readonly aadhaar: string | null;
  readonly address: string;
  readonly city: string;
  readonly state: string;
  readonly pin_code: string;
  readonly skill_level: string;
  readonly batch_id: string | null;
  readonly joined_on: string;
  readonly parent_name: string;
  readonly parent_relation: string;
  readonly parent_phone: string;
  readonly parent_email: string | null;
}

interface StudentListDbRow {
  student_id: string;
  student_code: string;
  full_name: string;
  photo_url: string | null;
  batch_id: string | null;
  batch_name: string | null;
  program_id: string | null;
  program_name: string | null;
  coach_id: string | null;
  coach_name: string | null;
  coach_photo_url: string | null;
  date_of_birth: string;
  phone: string | null;
  status: StudentListStatus;
  parent_name: string | null;
  parent_phone: string | null;
  join_date: string;
  address: string | null;
  pin_code: string | null;
  total_count: number;
}

@Injectable({ providedIn: 'root' })
export class StudentListService {
  private readonly supabase = inject(SupabaseClientService);
  private readonly storage = inject(StorageService);

  async getById(id: string): Promise<StudentFormRecord> {
    const client = this.supabase.requireClient();
    const studentResult = await client
      .from('students')
      .select(
        'id,student_code,full_name,date_of_birth,gender,skill_level,phone,email,address,joined_on,photo_url,photo_path,status',
      )
      .eq('id', id)
      .single();
    if (studentResult.error) throw new DataRequestError('Load academy data', studentResult.error);
    const data = studentResult.data;
    const [parentResult, enrollmentResult, medicalResult] = await Promise.all([
      client
        .from('student_parents')
        .select('is_primary,parents(id,full_name,relation,phone,whatsapp,email)')
        .eq('student_id', id)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from('enrollments')
        .select('batch_id,fee_plan_id,valid_from,status')
        .eq('student_id', id)
        .order('valid_from', { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from('student_medical_records')
        .select('blood_group')
        .eq('student_id', id)
        .maybeSingle(),
    ]);
    if (parentResult.error) throw new DataRequestError('Load academy data', parentResult.error);
    if (enrollmentResult.error) throw new DataRequestError('Load academy data', enrollmentResult.error);
    if (medicalResult.error) throw new DataRequestError('Load academy data', medicalResult.error);

    const enrollment = enrollmentResult.data;
    let coachId: string | null = null;
    if (enrollment?.batch_id) {
      const coachResult = await client
        .from('batch_coaches')
        .select('coach_id')
        .eq('batch_id', enrollment.batch_id)
        .order('is_primary', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (coachResult.error) throw new DataRequestError('Load academy data', coachResult.error);
      coachId = coachResult.data?.coach_id ?? null;
    }

    const address = (data.address ?? {}) as Record<string, string>;
    const parentRelation = parentResult.data?.parents as unknown as {
      full_name: string;
      relation: string | null;
      phone: string;
      whatsapp: string | null;
      email: string | null;
    } | null;
    return {
      id: data.id,
      studentCode: data.student_code,
      status: data.status,
      fullName: data.full_name,
      dateOfBirth: data.date_of_birth,
      gender: data.gender,
      skillLevel: data.skill_level,
      phone: data.phone,
      email: data.email,
      address: address['formatted'] ?? address['address'] ?? address['line1'] ?? null,
      city: address['city'] ?? null,
      state: address['state'] ?? null,
      pinCode: address['pinCode'] ?? address['pin_code'] ?? address['postal_code'] ?? null,
      joinedOn: enrollment?.valid_from ?? data.joined_on,
      photoUrl: data.photo_path
        ? await this.storage.signedUrl('student-photos', data.photo_path, 3600)
        : data.photo_url,
      bloodGroup: medicalResult.data?.blood_group ?? null,
      nationality: address['nationality'] ?? null,
      aadhaar: address['aadhaar'] ?? null,
      batchId: enrollment?.batch_id ?? null,
      coachId,
      parentName: parentRelation?.full_name ?? null,
      parentRelation: parentRelation?.relation ?? null,
      parentPhone: parentRelation?.whatsapp ?? parentRelation?.phone ?? null,
      parentEmail: parentRelation?.email ?? null,
    };
  }

  async list(
    query: StudentListQuery,
  ): Promise<{ rows: readonly StudentListItem[]; total: number }> {
    const { data, error } = await this.supabase.requireClient().rpc(query.columns ? 'get_student_columns_page' : 'get_student_list_page', query.columns ? {p_page:query.page,p_size:query.pageSize,p_columns:query.columns,p_sort:({name:'full_name',code:'student_code',dateOfBirth:'date_of_birth',joinDate:'join_date'} as Record<string,string>)[query.sortBy] ?? query.sortBy.replace(/^cf_/,''),p_direction:query.sortDirection} : {
      p_search: query.search || null,
      p_batch_id: query.batchId || null,
      p_program_id: query.programId || null,
      p_coach_id: query.coachId || null,
      p_status: query.status || null,
      p_page: query.page,
      p_page_size: query.pageSize,
      p_sort_by: query.sortBy,
      p_sort_direction: query.sortDirection,
    });
    if (error) throw new DataRequestError('Load academy data', error);
    const dbRows = (query.columns ? data?.rows ?? [] : data ?? []) as StudentListDbRow[];
    const rows = dbRows.map((row) => ({
      id: row.student_id,
      studentCode: row.student_code,
      fullName: row.full_name,
      photoUrl: row.photo_url,
      batchId: row.batch_id,
      batchName: row.batch_name,
      programId: row.program_id,
      programName: row.program_name,
      coachId: row.coach_id,
      coachName: row.coach_name,
      coachPhotoUrl: row.coach_photo_url,
      dateOfBirth: row.date_of_birth,
      phone: row.phone,
      status: row.status,
      parentName: row.parent_name,
      parentPhone: row.parent_phone,
      joinDate: row.join_date,
      address: row.address,
      pinCode: row.pin_code,
    }));
    const idsWithoutPhotos = rows.filter((row) => !row.photoUrl).map((row) => row.id);
    if (idsWithoutPhotos.length) {
      const photos = await this.supabase
        .requireClient()
        .from('students')
        .select('id,photo_path')
        .in('id', idsWithoutPhotos)
        .not('photo_path', 'is', null);
      if (photos.error) throw this.toError('List student photos', photos.error);
      const signedPhotos = new Map<string, string>();
      await Promise.all(
        (photos.data ?? []).map(async (photo) => {
          if (photo.photo_path) {
            signedPhotos.set(
              photo.id,
              await this.storage.signedUrl('student-photos', photo.photo_path, 3600),
            );
          }
        }),
      );
      for (const row of rows) {
        const signedUrl = signedPhotos.get(row.id);
        if (signedUrl) (row as { photoUrl: string | null }).photoUrl = signedUrl;
      }
    }
    return {
      rows,
      total: Number(query.columns ? data?.total ?? 0 : dbRows[0]?.total_count ?? 0),
    };
  }

  getStudents(query: StudentListQuery) {
    return this.list(query);
  }

  getStudentById(id: string) {
    return this.getById(id);
  }

  async getStudentWorkspace(id: string): Promise<StudentWorkspace> {
    const client = this.supabase.requireClient();
    const student = await this.getById(id);
    const [enrollment, attendance, payments, documents, medical, summaryResult, balances] = await Promise.all(
      [
        client
          .from('enrollments')
          .select('*,batch:batches(*),fee_plan:fee_plans(*)')
          .eq('student_id', id)
          .order('valid_from', { ascending: false })
          .limit(1)
          .maybeSingle(),
        this.getAttendancePage(id, 1, 5),
        this.getPaymentPage(id, 1, 5),
        this.getDocumentPage(id, 1, 5),
        client.from('student_medical_records').select('*').eq('student_id', id).maybeSingle(),
        client.rpc('get_student_history_summary', { p_student_id: id }),
        loadPaymentBalances(client, { studentId: id }),
      ],
    );
    const error = enrollment.error ?? medical.error ?? summaryResult.error;
    if (error) throw this.toError('Get complete student details', error);
    return {
      student,
      enrollment: enrollment.data as StudentDetailRecord | null,
      attendance: attendance.rows,
      payments: payments.rows,
      documents: documents.rows,
      medical: medical.data as StudentDetailRecord | null,
      attendanceTotal: attendance.total,
      paymentTotal: payments.total,
      paymentAmount: sumMoney(balances.map(row => row.net_amount)),
      documentTotal: documents.total,
      attendanceSummary: {
        total: Number(summaryResult.data?.attendance_total ?? 0),
        present: Number(summaryResult.data?.present ?? 0),
        late: Number(summaryResult.data?.late ?? 0),
        absent: Number(summaryResult.data?.absent ?? 0),
      },
    };
  }

  async detailPage(studentId:string,kind:string,page:number,pageSize:number,columns:Record<string,string>,sortBy:string,direction:'asc'|'desc') {
    const result=await this.supabase.requireClient().rpc('get_student_detail_page',{p_resource:kind,p_page:page,p_size:pageSize,p_columns:columns,p_sort:sortBy,p_direction:direction,p_scope:{studentId}});
    if(result.error)throw this.toError('Load student history',result.error);
    return result.data as StudentDetailPage & {page:number};
  }
  async getAttendancePage(
    studentId: string,
    page: number,
    pageSize: number,
  ): Promise<StudentDetailPage> {
    return this.historyPage(
      'attendance_records',
      '*,batch:batches(name)',
      studentId,
      'attendance_date',
      page,
      pageSize,
    );
  }
  async getPaymentPage(
    studentId: string,
    page: number,
    pageSize: number,
  ): Promise<StudentDetailPage> {
    return this.historyPage(
      'payments',
      '*,monthly_charge:monthly_charges(*),receipt:receipts(*)',
      studentId,
      'paid_at',
      page,
      pageSize,
    );
  }
  async getDocumentPage(
    studentId: string,
    page: number,
    pageSize: number,
  ): Promise<StudentDetailPage> {
    return this.historyPage('student_documents', '*', studentId, 'created_at', page, pageSize);
  }
  private async historyPage(
    table: 'attendance_records' | 'payments' | 'student_documents',
    select: string,
    studentId: string,
    order: string,
    page: number,
    pageSize: number,
  ): Promise<StudentDetailPage> {
    const from = Math.max(0, page - 1) * pageSize;
    const result = await this.supabase
      .requireClient()
      .from(table)
      .select(select, { count: 'exact' })
      .eq('student_id', studentId)
      .order(order, { ascending: false })
      .range(from, from + pageSize - 1);
    if (result.error) throw this.toError('Get student history page', result.error);
    return {
      rows: (result.data ?? []) as unknown as StudentDetailRecord[],
      total: result.count ?? 0,
    };
  }

  async createStudent(input: StudentMutation): Promise<string> {
    const id = crypto.randomUUID();
    let photoPath: string | null = null;
    try {
      if (input.photo) photoPath = await this.storage.upload('student-photos', id, input.photo);
      const { data, error } = await this.supabase.requireClient().rpc('create_student_profile', {
        p_payload: this.payload(input, { id, photo_path: photoPath }),
      });
      if (error) throw this.toError('Create student', error);
      return String(data ?? id);
    } catch (error) {
      if (photoPath) await this.storage.remove('student-photos', photoPath).catch(() => undefined);
      throw error;
    }
  }

  async updateStudent(id: string, input: StudentMutation): Promise<void> {
    const client = this.supabase.requireClient();
    const current = await client.from('students').select('photo_path').eq('id', id).single();
    if (current.error) throw this.toError('Get existing student photo', current.error);
    let newPhotoPath: string | null | undefined;
    try {
      if (input.photo) newPhotoPath = await this.storage.upload('student-photos', id, input.photo);
      const extra = newPhotoPath === undefined ? {} : { photo_path: newPhotoPath };
      const { error } = await client.rpc('update_student_profile', {
        p_student_id: id,
        p_payload: this.payload(input, extra),
      });
      if (error) throw this.toError('Update student', error);
      if (newPhotoPath && current.data.photo_path) {
        await this.storage.remove('student-photos', current.data.photo_path).catch(() => undefined);
      }
    } catch (error) {
      if (newPhotoPath)
        await this.storage.remove('student-photos', newPhotoPath).catch(() => undefined);
      throw error;
    }
  }

  async updateLinkedChildProfile(id: string, input: ParentChildProfileMutation): Promise<void> {
    const client = this.supabase.requireClient();
    const current = await client.from('students').select('photo_path').eq('id', id).single();
    if (current.error) throw this.toError('Get child profile', current.error);
    let newPhotoPath: string | undefined;
    try {
      if (input.photo) newPhotoPath = await this.storage.upload('student-photos', id, input.photo);
      const { error } = await client.rpc('parent_update_linked_student', {
        p_student_id: id,
        p_payload: {
          full_name: input.fullName.trim(),
          date_of_birth: input.dateOfBirth,
          gender: input.gender,
          blood_group: input.bloodGroup || null,
          phone: input.phone.trim(),
          email: input.email.trim() || null,
          nationality: input.nationality,
          aadhaar: input.aadhaar.trim() || null,
          address: input.address.trim(),
          city: input.city.trim(),
          state: input.state,
          pin_code: input.pinCode.trim(),
          ...(newPhotoPath ? { photo_path: newPhotoPath } : {}),
        },
      });
      if (error) throw this.toError('Update child profile', error);
      if (newPhotoPath && current.data.photo_path) {
        await this.storage.remove('student-photos', current.data.photo_path).catch(() => undefined);
      }
    } catch (error) {
      if (newPhotoPath)
        await this.storage.remove('student-photos', newPhotoPath).catch(() => undefined);
      throw error;
    }
  }

  async deleteStudent(id: string): Promise<void> {
    const client = this.supabase.requireClient();
    const [student, documents] = await Promise.all([
      client.from('students').select('photo_path').eq('id', id).single(),
      client.from('student_documents').select('storage_path').eq('student_id', id),
    ]);
    if (student.error) throw this.toError('Get student before delete', student.error);
    if (documents.error) throw this.toError('Get student documents before delete', documents.error);
    const { error } = await client.rpc('delete_student_profile', { p_student_id: id });
    if (error) throw this.toError('Delete student', error);
    const cleanup = [
      student.data.photo_path
        ? this.storage.remove('student-photos', student.data.photo_path)
        : Promise.resolve(),
      ...(documents.data ?? []).map((document) =>
        this.storage.remove('student-documents', document.storage_path),
      ),
    ];
    await Promise.allSettled(cleanup);
  }

  async summary(): Promise<StudentSummary> {
    const { data, error } = await this.supabase.requireClient().rpc('get_student_summary');
    if (error) throw new DataRequestError('Load academy data', error);
    const row = (data?.[0] ?? {}) as Record<string, number>;
    return {
      total: Number(row['total'] ?? 0),
      active: Number(row['active'] ?? 0),
      inactive: Number(row['inactive'] ?? 0),
      newThisMonth: Number(row['new_this_month'] ?? 0),
      graduated: Number(row['graduated'] ?? 0),
    };
  }

  async update(
    id: string,
    changes: {
      readonly fullName: string;
      readonly dateOfBirth: string;
      readonly phone: string;
      readonly status: 'active' | 'inactive';
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .requireClient()
      .from('students')
      .update({
        full_name: changes.fullName,
        date_of_birth: changes.dateOfBirth,
        phone: changes.phone || null,
        status: changes.status,
      })
      .eq('id', id);
    if (error) throw new DataRequestError('Load academy data', error);
  }

  private payload(
    input: StudentMutation,
    extra: Partial<Pick<StudentRpcPayload, 'id' | 'photo_path'>> = {},
  ): StudentRpcPayload {
    return {
      full_name: input.fullName.trim(),
      date_of_birth: input.dateOfBirth,
      gender: input.gender,
      blood_group: input.bloodGroup || null,
      phone: input.phone.trim(),
      email: input.email.trim() || null,
      nationality: input.nationality,
      aadhaar: input.aadhaar.trim() || null,
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state,
      pin_code: input.pinCode.trim(),
      skill_level: input.skillLevel,
      batch_id: input.batchId || null,
      joined_on: input.joinedOn,
      parent_name: input.parentName.trim(),
      parent_relation: input.parentRelation,
      parent_phone: input.parentPhone.trim(),
      parent_email: input.parentEmail.trim() || null,
      ...extra,
    };
  }

  private toError(operation: string, error: PostgrestError): Error {
    if (error.code === '23505' || error.message.includes('student_already_exists')) {
      return new Error('A student with this phone number or email already exists.');
    }
    if (error.code === '42501') return new Error('You do not have permission for this action.');
    if (error.code === 'PGRST116' || error.code === 'P0002') return new Error('Student not found.');
    if (error.message.includes('batch_capacity_reached'))
      return new Error('The selected batch is full.');
    return new DataRequestError(operation, error);
  }

  async filters(): Promise<StudentListFilters> {
    const client = this.supabase.requireClient();
    const [batches, programs, coaches] = await Promise.all([
      client.from('batches').select('id,name').order('name'),
      client.from('fee_plans').select('id,name').order('name'),
      client.from('coaches').select('id,full_name').order('full_name'),
    ]);
    const error = batches.error ?? programs.error ?? coaches.error;
    if (error) throw new DataRequestError('Load academy data', error);
    return {
      batches: (batches.data ?? []).map((x) => ({ id: x.id, name: x.name })),
      programs: (programs.data ?? []).map((x) => ({ id: x.id, name: x.name })),
      coaches: (coaches.data ?? []).map((x) => ({ id: x.id, name: x.full_name })),
    };
  }
}
