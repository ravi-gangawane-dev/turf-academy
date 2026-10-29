import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Permission } from './permissions';

export const permissionGuard: CanActivateChildFn = (route) => {
  const permission = route.data['permission'] as Permission | undefined;
  return inject(AuthService).hasPermission(permission) ? true : inject(Router).createUrlTree(['/unauthorized']);
};
