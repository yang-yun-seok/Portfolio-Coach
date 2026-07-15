import { Readable } from 'node:stream';
import { createClient } from '@supabase/supabase-js';

const READINESS_TTL_MS = 60 * 1000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_HEADER = Buffer.from('%PDF-');
const SUBMISSION_OBJECT_PATH = /^portfolio-submissions\/[^/]+\/[^/]+\/(?:resume|cover-letter|portfolio-[1-5])\.pdf$/;

function createServiceError(message, statusCode, code = '') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeProjectUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function normalizeBucketName(value) {
  return String(value || 'portfolio-submissions').trim();
}

function isMissingBucketError(error) {
  const statusCode = Number(error?.statusCode || error?.status);
  const message = String(error?.message || '').toLowerCase();
  return statusCode === 404 || message.includes('bucket not found');
}

function isPdfBuffer(buffer) {
  return Buffer.isBuffer(buffer)
    && buffer.subarray(0, Math.min(buffer.length, 1024)).indexOf(PDF_HEADER) >= 0;
}

export function assertSubmissionObjectPath(path) {
  const normalizedPath = String(path || '').trim();
  if (!SUBMISSION_OBJECT_PATH.test(normalizedPath)) {
    throw createServiceError('올바르지 않은 제출 파일 경로입니다.', 400, 'invalid_storage_path');
  }
  return normalizedPath;
}

export function createSubmissionStorageService({
  env = process.env,
  createClientImpl = createClient,
} = {}) {
  const projectUrl = normalizeProjectUrl(env.SUPABASE_STORAGE_URL);
  const secretKey = String(
    env.SUPABASE_STORAGE_SECRET_KEY
      || env.SUPABASE_STORAGE_SERVICE_ROLE_KEY
      || '',
  ).trim();
  const bucketName = normalizeBucketName(env.SUPABASE_STORAGE_BUCKET);
  const configReady = Boolean(projectUrl && secretKey && bucketName);
  const client = configReady
    ? createClientImpl(projectUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    })
    : null;
  let readinessCache = null;
  let readinessCheckedAt = 0;

  function requireClient() {
    if (!client || !configReady) {
      throw createServiceError(
        '제출 파일 저장소가 설정되지 않았습니다.',
        503,
        'storage_not_configured',
      );
    }
    return client;
  }

  async function getReadiness({ force = false } = {}) {
    const now = Date.now();
    if (!force && readinessCache && now - readinessCheckedAt < READINESS_TTL_MS) {
      return readinessCache;
    }

    if (!configReady) {
      readinessCache = { ready: false, status: 'admin_not_configured' };
      readinessCheckedAt = now;
      return readinessCache;
    }

    try {
      const { data, error } = await client.storage.getBucket(bucketName);
      if (error) {
        readinessCache = isMissingBucketError(error)
          ? { ready: false, status: 'bucket_missing' }
          : { ready: false, status: 'storage_unavailable' };
      } else if (data?.public === true) {
        readinessCache = { ready: false, status: 'bucket_public' };
      } else {
        readinessCache = { ready: true, status: 'ready' };
      }
    } catch {
      readinessCache = { ready: false, status: 'storage_unavailable' };
    }

    readinessCheckedAt = now;
    return readinessCache;
  }

  async function assertReady() {
    const readiness = await getReadiness();
    if (readiness.ready !== true) {
      throw createServiceError(
        '제출 파일 저장소를 사용할 수 없습니다.',
        503,
        readiness.status || 'storage_unavailable',
      );
    }
  }

  async function uploadPdf({ path, buffer, metadata = {} }) {
    const objectPath = assertSubmissionObjectPath(path);
    if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_FILE_SIZE_BYTES) {
      throw createServiceError(
        'PDF 파일은 10MB 이하로 제출해 주세요.',
        400,
        'invalid_file_size',
      );
    }
    if (!isPdfBuffer(buffer)) {
      throw createServiceError(
        'PDF 형식의 파일만 제출할 수 있습니다.',
        400,
        'invalid_file_type',
      );
    }

    await assertReady();
    const storage = requireClient().storage.from(bucketName);
    const { data, error } = await storage.upload(objectPath, buffer, {
      cacheControl: '0',
      contentType: 'application/pdf',
      metadata,
      upsert: false,
    });
    if (error) {
      const statusCode = Number(error.statusCode || error.status);
      throw createServiceError(
        statusCode === 409 ? '같은 제출 파일이 이미 존재합니다.' : '제출 파일을 저장하지 못했습니다.',
        statusCode === 409 ? 409 : 502,
        statusCode === 409 ? 'storage_conflict' : 'storage_upload_failed',
      );
    }

    return { path: data?.path || objectPath };
  }

  async function downloadPdf({ path }) {
    const objectPath = assertSubmissionObjectPath(path);
    await assertReady();
    const { data, error } = await requireClient().storage.from(bucketName).download(objectPath, {
      cacheNonce: Date.now().toString(),
    });
    if (error || !data) {
      if (isMissingBucketError(error) || Number(error?.statusCode || error?.status) === 400) {
        throw createServiceError('제출 파일을 찾을 수 없습니다.', 404, 'storage_object_missing');
      }
      throw createServiceError('제출 파일을 불러오지 못했습니다.', 502, 'storage_download_failed');
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_FILE_SIZE_BYTES) {
      throw createServiceError('제출 파일 크기가 올바르지 않습니다.', 409, 'invalid_stored_file');
    }
    if (!isPdfBuffer(buffer)) {
      throw createServiceError('저장된 제출 파일 형식이 올바르지 않습니다.', 409, 'invalid_stored_file');
    }

    return {
      stream: Readable.from(buffer),
      contentType: 'application/pdf',
      contentLength: buffer.length,
    };
  }

  async function deleteFiles(paths = []) {
    const objectPaths = [...new Set(paths.map(assertSubmissionObjectPath))];
    if (objectPaths.length === 0 || !configReady) return [];
    const { data, error } = await requireClient().storage.from(bucketName).remove(objectPaths);
    if (error) {
      throw createServiceError('임시 제출 파일을 정리하지 못했습니다.', 502, 'storage_cleanup_failed');
    }
    return data || [];
  }

  return {
    provider: 'supabase',
    bucketName,
    configReady,
    getReadiness,
    uploadPdf,
    downloadPdf,
    deleteFiles,
  };
}
