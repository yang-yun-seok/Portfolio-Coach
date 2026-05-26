import { join } from 'path';
import { runCrawler } from '../../lib/crawler.js';
import {
  JOB_AGGREGATE_FILE,
  JOB_HISTORY_DIR,
  JOB_HISTORY_RETENTION_DAYS,
  buildPublicJobs,
  deleteJobRecord,
  formatKstDate,
  isActiveJob,
  isManagedCatalogJob,
  loadJobHistorySnapshot,
  loadJobMetadata,
  pruneJobHistorySnapshots,
  loadJobRecords,
  readJsonFile,
  writeJobAggregate,
  writeJobHistorySnapshot,
  writeJobIndex,
  writeJobMetadata,
  writeJobRecord,
} from '../../lib/job-catalog.js';

/*
export const DAILY_GAMEJOB_JOB_TAGS = [
  '게임개발(클라이언트)',
  '게임개발(모바일)',
  '게임AI 개발',
  '인터페이스 디자인',
  '원화',
  '모델링',
  '애니메이션',
  '이펙트·FX',
  '게임기획',
  '게임운영',
  'QA·테스터',
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
*/

export const DAILY_GAMEJOB_JOB_TAGS = [
  '\uac8c\uc784\uac1c\ubc1c(\ud074\ub77c\uc774\uc5b8\ud2b8)',
  '\uac8c\uc784\uac1c\ubc1c(\ubaa8\ubc14\uc77c)',
  '\uac8c\uc784AI \uac1c\ubc1c',
  '\uc778\ud130\ud398\uc774\uc2a4 \ub514\uc790\uc778',
  '\uc6d0\ud654',
  '\ubaa8\ub378\ub9c1',
  '\uc560\ub2c8\uba54\uc774\uc158',
  '\uc774\ud399\ud2b8\u00b7FX',
  '\uac8c\uc784\uae30\ud68d',
  '\uac8c\uc784\uc6b4\uc601',
  'QA\u00b7\ud14c\uc2a4\ud130',
];

export const DAILY_GAMEJOB_CAREER_TAGS = [
  '\uc2e0\uc785',
  '1~3\ub144',
  '\uacbd\ub825\ubb34\uad00',
];

export const DAILY_GAMEJOB_TARGETS = [
  ...DAILY_GAMEJOB_JOB_TAGS,
  ...DAILY_GAMEJOB_CAREER_TAGS,
];

function getJobsDir(dataDir) {
  return join(dataDir, 'jobs');
}

function getHistoryDir(dataDir) {
  return join(dataDir, JOB_HISTORY_DIR);
}

function getJobMap(jobs) {
  return new Map((jobs || []).filter(Boolean).map((job) => [String(job.id), job]));
}

