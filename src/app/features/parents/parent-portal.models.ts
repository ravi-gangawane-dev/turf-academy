import { ParentDetailRecord } from '../../core/supabase/domain-services';
import { StudentWorkspace } from '../students/student-list.service';

export interface ParentPortalRecord {
  readonly id?: string;
  readonly student_id?: string;
  readonly parent_id?: string;
  readonly batch_id?: string;
  readonly attendance_date?: string;
  readonly check_in_at?: string | null;
  readonly check_out_at?: string | null;
  readonly status?: string;
  readonly source?: string;
  readonly remarks?: string | null;
  readonly amount?: number;
  readonly payment_mode?: string;
  readonly provider_reference?: string | null;
  readonly client_reference?: string;
  readonly paid_at?: string;
  readonly body?: string;
  readonly subject?: string | null;
  readonly template_key?: string | null;
  readonly created_at?: string;
  readonly read_at?: string | null;
  readonly profile_photo_url?: string | null;
  readonly profile_name?: string | null;
  readonly day_of_week?: number;
  readonly session_date?: string;
  readonly start_time?: string;
  readonly end_time?: string;
  readonly title?: string;
  readonly location?: string | null;
  readonly venue?: string | null;
  readonly charge_month?: string;
  readonly due_date?: string;
  readonly final_amount?: number;
  readonly base_amount?: number;
  readonly discount_amount?: number;
  readonly late_fee_amount?: number;
  readonly paid_amount?: number;
  readonly balance_amount?: number;
  readonly full_name?: string;
  readonly name?: string;
  readonly phone?: string | null;
  readonly experience_years?: number;
  readonly qualification?: string | null;
  readonly formatted?: string;
  readonly city?: string;
  readonly state?: string;
  readonly pinCode?: string;
  readonly receipt_number?: string;
  readonly storage_path?: string | null;
  readonly url?: string | null;
  readonly email?: string | null;
  readonly photo_path?: string | null;
  readonly photo_url?: string | null;
  readonly is_primary?: boolean;
  readonly batch?: ParentPortalRecord | readonly ParentPortalRecord[] | null;
  readonly coach?: ParentPortalRecord | null;
  readonly student?: ParentPortalRecord | readonly ParentPortalRecord[] | null;
  readonly fee_plan?: ParentPortalRecord | readonly ParentPortalRecord[] | null;
  readonly monthly_charge?: ParentPortalRecord | readonly ParentPortalRecord[] | null;
  readonly receipt?:
    | (ParentPortalRecord & {
        readonly storage_path?: string | null;
        readonly receipt_number?: string;
        readonly url?: string | null;
      })
    | readonly ParentPortalRecord[]
    | null;
}

export interface ParentCoachRecord extends ParentPortalRecord {
  readonly id: string;
  readonly full_name: string;
}
export interface ParentCoachLinkRecord extends ParentPortalRecord {
  readonly coach: ParentCoachRecord;
}

export interface ParentChildLink {
  readonly is_primary: boolean;
  readonly can_pick_up: boolean;
  readonly student: { readonly id: string };
}
export interface ParentChildData {
  readonly link: ParentChildLink;
  readonly workspace: StudentWorkspace;
}
export interface ParentPage {
  readonly rows: readonly ParentPortalRecord[];
  readonly total: number;
}
export interface ParentPortalData {
  readonly parent: ParentDetailRecord;
  readonly children: readonly ParentChildData[];
  readonly selected: ParentChildData | null;
  readonly charges: readonly ParentPortalRecord[];
  readonly notifications: readonly ParentPortalRecord[];
  readonly batchDays: readonly ParentPortalRecord[];
  readonly coaches: readonly ParentCoachLinkRecord[];
  readonly sessions: readonly ParentPortalRecord[];
  readonly attendancePage: ParentPage;
  readonly paymentPage: ParentPage;
  readonly notificationPage: ParentPage;
}

export interface ParentPortalQuery {
  readonly attendancePage: number;
  readonly attendancePageSize: number;
  readonly attendanceStatus?: string;
  readonly attendanceFrom?: string;
  readonly attendanceTo?: string;
  readonly attendanceSearch?: string;
  readonly attendanceSortBy?: 'date' | 'checkIn' | 'status';
  readonly attendanceSortDirection?: 'asc' | 'desc';
  readonly paymentPage: number;
  readonly paymentPageSize: number;
  readonly paymentStatus?: string;
  readonly paymentSearch?: string;
  readonly paymentSortBy?: 'date' | 'amount' | 'mode' | 'reference' | 'status';
  readonly paymentSortDirection?: 'asc' | 'desc';
  readonly notificationPage: number;
  readonly notificationPageSize: number;
  readonly notificationUnreadOnly?: boolean;
  readonly notificationType?: string;
}
