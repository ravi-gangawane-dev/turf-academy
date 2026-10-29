import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/students' } as RouterStateSnapshot;

  function run(authenticated: boolean): Promise<boolean | UrlTree> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            ensureInitialized: () => Promise.resolve(),
            isAuthenticated: () => authenticated,
          },
        },
      ],
    });
    return TestBed.runInInjectionContext(() => authGuard(route, state)) as Promise<boolean | UrlTree>;
  }

  it('allows a signed-in user through', async () => {
    await expect(run(true)).resolves.toBe(true);
  });

  it('redirects a signed-out user to login and keeps the attempted URL', async () => {
    const result = await run(false);
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/auth/login?returnUrl=%2Fstudents',
    );
  });

  it('waits for initialization before deciding', async () => {
    const order: string[] = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            ensureInitialized: () => {
              order.push('initialize');
              return Promise.resolve();
            },
            isAuthenticated: () => {
              order.push('check');
              return true;
            },
          },
        },
      ],
    });
    await TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(order).toEqual(['initialize', 'check']);
  });
});
