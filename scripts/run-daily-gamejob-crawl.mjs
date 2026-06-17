import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DataLoader } from '../lib/data-loader.js';
import { generateStaticApi } from './generate-static-api.js';
import { runDailyGameJobCrawling } from '../server/services/gamejob-daily-crawling.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const dataDir = join(ROOT, 'data');

function toCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}

function buildSummaryLines(metadata = {}) {
  return [
    `[daily-crawl] success: public jobs ${toCount(metadata.referenceJobCount)}, new jobs ${toCount(metadata.newJobsCount)}`,
    `previous jobs: ${toCount(metadata.previousReferenceJobCount)}`,
    `current jobs: ${toCount(metadata.referenceJobCount)}`,
    `new jobs: ${toCount(metadata.newJobsCount)}`,
    `reactivated jobs: ${toCount(metadata.reactivatedJobsCount)}`,
    `deleted jobs: ${toCount(metadata.deletedJobsCount)}`,
    `listed jobs: ${toCount(metadata.listedJobsCount)}`,
    `crawled jobs: ${toCount(metadata.crawledJobsCount)}`,
    `fetched jobs: ${toCount(metadata.fetchedJobsCount)}`,
    `reused jobs: ${toCount(metadata.reusedJobsCount)}`,
    `crawl errors: ${toCount(metadata.errorCount)}`,
  ];
}

async function main() {
  const dataLoader = new DataLoader(dataDir);
  const result = await runDailyGameJobCrawling({
    dataDir,
    dataLoader,
    logger: console,
  });

  generateStaticApi();

  if (!result.ok) {
    console.error('[daily-crawl] completed with failure metadata update.');
    process.exitCode = 1;
    return;
  }

  console.log(buildSummaryLines(result.metadata).join('\n'));
}

main().catch((error) => {
  console.error('[daily-crawl] fatal error:', error.message);
  process.exit(1);
});
