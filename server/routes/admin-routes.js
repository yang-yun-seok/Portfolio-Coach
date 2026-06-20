import { Router } from 'express';

const REVIEW_STATUSES = new Set(['submitted', 'reviewing', 'reviewed', 'rejected']);
const MAX_ADMIN_MEMO_LENGTH = 2000;
const MAX_STUDENT_FEEDBACK_LENGTH = 3000;

function parseLimit(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseReviewPatch(body = {}) {
  const patch = {};

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    const status = String(body.status || '').trim();
    if (!REVIEW_STATUSES.has(status)) {
      throw createHttpError('지원하지 않는 제출 상태입니다.', 400);
    }
    patch.status = status;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'adminMemo')) {
    const adminMemo = String(body.adminMemo || '').trim();
    if (adminMemo.length > MAX_ADMIN_MEMO_LENGTH) {
      throw createHttpError(`관리자 메모는 ${MAX_ADMIN_MEMO_LENGTH}자 이하로 입력해 주세요.`, 400);
    }
    patch.adminMemo = adminMemo;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'studentFeedback')) {
    const studentFeedback = String(body.studentFeedback || '').trim();
    if (studentFeedback.length > MAX_STUDENT_FEEDBACK_LENGTH) {
      throw createHttpError(`학생 공개 피드백은 ${MAX_STUDENT_FEEDBACK_LENGTH}자 이하로 입력해 주세요.`, 400);
    }
    patch.studentFeedback = studentFeedback;
  }

  if (!Object.keys(patch).length) {
    throw createHttpError('변경할 검토 정보가 없습니다.', 400);
  }

  return patch;
}

function buildSummary({ submissions, users }) {
  const uniqueSubmitters = new Set(submissions.map((item) => item.userId).filter(Boolean));
  const todayDate = new Date().toISOString().slice(0, 10);
  return {
    totalSubmissions: submissions.length,
    totalUsers: users.length,
    uniqueSubmitters: uniqueSubmitters.size,
    submittedCount: submissions.filter((item) => item.status === 'submitted').length,
    reviewingCount: submissions.filter((item) => item.status === 'reviewing').length,
    reviewedCount: submissions.filter((item) => item.status === 'reviewed').length,
    rejectedCount: submissions.filter((item) => item.status === 'rejected').length,
    todayActionCount: submissions.filter((item) => (
      ['submitted', 'reviewing'].includes(item.status)
      && String(item.submittedAtIso || '').slice(0, 10) === todayDate
    )).length,
    resubmissionWaitCount: submissions.filter((item) => item.status === 'rejected').length,
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

  router.patch('/api/admin/submissions/:submissionId', authMiddleware.requireAdmin, async (req, res) => {
    try {
      const patch = parseReviewPatch(req.body);
      const submission = await firebaseAdminService.updateAdminSubmissionReview({
        submissionId: req.params.submissionId,
        ...patch,
        actor: req.authUser,
      });

      res.json({ submission });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error.message || '제출 검토 정보를 저장하지 못했습니다.',
      });
    }
  });

  return router;
}
