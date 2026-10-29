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
