import assert from 'node:assert/strict';
import test from 'node:test';
import { createConfigRouter } from '../server/routes/config-routes.js';
import {
  isEnabledFlag,
  resolvePortfolioSubmissionCapability,
} from '../server/services/config-service.js';
import { normalizeSiteCapabilities } from '../src/lib/site-capabilities.js';

function routeHandler(router, path) {
  return router.stack.find((layer) => layer.route?.path === path)?.route?.stack?.[0]?.handle;
}

test('isEnabledFlag requires an explicit true value', () => {
  assert.equal(isEnabledFlag('true'), true);
  assert.equal(isEnabledFlag(' TRUE '), true);
  assert.equal(isEnabledFlag('false'), false);
  assert.equal(isEnabledFlag(undefined), false);
});

test('normalizeSiteCapabilities defaults submission uploads to unavailable', () => {
  assert.deepEqual(normalizeSiteCapabilities({}), {
    portfolioSubmissions: { enabled: false, status: 'not_configured' },
  });
  assert.deepEqual(normalizeSiteCapabilities({
    portfolioSubmissions: { enabled: true, status: 'unexpected-client-value' },
  }), {
    portfolioSubmissions: { enabled: true, status: 'ready' },
  });
  assert.deepEqual(normalizeSiteCapabilities({
    portfolioSubmissions: { enabled: false, status: 'bucket_missing' },
  }), {
    portfolioSubmissions: { enabled: false, status: 'bucket_missing' },
  });
});

test('submission capability requires both the operations flag and a real Storage bucket', () => {
  assert.deepEqual(resolvePortfolioSubmissionCapability({
    uploadsRequested: false,
    storageReadiness: { ready: true, status: 'ready' },
  }), { enabled: false, status: 'not_configured' });
  assert.deepEqual(resolvePortfolioSubmissionCapability({
    uploadsRequested: true,
    storageReadiness: { ready: false, status: 'bucket_missing' },
  }), { enabled: false, status: 'bucket_missing' });
  assert.deepEqual(resolvePortfolioSubmissionCapability({
    uploadsRequested: true,
    storageReadiness: { ready: true, status: 'ready' },
  }), { enabled: true, status: 'ready' });
});

test('capabilities endpoint probes Storage only when uploads are requested', async () => {
  const receivedReadiness = [];
  let readinessCalls = 0;
  const configService = {
    arePortfolioUploadsRequested: () => true,
    getCapabilitiesResponse: ({ storageReadiness }) => {
      receivedReadiness.push(storageReadiness);
      return {
        portfolioSubmissions: {
          enabled: storageReadiness?.ready === true,
          status: storageReadiness?.status || 'not_configured',
        },
      };
    },
  };
  const firebaseAdminService = {
    getStorageReadiness: async () => {
      readinessCalls += 1;
      return { ready: false, status: 'bucket_missing' };
    },
  };
  const router = createConfigRouter({ configService, firebaseAdminService });
  const headers = {};
  const response = {
    body: null,
    setHeader(name, value) { headers[name] = value; },
    json(body) { this.body = body; },
  };

  await routeHandler(router, '/api/capabilities')({}, response);

  assert.equal(readinessCalls, 1);
  assert.deepEqual(receivedReadiness, [{ ready: false, status: 'bucket_missing' }]);
  assert.deepEqual(response.body, {
    portfolioSubmissions: { enabled: false, status: 'bucket_missing' },
  });
  assert.equal(headers['Cache-Control'], 'no-store');

  const disabledRouter = createConfigRouter({
    configService: { ...configService, arePortfolioUploadsRequested: () => false },
    firebaseAdminService,
  });
  const disabledResponse = {
    setHeader() {},
    json() {},
  };
  await routeHandler(disabledRouter, '/api/capabilities')({}, disabledResponse);
  assert.equal(readinessCalls, 1);
  assert.deepEqual(receivedReadiness, [{ ready: false, status: 'bucket_missing' }, undefined]);
});

test('capabilities endpoint fails closed when the Storage probe throws', async () => {
  let responseBody;
  const router = createConfigRouter({
    configService: {
      arePortfolioUploadsRequested: () => true,
      getCapabilitiesResponse: ({ storageReadiness }) => ({
        portfolioSubmissions: {
          enabled: storageReadiness?.ready === true,
          status: storageReadiness?.status || 'not_configured',
        },
      }),
    },
    firebaseAdminService: {
      getStorageReadiness: async () => { throw new Error('probe failed'); },
    },
  });

  await routeHandler(router, '/api/capabilities')({}, {
    setHeader() {},
    json(body) { responseBody = body; },
  });

  assert.deepEqual(responseBody, {
    portfolioSubmissions: { enabled: false, status: 'storage_unavailable' },
  });
});
