import { Router } from 'express';
import { enforceAdminCrawlAccess } from './admin-guard.js';

export function createCrawlRouter({ crawlService }) {
  const router = Router();

  router.post('/api/crawl/start', async (req, res) => {
    if (!enforceAdminCrawlAccess(req, res)) return;
    const result = await crawlService.startCrawl(req.body?.targets);
    res.status(result.status).json(result.body);
  });

  router.get('/api/crawl/stream', (req, res) => {
    if (!enforceAdminCrawlAccess(req, res)) return;
    crawlService.attachStream(req, res);
  });

  router.post('/api/crawl/stop', (req, res) => {
    if (!enforceAdminCrawlAccess(req, res)) return;
    res.json(crawlService.stopCrawl());
  });

  router.get('/api/crawl/status', (req, res) => {
    if (!enforceAdminCrawlAccess(req, res)) return;
    res.json(crawlService.getStatus());
  });

  return router;
}
