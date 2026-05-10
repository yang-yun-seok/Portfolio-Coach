import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { DataLoader } from './lib/data-loader.js';
import { createAnalysisRouter } from './server/routes/analysis-routes.js';
import { createDataRouter } from './server/routes/data-routes.js';
import { createCrawlRouter } from './server/routes/crawl-routes.js';
import { createAnalysisService } from './server/services/analysis-service.js';
import { createCrawlService } from './server/services/crawl-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── DataLoader 초기화 ──────────────────────────────────────────────────────
const dataDir = join(__dirname, 'data');
const dataLoader = new DataLoader(dataDir);

// ── 설정 로더 ──────────────────────────────────────────────────────────────
const IS_DEV = process.env.NODE_ENV !== 'production';

function loadJsonFile(filePath) {
  const fullPath = join(__dirname, filePath);
  if (!existsSync(fullPath)) {
    console.warn(`[Config] 파일 없음: ${filePath}`);
    return null;
  }
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

function loadTextFile(filePath) {
  const fullPath = join(__dirname, filePath);
  if (!existsSync(fullPath)) {
    console.warn(`[Config] 파일 없음: ${filePath}`);
    return '';
  }
  return readFileSync(fullPath, 'utf-8').trim();
}

// ── 프롬프트/설정 캐시 ─────────────────────────────────────────────────────
let _cache = { prompts: null, serverConfig: null, modelsConfig: null };

function loadPrompts() {
  if (!IS_DEV && _cache.prompts) return _cache.prompts;
  const prompts = {
    systemPrompt: loadTextFile('prompts/system-prompt.md'),
    jsonSchemaPrompt: loadTextFile('prompts/analysis-schema.md'),
    geminiResponseSchema: loadJsonFile('prompts/analysis-schema.json'),
    interviewBasic: loadJsonFile('prompts/interview-basic.json'),
    userPromptTemplate: loadTextFile('prompts/user-prompt-template.md'),
  };
  _cache.prompts = prompts;
  if (IS_DEV) console.log('[Config] 프롬프트 파일 (재)로드 완료');
  return prompts;
}

// ── 직군별 추가 평가 지시문 ────────────────────────────────────────────────
function loadServerConfig() {
  if (!IS_DEV && _cache.serverConfig) return _cache.serverConfig;
  const config = loadJsonFile('config/server.json') || {
    port: 3002, bodyLimit: '100mb', cors: true,
    generation: { temperature: 0.7, maxTokens: 8192, responseMimeType: 'application/json' },
    retry: { maxRetries: 3, delays: [1000, 2000, 4000] },
  };
  _cache.serverConfig = config;
  return config;
}

function loadModelsConfig() {
  if (!IS_DEV && _cache.modelsConfig) return _cache.modelsConfig;
  const config = loadJsonFile('config/models.json');
  _cache.modelsConfig = config;
  return config;
}

// ── 모델 유틸리티 ──────────────────────────────────────────────────────────
function getProviderConfig(providerId) {
  const config = loadModelsConfig();
  return config?.providers?.[providerId] || null;
}

function getDefaultModel(providerId) {
  const provider = getProviderConfig(providerId);
  if (!provider) return null;
  return provider.models.find((m) => m.default) || provider.models[0];
}

function findModel(providerId, modelId) {
  const provider = getProviderConfig(providerId);
  if (!provider) return null;
  return provider.models.find((m) => m.id === modelId) || getDefaultModel(providerId);
}

// ── Express 앱 초기화 ──────────────────────────────────────────────────────
const serverConfig = loadServerConfig();
const app = express();
app.use(cors());
app.use(express.json({ limit: serverConfig.bodyLimit }));

const crawlService = createCrawlService({ dataDir, dataLoader });
const analysisService = createAnalysisService({
  loadPrompts,
  loadServerConfig,
  getProviderConfig,
  findModel,
  fetchWithRetry,
  fetchImpl: fetch,
});
app.use(createAnalysisRouter({ analysisService }));
app.use(createDataRouter({ dataLoader, crawlService }));
app.use(createCrawlRouter({ crawlService }));

// ── 유틸: fetch with retry ────────────────────────────────────────────────
async function fetchWithRetry(url, options) {
  const { maxRetries, delays } = loadServerConfig().retry;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (!response.ok) {
        const errMsg = data.error?.message || data.message || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }
      return data;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
}

// ── API: 모델 목록 ────────────────────────────────────────────────────────
app.get('/api/models', (req, res) => {
  const config = loadModelsConfig();
  if (!config) return res.status(500).json({ error: '모델 설정을 로드할 수 없습니다.' });

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
  res.json(result);
});

// ── API: 프롬프트 조회 (프론트엔드 디버깅/관리용) ──────────────────────────
app.get('/api/prompts/interview-basic', (req, res) => {
  const prompts = loadPrompts();
  res.json(prompts.interviewBasic || []);
});

// ── API: API 키 검증 ──────────────────────────────────────────────────────
app.post('/api/validate-key', async (req, res) => {
  const { provider, apiKey, modelId } = req.body;
  if (!provider || (provider !== 'gemini' && !apiKey)) {
    return res.json({ valid: false, error: '제공자와 API 키를 모두 입력해주세요.' });
  }

  const providerConfig = getProviderConfig(provider);
  if (!providerConfig || !providerConfig.enabled) {
    return res.json({ valid: false, error: `${provider}는 현재 지원하지 않는 제공자입니다.` });
  }

  try {
    if (provider === 'gemini') {
      // 키 유효성 검증은 항상 안정 모델(2.5-flash)로 수행.
      // 선택 모델 ID가 존재하지 않아도 키 자체가 유효하면 true를 반환.
      const validationModelId = 'gemini-2.5-flash';
      const url = `${providerConfig.apiBase}/${validationModelId}:generateContent?key=${apiKey}`;
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] }),
      });
      if (r.ok) return res.json({ valid: true });
      // 401/403 → 키 무효, 그 외(404 등) → 키는 유효하나 다른 문제
      const status = r.status;
      if (status === 401 || status === 403) {
        return res.json({ valid: false, error: 'API 키가 유효하지 않습니다.' });
      }
      const errBody = await r.json().catch(() => ({}));
      return res.json({ valid: false, error: errBody?.error?.message || `오류 코드: ${status}` });
    }

    if (provider === 'claude') {
      const model = findModel('claude', modelId);
      const r = await fetch(`${providerConfig.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': providerConfig.apiVersion,
        },
        body: JSON.stringify({
          model: model.id,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      return res.json({ valid: r.ok });
    }

    if (provider === 'openai') {
      const model = findModel('openai', modelId);
      const r = await fetch(`${providerConfig.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.id,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });
      return res.json({ valid: r.ok });
    }

    res.json({ valid: false, error: '알 수 없는 제공자입니다.' });
  } catch (err) {
    res.json({ valid: false, error: err.message });
  }
});

