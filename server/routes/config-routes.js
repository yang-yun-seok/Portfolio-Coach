import { Router } from 'express';

export function createConfigRouter({ configService, submissionStorageService }) {
  const router = Router();

  router.get('/api/models', (req, res) => {
    const result = configService.getModelsResponse();
    if (!result) {
      return res.status(500).json({ error: '모델 설정을 로드할 수 없습니다.' });
    }

    return res.json(result);
  });

  router.get('/api/capabilities', async (req, res) => {
    let storageReadiness;
    if (configService.arePortfolioUploadsRequested()) {
      try {
        storageReadiness = await submissionStorageService?.getReadiness?.();
      } catch {
        storageReadiness = { ready: false, status: 'storage_unavailable' };
      }
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(configService.getCapabilitiesResponse({ storageReadiness }));
  });

  router.get('/api/prompts/interview-basic', (req, res) => {
    res.json(configService.getInterviewBasicPrompts());
  });

  router.post('/api/validate-key', async (req, res) => {
    const result = await configService.validateKey(req.body);
    res.json(result);
  });

  return router;
}
