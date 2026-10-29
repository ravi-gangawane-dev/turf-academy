import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AttendanceRecord,
  Batch,
  Coach,
  Enrollment,
  FeeCharge,
  NotificationLog,
  Parent,
  Payment,
  PaymentMode,
  QrIdentity,
  ReportDataset,
  ReportType,
  Student,
  StudentRegistration,
} from '../models/academy.model';

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
}
export interface StudentUpdate {
  readonly name: string;
  readonly dateOfBirth: string;
  readonly skillLevel: string;
  readonly status: Student['status'];
  readonly version: number;
}
export type ParentWrite = Omit<Parent, 'id'>;
export type ParentUpdate = ParentWrite;
export type BatchWrite = Omit<Batch, 'id'>;
export type CoachWrite = Omit<Coach, 'id'>;
export type EnrollmentWrite = Omit<Enrollment, 'id' | 'status'>;
export interface FeeChargeView extends FeeCharge {
  readonly paidPaise: number;
  readonly balancePaise: number;
  readonly status: 'Paid' | 'Partial' | 'Pending' | 'Overdue';
}

export interface StudentsRepository {
  list(search?: string, page?: number, limit?: number): Observable<Page<Student>>;
  get(id: string): Observable<Student>;
  register(input: StudentRegistration): Observable<Student>;
  update(id: string, input: StudentUpdate): Observable<Student>;
}
export interface ParentsRepository {
  list(): Observable<readonly Parent[]>;
  create(input: ParentWrite): Observable<Parent>;
  update(id: string, input: ParentUpdate): Observable<Parent>;
}
export interface BatchesRepository {
  list(): Observable<readonly Batch[]>;
  create(input: BatchWrite): Observable<Batch>;
  update(id: string, input: BatchWrite): Observable<Batch>;
  delete(id: string): Observable<void>;
}
export interface CoachesRepository {
  list(): Observable<readonly Coach[]>;
  create(input: CoachWrite): Observable<Coach>;
  update(id: string, input: CoachWrite): Observable<Coach>;
}
export interface EnrollmentsRepository {
  list(): Observable<readonly Enrollment[]>;
  create(input: EnrollmentWrite): Observable<Enrollment>;
  changeStatus(id: string, status: 'pause' | 'cancel' | 'reactivate'): Observable<Enrollment>;
  transfer(id: string, batchId: string, startDate: string): Observable<Enrollment>;
}
export interface AttendanceRepository {
  list(date: string, batchId?: string): Observable<readonly AttendanceRecord[]>;
  identifyQr(code: string): Observable<QrIdentity>;
  checkIn(
    studentId: string,
    batchId: string,
    source?: 'manual' | 'qr',
    idempotencyKey?: string,
  ): Observable<AttendanceRecord>;
  checkOut(attendanceId: string, idempotencyKey?: string): Observable<AttendanceRecord>;
}
export interface FeesRepository {
  list(status?: string): Observable<readonly FeeChargeView[]>;
  recordPayment(chargeId: string, amountPaise: number, mode: PaymentMode): Observable<Payment>;
}
export interface NotificationsRepository {
  list(): Observable<readonly NotificationLog[]>;
  retry(id: string): Observable<NotificationLog>;
}
export interface ReportsRepository {
  generate(type: ReportType, from: string, to: string, batchId?: string): Observable<ReportDataset>;
}

export const STUDENTS_REPOSITORY = new InjectionToken<StudentsRepository>('StudentsRepository');
export const PARENTS_REPOSITORY = new InjectionToken<ParentsRepository>('ParentsRepository');
export const BATCHES_REPOSITORY = new InjectionToken<BatchesRepository>('BatchesRepository');
export const COACHES_REPOSITORY = new InjectionToken<CoachesRepository>('CoachesRepository');
export const ENROLLMENTS_REPOSITORY = new InjectionToken<EnrollmentsRepository>(
  'EnrollmentsRepository',
);
export const ATTENDANCE_REPOSITORY = new InjectionToken<AttendanceRepository>(
  'AttendanceRepository',
);
export const FEES_REPOSITORY = new InjectionToken<FeesRepository>('FeesRepository');
export const NOTIFICATIONS_REPOSITORY = new InjectionToken<NotificationsRepository>(
  'NotificationsRepository',
);
export const REPORTS_REPOSITORY = new InjectionToken<ReportsRepository>('ReportsRepository');
