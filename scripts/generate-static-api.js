import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  JOB_HISTORY_DIR,
  buildPublicJobs,
  loadJobMetadata,
  loadJobRecords,
} from '../lib/job-catalog.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC_API = join(ROOT, 'public', 'api');
const PUBLIC_HISTORY = join(PUBLIC_API, 'history');
const PUBLIC_PROMPTS = join(PUBLIC_API, 'prompts');

function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function writeJson(path, payload) {
  writeFileSync(path, JSON.stringify(payload, null, 2), 'utf-8');
}

function clearJsonFiles(dir) {
  if (!existsSync(dir)) return;
  readdirSync(dir)
    .filter((fileName) => fileName.endsWith('.json'))
    .forEach((fileName) => unlinkSync(join(dir, fileName)));
}

function generateModels() {
  const config = loadJson(join(ROOT, 'config', 'models.json'));
  if (!config) return;

  const payload = {};
  for (const [providerId, provider] of Object.entries(config.providers || {})) {
    payload[providerId] = {
      label: provider.label,
      enabled: provider.enabled,
      color: provider.color,
      supportsFiles: provider.supportsFiles,
      models: (provider.models || []).map((model) => ({
        id: model.id,
        label: model.label,
        description: model.description,
        default: Boolean(model.default),
      })),
    };
  }

  writeJson(join(PUBLIC_API, 'models.json'), payload);
}

function generateCompanies() {
  const companiesDir = join(ROOT, 'data', 'companies');
  if (!existsSync(companiesDir)) return;

  const companies = readdirSync(companiesDir)
    .filter((fileName) => fileName.endsWith('.json') && fileName !== '_index.json')
    .map((fileName) => loadJson(join(companiesDir, fileName)))
    .filter(Boolean);

  writeJson(join(PUBLIC_API, 'companies.json'), companies);
}

function generateJobs() {
  const jobsDir = join(ROOT, 'data', 'jobs');
  if (!existsSync(jobsDir)) return;

  const allJobs = loadJobRecords(jobsDir);
  const publicJobs = buildPublicJobs(allJobs);
  const fallbackLatestDate = publicJobs
    .map((job) => job.updatedAt)
    .filter(Boolean)
    .sort()
    .reverse()[0] || null;
  const loadedMetadata = loadJobMetadata(jobsDir);
  const metadata = {
    ...loadedMetadata,
    latestAppliedDate: loadedMetadata.latestAppliedDate || fallbackLatestDate,
    referenceJobCount: publicJobs.length,
    activeJobsCount: loadedMetadata.activeJobsCount || publicJobs.length,
    lastCrawlStatus: loadedMetadata.lastCrawlStatus === 'idle' && publicJobs.length > 0 ? 'success' : loadedMetadata.lastCrawlStatus,
  };

  writeJson(join(PUBLIC_API, 'jobs.json'), publicJobs);
  writeJson(join(PUBLIC_API, 'jobs-metadata.json'), metadata);
}

function generateJobHistory() {
  const historyDir = join(ROOT, 'data', JOB_HISTORY_DIR);
  ensureDir(PUBLIC_HISTORY);
  clearJsonFiles(PUBLIC_HISTORY);

  if (!existsSync(historyDir)) {
    writeJson(join(PUBLIC_API, 'jobs-history-index.json'), []);
    return;
  }

  const historyIndex = readdirSync(historyDir)
    .filter((fileName) => /^\d{4}-\d{2}-\d{2}\.json$/.test(fileName))
    .sort()
    .reverse()
    .map((fileName) => {
    const date = fileName.replace(/\.json$/, '');
    const snapshot = loadJson(join(historyDir, fileName));
    if (!snapshot) return null;

    writeJson(join(PUBLIC_HISTORY, fileName), snapshot);

    return {
      date,
      generatedAt: snapshot.generatedAt || null,
      referenceJobCount: snapshot.referenceJobCount || 0,
      newJobsCount: snapshot.newJobsCount || 0,
      activeJobsCount: snapshot.activeJobsCount || 0,
      lastCrawlStatus: snapshot.lastCrawlStatus || 'unknown',
      path: `./history/${fileName}`,
    };
  })
    .filter(Boolean);

  writeJson(join(PUBLIC_API, 'jobs-history-index.json'), historyIndex);
}

function generateInterviewBasic() {
  const data = loadJson(join(ROOT, 'prompts', 'interview-basic.json'));
  if (!data) return;

  ensureDir(PUBLIC_PROMPTS);
  writeJson(join(PUBLIC_PROMPTS, 'interview-basic.json'), data);
}

export function generateStaticApi() {
  ensureDir(PUBLIC_API);
  generateModels();
  generateCompanies();
  generateJobs();
  generateJobHistory();
  generateInterviewBasic();
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  console.log('=== Generating static API files for GitHub Pages ===');
  generateStaticApi();
  console.log('=== Done ===');
}
