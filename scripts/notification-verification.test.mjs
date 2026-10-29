import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VerificationBlocked, verifyOwnership } from './notification-verification.mjs';

test('empty inbox and missing linked recipient cannot pass ownership acceptance', () => {
  assert.throws(() => verifyOwnership([], { id: 'one' }, 'parent'), VerificationBlocked);
  assert.throws(() => verifyOwnership([], null, 'parent'), VerificationBlocked);
});
test('cross-recipient records fail for both parent and coach', () => {
  for (const role of ['parent', 'coach']) {
    assert.throws(() => verifyOwnership([{ [`${role}_id`]: 'other' }], { id: 'one' }, role), /Cross-recipient/);
    assert.doesNotThrow(() => verifyOwnership([{ [`${role}_id`]: 'one' }], { id: 'one' }, role));
  }
});
test('malformed row response fails instead of passing', () => {
  assert.throws(() => verifyOwnership(null, { id: 'one' }, 'parent'), /row array/);
});
