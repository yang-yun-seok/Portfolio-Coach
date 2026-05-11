import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  listJobHistoryFileNames,
  pruneJobHistorySnapshots,
} from '../lib/job-catalog.js';

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
