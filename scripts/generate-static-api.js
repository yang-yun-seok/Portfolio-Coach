/**
 * GitHub Pages용 정적 API JSON 생성 스크립트
 * 빌드 전에 실행하여 /api/* 엔드포인트를 정적 JSON 파일로 대체한다.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC_API = join(ROOT, 'public', 'api');
const PUBLIC_PROMPTS = join(PUBLIC_API, 'prompts');

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function loadJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// ── 1. /api/models ──
function generateModels() {
  const config = loadJson(join(ROOT, 'config', 'models.json'));
  if (!config) { console.warn('[SKIP] config/models.json not found'); return; }

  const result = {};
  for (const [id, provider] of Object.entries(config.providers)) {
    result[id] = {
      label: provider.label,
      enabled: provider.enabled,
      color: provider.color,
      supportsFiles: provider.supportsFiles,
      models: provider.models.map((m) => ({
        id: m.id,
        label: m.label,
        description: m.description,
        default: m.default || false,
      })),
    };
  }
  writeFileSync(join(PUBLIC_API, 'models.json'), JSON.stringify(result, null, 2));
  console.log('[OK] public/api/models.json');
}

// ── 2. /api/companies ──
function generateCompanies() {
  const dataDir = join(ROOT, 'data', 'companies');
  if (!existsSync(dataDir)) { console.warn('[SKIP] data/companies not found'); return; }

  // 항상 개별 파일을 읽어 상세 데이터 포함 (_index.json은 요약만 있음)
  const companies = readdirSync(dataDir)
    .filter(f => f.endsWith('.json') && f !== '_index.json')
    .map(f => loadJson(join(dataDir, f)))
    .filter(Boolean);
  writeFileSync(join(PUBLIC_API, 'companies.json'), JSON.stringify(companies, null, 2));
  console.log(`[OK] public/api/companies.json (${Array.isArray(companies) ? companies.length : 'index'} entries)`);
}

// ── 3. /api/jobs ──
function generateJobs() {
  const dataDir = join(ROOT, 'data', 'jobs');
  if (!existsSync(dataDir)) { console.warn('[SKIP] data/jobs not found'); return; }

  // _index.json은 메타데이터이므로, 항상 개별 job-*.json 파일을 읽음
  const jobs = readdirSync(dataDir)
    .filter(f => f.endsWith('.json') && f !== '_index.json')
    .map(f => loadJson(join(dataDir, f)))
    .filter(Boolean);
  writeFileSync(join(PUBLIC_API, 'jobs.json'), JSON.stringify(jobs, null, 2));
  console.log(`[OK] public/api/jobs.json (${Array.isArray(jobs) ? jobs.length : 'index'} entries)`);
}

// ── 4. /api/prompts/interview-basic ──
function generateInterviewBasic() {
  const data = loadJson(join(ROOT, 'prompts', 'interview-basic.json'));
  if (!data) { console.warn('[SKIP] prompts/interview-basic.json not found'); return; }

  ensureDir(PUBLIC_PROMPTS);
  writeFileSync(join(PUBLIC_PROMPTS, 'interview-basic.json'), JSON.stringify(data, null, 2));
  console.log('[OK] public/api/prompts/interview-basic.json');
}

// ── 실행 ──
console.log('=== Generating static API files for GitHub Pages ===');
ensureDir(PUBLIC_API);
generateModels();
generateCompanies();
generateJobs();
generateInterviewBasic();
console.log('=== Done ===');
