import assert from 'node:assert/strict';
import test from 'node:test';
import { parseUserAccessPatch } from '../server/routes/admin-routes.js';

test('parseUserAccessPatch accepts an explicit boolean state', () => {
  assert.deepEqual(parseUserAccessPatch({ active: true }), { active: true });
  assert.deepEqual(parseUserAccessPatch({ active: false }), { active: false });
});

test('parseUserAccessPatch rejects missing, coerced, and extra values', () => {
  for (const payload of [
    {},
    { active: 'false' },
    { active: false, role: 'admin' },
    null,
  ]) {
    assert.throws(
      () => parseUserAccessPatch(payload),
      (error) => error.statusCode === 400 && /active 불리언/.test(error.message),
    );
  }
});
