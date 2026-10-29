import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../config/api.config';
import { AcademyFacade } from './academy.facade';
import { SupabaseAttendanceRepository } from '../api/supabase-attendance.repository';
import { AttendanceOutboxService } from '../offline/attendance-outbox.service';
import { signal } from '@angular/core';

describe('AcademyFacade', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('keeps the latest attendance load when earlier reads finish later', async () => {
    type Workspace = Awaited<ReturnType<SupabaseAttendanceRepository['workspace']>>;
    let resolveEarlier!: (value: Workspace) => void;
    const empty = { students: [], batches: [], enrollments: [], attendance: [] };
    const api = { workspace: vi.fn()
      .mockReturnValueOnce(new Promise<Workspace>(resolve => { resolveEarlier = resolve; }))
      .mockResolvedValueOnce({ ...empty, students: [{ id: 'new', name: 'Latest Student' }] }) };
    TestBed.configureTestingModule({ providers: [provideHttpClient(),
      { provide: API_CONFIG, useValue: { backend: 'supabase', useMockApi: false } },
      { provide: SupabaseAttendanceRepository, useValue: api },
      { provide: AttendanceOutboxService, useValue: { online: signal(true) } },
    ] });
    const facade = TestBed.inject(AcademyFacade);
    const earlier = facade.loadAttendanceWorkspace();
    await facade.loadAttendanceWorkspace();
    resolveEarlier(empty);
    await earlier;
    expect(facade.students()[0]?.name).toBe('Latest Student');
    expect(facade.loading()).toBe(false);
  });

  it('propagates Supabase save failures without refreshing into a false success', async () => {
    const api = { checkIn: vi.fn().mockRejectedValue(new Error('Attendance service unavailable')), workspace: vi.fn() };
    TestBed.configureTestingModule({ providers: [provideHttpClient(),
      { provide: API_CONFIG, useValue: { backend: 'supabase', useMockApi: false } },
      { provide: SupabaseAttendanceRepository, useValue: api },
      { provide: AttendanceOutboxService, useValue: { online: signal(true) } },
    ] });
    await expect(TestBed.inject(AcademyFacade).checkIn('s1', 'b1')).rejects.toThrow('Attendance service unavailable');
    expect(api.workspace).not.toHaveBeenCalled();
  });

  it('uses synchronous session state in mock mode', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), { provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: true } }] });
    const facade = TestBed.inject(AcademyFacade);
    const initialCount = facade.students().length;
    facade.registerStudent({ studentName: 'Facade Player', dateOfBirth: '2014-02-02', skillLevel: 'Beginner', parentName: 'Facade Parent', mobile: '9999999999', whatsapp: '9999999999', relation: 'Guardian' });
    expect(facade.students().length).toBe(initialCount + 1);
    expect(facade.loading()).toBe(false);
  });

  it('hydrates shared state from repositories in HTTP mode', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: false } }] });
    const facade = TestBed.inject(AcademyFacade);
    const controller = TestBed.inject(HttpTestingController);
    expect(facade.loading()).toBe(true);
    controller.expectOne((request) => request.url === '/api/v1/students').flush({ success: true, message: 'ok', data: { items: [{ id: 's1', parentId: 'p1', name: 'Server Student', dateOfBirth: '2013-01-01', skillLevel: 'Beginner', status: 'active' }], page: 1, limit: 100, total: 1 } });
    controller.expectOne('/api/v1/parents').flush({ success: true, message: 'ok', data: [{ id: 'p1', name: 'Server Parent', mobile: '9999999999', whatsapp: '9999999999', relation: 'Mother' }] });
    controller.expectOne('/api/v1/batches').flush({ success: true, message: 'ok', data: [] });
    controller.expectOne('/api/v1/coaches').flush({ success: true, message: 'ok', data: [{ id: 'c1', name: 'Server Coach', mobile: '9888888888', specialization: 'Fielding', status: 'active' }] });
    controller.expectOne('/api/v1/enrollments').flush({ success: true, message: 'ok', data: [] });
    controller.expectOne((request) => request.url === '/api/v1/attendance').flush({ success: true, message: 'ok', data: [] });
    controller.expectOne('/api/v1/fees').flush({ success: true, message: 'ok', data: [] });
    controller.expectOne('/api/v1/notifications').flush({ success: true, message: 'ok', data: [] });
    expect(facade.students()[0]?.name).toBe('Server Student');
    expect(facade.parents()[0]?.name).toBe('Server Parent');
    expect(facade.coaches()[0]?.name).toBe('Server Coach');
    expect(facade.loading()).toBe(false);
    controller.verify();
  });
});
