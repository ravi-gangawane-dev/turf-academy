export interface EnrollmentStudent {
  id: string;
  student_code: string;
  full_name: string;
  date_of_birth: string;
  phone: string | null;
  status: string;
}
export interface EnrollmentBatch {
  id: string;
  code: string;
  name: string;
  status: string;
  capacity: number;
  fee_plan_id: string | null;
}
export interface EnrollmentPlan {
  id: string;
  name: string;
  monthly_fee: number;
  duration_months: number;
  status: string;
}
export type EnrollmentStatus = 'active' | 'paused' | 'cancelled';
export interface EnrollmentRecord {
  id: string;
  student_id: string;
  batch_id: string;
  fee_plan_id: string;
  status: EnrollmentStatus;
  valid_from: string;
  valid_till: string | null;
  monthly_fee: number;
  notes: string | null;
}
export interface EnrollmentWorkspace {
  students: EnrollmentStudent[];
  batches: EnrollmentBatch[];
  plans: EnrollmentPlan[];
  enrollments: EnrollmentRecord[];
}
export interface EnrollmentConfirmationGuardian {
  id: string;
  full_name: string;
  relation: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  is_primary: boolean;
  can_pick_up: boolean;
}
export interface EnrollmentConfirmationBatch {
  id: string;
  code: string;
  name: string;
  age_group: string | null;
  skill_level: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  capacity: number;
  batch_days: { day_of_week: number }[];
  batch_coaches: { coach: { full_name: string } | null }[];
}
export interface EnrollmentConfirmationPlan {
  id: string;
  name: string;
  monthly_fee: number;
  registration_fee: number;
  duration_months: number;
  status: string;
}
/** Live enrollment detail used to print a create/transfer/status confirmation. */
export interface EnrollmentConfirmationRecord {
  enrollment: EnrollmentRecord;
  student: EnrollmentStudent;
  batch: EnrollmentConfirmationBatch;
  plan: EnrollmentConfirmationPlan;
  guardians: EnrollmentConfirmationGuardian[];
  previousBatch: { name: string; code: string } | null;
}
export interface EnrollmentHistoryFilters {
  columns?: Record<string,string>;
  sortBy?: string;
  sortDirection?: 'asc'|'desc';
  search: string;
  action: string;
  studentId: string;
  batchId: string;
  from: string;
  to: string;
}
export interface EnrollmentHistoryRow {
  id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string | null;
  effective_on: string;
  created_at: string;
  reason: string | null;
  changed_by: string | null;
  enrollment: {
    student_id: string;
    student: { full_name: string; student_code: string };
  };
  from_batch: { name: string } | null;
  to_batch: { name: string } | null;
  actor: { full_name: string } | null;
}
