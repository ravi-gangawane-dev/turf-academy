import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { StaffRole } from './auth.model';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth=inject(AuthService); const router=inject(Router);
  const roles=(route.data['roles'] as readonly StaffRole[]|undefined)??[];
  return auth.ensureInitialized().then(()=>{
    if(!auth.isAuthenticated())return router.createUrlTree(['/auth/login'],{queryParams:{returnUrl:state.url}});
    return auth.hasRole(roles)?true:router.createUrlTree(['/unauthorized']);
  });
};
