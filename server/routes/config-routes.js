import { Router } from 'express';

export function createConfigRouter({ configService }) {
  const router = Router();

  router.get('/api/models', (req, res) => {
    const result = configService.getModelsResponse();
    if (!result) {
      return res.status(500).json({ error: '모델 설정을 로드할 수 없습니다.' });
    }

    return res.json(result);
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
