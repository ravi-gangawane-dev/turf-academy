import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-auth-utility-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './auth-utility-page.html',
  styleUrl: './auth-utility-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthUtilityPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly title = String(this.route.snapshot.data['title'] ?? 'Account recovery');
  protected readonly description = String(
    this.route.snapshot.data['description'] ?? 'Verify your academy account to continue.',
  );
  protected readonly kind = String(
    this.route.snapshot.data['kind'] ?? (this.title === 'Session Expired' ? 'expired' : 'email'),
  );
  protected readonly message = signal('');
  protected readonly error = signal('');
  protected readonly submitting = signal(false);
  /** Reason supplied by session revalidation; drives a specific expired-session message. */
  protected readonly sessionEndReason = String(
    this.route.snapshot.queryParamMap.get('reason') ?? '',
  );
  protected readonly expiredMessage =
    this.sessionEndReason === 'inactive'
      ? 'Your account has been disabled. Contact the academy administrator to restore access.'
      : this.sessionEndReason === 'suspended'
        ? 'Your account has been suspended. Contact the academy administrator.'
        : this.sessionEndReason === 'removed'
          ? 'Your account is no longer available. Contact the academy administrator.'
          : 'Your session has expired. For your security, please sign in again.';
  /** Read-only identity of the authenticated account being activated or reset. */
  protected readonly accountEmail = computed(() => this.auth.profile()?.email ?? '');
  protected readonly showPassword = signal(false);
  protected readonly attempted = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    identity: ['', [Validators.required, Validators.email]],
    code: ['', [Validators.pattern(/^\d{6,10}$/)]],
    password: [
      '',
      [
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/),
      ],
    ],
    confirmPassword: [''],
  });

  constructor() {
    if (this.kind === 'password') {
      this.form.controls.identity.clearValidators();
      this.form.controls.password.addValidators(Validators.required);
      this.form.controls.confirmPassword.addValidators(Validators.required);
    }
    if (this.kind === 'otp') this.form.controls.code.addValidators(Validators.required);
    for (const control of Object.values(this.form.controls)) control.updateValueAndValidity();
    const recoveryError =
      this.route.snapshot.queryParamMap.get('error') ||
      new URLSearchParams(location.hash.slice(1)).get('error');
    // A link that failed before the page loaded must stay on screen next to a
    // recovery action, so it belongs in the inline alert rather than a toast.
    if (recoveryError)
      this.error.set('This recovery link is invalid or has expired. Request a new reset link.');
  }

  protected async submit(): Promise<void> {
    if (this.submitting()) return;
    this.attempted.set(true);
    this.form.controls.identity.setValue(this.form.controls.identity.value.trim());
    this.form.controls.code.setValue(this.form.controls.code.value.trim());
    this.error.set('');

    if (this.kind === 'password' && this.form.value.password !== this.form.value.confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    try {
      if (this.kind === 'email') {
        await this.auth.resetPassword(this.form.getRawValue().identity);
        this.toast.success('If an account exists for that email, a secure reset link has been sent.');
      } else if (this.kind === 'otp') {
        await this.auth.verifyOtp(this.form.getRawValue().identity, this.form.getRawValue().code);
        this.toast.success('Verification successful. You can now choose a new password.');
        setTimeout(() => void this.router.navigateByUrl('/auth/reset-password'), 800);
      } else if (this.kind === 'password') {
        await this.auth.changePassword(this.form.getRawValue().password);
        await this.auth.logout();
        await this.router.navigateByUrl('/auth/password-updated');
      }
    } catch (error) {
      this.toast.error(this.auth.friendlyError(error));
    } finally {
      this.submitting.set(false);
    }
  }
  protected togglePassword(): void {
    this.showPassword.update((value) => !value);
  }
}