// ── API: AI 분석 ──────────────────────────────────────────────────────────
const distDir = join(__dirname, 'dist');
const distIndexFile = join(distDir, 'index.html');

if (existsSync(distIndexFile)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(distIndexFile);
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      ok: true,
      service: 'portfolio-coach-api',
      message: 'Frontend is deployed separately. Use the GitHub Pages URL for the web app.',
    });
  });
}

// ── 서버 시작 ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || serverConfig.port;

// 초기 로드 검증
const modelsConfig = loadModelsConfig();
const enabledProviders = modelsConfig
  ? Object.entries(modelsConfig.providers)
      .filter(([, p]) => p.enabled)
      .map(([id, p]) => `${p.label}(${p.models.map((m) => m.id).join(', ')})`)
  : ['설정 로드 실패'];

loadPrompts(); // 초기 프롬프트 로드 검증

// 데이터 로더 초기 검증
const dataStatus = dataLoader.getStatus();

app.listen(PORT, () => {
  console.log(`\n🎮 Game Career Assistant Backend`);
  console.log(`   Backend : http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:5173  (개발 시)`);
  console.log(`   Mode    : ${IS_DEV ? '개발 (프롬프트 핫 리로드 활성)' : '프로덕션 (캐시)'}`);
  console.log(`   활성 모델: ${enabledProviders.join(', ')}`);
  console.log(`   데이터   : 기업 ${dataStatus.companiesCount}개, 공고 ${dataStatus.jobsCount}개 (${dataStatus.dataSource})\n`);
});
