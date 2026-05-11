import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export const JOB_INDEX_FILE = '_index.json';
export const JOB_META_FILE = '_meta.json';
export const JOB_AGGREGATE_FILE = 'all-jobs.json';
export const JOB_HISTORY_DIR = 'history';
export const JOB_HISTORY_RETENTION_DAYS = 365;
const JOB_FILE_PATTERN = /^job-\d+\.json$/;
const JOB_HISTORY_FILE_PATTERN = /^\d{4}-\d{2}-\d{2}\.json$/;

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

export function listJobHistoryFileNames(historyDir) {
  if (!existsSync(historyDir)) return [];
  return readdirSync(historyDir)
    .filter((fileName) => JOB_HISTORY_FILE_PATTERN.test(fileName))
    .sort()
    .reverse();
}

export function loadJobHistorySnapshot(historyDir, date) {
  return readJsonFile(join(historyDir, `${date}.json`), null);
}

export function writeJobHistorySnapshot(historyDir, date, payload) {
  writeJsonFile(join(historyDir, `${date}.json`), payload);
}

function parseDateString(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ''));
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

export function pruneJobHistorySnapshots(historyDir, {
  referenceDate = formatKstDate(new Date()),
  retentionDays = JOB_HISTORY_RETENTION_DAYS,
} = {}) {
  const reference = parseDateString(referenceDate);
  if (!reference || retentionDays <= 0) return [];

  const cutoff = new Date(reference);
  cutoff.setUTCDate(cutoff.getUTCDate() - (retentionDays - 1));
  const cutoffDate = toDateString(cutoff);
  const removedDates = [];

  listJobHistoryFileNames(historyDir)
    .map((fileName) => fileName.replace(/\.json$/, ''))
    .filter((date) => date < cutoffDate)
    .forEach((date) => {
      const filePath = join(historyDir, `${date}.json`);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        removedDates.push(date);
      }
    });

  return removedDates;
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

function normalizeJobText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·ㆍ]/g, '');
}

function getJobSearchText(job) {
  return normalizeJobText([
    job?.role,
    ...(Array.isArray(job?.roles) ? job.roles : []),
    job?.title,
    job?.experience,
    job?.keywords,
    ...(Array.isArray(job?.reqSkills) ? job.reqSkills : []),
  ].filter(Boolean).join(' '));
}

function getJobTitleRoleText(job) {
  return normalizeJobText([
    job?.role,
    ...(Array.isArray(job?.roles) ? job.roles : []),
    job?.title,
  ].filter(Boolean).join(' '));
}

function matchesJobTag(job, tag) {
  const haystack = getJobSearchText(job);
  const titleRoleText = getJobTitleRoleText(job);
  const hasArtSignals = /디자이너|원화|일러스트|아티스트|도트|모델링|애니메이션|이펙트|배경/.test(titleRoleText);
  const hasOpsSignals = /게임운영|운영|qa|테스트|gm|cs|고객|커뮤니티|cm|모니터링/.test(titleRoleText);
  const hasPmSignals = /사업pm|개발pm|projectmanager|프로젝트매니저|서비스기획pm|\bpm\b/.test(titleRoleText);
  if (hasArtSignals || hasOpsSignals || hasPmSignals) {
    return false;
  }

  switch (tag) {
    case '게임기획':
      return /게임기획|기획|시스템기획|컨텐츠|콘텐츠|레벨기획|밸런스|전투기획|uiux기획|시나리오/.test(haystack);
    case '게임개발(모바일)':
      return /모바일|ios|android|앱개발|모바일게임/.test(haystack);
    case '게임개발(클라이언트)':
      return /클라이언트|unity|unreal|언리얼|c\+\+|c#|엔진|게임프로그래머/.test(haystack);
    default:
      return haystack.includes(normalizeJobText(tag));
  }
}

function matchesCareerTag(job, tag) {
  const experienceText = normalizeJobText(job?.experience || '');
  const numericExp = Number(job?.reqExp);

  switch (tag) {
    case '신입':
      return experienceText.includes('신입') || (!experienceText && numericExp === 0);
    case '1~3년':
      return experienceText.includes('1~3')
        || experienceText.includes('1-3')
        || /1년이상|2년이상|3년이하|1년차|2년차|3년차/.test(experienceText)
        || (!Number.isNaN(numericExp) && numericExp >= 1 && numericExp <= 3);
    case '경력무관':
      return experienceText.includes('무관') || (!experienceText && numericExp === 0);
    default:
      return experienceText.includes(normalizeJobText(tag));
  }
}

export function filterJobsByCatalogFilters(jobs, filters = {}) {
  const jobTags = Array.isArray(filters?.jobTags) ? filters.jobTags.filter(Boolean) : [];
  const careerTags = Array.isArray(filters?.careerTags) ? filters.careerTags.filter(Boolean) : [];

  return (jobs || []).filter((job) => {
    if (jobTags.length > 0 && !jobTags.some((tag) => matchesJobTag(job, tag))) {
      return false;
    }
    if (careerTags.length > 0 && !careerTags.some((tag) => matchesCareerTag(job, tag))) {
      return false;
    }
    return true;
  });
}

export function buildPublicJobs(jobs, filters = {}) {
  return filterJobsByCatalogFilters(
    jobs.filter(isPublicJob),
    filters,
  )
    .sort((left, right) => {
      const leftDate = String(left.updatedAt || '');
      const rightDate = String(right.updatedAt || '');
      return rightDate.localeCompare(leftDate);
    });
}

export function countNewJobsForDate(jobs, date) {
  if (!date) return 0;
  return (jobs || []).filter((job) => {
    const 기준일 = job?.firstSeenAt || job?.updatedAt;
    return 기준일 && formatKstDate(기준일) === date;
  }).length;
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
