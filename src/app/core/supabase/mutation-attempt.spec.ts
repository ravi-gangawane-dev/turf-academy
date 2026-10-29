import { MutationAttempt } from './mutation-attempt';
describe('MutationAttempt', () => {
  it('reuses an uncertain request key, changes on edited input, and retires on success', () => {
    const attempt = new MutationAttempt();
    const key = attempt.key({ amount: 10.25, charge: 'a' });
    expect(attempt.key({ amount: 10.25, charge: 'a' })).toBe(key);
    const edited = attempt.key({ amount: 20, charge: 'a' });
    expect(edited).not.toBe(key);
    attempt.complete();
    expect(attempt.key({ amount: 20, charge: 'a' })).not.toBe(edited);
  });
});
