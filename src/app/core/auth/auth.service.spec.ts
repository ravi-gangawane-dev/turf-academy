import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        { provide: API_CONFIG, useValue: { baseUrl: '/api/v1', useMockApi: true } },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('creates a mock staff session', async () => {
    const session = await firstValueFrom(
      service.login({ identity: 'admin@turf.local', password: 'academy123' }),
    );
    expect(session.user.role).toBe('admin');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken()).toBe('mock-access-token');
  });

  it('clears the active session on logout', async () => {
    await firstValueFrom(service.login({ identity: 'admin@turf.local', password: 'academy123' }));
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(sessionStorage.getItem('turf-academy-session')).toBeNull();
  });

  it('applies the coach permission boundary', async () => {
    await firstValueFrom(service.login({ identity: 'coach@turf.local', password: 'academy123' }));
    expect(service.hasPermission('coach:portal')).toBe(true);
    expect(service.hasPermission('attendance:write')).toBe(false);
    expect(service.hasPermission('students:read')).toBe(false);
    expect(service.hasPermission('students:write')).toBe(false);
    expect(service.hasPermission('coaches:write')).toBe(false);
    expect(service.hasPermission('fees:write')).toBe(false);
    expect(service.hasPermission('reports:read')).toBe(false);
  });

  it('separates parent child access from student management', async () => {
    await firstValueFrom(service.login({ identity: 'parent@turf.local', password: 'academy123' }));
    expect(service.hasPermission('children:read')).toBe(true);
    expect(service.hasPermission('students:read')).toBe(false);
    expect(service.hasPermission('students:write')).toBe(false);
    expect(service.hasPermission('attendance:write')).toBe(false);
    expect(service.hasPermission('fees:write')).toBe(false);
  });
});
