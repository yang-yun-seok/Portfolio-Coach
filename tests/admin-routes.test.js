import assert from 'node:assert/strict';
import test from 'node:test';
import { PassThrough, Readable } from 'node:stream';
import {
  buildAttachmentDisposition,
  createAdminRouter,
  matchesAdminModePassword,
  parseAdminUnlock,
  parseSubmissionDeletion,
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

test('admin submission file endpoint requires administrator authentication first', () => {
  const requireAdmin = () => {};
  const router = createAdminRouter({
    firebaseAdminService: {},
    authMiddleware: { requireAdmin },
    adminModePassword: TEST_ADMIN_PASSWORD,
  });

  assert.equal(
    routeMiddleware(router, '/api/admin/submissions/:submissionId/files/:fileKey')[0],
    requireAdmin,
  );
});

test('submission deletion requires an exact submission ID confirmation', () => {
  assert.deepEqual(
    parseSubmissionDeletion({ confirmSubmissionId: 'submission-1' }, 'submission-1'),
    { confirmSubmissionId: 'submission-1' },
  );

  for (const payload of [
    {},
    { confirmSubmissionId: 'submission-2' },
    { confirmSubmissionId: 1 },
    { confirmSubmissionId: 'submission-1', force: true },
  ]) {
    assert.throws(
      () => parseSubmissionDeletion(payload, 'submission-1'),
      (error) => error.statusCode === 400 && /제출 ID/.test(error.message),
    );
  }
});

test('admin submission deletion removes private files before Firestore metadata', async () => {
  const calls = [];
  const requireAdmin = () => {};
  const router = createAdminRouter({
    firebaseAdminService: {
      async getAdminSubmissionDeletionPlan(input) {
        calls.push(['plan', input]);
        return {
          storagePaths: ['portfolio-submissions/student-1/submission-1/resume.pdf'],
          fileCount: 1,
          storageBytes: 1200,
        };
      },
      async deleteAdminSubmission(input) {
        calls.push(['metadata', input]);
        return { id: 'submission-1', userId: 'student-1' };
      },
    },
    submissionStorageService: {
      async deleteFiles(paths) {
        calls.push(['storage', paths]);
      },
    },
    authMiddleware: { requireAdmin },
    adminModePassword: TEST_ADMIN_PASSWORD,
  });
  const deleteRoute = router.stack.find((layer) => (
    layer.route?.path === '/api/admin/submissions/:submissionId'
    && layer.route?.methods?.delete
  ));
  const handler = deleteRoute.route.stack[1].handle;
  let statusCode = 200;
  let payload = null;
  const response = {
    status(nextStatusCode) {
      statusCode = nextStatusCode;
      return this;
    },
    json(nextPayload) {
      payload = nextPayload;
      return this;
    },
  };

  await handler({
    params: { submissionId: 'submission-1' },
    body: { confirmSubmissionId: 'submission-1' },
    authUser: { uid: 'admin-1', email: 'admin@example.com' },
  }, response);

  assert.equal(statusCode, 200);
  assert.deepEqual(calls, [
    ['plan', { submissionId: 'submission-1' }],
    ['storage', ['portfolio-submissions/student-1/submission-1/resume.pdf']],
    ['metadata', {
      submissionId: 'submission-1',
      actor: { uid: 'admin-1', email: 'admin@example.com' },
    }],
  ]);
  assert.deepEqual(payload, {
    deletedSubmission: { id: 'submission-1', userId: 'student-1' },
    deletedFileCount: 1,
    releasedStorageBytes: 1200,
  });
});

test('attachment disposition removes header injection and preserves UTF-8 names', () => {
  const disposition = buildAttachmentDisposition('학생\r\n이력서.pdf');
  assert.doesNotMatch(disposition, /[\r\n]/);
  assert.match(disposition, /^attachment; filename="_____\.pdf";/);
  assert.match(disposition, /filename\*=UTF-8''%ED%95%99%EC%83%9D%EC%9D%B4%EB%A0%A5%EC%84%9C\.pdf$/);
});

test('admin file endpoint resolves Firestore metadata and streams from private storage', async () => {
  const calls = [];
  const router = createAdminRouter({
    firebaseAdminService: {
      async getAdminSubmissionFileDescriptor(input) {
        calls.push(['descriptor', input]);
        return {
          fileName: '학생이력서.pdf',
          storagePath: 'portfolio-submissions/student-1/submission-1/resume.pdf',
        };
      },
    },
    submissionStorageService: {
      async downloadPdf(input) {
        calls.push(['download', input]);
        return {
          stream: Readable.from(Buffer.from('%PDF-test')),
          contentType: 'application/pdf',
          contentLength: 9,
        };
      },
    },
    authMiddleware: { requireAdmin() {} },
    adminModePassword: TEST_ADMIN_PASSWORD,
  });
  const handler = routeMiddleware(
    router,
    '/api/admin/submissions/:submissionId/files/:fileKey',
  )[1];
  const response = new PassThrough();
  const chunks = [];
  const headers = {};
  response.on('data', (chunk) => chunks.push(chunk));
  response.setHeader = (name, value) => { headers[name] = value; };
  response.status = () => response;
  response.json = () => response;
  response.destroy = (error) => { if (error) throw error; };

  await handler({
    params: { submissionId: 'submission-1', fileKey: 'resume' },
  }, response);

  assert.deepEqual(calls, [
    ['descriptor', { submissionId: 'submission-1', fileKey: 'resume' }],
    ['download', { path: 'portfolio-submissions/student-1/submission-1/resume.pdf' }],
  ]);
  assert.equal(Buffer.concat(chunks).toString(), '%PDF-test');
  assert.equal(headers['Content-Type'], 'application/pdf');
  assert.equal(headers['Cache-Control'], 'private, no-store');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
});
