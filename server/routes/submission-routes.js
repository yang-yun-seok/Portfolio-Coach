import { Router } from 'express';

function parseLimit(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export function createSubmissionRouter({ firebaseAdminService, authMiddleware }) {
  const router = Router();

  router.get('/api/me/submissions', authMiddleware.requireAuth, async (req, res) => {
    try {
      if (!req.authUser?.uid) {
        return res.status(401).json({ error: '로그인이 필요합니다.' });
      }

      const limit = parseLimit(req.query.limit, 20, 50);
      const submissions = await firebaseAdminService.listUserSubmissions({
        uid: req.authUser.uid,
        limit,
      });

      return res.json({ submissions });
    } catch (error) {
      return res.status(500).json({
        error: error.message || '제출 내역을 불러오지 못했습니다.',
      });
    }
  });

  return router;
}
