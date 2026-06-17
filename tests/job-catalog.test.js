import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  listJobHistoryFileNames,
  loadJobMetadata,
  loadJobRecords,
  pruneJobHistorySnapshots,
  writeJobRecord,
} from '../lib/job-catalog.js';
import {
  assertManagedCrawlHasResults,
  updateCrawlingMetadata,
  upsertJobPostings,
} from '../server/services/gamejob-daily-crawling.js';

function createManagedJob(id, overrides = {}) {
  const normalizedId = String(id).replace(/^crawled-/, '');
  return {
    id: `crawled-${normalizedId}`,
    title: `Job ${normalizedId}`,
    company: 'Test Studio',
    role: '게임기획',
    experience: '신입',
    reqExp: 0,
    reqSkills: [],
    source: 'GameJob',
    catalogManaged: true,
    status: 'active',
    isActive: true,
    updatedAt: '2026-05-10',
    firstSeenAt: '2026-05-10T00:00:00.000Z',
    lastSeenAt: '2026-05-10T00:00:00.000Z',
    lastCrawledAt: '2026-05-10T00:00:00.000Z',
    ...overrides,
  };
}

function createResolvedJob(id, overrides = {}) {
  return createManagedJob(id, {
    catalogManaged: false,
    status: 'resolved',
    ...overrides,
  });
}

test('pruneJobHistorySnapshots keeps only the most recent 365 days', () => {
  const root = mkdtempSync(join(tmpdir(), 'job-history-'));
  const historyDir = join(root, 'history');
  mkdirSync(historyDir, { recursive: true });

  ['2025-05-09', '2025-05-12', '2026-05-10', '2026-05-11'].forEach((date) => {
    writeFileSync(join(historyDir, `${date}.json`), JSON.stringify({ date }), 'utf-8');
  });

  const removedDates = pruneJobHistorySnapshots(historyDir, {
    referenceDate: '2026-05-11',
    retentionDays: 365,
  });

  assert.deepEqual(removedDates, ['2025-05-09']);
  assert.deepEqual(listJobHistoryFileNames(historyDir), [
    '2026-05-11.json',
    '2026-05-10.json',
    '2025-05-12.json',
  ]);
});

test('upsertJobPostings deletes managed jobs that disappeared from the latest listing', () => {
  const root = mkdtempSync(join(tmpdir(), 'job-sync-'));
  const jobsDir = join(root, 'jobs');
  mkdirSync(jobsDir, { recursive: true });

  writeJobRecord(jobsDir, createManagedJob('1'));
  writeJobRecord(jobsDir, createManagedJob('2'));
  writeJobRecord(jobsDir, createResolvedJob('999'));

  const result = upsertJobPostings({
    dataDir: root,
    crawledJobs: [
      createManagedJob('1', { title: 'Job 1 Updated', updatedAt: '2026-05-12' }),
      createManagedJob('3', { title: 'Job 3 New', updatedAt: '2026-05-12' }),
    ],
    listedJobIds: ['crawled-1', 'crawled-3'],
    crawlFinishedAt: '2026-05-12T00:00:00.000Z',
  });

  const jobs = loadJobRecords(jobsDir);
  const ids = jobs.map((job) => job.id).sort();

  assert.deepEqual(ids, ['crawled-1', 'crawled-3', 'crawled-999']);
  assert.equal(existsSync(join(jobsDir, 'job-2.json')), false);
  assert.equal(result.newJobsCount, 1);
  assert.equal(result.deletedJobsCount, 1);
  assert.equal(result.previousReferenceJobCount, 2);
  assert.equal(result.listedJobsCount, 2);
  assert.equal(result.crawledJobsCount, 2);
  assert.equal(result.referenceJobCount, 2);
});

test('upsertJobPostings keeps existing managed jobs when the listing still contains them', () => {
  const root = mkdtempSync(join(tmpdir(), 'job-sync-'));
  const jobsDir = join(root, 'jobs');
  mkdirSync(jobsDir, { recursive: true });

  writeJobRecord(jobsDir, createManagedJob('1'));
  writeJobRecord(jobsDir, createManagedJob('2', { title: 'Job 2 Previous' }));

  const result = upsertJobPostings({
    dataDir: root,
    crawledJobs: [
      createManagedJob('1', { title: 'Job 1 Updated', updatedAt: '2026-05-12' }),
    ],
    listedJobIds: ['crawled-1', 'crawled-2'],
    crawlFinishedAt: '2026-05-12T00:00:00.000Z',
  });

  const jobs = loadJobRecords(jobsDir);
  const job2 = jobs.find((job) => job.id === 'crawled-2');

  assert.equal(result.deletedJobsCount, 0);
  assert.equal(result.referenceJobCount, 2);
  assert.ok(job2);
  assert.equal(job2.title, 'Job 2 Previous');
  assert.equal(job2.isActive, true);
});

