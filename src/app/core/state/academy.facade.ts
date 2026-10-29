import { inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, finalize, firstValueFrom, forkJoin, Observable, tap } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  Batch,
  Coach,
  Parent,
  Payment,
  PaymentMode,
  QrIdentity,
  ReportDataset,
  ReportType,
  Student,
  StudentRegistration,
} from '../models/academy.model';
import {
  HttpAttendanceRepository,
  HttpBatchesRepository,
  HttpCoachesRepository,
  HttpEnrollmentsRepository,
  HttpFeesRepository,
  HttpNotificationsRepository,
  HttpParentsRepository,
  HttpReportsRepository,
  HttpStudentsRepository,
} from '../api/http-academy.repositories';
import { AcademyStore } from './academy.store';
import { AttendanceOutboxService } from '../offline/attendance-outbox.service';
import { normalizeHttpError } from '../api/app-http.error';
import { SupabaseAttendanceRepository } from '../api/supabase-attendance.repository';
import { AttendanceWhatsApp } from '../services/whatsapp.service';

@Injectable({ providedIn: 'root' })
export class AcademyFacade {
  private readonly config = inject(API_CONFIG);
  private readonly state = inject(AcademyStore);
  private readonly studentsApi = inject(HttpStudentsRepository);
  private readonly parentsApi = inject(HttpParentsRepository);
  private readonly batchesApi = inject(HttpBatchesRepository);
  private readonly coachesApi = inject(HttpCoachesRepository);
  private readonly enrollmentsApi = inject(HttpEnrollmentsRepository);
  private readonly attendanceApi = inject(HttpAttendanceRepository);
  private readonly supabaseAttendance = inject(SupabaseAttendanceRepository);
  private readonly feesApi = inject(HttpFeesRepository);
  private readonly notificationsApi = inject(HttpNotificationsRepository);
  private readonly reportsApi = inject(HttpReportsRepository);
  readonly attendanceOutbox = inject(AttendanceOutboxService);
  private initialized = false;
  private attendanceLoadId = 0;

  readonly loading = signal(false);
  readonly apiError = signal('');
  readonly lastPayment = signal<Payment | null>(null);
  readonly students = this.state.students;
  readonly parents = this.state.parents;
  readonly batches = this.state.batches;
  readonly coaches = this.state.coaches;
  readonly enrollments = this.state.enrollments;
  readonly attendance = this.state.attendance;
  readonly charges = this.state.charges;
  readonly payments = this.state.payments;
  readonly notifications = this.state.notifications;
  readonly studentRows = this.state.studentRows;
  readonly activeEnrollmentRows = this.state.activeEnrollmentRows;
  readonly enrollmentRows = this.state.enrollmentRows;
  readonly feeRows = this.state.feeRows;

  constructor() {
    this.initialize();
  }

  initialize(): void {
    if (this.initialized || this.config.useMockApi) return;
    this.initialized = true;
    this.state.hydrate({
      students: [],
      parents: [],
      batches: [],
      coaches: [],
      enrollments: [],
      attendance: [],
      charges: [],
      notifications: [],
    });
    // Supabase-backed feature services own their queries. Calling the legacy REST
    // repositories here requests the SPA shell from /api/v1 and creates a global
    // JSON parsing error over otherwise healthy Supabase pages.
    if (this.config.backend === 'supabase') return;
    this.refresh();
  }

