import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertAdminUserAccessChange,
  createFirebaseAdminService,
  normalizePrivateKey,
  resolveSubmissionFileDescriptor,
  sanitizeSubmissionFiles,
  verifyFirebaseIdToken,
} from '../server/services/firebase-admin-service.js';

const SAMPLE_BODY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const EXPECTED_PEM = [
  '-----BEGIN PRIVATE KEY-----',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  '-----END PRIVATE KEY-----',
  '',
].join('\n');

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

test('normalizePrivateKey restores escaped newline PEM values', () => {
  const escaped = '-----BEGIN PRIVATE KEY-----\\nABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/\\nABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/\\n-----END PRIVATE KEY-----\\n';
  assert.equal(normalizePrivateKey(escaped), EXPECTED_PEM);
});

test('normalizePrivateKey restores one-line Render PEM values', () => {
  const oneLine = `-----BEGIN PRIVATE KEY----- ${SAMPLE_BODY} -----END PRIVATE KEY-----`;
  assert.equal(normalizePrivateKey(oneLine), EXPECTED_PEM);
});

test('normalizePrivateKey strips wrapping quotes', () => {
  const quoted = `"-----BEGIN PRIVATE KEY-----\\n${SAMPLE_BODY}\\n-----END PRIVATE KEY-----\\n"`;
  assert.equal(normalizePrivateKey(quoted), EXPECTED_PEM);
});

test('verifyFirebaseIdToken forwards revoked-token checks to Firebase Auth', async () => {
  const calls = [];
  const auth = {
    verifyIdToken: async (...args) => {
      calls.push(args);
      return { uid: 'student-1' };
    },
  };

  const decoded = await verifyFirebaseIdToken(auth, 'token-1', { checkRevoked: true });

  assert.deepEqual(decoded, { uid: 'student-1' });
  assert.deepEqual(calls, [['token-1', true]]);
});

test('assertAdminUserAccessChange allows student account updates', () => {
  assert.doesNotThrow(() => assertAdminUserAccessChange({
    active: false,
    actorUid: 'admin-1',
    targetUid: 'student-1',
    targetRole: 'user',
  }));
});

test('assertAdminUserAccessChange protects the current admin and other admins', () => {
  assert.throws(
    () => assertAdminUserAccessChange({
      active: false,
      actorUid: 'admin-1',
      targetUid: 'admin-1',
      targetRole: 'admin',
    }),
    (error) => error.statusCode === 409 && /현재 로그인한 관리자/.test(error.message),
  );
  assert.throws(
    () => assertAdminUserAccessChange({
      active: false,
      actorUid: 'admin-1',
      targetUid: 'admin-2',
      targetRole: 'admin',
    }),
    (error) => error.statusCode === 409 && /관리자 계정 상태/.test(error.message),
  );
});

test('sanitizeSubmissionFiles strips legacy download URLs and unknown fields', () => {
  assert.deepEqual(sanitizeSubmissionFiles({
    resume: {
      fileName: 'resume.pdf',
      storagePath: 'portfolio-submissions/student-1/submission-1/resume.pdf',
      size: 1200,
      type: 'application/pdf',
      url: 'https://example.com/permanent-download-token',
      unexpected: true,
    },
    coverLetter: null,
    portfolio: [],
  }), {
    resume: {
      fileName: 'resume.pdf',
      storagePath: 'portfolio-submissions/student-1/submission-1/resume.pdf',
      size: 1200,
      type: 'application/pdf',
    },
    coverLetter: null,
    portfolio: [],
  });
});

test('resolveSubmissionFileDescriptor accepts only the expected owner path', () => {
  const submission = {
    userId: 'student-1',
    files: {
      resume: {
        fileName: '이력서.pdf',
        storagePath: 'portfolio-submissions/student-1/submission-1/resume.pdf',
        size: 1200,
        type: 'application/pdf',
      },
      coverLetter: null,
      portfolio: [],
    },
  };

  assert.equal(resolveSubmissionFileDescriptor({
    submissionId: 'submission-1',
    submission,
    fileKey: 'resume',
  }).fileName, '이력서.pdf');

  assert.throws(
    () => resolveSubmissionFileDescriptor({
      submissionId: 'submission-1',
      submission: {
        ...submission,
        files: {
          ...submission.files,
          resume: {
            ...submission.files.resume,
            storagePath: 'portfolio-submissions/another-user/submission-1/resume.pdf',
          },
        },
      },
      fileKey: 'resume',
    }),
    (error) => error.statusCode === 409 && /경로/.test(error.message),
  );
  assert.throws(
    () => resolveSubmissionFileDescriptor({
      submissionId: 'submission-1',
      submission,
      fileKey: '../../secret',
    }),
    (error) => error.statusCode === 400 && /지원하지 않는/.test(error.message),
  );
});

test('createFirebaseAdminService does not throw on an invalid private key', () => {
  const previous = {
    authRequired: process.env.FIREBASE_AUTH_REQUIRED,
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
    adminCredentials: process.env.FIREBASE_ADMIN_CREDENTIALS,
    googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
  };

  try {
    process.env.FIREBASE_AUTH_REQUIRED = 'true';
    process.env.FIREBASE_PROJECT_ID = 'portfolio-coach-test';
    process.env.FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk@test.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = 'not-a-real-private-key';
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.FIREBASE_ADMIN_CREDENTIALS;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    const service = createFirebaseAdminService();
    assert.equal(service.authRequired, true);
    assert.equal(service.configReady, false);
    assert.match(service.initError, /private key|PEM|DECODER|parse/i);
  } finally {
    restoreEnv('FIREBASE_AUTH_REQUIRED', previous.authRequired);
    restoreEnv('FIREBASE_PROJECT_ID', previous.projectId);
    restoreEnv('FIREBASE_CLIENT_EMAIL', previous.clientEmail);
    restoreEnv('FIREBASE_PRIVATE_KEY', previous.privateKey);
    restoreEnv('FIREBASE_SERVICE_ACCOUNT_JSON', previous.serviceAccount);
    restoreEnv('FIREBASE_ADMIN_CREDENTIALS', previous.adminCredentials);
    restoreEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON', previous.googleCredentials);
  }
});
