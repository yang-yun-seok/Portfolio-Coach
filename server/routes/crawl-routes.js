import { Router } from 'express';

export function createCrawlRouter({ crawlService }) {
  const router = Router();

  router.post('/api/crawl/start', async (req, res) => {
    const result = await crawlService.startCrawl(req.body?.targets);
    res.status(result.status).json(result.body);
  });

  router.get('/api/crawl/stream', (req, res) => {
    crawlService.attachStream(req, res);
  });

  router.post('/api/crawl/stop', (req, res) => {
    res.json(crawlService.stopCrawl());
  });

  router.get('/api/crawl/status', (req, res) => {
    res.json(crawlService.getStatus());
  });

  return router;
}
