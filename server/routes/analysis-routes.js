import { Router } from 'express';

export function createAnalysisRouter({ analysisService }) {
  const router = Router();

  router.post('/api/analyze', async (req, res) => {
    const result = await analysisService.analyze(req.body);
    res.status(result.status).json(result.body);
  });

  router.post('/api/analyze-personality', async (req, res) => {
    const result = await analysisService.analyzePersonality(req.body);
    res.status(result.status).json(result.body);
  });

  return router;
}