function getCatalogFilters() {
  return {
    jobTags: DAILY_GAMEJOB_JOB_TAGS,
    careerTags: DAILY_GAMEJOB_CAREER_TAGS,
  };
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

function buildListedManagedFallback(previousJob, crawlFinishedAt) {
  return {
    ...previousJob,
    catalogManaged: true,
    status: 'active',
    isActive: true,
    lastSeenAt: crawlFinishedAt,
    lastCrawledAt: crawlFinishedAt,
    inactiveAt: null,
  };
}

export async function crawlGameJobPostings({
  dataDir,
  onProgress = () => {},
  signal = null,
} = {}) {
  const startedAt = new Date().toISOString();
  const filters = getCatalogFilters();
  const existingJobs = buildPublicJobs(loadJobRecords(getJobsDir(dataDir)), filters);
  const result = await runCrawler({
    targets: DAILY_GAMEJOB_TARGETS,
    dataDir,
    signal,
    onProgress,
    existingJobs,
  });

  return {
    ...result,
    startedAt,
    finishedAt: new Date().toISOString(),
    filters,
  };
}

export function upsertJobPostings({
  dataDir,
  crawledJobs = [],
  crawlFinishedAt = new Date().toISOString(),
  listedJobIds = [],
  removeMissingManagedJobs = true,
} = {}) {
  const jobsDir = getJobsDir(dataDir);
  const previousJobs = loadJobRecords(jobsDir);
  const previousMap = getJobMap(previousJobs);
  const crawledMap = getJobMap(crawledJobs);
  const listedJobIdSet = new Set(
    (listedJobIds.length > 0 ? listedJobIds : [...crawledMap.keys()]).map((jobId) => String(jobId)),
  );
  const nextJobs = [];
  const touchedIds = new Set();
  const removedManagedJobIds = [];

  let newJobsCount = 0;
  let reactivatedJobsCount = 0;
  let deletedJobsCount = 0;

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
      if (!removeMissingManagedJobs) {
        nextJobs.push(previousJob);
        continue;
      }

      if (listedJobIdSet.has(jobId)) {
        nextJobs.push(buildListedManagedFallback(previousJob, crawlFinishedAt));
        if (!isActiveJob(previousJob)) {
          reactivatedJobsCount += 1;
        }
        continue;
      }

      if (isActiveJob(previousJob)) {
        deletedJobsCount += 1;
      }
      removedManagedJobIds.push(jobId);
      continue;
    }

    nextJobs.push(previousJob);
  }

  nextJobs.sort((left, right) => String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')));
  removedManagedJobIds.forEach((jobId) => deleteJobRecord(jobsDir, jobId));
  nextJobs.forEach((job) => writeJobRecord(jobsDir, job));
  writeJobAggregate(jobsDir, nextJobs);
  writeJobIndex(jobsDir, nextJobs);

  const publicJobs = buildPublicJobs(nextJobs);
  const activeJobsCount = publicJobs.length;
  const totalManagedJobsCount = nextJobs.filter(isManagedCatalogJob).length;

  return {
    jobs: nextJobs,
    publicJobs,
    newJobsCount,
    reactivatedJobsCount,
    deletedJobsCount,
    deactivatedJobsCount: deletedJobsCount,
    inactiveJobsCount: 0,
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

export function appendDailyHistorySnapshot({
  dataDir,
  crawlFinishedAt = new Date().toISOString(),
  publicJobs = [],
  metadata = {},
} = {}) {
  const historyDir = getHistoryDir(dataDir);
  const snapshotDate = formatKstDate(crawlFinishedAt);
  const previousSnapshot = loadJobHistorySnapshot(historyDir, snapshotDate);
  const snapshot = {
    date: snapshotDate,
    generatedAt: crawlFinishedAt,
    referenceJobCount: publicJobs.length,
    newJobsCount: metadata.newJobsCount || 0,
    activeJobsCount: metadata.activeJobsCount || publicJobs.length,
    lastCrawlStatus: metadata.lastCrawlStatus || 'success',
    jobs: publicJobs,
  };

  writeJobHistorySnapshot(historyDir, snapshotDate, {
    ...previousSnapshot,
    ...snapshot,
  });

  const prunedDates = pruneJobHistorySnapshots(historyDir, {
    referenceDate: snapshotDate,
  });

  return {
    ...snapshot,
    retentionDays: JOB_HISTORY_RETENTION_DAYS,
    prunedDates,
  };
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
      listedJobIds: crawlResult.listedJobIds || [],
    });

    const metadata = updateCrawlingMetadata({
      dataDir,
      crawlResult,
      upsertResult,
    });
    const history = appendDailyHistorySnapshot({
      dataDir,
      crawlFinishedAt: crawlResult.finishedAt,
      publicJobs: upsertResult.publicJobs,
      metadata,
    });

    dataLoader?.refresh?.();

    return {
      ok: true,
      crawlResult,
      upsertResult,
      metadata,
      history,
    };
  } catch (error) {
    logger.error('[daily-crawl] failed:', error.message);
    const metadata = updateCrawlingMetadata({
      dataDir,
      error,
      crawlResult: {
        finishedAt: new Date().toISOString(),
        filters: getCatalogFilters(),
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
