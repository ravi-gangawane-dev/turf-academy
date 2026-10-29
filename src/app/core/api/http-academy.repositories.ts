import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import { SupabaseAttendanceRepository } from './supabase-attendance.repository';
import { ApiResponse, API_CONFIG } from '../config/api.config';
import {
  AttendanceRecord,
  Batch,
  Coach,
  Enrollment,
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
import {
  AttendanceRepository,
  BatchesRepository,
  BatchWrite,
  CoachesRepository,
  CoachWrite,
  EnrollmentWrite,
  EnrollmentsRepository,
  FeeChargeView,
  FeesRepository,
  NotificationsRepository,
  Page,
  ParentsRepository,
  ParentUpdate,
  ParentWrite,
  ReportsRepository,
  StudentsRepository,
  StudentUpdate,
} from './academy.repositories';

abstract class HttpRepositoryBase {
  protected readonly http = inject(HttpClient);
  protected readonly config = inject(API_CONFIG);
  protected unwrap<T>() {
    return map((response: ApiResponse<T>) => response.data);
  }
  protected idempotencyHeaders(key?: string): HttpHeaders {
    return new HttpHeaders({
      'Idempotency-Key':
        key ?? globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random()}`,
    });
  }
}

@Injectable({ providedIn: 'root' })
export class HttpStudentsRepository extends HttpRepositoryBase implements StudentsRepository {
  list(search = '', page = 1, limit = 20): Observable<Page<Student>> {
    const params = new HttpParams().set('search', search).set('page', page).set('limit', limit);
    return this.http
      .get<ApiResponse<Page<Student>>>(`${this.config.baseUrl}/students`, { params })
      .pipe(this.unwrap());
  }
  get(id: string): Observable<Student> {
    return this.http
      .get<ApiResponse<Student>>(`${this.config.baseUrl}/students/${encodeURIComponent(id)}`)
      .pipe(this.unwrap());
  }
  register(input: StudentRegistration): Observable<Student> {
    return this.http
      .post<ApiResponse<Student>>(`${this.config.baseUrl}/students`, input)
      .pipe(this.unwrap());
  }
  update(id: string, input: StudentUpdate): Observable<Student> {
    return this.http
      .put<ApiResponse<Student>>(`${this.config.baseUrl}/students/${encodeURIComponent(id)}`, input)
      .pipe(this.unwrap());
  }
}

@Injectable({ providedIn: 'root' })
export class HttpParentsRepository extends HttpRepositoryBase implements ParentsRepository {
  list(): Observable<readonly Parent[]> {
    return this.http
      .get<ApiResponse<readonly Parent[]>>(`${this.config.baseUrl}/parents`)
      .pipe(this.unwrap());
  }
  create(input: ParentWrite): Observable<Parent> {
    return this.http
      .post<ApiResponse<Parent>>(`${this.config.baseUrl}/parents`, input)
      .pipe(this.unwrap());
  }
  update(id: string, input: ParentUpdate): Observable<Parent> {
    return this.http
      .put<ApiResponse<Parent>>(`${this.config.baseUrl}/parents/${encodeURIComponent(id)}`, input)
      .pipe(this.unwrap());
  }
}

@Injectable({ providedIn: 'root' })
export class HttpBatchesRepository extends HttpRepositoryBase implements BatchesRepository {
  list(): Observable<readonly Batch[]> {
    return this.http
      .get<ApiResponse<readonly Batch[]>>(`${this.config.baseUrl}/batches`)
      .pipe(this.unwrap());
  }
  create(input: BatchWrite): Observable<Batch> {
    return this.http
      .post<ApiResponse<Batch>>(`${this.config.baseUrl}/batches`, input)
      .pipe(this.unwrap());
  }
  update(id: string, input: BatchWrite): Observable<Batch> {
    return this.http
      .put<ApiResponse<Batch>>(`${this.config.baseUrl}/batches/${encodeURIComponent(id)}`, input)
      .pipe(this.unwrap());
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.config.baseUrl}/batches/${encodeURIComponent(id)}`);
  }
}

@Injectable({ providedIn: 'root' })
export class HttpCoachesRepository extends HttpRepositoryBase implements CoachesRepository {
  list(): Observable<readonly Coach[]> {
    return this.http
      .get<ApiResponse<readonly Coach[]>>(`${this.config.baseUrl}/coaches`)
      .pipe(this.unwrap());
  }
  create(input: CoachWrite): Observable<Coach> {
    return this.http
      .post<ApiResponse<Coach>>(`${this.config.baseUrl}/coaches`, input)
      .pipe(this.unwrap());
  }
  update(id: string, input: CoachWrite): Observable<Coach> {
    return this.http
      .put<ApiResponse<Coach>>(`${this.config.baseUrl}/coaches/${encodeURIComponent(id)}`, input)
      .pipe(this.unwrap());
  }
}

@Injectable({ providedIn: 'root' })
export class HttpEnrollmentsRepository extends HttpRepositoryBase implements EnrollmentsRepository {
  list(): Observable<readonly Enrollment[]> {
    return this.http
      .get<ApiResponse<readonly Enrollment[]>>(`${this.config.baseUrl}/enrollments`)
      .pipe(this.unwrap());
  }
  create(input: EnrollmentWrite): Observable<Enrollment> {
    return this.http
      .post<ApiResponse<Enrollment>>(`${this.config.baseUrl}/enrollments`, input)
      .pipe(this.unwrap());
  }
  changeStatus(id: string, status: 'pause' | 'cancel' | 'reactivate'): Observable<Enrollment> {
    return this.http
      .post<ApiResponse<Enrollment>>(
        `${this.config.baseUrl}/enrollments/${encodeURIComponent(id)}/${status}`,
        {},
      )
      .pipe(this.unwrap());
  }
  transfer(id: string, batchId: string, startDate: string): Observable<Enrollment> {
    return this.http
      .post<ApiResponse<Enrollment>>(
        `${this.config.baseUrl}/enrollments/${encodeURIComponent(id)}/transfer-batch`,
        { batchId, startDate },
      )
      .pipe(this.unwrap());
  }
}

@Injectable({ providedIn: 'root' })
export class HttpAttendanceRepository extends HttpRepositoryBase implements AttendanceRepository {
  private readonly supabaseAttendance = inject(SupabaseAttendanceRepository);
  list(date: string, batchId?: string): Observable<readonly AttendanceRecord[]> {
    if (this.config.backend === 'supabase') return from(this.supabaseAttendance.list(date, batchId));
    let params = new HttpParams().set('date', date);
    if (batchId) params = params.set('batchId', batchId);
    return this.http
      .get<ApiResponse<readonly AttendanceRecord[]>>(`${this.config.baseUrl}/attendance`, {
        params,
      })
      .pipe(this.unwrap());
  }
  identifyQr(code: string): Observable<QrIdentity> {
    if (this.config.backend === 'supabase') return from(this.supabaseAttendance.identifyQr(code));
    return this.http
      .post<ApiResponse<QrIdentity>>(`${this.config.baseUrl}/attendance/identify`, { code })
      .pipe(this.unwrap());
  }
  checkIn(
    studentId: string,
    batchId: string,
    source: 'manual' | 'qr' = 'manual',
    idempotencyKey?: string,
  ): Observable<AttendanceRecord> {
    if (this.config.backend === 'supabase') return from(this.supabaseAttendance.checkIn(studentId, batchId, source, idempotencyKey));
    return this.http
      .post<ApiResponse<AttendanceRecord>>(
        `${this.config.baseUrl}/attendance/check-in`,
        { studentId, batchId, source },
        { headers: this.idempotencyHeaders(idempotencyKey) },
      )
      .pipe(this.unwrap());
  }
  checkOut(attendanceId: string, idempotencyKey?: string): Observable<AttendanceRecord> {
    if (this.config.backend === 'supabase') return from(this.supabaseAttendance.checkOut(attendanceId, idempotencyKey));
    return this.http
      .post<ApiResponse<AttendanceRecord>>(
        `${this.config.baseUrl}/attendance/check-out`,
        { attendanceId },
        { headers: this.idempotencyHeaders(idempotencyKey) },
      )
      .pipe(this.unwrap());
  }
}

@Injectable({ providedIn: 'root' })
export class HttpFeesRepository extends HttpRepositoryBase implements FeesRepository {
  list(status?: string): Observable<readonly FeeChargeView[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http
      .get<ApiResponse<readonly FeeChargeView[]>>(`${this.config.baseUrl}/fees`, { params })
      .pipe(this.unwrap());
  }
  recordPayment(chargeId: string, amountPaise: number, mode: PaymentMode): Observable<Payment> {
    return this.http
      .post<ApiResponse<Payment>>(
        `${this.config.baseUrl}/fees/record-payment`,
        { chargeId, amountPaise, mode },
        { headers: this.idempotencyHeaders() },
      )
      .pipe(this.unwrap());
  }
}

@Injectable({ providedIn: 'root' })
export class HttpNotificationsRepository
  extends HttpRepositoryBase
  implements NotificationsRepository
{
  list(): Observable<readonly NotificationLog[]> {
    return this.http
      .get<ApiResponse<readonly NotificationLog[]>>(`${this.config.baseUrl}/notifications`)
      .pipe(this.unwrap());
  }
  retry(id: string): Observable<NotificationLog> {
    return this.http
      .post<ApiResponse<NotificationLog>>(
        `${this.config.baseUrl}/notifications/${encodeURIComponent(id)}/retry`,
        {},
      )
      .pipe(this.unwrap());
  }
}

@Injectable({ providedIn: 'root' })
export class HttpReportsRepository extends HttpRepositoryBase implements ReportsRepository {
  generate(
    type: ReportType,
    from: string,
    to: string,
    batchId?: string,
  ): Observable<ReportDataset> {
    let params = new HttpParams().set('from', from).set('to', to);
    if (batchId) params = params.set('batchId', batchId);
    return this.http
      .get<ApiResponse<ReportDataset>>(`${this.config.baseUrl}/reports/${type}`, { params })
      .pipe(this.unwrap());
  }
}
