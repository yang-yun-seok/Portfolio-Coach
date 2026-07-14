import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAdminRouter,
  matchesAdminModePassword,
  parseAdminUnlock,
  parseUserAccessPatch,
} from '../server/routes/admin-routes.js';

const TEST_ADMIN_PASSWORD = 'correct-admin-password';

function routeMiddleware(router, path) {
  const routeLayer = router.stack.find((layer) => layer.route?.path === path);
  return routeLayer?.route?.stack?.map((layer) => layer.handle) || [];
}

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

test('admin unlock accepts only a bounded password string', () => {
  assert.deepEqual(parseAdminUnlock({ password: ` ${TEST_ADMIN_PASSWORD} ` }), { password: TEST_ADMIN_PASSWORD });

  for (const payload of [
    {},
    { password: 808 },
    { password: '' },
    { password: 'x'.repeat(129) },
    { password: TEST_ADMIN_PASSWORD, role: 'admin' },
  ]) {
    assert.throws(
      () => parseAdminUnlock(payload),
      (error) => error.statusCode === 400 && /비밀번호/.test(error.message),
    );
  }
});

test('admin unlock compares configured passwords without exposing a client constant', () => {
  assert.equal(matchesAdminModePassword(TEST_ADMIN_PASSWORD, TEST_ADMIN_PASSWORD), true);
  assert.equal(matchesAdminModePassword('incorrect-admin-password', TEST_ADMIN_PASSWORD), false);
  assert.equal(matchesAdminModePassword('longer', TEST_ADMIN_PASSWORD), false);
  assert.throws(
    () => matchesAdminModePassword(TEST_ADMIN_PASSWORD, ''),
    (error) => error.statusCode === 503 && /서버에 설정/.test(error.message),
  );
});

test('admin unlock endpoint requires administrator authentication first', () => {
  const requireAdmin = () => {};
  const router = createAdminRouter({
    firebaseAdminService: {},
    authMiddleware: { requireAdmin },
    adminModePassword: TEST_ADMIN_PASSWORD,
  });

  assert.equal(routeMiddleware(router, '/api/admin/unlock')[0], requireAdmin);
});
