import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { StaffRole } from './auth.model';
import { roleGuard } from './role.guard';
import { AuthService } from './auth.service';

describe('roleGuard', () => {
  const state = { url: '/students' } as RouterStateSnapshot;

  function run(role: StaffRole | null, roles: readonly StaffRole[]): Promise<boolean | UrlTree> {
    const route = { data: { roles } } as unknown as ActivatedRouteSnapshot;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            ensureInitialized: () => Promise.resolve(),
            isAuthenticated: () => role !== null,
            hasRole: (allowed: readonly StaffRole[]) => role !== null && allowed.includes(role),
          },
        },
      ],
    });
    return TestBed.runInInjectionContext(() => roleGuard(route, state)) as Promise<boolean | UrlTree>;
  }

  it('allows a user whose role is listed on the route', async () => {
    await expect(run('admin', ['admin', 'receptionist'])).resolves.toBe(true);
  });

  it('redirects a signed-in user without the required role to unauthorized', async () => {
    const result = await run('coach', ['admin']);
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/unauthorized');
  });

  it('redirects a signed-out user to login with the attempted URL', async () => {
    const result = await run(null, ['admin']);
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/auth/login?returnUrl=%2Fstudents',
    );
  });

  it('denies every role when the route lists no roles', async () => {
    const result = await run('admin', []);
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/unauthorized');
  });
});
