import { LatestQueryGuard } from './latest-query.guard';

describe('LatestQueryGuard', () => {
  it('coalesces an identical in-flight query', () => {
    const guard = new LatestQueryGuard();
    expect(guard.begin('page-1')).toBe(1);
    expect(guard.begin('page-1')).toBeNull();
  });

  it('rejects a stale response after filters change', () => {
    const guard = new LatestQueryGuard();
    const oldRequest = guard.begin('all')!;
    const currentRequest = guard.begin('batch-2')!;
    expect(guard.isCurrent(oldRequest)).toBe(false);
    expect(guard.isCurrent(currentRequest)).toBe(true);
  });
});
