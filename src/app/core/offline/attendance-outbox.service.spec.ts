import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../config/api.config';
import { AcademyStore } from '../state/academy.store';
import { AttendanceOutboxStorage } from './attendance-outbox.storage';
import { AttendanceOutboxService } from './attendance-outbox.service';

describe('AttendanceOutboxService', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: false, allowOfflineAttendance: true } }] }));

  it('queues an offline check-in with visible pending state', async () => {
    const service = TestBed.inject(AttendanceOutboxService);
    const store = TestBed.inject(AcademyStore);
    service.online.set(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await service.queueCheckIn('student-1', 'batch-2');
    expect(service.operations().length).toBe(1);
    expect(service.operations()[0]?.status).toBe('pending');
    expect(store.attendance()[0]?.syncState).toBe('pending');
  });

  it('replays with the stable operation id and reconciles server state', async () => {
    const service = TestBed.inject(AttendanceOutboxService);
    const store = TestBed.inject(AcademyStore);
    const controller = TestBed.inject(HttpTestingController);
    service.online.set(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await service.queueCheckIn('student-1', 'batch-2', 'qr');
    const operationId = service.operations()[0]!.id;
    service.online.set(true);
    const replay = service.replay();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const request = controller.expectOne('/api/v1/attendance/check-in');
    expect(request.request.headers.get('Idempotency-Key')).toBe(operationId);
    expect(request.request.body.source).toBe('qr');
    request.flush({ success: true, message: 'synced', data: { id: 'server-attendance-1', studentId: 'student-1', batchId: 'batch-2', businessDate: new Date().toISOString().slice(0, 10), checkInAt: '10:00 AM', status: 'present' } });
    await replay;
    expect(service.operations().length).toBe(0);
    expect(store.attendance()[0]?.id).toBe('server-attendance-1');
    expect(store.attendance()[0]?.syncState).toBeUndefined();
    expect(service.lastSyncAt()).toBeTruthy();
    expect(service.syncAttempts()[0]).toEqual(expect.objectContaining({ synced: 1, failed: 0 }));
    controller.verify();
  });

  it('clears persisted queue operations from the visible state', async () => {
    const service = TestBed.inject(AttendanceOutboxService);
    service.online.set(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await service.queueCheckIn('student-1', 'batch-2');
    await service.clear();
    expect(service.operations()).toEqual([]);
  });
});


describe('API-only attendance', () => {
  it('rejects offline mutations and never loads or replays saved device records', async () => {
    const storage = { list: vi.fn(), put: vi.fn(), delete: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
      { provide: API_CONFIG, useValue: { backend: 'supabase', useMockApi: false, allowOfflineAttendance: false } },
      { provide: AttendanceOutboxStorage, useValue: storage },
    ] });
    const outbox = TestBed.inject(AttendanceOutboxService);
    outbox.online.set(false);
    await expect(outbox.queueCheckIn('s1', 'b1')).rejects.toThrow('online API connection');
    await expect(outbox.queueCheckOut('a1', 's1', 'b1')).rejects.toThrow('online API connection');
    outbox.online.set(true);
    await outbox.replay();
    expect(storage.list).not.toHaveBeenCalled();
    expect(storage.put).not.toHaveBeenCalled();
    expect(TestBed.inject(AcademyStore).attendance()).toEqual([]);
    TestBed.inject(HttpTestingController).expectNone(() => true);
  });
});
