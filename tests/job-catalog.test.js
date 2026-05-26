import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  listJobHistoryFileNames,
  loadJobRecords,
  pruneJobHistorySnapshots,
  writeJobRecord,
} from '../lib/job-catalog.js';
import { upsertJobPostings } from '../server/services/gamejob-daily-crawling.js';

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
