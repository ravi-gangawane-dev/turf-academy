import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureInitialized().then(() => {
    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }
    // A temporary password must be replaced before any academy screen opens.
    if (auth.mustChangePassword() && !state.url.startsWith('/auth/reset-password')) {
      return router.createUrlTree(['/auth/reset-password']);
    }
    return true;
  });
};
