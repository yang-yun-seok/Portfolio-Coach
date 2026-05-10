import { join } from 'path';
import { runCrawler } from '../../lib/crawler.js';
import {
  JOB_AGGREGATE_FILE,
  buildPublicJobs,
  formatKstDate,
  isActiveJob,
  isManagedCatalogJob,
  loadJobMetadata,
  loadJobRecords,
  readJsonFile,
  writeJobAggregate,
  writeJobIndex,
  writeJobMetadata,
  writeJobRecord,
} from '../../lib/job-catalog.js';

export const DAILY_GAMEJOB_JOB_TAGS = [
  '게임개발(클라이언트)',
  '게임개발(모바일)',
  '게임기획',
  '게임운영',
  'QA·테스트',
];

export const DAILY_GAMEJOB_CAREER_TAGS = [
  '신입',
  '1~3년',
  '경력무관',
];

export const DAILY_GAMEJOB_TARGETS = [
  ...DAILY_GAMEJOB_JOB_TAGS,
  ...DAILY_GAMEJOB_CAREER_TAGS,
];

function getJobsDir(dataDir) {
  return join(dataDir, 'jobs');
}

function getJobMap(jobs) {
  return new Map((jobs || []).filter(Boolean).map((job) => [String(job.id), job]));
}

function buildManagedJob(previousJob, nextJob, crawlFinishedAt) {
  return {
    ...previousJob,
    ...nextJob,
    source: nextJob.source || previousJob?.source || 'GameJob',
    catalogManaged: true,
    status: 'active',
    isActive: true,
    firstSeenAt: previousJob?.firstSeenAt || crawlFinishedAt,
    lastSeenAt: crawlFinishedAt,
    lastCrawledAt: crawlFinishedAt,
    inactiveAt: null,
  };
}

function buildInactiveJob(previousJob, crawlFinishedAt) {
  return {
    ...previousJob,
    catalogManaged: previousJob?.catalogManaged === false ? false : true,
    status: 'inactive',
    isActive: false,
    lastCrawledAt: crawlFinishedAt,
    inactiveAt: previousJob?.inactiveAt || crawlFinishedAt,
  };
}

export async function crawlGameJobPostings({
  dataDir,
  onProgress = () => {},
  signal = null,
} = {}) {
  const startedAt = new Date().toISOString();
  const result = await runCrawler({
    targets: DAILY_GAMEJOB_TARGETS,
    dataDir,
    signal,
    onProgress,
  });

  return {
    ...result,
    startedAt,
    finishedAt: new Date().toISOString(),
    filters: {
      jobTags: DAILY_GAMEJOB_JOB_TAGS,
      careerTags: DAILY_GAMEJOB_CAREER_TAGS,
    },
  };
}

export function upsertJobPostings({
  dataDir,
  crawledJobs = [],
  crawlFinishedAt = new Date().toISOString(),
} = {}) {
  const jobsDir = getJobsDir(dataDir);
  const previousJobs = loadJobRecords(jobsDir);
  const previousMap = getJobMap(previousJobs);
  const crawledMap = getJobMap(crawledJobs);
  const nextJobs = [];
  const touchedIds = new Set();

  let newJobsCount = 0;
  let reactivatedJobsCount = 0;
  let inactiveJobsCount = 0;

  for (const [jobId, crawledJob] of crawledMap.entries()) {
    const previousJob = previousMap.get(jobId);
    const nextJob = buildManagedJob(previousJob, crawledJob, crawlFinishedAt);
    touchedIds.add(jobId);
    nextJobs.push(nextJob);

    if (!previousJob) {
      newJobsCount += 1;
    } else if (!isActiveJob(previousJob)) {
      reactivatedJobsCount += 1;
    }
  }

  for (const previousJob of previousJobs) {
    const jobId = String(previousJob.id);
    if (touchedIds.has(jobId)) continue;

    if (isManagedCatalogJob(previousJob)) {
      if (isActiveJob(previousJob)) {
        inactiveJobsCount += 1;
      }
      nextJobs.push(buildInactiveJob(previousJob, crawlFinishedAt));
      continue;
    }

    nextJobs.push(previousJob);
  }

  nextJobs.sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')));
  nextJobs.forEach((job) => writeJobRecord(jobsDir, job));
  writeJobAggregate(jobsDir, nextJobs);
  writeJobIndex(jobsDir, nextJobs);

  const publicJobs = buildPublicJobs(nextJobs);
  const activeJobsCount = nextJobs.filter(isActiveJob).length;
  const totalManagedJobsCount = nextJobs.filter(isManagedCatalogJob).length;

  return {
    jobs: nextJobs,
    publicJobs,
    newJobsCount,
    reactivatedJobsCount,
    deactivatedJobsCount: inactiveJobsCount,
    inactiveJobsCount: nextJobs.filter((job) => isManagedCatalogJob(job) && !isActiveJob(job)).length,
    activeJobsCount,
    totalManagedJobsCount,
    referenceJobCount: publicJobs.length,
    latestAppliedDate: formatKstDate(crawlFinishedAt),
  };
}