  refresh(): void {
    if (this.config.useMockApi || this.config.backend === 'supabase') return;
    this.loading.set(true);
    this.apiError.set('');
    const businessDate = new Date().toISOString().slice(0, 10);
    forkJoin({
      studentPage: this.studentsApi.list('', 1, 100),
      parents: this.parentsApi.list(),
      batches: this.batchesApi.list(),
      coaches: this.coachesApi.list(),
      enrollments: this.enrollmentsApi.list(),
      attendance: this.attendanceApi.list(businessDate),
      charges: this.feesApi.list(),
      notifications: this.notificationsApi.list(),
    })
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError((error) => this.handleError(error)),
      )
      .subscribe((data) =>
        this.state.hydrate({
          students: data.studentPage.items,
          parents: data.parents,
          batches: data.batches,
          coaches: data.coaches,
          enrollments: data.enrollments,
          attendance: data.attendance,
          charges: data.charges,
          notifications: data.notifications,
        }),
      );
  }

  async loadAttendanceWorkspace(): Promise<void> {
    if (this.config.useMockApi) return;
    if (this.config.backend !== 'supabase') { this.refresh(); return; }
    const loadId = ++this.attendanceLoadId;
    this.loading.set(true);
    this.apiError.set('');
    try {
      const data = await this.supabaseAttendance.workspace();
      if (loadId === this.attendanceLoadId) this.state.hydrateAttendance(data);
    } catch (error) {
      if (loadId === this.attendanceLoadId) this.apiError.set(error instanceof Error ? error.message : 'Attendance could not be loaded.');
    } finally { if (loadId === this.attendanceLoadId) this.loading.set(false); }
  }

  registerStudent(input: StudentRegistration): string {
    if (this.config.useMockApi) return this.state.registerStudent(input);
    this.run(this.studentsApi.register(input));
    return '';
  }
  updateStudent(
    id: string,
    input: Pick<Student, 'name' | 'dateOfBirth' | 'skillLevel' | 'status'>,
  ): void {
    if (this.config.useMockApi) {
      this.state.updateStudent(id, input);
      return;
    }
    this.run(this.studentsApi.update(id, { ...input, version: 1 }));
  }
  updateParent(id: string, input: Omit<Parent, 'id'>): void {
    if (this.config.useMockApi) {
      this.state.updateParent(id, input);
      return;
    }
    this.run(this.parentsApi.update(id, input));
  }
  addParent(input: Omit<Parent, 'id'>): string {
    if (this.config.useMockApi) return this.state.addParent(input);
    this.run(this.parentsApi.create(input));
    return '';
  }
  linkStudentToParent(studentId: string, parentId: string): void {
    if (this.config.useMockApi) {
      this.state.linkStudentToParent(studentId, parentId);
      return;
    }
    this.apiError.set('Linking a child requires PUT /students/:id/parent on the server.');
  }
  addBatch(input: Omit<Batch, 'id'>): void {
    if (this.config.useMockApi) {
      this.state.addBatch(input);
      return;
    }
    this.run(this.batchesApi.create(input));
  }
  updateBatch(id: string, input: Omit<Batch, 'id'>): void {
    if (this.config.useMockApi) {
      this.state.updateBatch(id, input);
      return;
    }
    this.run(this.batchesApi.update(id, input));
  }
  deleteBatch(id: string): void {
    if (this.config.useMockApi) {
      this.state.deleteBatch(id);
      return;
    }
    this.run(this.batchesApi.delete(id));
  }
  addCoach(input: Omit<Coach, 'id'>): void {
    if (this.config.useMockApi) {
      this.state.addCoach(input);
      return;
    }
    this.run(this.coachesApi.create(input));
  }
  updateCoach(id: string, input: Omit<Coach, 'id'>): void {
    if (this.config.useMockApi) {
      this.state.updateCoach(id, input);
      return;
    }
    this.run(this.coachesApi.update(id, input));
  }
  enroll(
    studentId: string,
    batchId: string,
    startDate: string,
    dueDate: string,
    monthlyFeePaise: number,
  ): void {
    if (this.config.useMockApi) {
      this.state.enroll(studentId, batchId, startDate, dueDate, monthlyFeePaise);
      return;
    }
    this.run(
      this.enrollmentsApi.create({ studentId, batchId, startDate, dueDate, monthlyFeePaise }),
    );
  }
  setEnrollmentStatus(id: string, status: 'paused' | 'cancelled'): void {
    if (this.config.useMockApi) {
      this.state.setEnrollmentStatus(id, status);
      return;
    }
    this.run(this.enrollmentsApi.changeStatus(id, status === 'paused' ? 'pause' : 'cancel'));
  }
  reactivateEnrollment(id: string): void {
    if (this.config.useMockApi) {
      this.state.reactivateEnrollment(id);
      return;
    }
    this.run(this.enrollmentsApi.changeStatus(id, 'reactivate'));
  }
  transferEnrollment(id: string, batchId: string, startDate: string): void {
    if (this.config.useMockApi) {
      this.state.transferEnrollment(id, batchId, startDate);
      return;
    }
    this.run(this.enrollmentsApi.transfer(id, batchId, startDate));
  }
  retryNotification(id: string): void {
    if (this.config.useMockApi) return;
    this.run(this.notificationsApi.retry(id));
  }
  async attendanceWhatsApp(
    studentId: string,
    batchId: string,
    action: 'check_in' | 'check_out',
  ): Promise<AttendanceWhatsApp | null> {
    if (!this.attendanceOutbox.online()) return null;
    if (this.config.backend === 'supabase' && !this.config.useMockApi) return this.supabaseAttendance.whatsappMessage(studentId, batchId, action);
    const row = this.activeEnrollmentRows().find(row => row.studentId === studentId && row.batchId === batchId);
    const student = this.students().find(student => student.id === studentId);
    const parent = this.parents().find(parent => parent.id === student?.parentId);
    const timestamp = action === 'check_in' ? row?.attendance?.checkInAt : row?.attendance?.checkOutAt;
    if (!row || !parent || !timestamp) return null;
    return { studentName: row.studentName, batchName: row.batchName, parentPhone: parent.whatsapp, action, timestamp };
  }
  async checkIn(studentId: string, batchId: string, source: 'manual' | 'qr' = 'manual'): Promise<void> {
    if (this.config.useMockApi) { this.state.checkIn(studentId, batchId); return; }
    if (!this.attendanceOutbox.online()) throw new Error('Attendance requires an online API connection. Reconnect and try again.');
    await firstValueFrom(this.attendanceApi.checkIn(studentId, batchId, source));
    if (this.config.backend === 'supabase') await this.loadAttendanceWorkspace(); else this.refresh();
  }
  async identifyQrCode(code: string): Promise<QrIdentity> {
    if (this.config.useMockApi) return this.state.identifyQrCode(code);
    try {
      return await firstValueFrom(this.attendanceApi.identifyQr(code));
    } catch (error) {
      throw normalizeHttpError(error);
    }
  }
  async generateReport(
    type: ReportType,
    from: string,
    to: string,
    batchId?: string,
  ): Promise<ReportDataset> {
    if (this.config.useMockApi) return this.state.buildReport(type, from, to, batchId);
    try {
      return await firstValueFrom(this.reportsApi.generate(type, from, to, batchId));
    } catch (error) {
      throw normalizeHttpError(error);
    }
  }
  async checkOut(attendanceId: string): Promise<void> {
    if (this.config.useMockApi) { this.state.checkOut(attendanceId); return; }
    if (!this.attendanceOutbox.online()) throw new Error('Attendance requires an online API connection. Reconnect and try again.');
    await firstValueFrom(this.attendanceApi.checkOut(attendanceId));
    if (this.config.backend === 'supabase') await this.loadAttendanceWorkspace(); else this.refresh();
  }
  recordPayment(chargeId: string, amountPaise: number, mode: PaymentMode): Payment | null {
    if (this.config.useMockApi) {
      const payment = this.state.recordPayment(chargeId, amountPaise, mode);
      this.lastPayment.set(payment);
      return payment;
    }
    if (!this.attendanceOutbox.online()) {
      this.apiError.set(
        'Payments cannot be recorded offline. Reconnect and confirm the payment online.',
      );
      return null;
    }
    this.loading.set(true);
    this.apiError.set('');
    this.feesApi
      .recordPayment(chargeId, amountPaise, mode)
      .pipe(
        tap((payment) => this.lastPayment.set(payment)),
        finalize(() => this.loading.set(false)),
        catchError((error) => this.handleError(error)),
      )
      .subscribe(() => this.refresh());
    return null;
  }
  addMonthlyCharge(enrollmentId: string, period: string, dueDate: string, amountPaise: number): void {
    if (this.config.useMockApi) {
      this.state.addMonthlyCharge(enrollmentId, period, dueDate, amountPaise);
      return;
    }
    this.apiError.set('Creating monthly charges requires POST /fees on the server.');
  }

  private run(request: Observable<unknown>): void {
    this.loading.set(true);
    this.apiError.set('');
    request
      .pipe(
        finalize(() => this.loading.set(false)),
        catchError((error) => this.handleError(error)),
      )
      .subscribe(() => this.refresh());
  }
  private handleError(error: unknown): Observable<never> {
    const normalized = normalizeHttpError(error);
    this.apiError.set(
      normalized.correlationId
        ? `${normalized.message} Reference: ${normalized.correlationId}`
        : normalized.message,
    );
    return EMPTY;
  }
}