const SUCCESS_STATUSES = new Set(['success', 'partial-success']);
const IGNORED_STATUSES = new Set(['', 'idle', 'unknown', 'skipped']);

function toTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function buildCrawlHealth(metadata = {}, historyEntries = [], sampleSize = 14) {
  const history = Array.isArray(historyEntries) ? historyEntries : [];
  const attempts = history
    .filter((entry) => entry?.generatedAt || !IGNORED_STATUSES.has(String(entry?.lastCrawlStatus || '')))
    .sort((left, right) => toTime(right.generatedAt || right.date) - toTime(left.generatedAt || left.date))
    .slice(0, sampleSize);
  const normalAttempts = attempts.filter((entry) => (
    SUCCESS_STATUSES.has(String(entry.lastCrawlStatus || ''))
    && Number(entry.referenceJobCount) > 0
  ));
  const latestNormal = normalAttempts[0] || null;
  const currentCount = Number(metadata.referenceJobCount) || 0;
  const currentStatus = String(metadata.lastCrawlStatus || 'unknown');

  return {
    attemptedCount: attempts.length,
    normalCount: normalAttempts.length,
    successRate: attempts.length ? Math.round((normalAttempts.length / attempts.length) * 100) : null,
    currentStatus,
    currentCount,
    currentHealthy: SUCCESS_STATUSES.has(currentStatus) && currentCount > 0,
    lastNormalJobCount: Number(latestNormal?.referenceJobCount) || currentCount,
    lastNormalAt: latestNormal?.generatedAt || metadata.lastSuccessfulCrawlAt || '',
  };
}
