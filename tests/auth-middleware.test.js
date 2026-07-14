import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthMiddleware } from '../server/routes/auth-middleware.js';

function createRequest(authorization = '') {
  return {
    authUser: undefined,
    get(name) {
      return name.toLowerCase() === 'authorization' ? authorization : '';
    },
  };
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test('requireAuth rejects requests without a bearer token', async () => {
  const middleware = createAuthMiddleware({
    firebaseAdminService: { authRequired: true, configReady: true },
  });
  const req = createRequest();
  const res = createResponse();
  let nextCalled = false;

  await middleware.requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test('requireAuth attaches an active user to the request', async () => {
  const firebaseAdminService = {
    authRequired: true,
    configReady: true,
    verifyIdToken: async () => ({ uid: 'student-1', email: 'student@example.com' }),
    getUserAccess: async () => ({ role: 'user', active: true }),
  };
  const middleware = createAuthMiddleware({ firebaseAdminService });
  const req = createRequest('Bearer valid-token');
  const res = createResponse();
  let nextCalled = false;

  await middleware.requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.authUser, {
    uid: 'student-1',
    email: 'student@example.com',
    role: 'user',
  });
});

test('requireAuth blocks inactive users', async () => {
  const middleware = createAuthMiddleware({
    firebaseAdminService: {
      authRequired: true,
      configReady: true,
      verifyIdToken: async () => ({ uid: 'student-1' }),
      getUserAccess: async () => ({ role: 'user', active: false }),
    },
  });
  const req = createRequest('Bearer valid-token');
  const res = createResponse();
  let nextCalled = false;

  await middleware.requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('requireAuth reports account lookup failures as unavailable', async () => {
  const middleware = createAuthMiddleware({
    firebaseAdminService: {
      authRequired: true,
      configReady: true,
      verifyIdToken: async () => ({ uid: 'student-1' }),
      getUserAccess: async () => { throw new Error('firestore unavailable'); },
    },
  });
  const req = createRequest('Bearer valid-token');
  const res = createResponse();

  await middleware.requireAuth(req, res, () => {});

  assert.equal(res.statusCode, 503);
});

test('requireAdmin checks token revocation and rejects non-admin users', async () => {
  const verifyCalls = [];
  const middleware = createAuthMiddleware({
    firebaseAdminService: {
      canVerifyTokens: true,
      verifyIdToken: async (...args) => {
        verifyCalls.push(args);
        return { uid: 'student-1', email: 'student@example.com' };
      },
      getUserAccess: async () => ({ role: 'user', active: true }),
    },
  });
  const req = createRequest('Bearer valid-token');
  const res = createResponse();
  let nextCalled = false;

  await middleware.requireAdmin(req, res, () => { nextCalled = true; });

  assert.deepEqual(verifyCalls, [['valid-token', { checkRevoked: true }]]);
  assert.equal(res.statusCode, 403);
  assert.equal(nextCalled, false);
});

test('requireAdmin allows active admin users', async () => {
  const middleware = createAuthMiddleware({
    firebaseAdminService: {
      canVerifyTokens: true,
      verifyIdToken: async () => ({ uid: 'admin-1', email: 'admin@example.com' }),
      getUserAccess: async () => ({ role: 'admin', active: true }),
    },
  });
  const req = createRequest('Bearer valid-token');
  const res = createResponse();
  let nextCalled = false;

  await middleware.requireAdmin(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.authUser, {
    uid: 'admin-1',
    email: 'admin@example.com',
    role: 'admin',
  });
});
