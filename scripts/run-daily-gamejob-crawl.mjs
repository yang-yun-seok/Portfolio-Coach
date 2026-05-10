import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DataLoader } from '../lib/data-loader.js';
import { generateStaticApi } from './generate-static-api.js';
import { runDailyGameJobCrawling } from '../server/services/gamejob-daily-crawling.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const dataDir = join(ROOT, 'data');

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

  console.log(`[daily-crawl] success: public jobs ${result.metadata.referenceJobCount}, new jobs ${result.metadata.newJobsCount}`);
}

main().catch((error) => {
  console.error('[daily-crawl] fatal error:', error.message);
  process.exit(1);
});
