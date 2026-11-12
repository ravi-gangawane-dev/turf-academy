import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

/** Keeps old batch URLs working while routing them into the canonical workspace view. */
export const legacyBatchRouteGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const view = String(route.data['legacyView'] ?? 'list');
  const url = new URL(state.url, 'http://localhost');
  const query: Record<string, string> = { view };
  url.searchParams.forEach((value, key) => { if (key !== 'view') query[key] = value; });
  return router.createUrlTree(['/batches'], { queryParams: query });
};
