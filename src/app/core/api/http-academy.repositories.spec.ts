import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { HttpAttendanceRepository, HttpReportsRepository, HttpStudentsRepository } from './http-academy.repositories';

describe('HTTP academy repositories', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: false } }, HttpStudentsRepository, HttpAttendanceRepository, HttpReportsRepository] }));

  it('unwraps paginated student responses and sends query parameters', async () => {
    const repository = TestBed.inject(HttpStudentsRepository);
    const controller = TestBed.inject(HttpTestingController);
    const resultPromise = firstValueFrom(repository.list('rohan', 2, 10));
    const request = controller.expectOne((candidate) => candidate.url === '/api/v1/students');
    expect(request.request.params.get('search')).toBe('rohan');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ success: true, message: 'ok', data: { items: [], page: 2, limit: 10, total: 0 } });
    expect((await resultPromise).page).toBe(2);
  });

  it('adds an idempotency key to attendance commands', () => {
    const repository = TestBed.inject(HttpAttendanceRepository);
    const controller = TestBed.inject(HttpTestingController);
    repository.checkIn('student-1', 'batch-2').subscribe();
    const request = controller.expectOne('/api/v1/attendance/check-in');
    expect(request.request.headers.has('Idempotency-Key')).toBe(true);
    request.flush({ success: true, message: 'ok', data: { id: 'a1', studentId: 'student-1', batchId: 'batch-2', businessDate: '2026-08-05', checkInAt: '2026-08-05T10:00:00Z', status: 'present' } });
  });

  it('identifies a QR code without sending an attendance command', async () => {
    const repository = TestBed.inject(HttpAttendanceRepository);
    const controller = TestBed.inject(HttpTestingController);
    const resultPromise = firstValueFrom(repository.identifyQr('opaque-code'));
    const request = controller.expectOne('/api/v1/attendance/identify');
    expect(request.request.body).toEqual({ code: 'opaque-code' });
    request.flush({ success: true, message: 'identified', data: { student: { id: 's1', parentId: 'p1', name: 'Player', dateOfBirth: '2013-01-01', skillLevel: 'Beginner', status: 'active' }, batch: { id: 'b1', name: 'Morning', schedule: 'Daily', capacity: 20, monthlyFeePaise: 200000 }, enrollment: { id: 'e1', studentId: 's1', batchId: 'b1', startDate: '2026-08-01', dueDate: '2026-08-05', monthlyFeePaise: 200000, status: 'active' } } });
    expect((await resultPromise).student.name).toBe('Player');
    controller.verify();
  });

  it('serializes report filters and unwraps the dataset', async () => {
    const repository = TestBed.inject(HttpReportsRepository);
    const controller = TestBed.inject(HttpTestingController);
    const resultPromise = firstValueFrom(repository.generate('pending', '2026-08-01', '2026-08-31', 'batch-1'));
    const request = controller.expectOne((candidate) => candidate.url === '/api/v1/reports/pending');
    expect(request.request.params.get('from')).toBe('2026-08-01');
    expect(request.request.params.get('batchId')).toBe('batch-1');
    request.flush({ success: true, message: 'ok', data: { type: 'pending', title: 'Pending', generatedAt: '2026-08-05T00:00:00Z', columns: [], rows: [], summary: [] } });
    expect((await resultPromise).type).toBe('pending');
  });
});
