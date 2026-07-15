import { readFile, unlink } from 'node:fs/promises';
import { basename } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PORTFOLIO_FILES = 5;
const MAX_TOTAL_FILES = 7;
const MAX_PAYLOAD_BYTES = 64 * 1024;
const PDF_HEADER = Buffer.from('%PDF-');

function createHttpError(message, statusCode, code = '') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function parseLimit(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function boundedString(value, maxLength, fieldName, { required = false } = {}) {
  const normalized = String(value || '').trim();
  if (required && !normalized) {
    throw createHttpError(`${fieldName}을 입력해 주세요.`, 400, 'invalid_submission_payload');
  }
  if (normalized.length > maxLength) {
    throw createHttpError(`${fieldName}은 ${maxLength}자 이하로 입력해 주세요.`, 400, 'invalid_submission_payload');
  }
  return normalized;
}

function normalizeSkills(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 30)
    .map((item) => boundedString(item, 60, '기술'))
    .filter(Boolean);
}

function normalizeRecommendedJobs(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map((job) => ({
    id: boundedString(job?.id, 120, '공고 ID'),
    company: boundedString(job?.company, 120, '회사명'),
    title: boundedString(job?.title, 200, '공고명'),
    score: Number.isFinite(Number(job?.score)) ? Number(job.score) : 0,
  }));
}

export function parseSubmissionPayload(rawPayload) {
  let payload;
  try {
    payload = JSON.parse(String(rawPayload || ''));
  } catch {
    throw createHttpError('제출 정보 형식이 올바르지 않습니다.', 400, 'invalid_submission_payload');
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw createHttpError('제출 정보 형식이 올바르지 않습니다.', 400, 'invalid_submission_payload');
  }

  const experience = Number(payload.experience);
  return {
    applicantName: boundedString(payload.applicantName, 100, '지원자 이름', { required: true }),
    track: boundedString(payload.track, 100, '직무 트랙', { required: true }),
    subRole: boundedString(payload.subRole, 100, '세부 직무'),
    experience: Number.isFinite(experience) ? Math.max(0, Math.min(60, experience)) : 0,
    skills: normalizeSkills(payload.skills),
    githubUrl: boundedString(payload.githubUrl, 500, 'GitHub 주소'),
    latestAnalysisSummary: boundedString(payload.latestAnalysisSummary, 5000, '분석 요약'),
    latestRecommendedJobsSnapshot: normalizeRecommendedJobs(payload.latestRecommendedJobsSnapshot),
  };
}

function normalizeOriginalName(value, fallbackName) {
  const normalized = basename(String(value || '').replace(/\\/g, '/'))
    .replace(/[\r\n]/g, '')
    .trim();
  return (normalized || fallbackName).slice(0, 255);
}

export function buildSubmissionUploadPlan({ files = {}, uid, submissionId }) {
  const resume = files.resume?.[0] || null;
  const coverLetter = files.coverLetter?.[0] || null;
  const portfolio = Array.isArray(files.portfolio)
    ? files.portfolio.slice(0, MAX_PORTFOLIO_FILES)
    : [];
  const items = [];

  if (resume) {
    items.push({
      field: 'resume',
      file: resume,
      fileKey: 'resume',
      objectName: 'resume.pdf',
    });
  }
  if (coverLetter) {
    items.push({
      field: 'coverLetter',
      file: coverLetter,
      fileKey: 'coverLetter',
      objectName: 'cover-letter.pdf',
    });
  }
  portfolio.forEach((file, index) => {
    items.push({
      field: 'portfolio',
      file,
      fileKey: `portfolio-${index + 1}`,
      objectName: `portfolio-${index + 1}.pdf`,
    });
  });

  if (items.length === 0) {
    throw createHttpError(
      '이력서, 자기소개서, 포트폴리오 중 하나 이상의 PDF가 필요합니다.',
      400,
      'submission_file_required',
    );
  }

  return items.map((item) => ({
    ...item,
    storagePath: `portfolio-submissions/${uid}/${submissionId}/${item.objectName}`,
  }));
}

export function assertPdfBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_FILE_SIZE_BYTES) {
    throw createHttpError('PDF 파일은 10MB 이하로 제출해 주세요.', 400, 'invalid_file_size');
  }
  if (buffer.subarray(0, Math.min(buffer.length, 1024)).indexOf(PDF_HEADER) < 0) {
    throw createHttpError('PDF 형식의 파일만 제출할 수 있습니다.', 400, 'invalid_file_type');
  }
}

function flattenUploadedFiles(files = {}) {
  return Object.values(files).flat().filter(Boolean);
}

async function cleanupTemporaryFiles(files = {}) {
  await Promise.allSettled(
    flattenUploadedFiles(files).map((file) => unlink(file.path)),
  );
}

