import { Router } from 'express';

export function createAnalysisRouter({ analysisService, authMiddleware }) {
  const router = Router();

  router.post('/api/analyze', authMiddleware.requireAuth, async (req, res) => {
    const result = await analysisService.analyze(req.body);
    res.status(result.status).json(result.body);
  });

  router.post('/api/analyze-personality', authMiddleware.requireAuth, async (req, res) => {
    const result = await analysisService.analyzePersonality(req.body);
    res.status(result.status).json(result.body);
  });

  router.post('/api/match-jobs', authMiddleware.requireAuth, async (req, res) => {
    const result = await analysisService.matchJobs(req.body);
    res.status(result.status).json(result.body);
  });

  router.post('/api/company-insights', authMiddleware.requireAuth, async (req, res) => {
    const result = await analysisService.analyzeCompany(req.body);
    res.status(result.status).json(result.body);
  });

  router.post('/api/market-insights', authMiddleware.requireAuth, async (req, res) => {
    const result = await analysisService.analyzeMarket(req.body);
    res.status(result.status).json(result.body);
  });

  router.post('/api/instructor-draft', authMiddleware.requireAuth, async (req, res) => {
    const result = await analysisService.generateInstructorDraft(req.body);
    res.status(result.status).json(result.body);
  });

  return router;
}
