import { Router } from 'express';

function parseLimit(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function buildSummary({ submissions, users }) {
  const uniqueSubmitters = new Set(submissions.map((item) => item.userId).filter(Boolean));
  return {
    totalSubmissions: submissions.length,
    totalUsers: users.length,
    uniqueSubmitters: uniqueSubmitters.size,
    submittedCount: submissions.filter((item) => item.status === 'submitted').length,
    reviewingCount: submissions.filter((item) => item.status === 'reviewing').length,
    reviewedCount: submissions.filter((item) => item.status === 'reviewed').length,
    latestSubmittedAtIso: submissions[0]?.submittedAtIso || '',
  };
}

export function createAdminRouter({ firebaseAdminService, authMiddleware }) {
  const router = Router();

  router.get('/api/admin/overview', authMiddleware.requireAdmin, async (req, res) => {
    try {
      const submissionLimit = parseLimit(req.query.submissionLimit, 100, 200);
      const userLimit = parseLimit(req.query.userLimit, 200, 500);
      const [submissions, users] = await Promise.all([
        firebaseAdminService.listAdminSubmissions({ limit: submissionLimit }),
        firebaseAdminService.listAdminUsers({ limit: userLimit }),
      ]);
      const usersById = new Map(users.map((user) => [user.uid, user]));
      const enrichedSubmissions = submissions.map((submission) => ({
        ...submission,
        account: usersById.get(submission.userId) || null,
      }));

      res.json({
        summary: buildSummary({ submissions: enrichedSubmissions, users }),
        submissions: enrichedSubmissions,
        users,
      });
    } catch (error) {
      res.status(500).json({
        error: error.message || '관리자 데이터를 불러오지 못했습니다.',
      });
    }
  });

  return router;
}