function createUploadMiddleware() {
  const upload = multer({
    dest: tmpdir(),
    limits: {
      fieldNameSize: 40,
      fieldSize: MAX_PAYLOAD_BYTES,
      fields: 1,
      fileSize: MAX_FILE_SIZE_BYTES,
      files: MAX_TOTAL_FILES,
      parts: MAX_TOTAL_FILES + 1,
    },
    fileFilter(req, file, callback) {
      const isPdf = file.mimetype === 'application/pdf'
        || String(file.originalname || '').toLowerCase().endsWith('.pdf');
      callback(isPdf ? null : createHttpError(
        'PDF 형식의 파일만 제출할 수 있습니다.',
        400,
        'invalid_file_type',
      ), isPdf);
    },
  }).fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 },
    { name: 'portfolio', maxCount: MAX_PORTFOLIO_FILES },
  ]);

  return (req, res, next) => {
    upload(req, res, async (error) => {
      if (!error) {
        next();
        return;
      }
      await cleanupTemporaryFiles(req.files);
      const isSizeError = error.code === 'LIMIT_FILE_SIZE';
      res.status(isSizeError ? 413 : (error.statusCode || 400)).json({
        error: isSizeError
          ? 'PDF 파일은 각각 10MB 이하로 제출해 주세요.'
          : (error.message || '제출 파일을 읽지 못했습니다.'),
        code: error.code || 'invalid_upload',
      });
    });
  };
}

function buildFileDescriptors(uploadedItems) {
  const descriptors = {
    resume: null,
    coverLetter: null,
    portfolio: [],
  };
  uploadedItems.forEach((item) => {
    const descriptor = {
      fileName: normalizeOriginalName(item.file.originalname, item.objectName),
      storagePath: item.storagePath,
      size: item.file.size,
      type: 'application/pdf',
      sha256: item.sha256,
    };
    if (item.field === 'portfolio') {
      descriptors.portfolio.push(descriptor);
    } else {
      descriptors[item.field] = descriptor;
    }
  });
  return descriptors;
}

export function createSubmissionRouter({
  firebaseAdminService,
  submissionStorageService,
  authMiddleware,
  areUploadsRequested = () => process.env.PORTFOLIO_UPLOADS_ENABLED === 'true',
}) {
  const router = Router();
  const activeUploadUserIds = new Set();
  const uploadMiddleware = createUploadMiddleware();

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
        error: error.message || '제출 이력을 불러오지 못했습니다.',
      });
    }
  });

  router.post(
    '/api/me/submissions',
    authMiddleware.requireAuth,
    async (req, res, next) => {
      if (!areUploadsRequested()) {
        return res.status(503).json({
          error: '자료 제출은 현재 준비 중입니다.',
          code: 'not_configured',
        });
      }
      const readiness = await submissionStorageService.getReadiness();
      if (readiness.ready !== true) {
        return res.status(503).json({
          error: '자료 제출은 현재 준비 중입니다.',
          code: readiness.status || 'storage_unavailable',
        });
      }
      return next();
    },
    uploadMiddleware,
    async (req, res) => {
      const uid = req.authUser?.uid || '';
      const uploadedPaths = [];
      if (!uid) {
        await cleanupTemporaryFiles(req.files);
        return res.status(401).json({ error: '로그인이 필요합니다.' });
      }
      if (activeUploadUserIds.has(uid)) {
        await cleanupTemporaryFiles(req.files);
        return res.status(409).json({
          error: '진행 중인 제출이 있습니다. 완료 후 다시 시도해 주세요.',
          code: 'submission_in_progress',
        });
      }

      activeUploadUserIds.add(uid);
      try {
        const payload = parseSubmissionPayload(req.body?.payload);
        const submissionId = firebaseAdminService.createSubmissionId();
        const uploadPlan = buildSubmissionUploadPlan({
          files: req.files,
          uid,
          submissionId,
        });
        const preparedItems = [];

        for (const item of uploadPlan) {
          const buffer = await readFile(item.file.path);
          assertPdfBuffer(buffer);
          preparedItems.push({
            ...item,
            buffer,
            sha256: createHash('sha256').update(buffer).digest('hex'),
          });
        }

        const duplicateHash = preparedItems.find((item, index) => (
          preparedItems.findIndex((candidate) => candidate.sha256 === item.sha256) !== index
        ));
        if (duplicateHash) {
          throw createHttpError(
            `${normalizeOriginalName(duplicateHash.file.originalname, duplicateHash.objectName)} 파일이 중복 첨부되었습니다.`,
            409,
            'duplicate_file',
          );
        }

        const fileDescriptors = buildFileDescriptors(preparedItems);
        await firebaseAdminService.assertSubmissionNotDuplicate?.({ uid, files: fileDescriptors });

        for (const item of preparedItems) {
          await submissionStorageService.uploadPdf({
            path: item.storagePath,
            buffer: item.buffer,
            metadata: {
              fileKey: item.fileKey,
              submissionId,
              userId: uid,
            },
          });
          uploadedPaths.push(item.storagePath);
        }

        const submission = await firebaseAdminService.createPortfolioSubmission({
          submissionId,
          authUser: req.authUser,
          payload,
          files: fileDescriptors,
        });
        return res.status(201).json({ submission });
      } catch (error) {
        if (uploadedPaths.length > 0) {
          try {
            await submissionStorageService.deleteFiles(uploadedPaths);
          } catch (cleanupError) {
            console.warn(`[Submission] Failed to roll back uploaded files: ${cleanupError.message}`);
          }
        }
        return res.status(error.statusCode || 500).json({
          error: error.statusCode ? error.message : '자료를 제출하지 못했습니다.',
          code: error.code || 'submission_failed',
        });
      } finally {
        activeUploadUserIds.delete(uid);
        await cleanupTemporaryFiles(req.files);
      }
    },
  );

  return router;
}
