import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AuthUtilityPage } from './auth-utility-page';

function setup(kind: string, recoveryError: string | null = null) {
  const auth = { resetPassword: vi.fn().mockResolvedValue(undefined), verifyOtp: vi.fn().mockResolvedValue(undefined), changePassword: vi.fn().mockResolvedValue(undefined), logout: vi.fn().mockResolvedValue(undefined), friendlyError: AuthService.prototype.friendlyError };
  TestBed.configureTestingModule({ providers: [provideRouter([]),
    { provide: ActivatedRoute, useValue: { snapshot: { data: { kind }, queryParamMap: { get: () => recoveryError } } } },
    { provide: AuthService, useValue: auth },
  ] });
  const fixture = TestBed.createComponent(AuthUtilityPage);
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  return { fixture, page: fixture.componentInstance, auth, navigate };
}

describe('Account recovery screens', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('submits a valid password without requiring the hidden email and signs out after success', async () => {
    const { page, auth, navigate } = setup('password');
    page['form'].patchValue({ password: 'NewPass123!', confirmPassword: 'NewPass123!' });
    await page['submit']();
    expect(auth.changePassword).toHaveBeenCalledWith('NewPass123!');
    expect(auth.logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/auth/password-updated');
  });
  it('blocks mismatched and weak passwords', async () => {
    const { page, auth } = setup('password');
    page['form'].patchValue({ password: 'NewPass123!', confirmPassword: 'Other123!' });
    await page['submit']();
    expect(page['error']()).toContain('do not match');
    page['form'].patchValue({ password: 'short', confirmPassword: 'short' });
    await page['submit']();
    expect(auth.changePassword).not.toHaveBeenCalled();
  });
  it('requests an email reset and avoids duplicate submissions', async () => {
    const { page, auth } = setup('email');
    page['form'].patchValue({ identity: 'member@example.test' });
    const pending = page['submit']();
    await page['submit'](); await pending;
    expect(auth.resetPassword).toHaveBeenCalledOnce();
    expect(page['message']()).toContain('If an account exists');
  });
  it('requires a numeric recovery code and explains rejected recovery codes', async () => {
    const { page, auth } = setup('otp');
    page['form'].patchValue({ identity: 'member@example.test', code: '12' });
    await page['submit']();
    expect(auth.verifyOtp).not.toHaveBeenCalled();
    auth.verifyOtp.mockRejectedValue({ message: 'Token has expired or is invalid' });
    page['form'].patchValue({ code: '123456' });
    await page['submit']();
    expect(page['error']()).toContain('Request a new reset link');
  });
  it.each(['123456', '12345678', '1234567890'])('accepts supported recovery code length: %s', (code) => {
    const { page } = setup('otp');
    page['form'].patchValue({ identity: 'member@example.test', code });
    expect(page['form'].valid).toBe(true);
  });
  it.each(['12345', '12345678901', '12345a'])('rejects invalid recovery code: %s', (code) => {
    const { page } = setup('otp');
    page['form'].patchValue({ identity: 'member@example.test', code });
    expect(page['form'].valid).toBe(false);
  });
  it('shows an expired-link message with a recovery action', () => {
    const { fixture } = setup('password', 'access_denied');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('invalid or has expired');
    expect(fixture.nativeElement.querySelector('a[href="/auth/forgot-password"]')).not.toBeNull();
  });
  it('keeps the password screen open after an expired session', async () => {
    const { page, auth, navigate } = setup('password');
    auth.changePassword.mockRejectedValue({ message: 'Auth session missing!' });
    page['form'].patchValue({ password: 'NewPass123!', confirmPassword: 'NewPass123!' });
    await page['submit']();
    expect(page['error']()).toContain('expired');
    expect(navigate).not.toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
