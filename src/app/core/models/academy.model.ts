export type StudentStatus = 'active' | 'inactive';
export type EnrollmentStatus = 'active' | 'paused' | 'cancelled';
export type AttendanceStatus = 'present' | 'late' | 'checked-out' | 'absent';
export type PaymentMode = 'cash' | 'upi' | 'online';

export interface Parent {
  readonly id: string;
  readonly name: string;
  readonly mobile: string;
  readonly whatsapp: string;
  readonly relation: string;
  readonly status?: 'active' | 'inactive';
  readonly dateOfBirth?: string;
  readonly occupation?: string;
  readonly alternatePhone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly city?: string;
  readonly state?: string;
  readonly pinCode?: string;
  readonly communication?: string;
  readonly contactTime?: string;
  readonly parentType?: string;
  readonly notes?: string;
  readonly emergencyName?: string;
  readonly emergencyRelation?: string;
  readonly emergencyPhone?: string;
  readonly emergencyAddress?: string;
  readonly joinedOn?: string;
  readonly photoUrl?: string | null;
}

export interface Student {
  readonly id: string;
  readonly parentId: string;
  readonly name: string;
  readonly dateOfBirth: string;
  readonly skillLevel: string;
  readonly status: StudentStatus;
}

export interface Batch {
  readonly id: string;
  readonly name: string;
  readonly schedule: string;
  readonly capacity: number;
  readonly monthlyFeePaise: number;
  readonly coachId?: string;
  readonly ageGroup?: string;
  readonly type?: string;
  readonly status?: 'active' | 'completed' | 'upcoming';
  readonly code?: string;
  readonly description?: string;
  readonly gender?: string;
  readonly level?: string;
  readonly days?: readonly string[];
  readonly startTime?: string;
  readonly endTime?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly waitlistCapacity?: number;
  readonly registrationFeePaise?: number;
  readonly discountPercent?: number;
  readonly assistantCoachId?: string;
}

export interface Coach {
  readonly id: string;
  readonly name: string;
  readonly mobile: string;
  readonly specialization: string;
  readonly status: 'active' | 'inactive';
  readonly email?: string;
  readonly address?: string;
  readonly dateOfBirth?: string;
  readonly experienceYears?: number;
  readonly qualification?: string;
  readonly biography?: string;
  readonly philosophy?: string;
  readonly specializations?: readonly string[];
  readonly achievements?: readonly string[];
  readonly certifications?: readonly string[];
  readonly photoDataUrl?: string;
}

export interface Enrollment {
  readonly id: string;
  readonly studentId: string;
  readonly batchId: string;
  readonly startDate: string;
  readonly dueDate: string;
  readonly monthlyFeePaise: number;
  readonly status: EnrollmentStatus;
}

export interface AttendanceRecord {
  readonly id: string;
  readonly studentId: string;
  readonly batchId: string;
  readonly businessDate: string;
  readonly checkInAt: string;
  readonly checkOutAt?: string;
  readonly status: AttendanceStatus;
  readonly syncState?: 'pending' | 'conflict' | 'failed';
}

export interface AttendanceOutboxOperation {
  readonly id: string;
  readonly kind: 'check-in' | 'check-out';
  readonly studentId: string;
  readonly batchId: string;
  readonly attendanceId?: string;
  readonly source?: 'manual' | 'qr';
  readonly createdAt: string;
  readonly status: 'pending' | 'syncing' | 'conflict' | 'failed';
  readonly failureReason?: string;
}

export interface FeeCharge {
  readonly id: string;
  readonly studentId: string;
  readonly enrollmentId: string;
  readonly period: string;
  readonly amountPaise: number;
  readonly dueDate: string;
}

export interface Payment {
  readonly id: string;
  readonly chargeId: string;
  readonly studentId: string;
  readonly amountPaise: number;
  readonly mode: PaymentMode;
  readonly paidAt: string;
  readonly receiptNumber: string;
}

export interface NotificationLog {
  readonly id: string;
  readonly studentId: string;
  readonly type: 'check-in' | 'check-out' | 'fee-reminder' | 'announcement';
  readonly recipientName: string;
  readonly recipientMobile: string;
  readonly channel: 'whatsapp' | 'sms';
  readonly status: 'queued' | 'sent' | 'delivered' | 'failed';
  readonly createdAt: string;
  readonly failureReason?: string;
}

export interface QrIdentity {
  readonly student: Student;
  readonly batch: Batch;
  readonly enrollment: Enrollment;
  readonly attendance?: AttendanceRecord;
}

export type ReportType = 'attendance' | 'fees' | 'pending' | 'enrollment' | 'revenue';
export interface ReportColumn {
  readonly key: string;
  readonly label: string;
}
export interface ReportDataset {
  readonly type: ReportType;
  readonly title: string;
  readonly generatedAt: string;
  readonly columns: readonly ReportColumn[];
  readonly rows: readonly Record<string, string | number>[];
  readonly summary: readonly { readonly label: string; readonly value: string }[];
}

export interface StudentRegistration {
  readonly studentName: string;
  readonly dateOfBirth: string;
  readonly skillLevel: string;
  readonly parentName: string;
  readonly mobile: string;
  readonly whatsapp: string;
  readonly relation: string;
}