export function updateCrawlingMetadata({
  dataDir,
  crawlResult = null,
  upsertResult = null,
  error = null,
} = {}) {
  const jobsDir = getJobsDir(dataDir);
  const previousMeta = loadJobMetadata(jobsDir);
  const succeeded = Boolean(crawlResult && upsertResult && !error);
  const finishedAt = crawlResult?.finishedAt || new Date().toISOString();
  const lastCrawlStatus = succeeded
    ? ((crawlResult.errors?.length || 0) > 0 ? 'partial-success' : 'success')
    : 'failed';

  const nextMeta = {
    ...previousMeta,
    source: 'GameJob',
    lastCrawlAttemptAt: finishedAt,
    lastCrawlStatus,
    lastCrawlError: error ? error.message || String(error) : null,
    filters: crawlResult?.filters || previousMeta.filters,
  };

  if (succeeded) {
    nextMeta.latestAppliedDate = upsertResult.latestAppliedDate;
    nextMeta.referenceJobCount = upsertResult.referenceJobCount;
    nextMeta.lastSuccessfulCrawlAt = finishedAt;
    nextMeta.newJobsCount = upsertResult.newJobsCount;
    nextMeta.activeJobsCount = upsertResult.activeJobsCount;
    nextMeta.inactiveJobsCount = upsertResult.inactiveJobsCount;
    nextMeta.totalManagedJobsCount = upsertResult.totalManagedJobsCount;
  }

  writeJobMetadata(jobsDir, nextMeta);
  return nextMeta;
}

export function persistResolvedJobPosting({ dataDir, job }) {
  const jobsDir = getJobsDir(dataDir);
  const previousJobs = loadJobRecords(jobsDir);
  const now = new Date().toISOString();
  const nextJob = {
    ...job,
    catalogManaged: false,
    status: 'resolved',
    isActive: true,
    firstSeenAt: job.firstSeenAt || now,
    lastSeenAt: now,
    lastCrawledAt: now,
  };

  const nextMap = getJobMap(previousJobs);
  nextMap.set(String(nextJob.id), nextJob);
  const nextJobs = [...nextMap.values()].sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')));
  writeJobRecord(jobsDir, nextJob);
  writeJobAggregate(jobsDir, nextJobs);
  writeJobIndex(jobsDir, nextJobs);
  return nextJob;
}

export async function runDailyGameJobCrawling({
  dataDir,
  dataLoader = null,
  logger = console,
  signal = null,
} = {}) {
  try {
    const crawlResult = await crawlGameJobPostings({
      dataDir,
      signal,
      onProgress: ({ message, percent }) => {
        logger.log(`[daily-crawl ${percent ?? 0}%] ${message}`);
      },
    });

    const upsertResult = upsertJobPostings({
      dataDir,
      crawledJobs: crawlResult.jobs || [],
      crawlFinishedAt: crawlResult.finishedAt,
    });

    const metadata = updateCrawlingMetadata({
      dataDir,
      crawlResult,
      upsertResult,
    });

    dataLoader?.refresh?.();

    return {
      ok: true,
      crawlResult,
      upsertResult,
      metadata,
    };
  } catch (error) {
    logger.error('[daily-crawl] failed:', error.message);
    const metadata = updateCrawlingMetadata({
      dataDir,
      error,
      crawlResult: {
        finishedAt: new Date().toISOString(),
        filters: {
          jobTags: DAILY_GAMEJOB_JOB_TAGS,
          careerTags: DAILY_GAMEJOB_CAREER_TAGS,
        },
      },
    });

    dataLoader?.refresh?.();

    return {
      ok: false,
      error,
      metadata,
    };
  }
}

function getMsUntilNextKstMidnight(now = new Date()) {
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffsetMs);
  const nextMidnightKst = new Date(kstNow);
  nextMidnightKst.setUTCHours(15, 0, 0, 0);
  if (nextMidnightKst <= now) {
    nextMidnightKst.setUTCDate(nextMidnightKst.getUTCDate() + 1);
  }
  return nextMidnightKst.getTime() - now.getTime();
}

export function scheduleDailyGameJobCrawling({
  task,
  logger = console,
  nowProvider = () => new Date(),
} = {}) {
  if (typeof task !== 'function') {
    throw new Error('scheduleDailyGameJobCrawling requires a task function.');
  }

  let timer = null;

  const scheduleNext = () => {
    const delayMs = getMsUntilNextKstMidnight(nowProvider());
    logger.log(`[daily-crawl] next scheduled run in ${Math.round(delayMs / 1000)}s`);
    timer = setTimeout(async () => {
      try {
        await task();
      } catch (error) {
        logger.error('[daily-crawl] scheduled task failed:', error.message);
      } finally {
        scheduleNext();
      }
    }, delayMs);
  };

  scheduleNext();
  return () => {
    if (timer) clearTimeout(timer);
  };
}

export function loadManagedJobsSnapshot(dataDir) {
  const jobsDir = getJobsDir(dataDir);
  const jobs = loadJobRecords(jobsDir);
  return {
    jobs,
    publicJobs: buildPublicJobs(jobs),
    metadata: loadJobMetadata(jobsDir),
    aggregate: readJsonFile(join(jobsDir, JOB_AGGREGATE_FILE), jobs),
  };
}
