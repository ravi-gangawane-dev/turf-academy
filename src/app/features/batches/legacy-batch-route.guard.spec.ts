import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { legacyBatchRouteGuard } from './legacy-batch-route.guard';

describe('legacy batch route guard', () => {
  it('preserves query parameters while selecting the legacy workspace view', () => {
    const router = { createUrlTree: vi.fn((commands, extras) => ({ commands, extras })) };
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: router }] });
    const route = { data: { legacyView: 'capacity' } } as unknown as ActivatedRouteSnapshot;
    const state = { url: '/batches/capacity?batch=b1&student=s1' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => legacyBatchRouteGuard(route, state));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/batches'], { queryParams: { view: 'capacity', batch: 'b1', student: 's1' } });
    expect(result).toBeDefined();
  });
});
