import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { LoginPage } from './login-page';
import { AuthService } from '../../core/auth/auth.service';
import { AuthSession, StaffRole } from '../../core/auth/auth.model';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let response: Subject<AuthSession>;
  let login: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;
  let params: Record<string, string>;

  beforeEach(async () => {
    response = new Subject<AuthSession>();
    login = vi.fn(() => response.asObservable());
    params = {};
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { get queryParamMap() { return convertToParamMap(params); } } } },
        { provide: AuthService, useValue: {
          login,
          friendlyError: (error: Error) => error.message,
          dashboardForRole: (role: StaffRole) => AuthService.prototype.dashboardForRole.call({} as AuthService, role),
        } },
      ],
    }).compileComponents();
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  });

  function render() { fixture = TestBed.createComponent(LoginPage); fixture.detectChanges(); }
  function fill(id: string, value: string) {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#' + id);
    input.value = value; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }
  function validForm() { fill('identity', 'person@example.com'); fill('password', 'valid-password'); }
  function submit() { fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true })); fixture.detectChanges(); }
  function succeed(role: StaffRole) { response.next({ accessToken: 'test-only-token', user: { id: 'test-id', name: 'Test', role } }); response.complete(); fixture.detectChanges(); }

  it('validates fields without making an authentication request', () => {
    render(); fill('identity', 'invalid'); fill('password', 'short'); submit();
    expect(login).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#identity-error').textContent).toContain('valid email');
    expect(fixture.nativeElement.querySelector('#password-error')).toBeTruthy();
  });
  it('toggles password visibility without submitting', () => {
    render(); fill('password', 'valid-password');
    fixture.nativeElement.querySelector('.password-toggle').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#password').type).toBe('text');
    expect(fixture.nativeElement.querySelector('.password-toggle').getAttribute('aria-label')).toBe('Hide password');
    expect(login).not.toHaveBeenCalled();
  });
  it('forwards remember-me selection through the existing form contract', () => {
    render(); validForm(); fixture.nativeElement.querySelector('[type="checkbox"]').click(); submit();
    expect(login).toHaveBeenCalledWith({ identity: 'person@example.com', password: 'valid-password', rememberMe: false });
  });
  it('prevents duplicate submissions and announces progress', () => {
    render(); validForm(); submit(); submit();
    expect(login).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.login-button').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.login-button').textContent).toContain('Signing in');
  });
  for (const message of ['Invalid login credentials.', 'Unable to connect. Please try again.', 'Your account is inactive.']) {
    it('shows authentication failure: ' + message, () => {
      render(); validForm(); submit(); response.error(new Error(message)); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(message);
      expect(fixture.nativeElement.querySelector('.login-button').disabled).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
    });
  }
  for (const [role, route] of [['admin', '/redirect/admin'], ['coach', '/redirect/coach'], ['receptionist', '/redirect/reception'], ['parent', '/redirect/parent']] as const) {
    it('uses the backend-provided ' + role + ' role for existing navigation', () => {
      render(); validForm(); submit(); succeed(role);
      expect(navigate).toHaveBeenCalledWith(route);
    });
  }
  it('preserves a local return URL', () => {
    params['returnUrl'] = '/students'; render(); validForm(); submit(); succeed('admin');
    expect(navigate).toHaveBeenCalledWith('/students');
  });
  it('rejects an external return URL', () => {
    params['returnUrl'] = '//example.com'; render(); validForm(); submit(); succeed('admin');
    expect(navigate).toHaveBeenCalledWith('/redirect/admin');
  });
  it('shows expired-session guidance and the existing recovery link', () => {
    params['reason'] = 'session-expired'; render();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('session has expired');
    expect(fixture.nativeElement.querySelector('.forgot').getAttribute('href')).toBe('/auth/forgot-password');
  });
  it('does not advertise role selection or unconfigured Google sign-in', () => {
    render(); expect(fixture.nativeElement.querySelector('[role="tab"],.google-button,.language-selector')).toBeNull();
  });
});
