import { Router } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

const REVIEW_STATUSES = new Set(['submitted', 'reviewing', 'reviewed', 'rejected']);
const MAX_ADMIN_MEMO_LENGTH = 2000;
const MAX_STUDENT_FEEDBACK_LENGTH = 3000;
const MAX_ADMIN_PASSWORD_LENGTH = 128;

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

export function buildAttachmentDisposition(fileName = 'submission.pdf') {
  const normalizedName = String(fileName || '')
    .replace(/[\r\n]/g, '')
    .replace(/[\\/]/g, '_')
    .trim() || 'submission.pdf';
  const asciiName = normalizedName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(normalizedName)}`;
}

export function parseUserAccessPatch(body = {}) {
  const normalizedBody = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const keys = Object.keys(normalizedBody);

  if (keys.length !== 1 || keys[0] !== 'active' || typeof normalizedBody.active !== 'boolean') {
    throw createHttpError('계정 상태는 active 불리언 값으로 지정해 주세요.', 400);
  }

  return { active: normalizedBody.active };
}

export function parseSubmissionDeletion(body = {}, submissionId = '') {
  const normalizedBody = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const keys = Object.keys(normalizedBody);
  const normalizedSubmissionId = String(submissionId || '').trim();

  if (
    keys.length !== 1
    || keys[0] !== 'confirmSubmissionId'
    || typeof normalizedBody.confirmSubmissionId !== 'string'
    || normalizedBody.confirmSubmissionId !== normalizedSubmissionId
  ) {
    throw createHttpError('정리할 제출 ID를 다시 확인해 주세요.', 400);
  }

  return { confirmSubmissionId: normalizedSubmissionId };
}

export function parseAdminUnlock(body = {}) {
  const normalizedBody = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const keys = Object.keys(normalizedBody);

  if (keys.length !== 1 || keys[0] !== 'password' || typeof normalizedBody.password !== 'string') {
    throw createHttpError('관리자 모드 비밀번호를 입력해 주세요.', 400);
  }

  const password = normalizedBody.password.trim();
  if (!password || password.length > MAX_ADMIN_PASSWORD_LENGTH) {
    throw createHttpError(`관리자 모드 비밀번호는 1~${MAX_ADMIN_PASSWORD_LENGTH}자로 입력해 주세요.`, 400);
  }

  return { password };
}

export function matchesAdminModePassword(password, expectedPassword) {
  const expected = String(expectedPassword || '');
  if (!expected) {
    throw createHttpError('관리자 모드 비밀번호가 서버에 설정되지 않았습니다.', 503);
  }

  const digest = (value) => createHash('sha256').update(value, 'utf8').digest();
  return timingSafeEqual(digest(String(password || '')), digest(expected));
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
  const fileDescriptors = submissions.flatMap((submission) => {
    const files = submission?.files || {};
    return [
      files.resume,
      files.coverLetter,
      ...(Array.isArray(files.portfolio) ? files.portfolio : []),
    ].filter(Boolean);
  });
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
    submissionFileCount: fileDescriptors.length,
    submissionStorageBytes: fileDescriptors.reduce(
      (total, file) => total + (Number(file?.size) || 0),
      0,
    ),
    latestSubmittedAtIso: submissions[0]?.submittedAtIso || '',
  };
}

export function createAdminRouter({
  firebaseAdminService,
  submissionStorageService,
  authMiddleware,
  adminModePassword = process.env.ADMIN_MODE_PASSWORD,
}) {
  const router = Router();

  router.post('/api/admin/unlock', authMiddleware.requireAdmin, (req, res) => {
    try {
      const { password } = parseAdminUnlock(req.body);
      if (!matchesAdminModePassword(password, adminModePassword)) {
        return res.status(403).json({ error: '비밀번호가 맞지 않습니다.' });
      }

      return res.json({ ok: true });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        error: error.message || '관리자 모드를 열지 못했습니다.',
      });
    }
  });

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

  router.get('/api/admin/submissions/:submissionId/files/:fileKey', authMiddleware.requireAdmin, async (req, res) => {
    try {
      const descriptor = await firebaseAdminService.getAdminSubmissionFileDescriptor({
        submissionId: req.params.submissionId,
        fileKey: req.params.fileKey,
      });
      const storedFile = await submissionStorageService.downloadPdf({
        path: descriptor.storagePath,
      });
      const file = {
        ...storedFile,
        fileName: descriptor.fileName,
      };
      res.setHeader('Content-Type', file.contentType || 'application/pdf');
      res.setHeader('Content-Disposition', buildAttachmentDisposition(file.fileName));
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (file.contentLength > 0) {
        res.setHeader('Content-Length', String(file.contentLength));
      }
      await pipeline(file.stream, res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy(error);
        return;
      }
      res.status(error.statusCode || 500).json({
        error: error.message || '제출 파일을 받지 못했습니다.',
      });
    }
  });

  router.delete('/api/admin/submissions/:submissionId', authMiddleware.requireAdmin, async (req, res) => {
    try {
      parseSubmissionDeletion(req.body, req.params.submissionId);
      const deletionPlan = await firebaseAdminService.getAdminSubmissionDeletionPlan({
        submissionId: req.params.submissionId,
      });
      await submissionStorageService.deleteFiles(deletionPlan.storagePaths);
      const deletedSubmission = await firebaseAdminService.deleteAdminSubmission({
        submissionId: req.params.submissionId,
        actor: req.authUser,
      });

      res.json({
        deletedSubmission,
        deletedFileCount: deletionPlan.fileCount,
        releasedStorageBytes: deletionPlan.storageBytes,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error.message || '제출 내역을 정리하지 못했습니다.',
        code: error.code || 'submission_delete_failed',
      });
    }
  });

  router.patch('/api/admin/users/:uid', authMiddleware.requireAdmin, async (req, res) => {
    try {
      const patch = parseUserAccessPatch(req.body);
      const user = await firebaseAdminService.updateAdminUserAccess({
        uid: req.params.uid,
        ...patch,
        actor: req.authUser,
      });

      res.json({ user });
    } catch (error) {
      res.status(error.statusCode || 500).json({
        error: error.message || '계정 상태를 변경하지 못했습니다.',
      });
    }
  });

  return router;
}
