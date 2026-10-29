import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { API_CONFIG } from '../../core/config/api.config';

@Component({ selector: 'app-login-page', imports: [ReactiveFormsModule, RouterLink], templateUrl: './login-page.html', styleUrl: './login-page.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly config = inject(API_CONFIG);
  protected readonly sessionExpired = this.route.snapshot.queryParamMap.get('reason') === 'session-expired';
  protected readonly submitting = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly error = signal('');
  protected readonly form = this.formBuilder.nonNullable.group({ identity: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.minLength(8)]], rememberMe: [true] });

  protected submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true); this.error.set('');
    this.auth.login(this.form.getRawValue()).pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (session) => void this.router.navigateByUrl(this.safeReturnUrl() || this.auth.dashboardForRole(session.user.role)),
      error: (error) => this.error.set(this.auth.friendlyError(error)),
    });
  }

  private safeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '';
  }

  protected togglePassword(): void { this.showPassword.update(value=>!value); }
}
