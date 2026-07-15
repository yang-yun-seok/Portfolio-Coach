import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCrawlHealth } from '../src/lib/crawl-health.js';

test('crawl health distinguishes completed zero-result runs from normal collection', () => {
  const health = buildCrawlHealth({
    lastCrawlStatus: 'success',
    referenceJobCount: 0,
  }, [
    { generatedAt: '2026-07-15T00:00:00.000Z', lastCrawlStatus: 'success', referenceJobCount: 0 },
    { generatedAt: '2026-07-14T00:00:00.000Z', lastCrawlStatus: 'success', referenceJobCount: 926 },
    { generatedAt: null, lastCrawlStatus: 'unknown', referenceJobCount: 0 },
  ]);

  assert.equal(health.attemptedCount, 2);
  assert.equal(health.normalCount, 1);
  assert.equal(health.successRate, 50);
  assert.equal(health.currentHealthy, false);
  assert.equal(health.lastNormalJobCount, 926);
});
