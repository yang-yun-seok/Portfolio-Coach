import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalysisRouter } from '../server/routes/analysis-routes.js';

function routeMiddleware(router, path) {
  const routeLayer = router.stack.find((layer) => layer.route?.path === path);
  return routeLayer?.route?.stack?.map((layer) => layer.handle) || [];
}

test('instructor draft endpoint requires administrator authentication', () => {
  const requireAuth = () => {};
  const requireAdmin = () => {};
  const router = createAnalysisRouter({
    analysisService: {},
    authMiddleware: { requireAuth, requireAdmin },
  });

  assert.equal(routeMiddleware(router, '/api/analyze')[0], requireAuth);
  assert.equal(routeMiddleware(router, '/api/instructor-draft')[0], requireAdmin);
});
