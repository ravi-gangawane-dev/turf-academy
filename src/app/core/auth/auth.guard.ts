import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureInitialized().then(() => auth.isAuthenticated() ? true : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } }));
};
