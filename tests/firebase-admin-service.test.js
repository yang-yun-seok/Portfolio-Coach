import assert from 'node:assert/strict';
import test from 'node:test';
import { createFirebaseAdminService, normalizePrivateKey } from '../server/services/firebase-admin-service.js';

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
