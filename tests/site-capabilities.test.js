import assert from 'node:assert/strict';
import test from 'node:test';
import { isEnabledFlag } from '../server/services/config-service.js';
import { normalizeSiteCapabilities } from '../src/lib/site-capabilities.js';

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
});
