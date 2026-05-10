import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export const JOB_INDEX_FILE = '_index.json';
export const JOB_META_FILE = '_meta.json';
export const JOB_AGGREGATE_FILE = 'all-jobs.json';
const JOB_FILE_PATTERN = /^job-\d+\.json$/;

export const DEFAULT_JOB_CATALOG_META = {
  source: 'GameJob',
  latestAppliedDate: null,
  referenceJobCount: 0,
  lastSuccessfulCrawlAt: null,
  lastCrawlAttemptAt: null,
  lastCrawlStatus: 'idle',
  lastCrawlError: null,
  newJobsCount: 0,
  activeJobsCount: 0,
  inactiveJobsCount: 0,
  totalManagedJobsCount: 0,
  filters: {
    jobTags: [],
    careerTags: [],
  },
};

export function readJsonFile(filePath, fallback = null) {
  try {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

export function writeJsonFile(filePath, value) {
  const dir = dirname(filePath);
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

export function ensureJobsDirectory(jobsDir) {
  if (!existsSync(jobsDir)) {
    mkdirSync(jobsDir, { recursive: true });
  }
}

export function normalizeJobFileName(id) {
  return `job-${String(id).replace(/^crawled-/, '')}.json`;
}

export function listJobFileNames(jobsDir) {
  if (!existsSync(jobsDir)) return [];
  return readdirSync(jobsDir).filter((fileName) => JOB_FILE_PATTERN.test(fileName));
}

export function loadJobRecords(jobsDir) {
  return listJobFileNames(jobsDir)
    .map((fileName) => readJsonFile(join(jobsDir, fileName), null))
    .filter(Boolean);
}

export function writeJobRecord(jobsDir, job) {
  ensureJobsDirectory(jobsDir);
  writeJsonFile(join(jobsDir, normalizeJobFileName(job.id)), job);
}

export function writeJobIndex(jobsDir, jobs) {
  const files = jobs.map((job) => normalizeJobFileName(job.id));
  writeJsonFile(join(jobsDir, JOB_INDEX_FILE), {
    updatedAt: new Date().toISOString(),
    count: jobs.length,
    activeCount: jobs.filter(isActiveJob).length,
    publicCount: jobs.filter(isPublicJob).length,
    files,
  });
}

export function writeJobAggregate(jobsDir, jobs) {
  writeJsonFile(join(jobsDir, JOB_AGGREGATE_FILE), jobs);
}

export function loadJobMetadata(jobsDir) {
  return {
    ...DEFAULT_JOB_CATALOG_META,
    ...(readJsonFile(join(jobsDir, JOB_META_FILE), {}) || {}),
  };
}

export function writeJobMetadata(jobsDir, metadata) {
  writeJsonFile(join(jobsDir, JOB_META_FILE), {
    ...DEFAULT_JOB_CATALOG_META,
    ...metadata,
  });
}

export function isManagedCatalogJob(job) {
  if (!job) return false;
  if (job.catalogManaged === false) return false;
  return job.source === 'GameJob';
}

export function isActiveJob(job) {
  if (!job) return false;
  if (job.status === 'inactive') return false;
  if (job.isActive === false) return false;
  return true;
}

export function isPublicJob(job) {
  return isManagedCatalogJob(job) && isActiveJob(job);
}

export function buildPublicJobs(jobs) {
  return jobs
    .filter(isPublicJob)
    .sort((left, right) => {
      const leftDate = String(left.updatedAt || '');
      const rightDate = String(right.updatedAt || '');
      return rightDate.localeCompare(leftDate);
    });
}

export function formatKstDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}