test('upsertJobPostings does not delete untouched managed jobs during a partial crawl', () => {
  const root = mkdtempSync(join(tmpdir(), 'job-sync-'));
  const jobsDir = join(root, 'jobs');
  mkdirSync(jobsDir, { recursive: true });

  writeJobRecord(jobsDir, createManagedJob('1'));
  writeJobRecord(jobsDir, createManagedJob('2'));

  const result = upsertJobPostings({
    dataDir: root,
    crawledJobs: [
      createManagedJob('1', { title: 'Job 1 Updated', updatedAt: '2026-05-12' }),
    ],
    listedJobIds: ['crawled-1'],
    crawlFinishedAt: '2026-05-12T00:00:00.000Z',
    removeMissingManagedJobs: false,
  });

  const jobs = loadJobRecords(jobsDir);

  assert.equal(result.deletedJobsCount, 0);
  assert.equal(jobs.length, 2);
  assert.equal(existsSync(join(jobsDir, 'job-2.json')), true);
});

test('managed catalog sync rejects an empty crawl before deleting existing jobs', () => {
  const root = mkdtempSync(join(tmpdir(), 'job-sync-'));
  const jobsDir = join(root, 'jobs');
  mkdirSync(jobsDir, { recursive: true });

  writeJobRecord(jobsDir, createManagedJob('1'));

  assert.throws(
    () => upsertJobPostings({
      dataDir: root,
      crawledJobs: [],
      listedJobIds: [],
      crawlFinishedAt: '2026-05-12T00:00:00.000Z',
    }),
    (error) => error.code === 'EMPTY_GAMEJOB_CRAWL' && /기존 공고 데이터는 보존/.test(error.message),
  );

  const jobs = loadJobRecords(jobsDir);
  assert.equal(jobs.length, 1);
  assert.equal(existsSync(join(jobsDir, 'job-1.json')), true);
});

test('managed catalog sync rejects suspiciously small full listings before deleting existing jobs', () => {
  const root = mkdtempSync(join(tmpdir(), 'job-sync-'));
  const jobsDir = join(root, 'jobs');
  mkdirSync(jobsDir, { recursive: true });

  for (let index = 1; index <= 60; index += 1) {
    writeJobRecord(jobsDir, createManagedJob(String(index)));
  }

  assert.throws(
    () => upsertJobPostings({
      dataDir: root,
      crawledJobs: [createManagedJob('1', { title: 'Job 1 Updated' })],
      listedJobIds: ['crawled-1'],
      crawlFinishedAt: '2026-05-12T00:00:00.000Z',
    }),
    (error) => error.code === 'SUSPICIOUS_GAMEJOB_CRAWL' && /급감/.test(error.message),
  );

  const jobs = loadJobRecords(jobsDir);
  assert.equal(jobs.length, 60);
  assert.equal(existsSync(join(jobsDir, 'job-60.json')), true);
});

test('assertManagedCrawlHasResults allows listed-only crawls and rejects fully empty crawls', () => {
  assert.doesNotThrow(() => assertManagedCrawlHasResults({
    jobs: [],
    listedJobIds: ['crawled-1'],
  }));

  assert.throws(
    () => assertManagedCrawlHasResults({ jobs: [], listedJobIds: [] }),
    (error) => error.code === 'EMPTY_GAMEJOB_CRAWL',
  );
});

test('updateCrawlingMetadata persists crawl summary counts', () => {
  const root = mkdtempSync(join(tmpdir(), 'job-meta-'));

  updateCrawlingMetadata({
    dataDir: root,
    crawlResult: {
      finishedAt: '2026-05-12T00:00:00.000Z',
      filters: { jobTags: ['게임기획'], careerTags: ['신입'] },
      listedJobIds: ['crawled-1', 'crawled-2'],
      jobs: [createManagedJob('1')],
      fetchedCount: 1,
      reusedCount: 1,
      pendingJobCount: 1,
      errors: ['detail failed'],
    },
    upsertResult: {
      latestAppliedDate: '2026-05-12',
      referenceJobCount: 2,
      previousReferenceJobCount: 1,
      newJobsCount: 1,
      reactivatedJobsCount: 0,
      deletedJobsCount: 0,
      keptJobsCount: 1,
      activeJobsCount: 2,
      inactiveJobsCount: 0,
      totalManagedJobsCount: 2,
    },
  });

  const metadata = loadJobMetadata(join(root, 'jobs'));
  assert.equal(metadata.lastCrawlStatus, 'partial-success');
  assert.equal(metadata.previousReferenceJobCount, 1);
  assert.equal(metadata.referenceJobCount, 2);
  assert.equal(metadata.listedJobsCount, 2);
  assert.equal(metadata.crawledJobsCount, 1);
  assert.equal(metadata.fetchedJobsCount, 1);
  assert.equal(metadata.reusedJobsCount, 1);
  assert.equal(metadata.pendingJobCount, 1);
  assert.equal(metadata.errorCount, 1);
});
