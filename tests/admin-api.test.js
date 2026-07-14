import assert from 'node:assert/strict';
import test from 'node:test';
import { unlockAdminMode } from '../src/lib/admin-api.js';

const TEST_ADMIN_PASSWORD = 'correct-admin-password';

test('unlockAdminMode sends the administrator token and password to the server', async () => {
  const originalFetch = globalThis.fetch;
  let capturedRequest = null;
  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const unlocked = await unlockAdminMode(async () => 'admin-token', TEST_ADMIN_PASSWORD);
    assert.equal(unlocked, true);
    assert.equal(capturedRequest.url, '/api/admin/unlock');
    assert.equal(capturedRequest.options.method, 'POST');
    assert.equal(capturedRequest.options.headers.Authorization, 'Bearer admin-token');
    assert.deepEqual(JSON.parse(capturedRequest.options.body), { password: TEST_ADMIN_PASSWORD });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('unlockAdminMode surfaces the server rejection message', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ error: '비밀번호가 맞지 않습니다.' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    await assert.rejects(
      () => unlockAdminMode(async () => 'admin-token', 'wrong'),
      /비밀번호가 맞지 않습니다/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
