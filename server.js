import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { DataLoader } from './lib/data-loader.js';
import { normalizeAll } from './lib/job-normalizer.js';
import { getProfileDisplayRole, normalizeUserProfile } from './src/data/skills.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── DataLoader 초기화 ──────────────────────────────────────────────────────
const dataLoader = new DataLoader(join(__dirname, 'data'));

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
const ROLE_FOCUS_MAP = {
  '프로그래밍': `
### 직군 특화 평가 지시 (프로그래밍 직군)
- 코드 기여도, 구조 설계, 성능/메모리/네트워크 최적화 경험을 구체적으로 평가하세요.
- 사용 엔진·언어·프레임워크를 나열하는 데서 끝내지 말고, 본인이 직접 해결한 병목과 의사결정을 확인하세요.
- GitHub, 코드 샘플, 트러블슈팅 문서, 테스트/빌드 자동화 경험이 있으면 포트폴리오 핵심 근거로 보강하세요.`,
  '기획': `
### 직군 특화 평가 지시 (게임 기획자)
- 시스템/컨텐츠/밸런스/QA/개발PM/사업PM 등 세부 직무에 맞는 산출물과 사고 과정을 평가하세요.
- 지표 기반 의사결정 경험(DAU, 잔존율, ARPU 등)을 가능한 수치로 표현하도록 안내하세요.
- QA라면 테스트 케이스·결함 재현·리스크 관리, PM이라면 일정·이슈·이해관계자 조율 경험을 확인하세요.`,
  '아트': `
### 직군 특화 평가 지시 (아트 / TA)
- 포트폴리오 퀄리티와 스타일 다양성을 최우선으로 평가하세요.
- 도트아티스트와 2D 그래픽 디자이너는 실루엣, 팔레트, 리소스 활용성, 게임 톤앤매너 적합성을 함께 평가하세요.
- 결과 이미지만 보지 말고 제작 의도, 레퍼런스, 러프→완성 과정, 엔진 적용, 최적화 기준을 확인하세요.
- TA라면 셰이더/툴 개발 경험, 아티스트-프로그래머 간 브리지 역할 경험을 강조하세요.`,
};

const DEFAULT_ROLE_FOCUS = `
### 직군 특화 평가 지시 (공통)
- 지원 직군에서 요구하는 핵심 기술 스택과 보유 스킬의 매칭도를 중점 평가하세요.
- 실제 프로젝트에서의 기여도와 성과를 수치·사례 중심으로 표현하도록 안내하세요.`;

// ── userPrompt 빌더 ───────────────────────────────────────────────────────
function buildUserPrompt({ top3, profile, hasFiles, hasPortfolioFile }) {
  const normalizedProfile = normalizeUserProfile(profile);
  const prompts = loadPrompts();
  let template = prompts.userPromptTemplate;

  // {{TOP3_JD}} 치환
  const top3JD = top3.map((job, idx) => `
[${idx + 1}순위 추천 공고]
- 회사명: ${job.companyInfo?.name || job.company}
- 모집 직무: ${job.title} (${job.role})
- 인재상: ${job.companyInfo?.idealCandidate || '정보 없음'}
- 기업 최신 이슈: ${job.companyInfo?.news?.join(' / ') || '정보 없음'}
- 과제 유무: ${job.hasAssignment ? job.assignmentType : '없음'}`).join('\n---');

  // {{PROFILE}} 치환
  const profileText = `
- 지원자 이름: ${normalizedProfile.name}
- 직무 대분류: ${normalizedProfile.roleGroup}
- 세부 직무: ${normalizedProfile.subRole}
- 매칭 기준 직군: ${normalizedProfile.role}
- 세부 평가 초점: ${normalizedProfile.roleFocus}
- 총 경력: ${normalizedProfile.experience}년 ${Number(normalizedProfile.experience) === 0 ? '(신입)' : '(경력)'}
- 보유 역량 및 숙련도: ${(normalizedProfile.skills || []).map((s) => `${s.name}(${s.level})`).join(', ')}`;

  // {{FILE_CONTEXT}} 치환
  const fileContext = hasFiles
    ? '### 첨부 파일\n첨부된 파일(이력서·자기소개서·포트폴리오)을 직접 분석하여 피드백에 반영하세요.'
    : '### 첨부 파일\n첨부 파일이 없습니다. 프로필 정보만으로 피드백을 제공하세요.';

  // {{PORTFOLIO_INSTRUCTION}} 치환
  const portfolioInstruction = hasPortfolioFile
    ? '첨부된 포트폴리오 파일을 직접 분석하여 구체적인 개선점을 제시하세요.'
    : '포트폴리오 파일이 없으므로 프로필과 직군 기준으로 포트폴리오 구성 방향을 제안하세요.';

  // {{ROLE_FOCUS}} 치환
  const roleFocus = `${ROLE_FOCUS_MAP[normalizedProfile.roleGroup] || DEFAULT_ROLE_FOCUS}

### 세부 직무 맞춤 지시 (${getProfileDisplayRole(normalizedProfile)})
- 모든 피드백은 "${normalizedProfile.subRole}" 지원자 관점에서 작성하세요.
- 이력서, 자기소개서, 포트폴리오 피드백은 해당 세부 직무에서 실제로 검증하는 산출물과 역량 기준을 반영하세요.`;

  // 템플릿 내 주석 블록(<!-- ... -->) 제거 후 치환
  template = template.replace(/<!--[\s\S]*?-->/g, '');
  template = template.replace('{{TOP3_JD}}', top3JD);
  template = template.replace('{{PROFILE}}', profileText);
  template = template.replace('{{FILE_CONTEXT}}', fileContext);
  template = template.replace('{{PORTFOLIO_INSTRUCTION}}', portfolioInstruction);
  template = template.replace('{{ROLE_FOCUS}}', roleFocus);

  return template.trim();
}

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
app.post('/api/analyze', async (req, res) => {
  // top3, profile 구조화 데이터 우선 사용, 없으면 레거시 userPrompt fallback
  const { provider, apiKey, modelId, top3, profile, hasFiles, hasPortfolioFile, fileParts, userPrompt: legacyPrompt } = req.body;

  if (!provider || (provider !== 'gemini' && !apiKey)) {
    return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
  }
  if (!top3 && !legacyPrompt) {
    return res.status(400).json({ error: '분석 데이터(top3/profile) 또는 userPrompt가 필요합니다.' });
  }

  // 구조화 데이터가 있으면 템플릿 빌더 사용, 없으면 레거시 문자열 사용
  const userPrompt = top3 && profile
    ? buildUserPrompt({ top3, profile, hasFiles: !!hasFiles, hasPortfolioFile: !!hasPortfolioFile })
    : legacyPrompt;

  const providerConfig = getProviderConfig(provider);
  if (!providerConfig || !providerConfig.enabled) {
    return res.status(400).json({ error: `${provider}는 현재 지원하지 않는 제공자입니다.` });
  }

  const prompts = loadPrompts();
  const genConfig = loadServerConfig().generation;

  try {
    let result;

    // ── Gemini ─────────────────────────────────────────────────────────
    if (provider === 'gemini') {
      const model = findModel('gemini', modelId);
      const parts = [{ text: userPrompt }];
      if (fileParts && fileParts.length > 0) {
        parts.push(...fileParts);
      }

      const payload = {
        contents: [{ parts }],
        systemInstruction: { parts: [{ text: prompts.systemPrompt }] },
        generationConfig: {
          responseMimeType: genConfig.responseMimeType,
          responseSchema: prompts.geminiResponseSchema,
          temperature: genConfig.temperature,
        },
      };

      let data;
      if (apiKey) {
        const url = `${providerConfig.apiBase}/${model.id}:generateContent?key=${apiKey}`;
        data = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const supabaseUrl = (process.env.SUPABASE_URL || 'https://pkwbqbxuujpcvndpacsc.supabase.co').replace(/\/$/, '');
        const proxyRes = await fetch(`${supabaseUrl}/functions/v1/gemini-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model.id,
            contents: payload.contents,
            systemInstruction: payload.systemInstruction,
            generationConfig: payload.generationConfig,
          }),
        });
        if (!proxyRes.ok) {
          const proxyText = await proxyRes.text().catch(() => '');
          throw new Error(proxyText || `gemini-proxy request failed (${proxyRes.status})`);
        }
        data = await proxyRes.json();
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini 응답을 파싱할 수 없습니다.');
      result = JSON.parse(text);
    }

    // ── Claude (비활성 — 향후 확장) ────────────────────────────────────
    else if (provider === 'claude') {
      const model = findModel('claude', modelId);
      const fullPrompt = `${userPrompt}\n\n${prompts.jsonSchemaPrompt}`;

      const data = await fetchWithRetry(`${providerConfig.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': providerConfig.apiVersion,
        },
        body: JSON.stringify({
          model: model.id,
          max_tokens: genConfig.maxTokens,
          system: prompts.systemPrompt,
          messages: [{ role: 'user', content: fullPrompt }],
        }),
      });

      const text = data.content?.[0]?.text;
      if (!text) throw new Error('Claude 응답을 파싱할 수 없습니다.');
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    }

    // ── OpenAI (비활성 — 향후 확장) ────────────────────────────────────
    else if (provider === 'openai') {
      const model = findModel('openai', modelId);
      const fullPrompt = `${userPrompt}\n\n${prompts.jsonSchemaPrompt}`;

      const data = await fetchWithRetry(`${providerConfig.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.id,
          messages: [
            { role: 'system', content: prompts.systemPrompt },
            { role: 'user', content: fullPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: genConfig.temperature,
        }),
      });

      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenAI 응답을 파싱할 수 없습니다.');
      result = JSON.parse(text);
    }

    else {
      return res.status(400).json({ error: '지원하지 않는 AI 제공자입니다.' });
    }

    res.json(result);
  } catch (err) {
    console.error('[/api/analyze] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: 인성검사 AI 분석 ─────────────────────────────────────────────────
app.post('/api/analyze-personality', async (req, res) => {
  const { provider, apiKey, modelId, likertAnswers, binaryAnswers, questions, binaryQuestions } = req.body;

  if (!provider || (provider !== 'gemini' && !apiKey)) {
    return res.status(400).json({ error: '필수 파라미터가 누락되었습니다.' });
  }

  const providerConfig = getProviderConfig(provider);
  if (!providerConfig || !providerConfig.enabled) {
    return res.status(400).json({ error: `${provider}는 현재 지원하지 않는 제공자입니다.` });
  }

  const genConfig = loadServerConfig().generation;

  // ── 프롬프트 구성 ──────────────────────────────────────────────────────
  const systemPrompt = `당신은 기업 인적성검사 전문 분석가이자 조직심리학 박사입니다.
지원자의 인성검사 응답 데이터를 분석하여 구조화된 피드백을 제공합니다.

분석 원칙:
1. 응답 패턴에서 성격 특성을 추론합니다.
2. 게임 업계 직무 적합성 관점에서 해석합니다.
3. 일관성 지표(유사 문항 간 응답 편차)를 확인합니다.
4. 사회적 바람직성(Lie Scale) 문항의 응답 경향을 분석합니다.
5. 실제 인적성 검사 대비 전략을 개인화하여 제시합니다.

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.`;

  // 리커트 응답 텍스트 변환
  const likertScale = ['전혀 그렇지 않다(1점)', '그렇지 않다(2점)', '그렇지 않은 편이다(3점)', '그런 편이다(4점)', '그렇다(5점)', '매우 그렇다(6점)'];
  let likertText = '## 리커트 척도 응답 (94문항)\n';
  if (questions && likertAnswers) {
    for (const q of questions) {
      const ans = likertAnswers[q.id];
      likertText += `Q${q.id}. "${q.text}" → ${ans !== undefined ? likertScale[ans] : '미응답'}\n`;
    }
  }

  let binaryText = '\n## 이항 선택형 응답 (31문항)\n';
  if (binaryQuestions && binaryAnswers) {
    for (const q of binaryQuestions) {
      const ans = binaryAnswers[q.id];
      if (ans === 'A') {
        binaryText += `Q${q.id}. "${q.text}" → A: "${q.optionA}"\n`;
      } else if (ans === 'B') {
        binaryText += `Q${q.id}. "${q.text}" → B: "${q.optionB}"\n`;
      } else {
        binaryText += `Q${q.id}. "${q.text}" → 미응답\n`;
      }
    }
  }

  const userPrompt = `다음은 게임 업계 지원자의 인성검사 응답 데이터입니다.

${likertText}
${binaryText}

위 응답을 분석하여 아래 JSON 형식으로 결과를 반환해주세요:

{
  "traits": [
    { "name": "성격 특성 이름 (예: 성실성)", "score": 0~100, "description": "해당 특성에 대한 설명 (2~3문장)" }
  ],
  "workStyle": {
    "axes": [
      { "leftLabel": "협업 지향", "rightLabel": "독립 지향", "value": -100~100, "description": "해석 설명" },
      { "leftLabel": "신중함", "rightLabel": "도전적", "value": -100~100, "description": "해석 설명" },
      { "leftLabel": "규칙 준수", "rightLabel": "자율 선호", "value": -100~100, "description": "해석 설명" },
      { "leftLabel": "안정 추구", "rightLabel": "성장 추구", "value": -100~100, "description": "해석 설명" },
      { "leftLabel": "외적 동기", "rightLabel": "내적 동기", "value": -100~100, "description": "해석 설명" }
    ]
  },
  "strengths": [
    { "title": "강점 이름", "description": "구체적 설명 (2~3문장)" }
  ],
  "cautions": [
    { "title": "주의점 이름", "description": "구체적 설명 및 개선 방향 (2~3문장)" }
  ],
  "consistency": {
    "score": 0~100,
    "comment": "일관성 지표 해석 (유사 문항 간 응답 편차, Lie Scale 문항 분석 등)"
  },
  "gameIndustryFit": "게임 업계 적합도에 대한 종합 코멘트 (3~4문장)",
  "testStrategy": [
    "개인화된 인성검사 대비 전략 1",
    "개인화된 인성검사 대비 전략 2",
    "개인화된 인성검사 대비 전략 3"
  ]
}

- traits는 반드시 5개 이상 포함하세요 (예: 성실성, 정서 안정성, 외향성, 친화성, 개방성, 자기 효능감 등).
- workStyle axes는 5개 축을 포함하세요.
- strengths는 2~3개, cautions는 1~2개 포함하세요.
- testStrategy는 이 지원자의 응답 패턴에 맞춤화된 전략 3개를 제시하세요.`;

  // ── Gemini 응답 스키마 ─────────────────────────────────────────────────
  const personalityResponseSchema = {
    type: 'OBJECT',
    properties: {
      traits: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            score: { type: 'NUMBER' },
            description: { type: 'STRING' },
          },
          required: ['name', 'score', 'description'],
        },
      },
      workStyle: {
        type: 'OBJECT',
        properties: {
          axes: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                leftLabel: { type: 'STRING' },
                rightLabel: { type: 'STRING' },
                value: { type: 'NUMBER' },
                description: { type: 'STRING' },
              },
              required: ['leftLabel', 'rightLabel', 'value', 'description'],
            },
          },
        },
        required: ['axes'],
      },
      strengths: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' },
          },
          required: ['title', 'description'],
        },
      },
      cautions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' },
          },
          required: ['title', 'description'],
        },
      },
      consistency: {
        type: 'OBJECT',
        properties: {
          score: { type: 'NUMBER' },
          comment: { type: 'STRING' },
        },
        required: ['score', 'comment'],
      },
      gameIndustryFit: { type: 'STRING' },
      testStrategy: {
        type: 'ARRAY',
        items: { type: 'STRING' },
      },
    },
    required: ['traits', 'workStyle', 'strengths', 'cautions', 'consistency', 'gameIndustryFit', 'testStrategy'],
  };

  try {
    let result;

    // ── Gemini ─────────────────────────────────────────────────────────
    if (provider === 'gemini') {
      const model = findModel('gemini', modelId);
      const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: personalityResponseSchema,
          temperature: genConfig.temperature,
        },
      };
      let data;
      if (apiKey) {
        const url = `${providerConfig.apiBase}/${model.id}:generateContent?key=${apiKey}`;
        data = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const supabaseUrl = (process.env.SUPABASE_URL || 'https://pkwbqbxuujpcvndpacsc.supabase.co').replace(/\/$/, '');
        const proxyRes = await fetch(`${supabaseUrl}/functions/v1/gemini-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model.id,
            contents: payload.contents,
            systemInstruction: payload.systemInstruction,
            generationConfig: payload.generationConfig,
          }),
        });
        if (!proxyRes.ok) {
          const proxyText = await proxyRes.text().catch(() => '');
          throw new Error(proxyText || `gemini-proxy request failed (${proxyRes.status})`);
        }
        data = await proxyRes.json();
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Gemini 응답을 파싱할 수 없습니다.');
      result = JSON.parse(text);
    }

    // ── Claude ──────────────────────────────────────────────────────────
    else if (provider === 'claude') {
      const model = findModel('claude', modelId);
      const data = await fetchWithRetry(`${providerConfig.apiBase}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': providerConfig.apiVersion,
        },
        body: JSON.stringify({
          model: model.id,
          max_tokens: genConfig.maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      const text = data.content?.[0]?.text;
      if (!text) throw new Error('Claude 응답을 파싱할 수 없습니다.');
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    }

    // ── OpenAI ─────────────────────────────────────────────────────────
    else if (provider === 'openai') {
      const model = findModel('openai', modelId);
      const data = await fetchWithRetry(`${providerConfig.apiBase}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.id,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: genConfig.temperature,
        }),
      });
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenAI 응답을 파싱할 수 없습니다.');
      result = JSON.parse(text);
    }

    else {
      return res.status(400).json({ error: '지원하지 않는 AI 제공자입니다.' });
    }

    res.json(result);
  } catch (err) {
    console.error('[/api/analyze-personality] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── API: 기업 데이터 (RAG) ────────────────────────────────────────────────
app.get('/api/companies', (req, res) => {
  const companies = dataLoader.getCompanies();
  res.json(companies);
});

app.get('/api/companies/:id', (req, res) => {
  const company = dataLoader.getCompanyById(req.params.id);
  if (!company) return res.status(404).json({ error: '기업을 찾을 수 없습니다.' });
  res.json(company);
});

// ── API: 공고 데이터 (RAG) ────────────────────────────────────────────────
app.get('/api/jobs', (req, res) => {
  const { role, company, skills, minExp, maxExp, query } = req.query;
  const results = dataLoader.searchJobs({ role, company, skills, minExp, maxExp, query });
  res.json(results);
});

app.get('/api/jobs/:id', (req, res) => {
  const job = dataLoader.getJobById(req.params.id);
  if (!job) return res.status(404).json({ error: '공고를 찾을 수 없습니다.' });
  res.json(job);
});

// ── API: 데이터 소스 상태 ─────────────────────────────────────────────────
app.get('/api/data/status', (req, res) => {
  res.json(dataLoader.getStatus());
});

// ── API: 데이터 리프레시 (관리용) ─────────────────────────────────────────
app.post('/api/data/refresh', (req, res) => {
  dataLoader.refresh();
  res.json({ success: true, status: dataLoader.getStatus() });
});

// ── API: 우선 공고 조회 (GI_No → 기존 데이터 확인 또는 단건 크롤링) ──────
app.post('/api/jobs/resolve', async (req, res) => {
  const { giNo } = req.body;
  if (!giNo) {
    return res.status(400).json({ error: 'giNo (공고 번호)가 필요합니다.' });
  }

  // 숫자만 추출 (URL 붙여넣기 대비)
  const cleanGiNo = String(giNo).replace(/\D/g, '');
  if (!cleanGiNo) {
    return res.status(400).json({ error: '유효한 공고 번호가 아닙니다.' });
  }

  // 1) 기존 데이터에서 먼저 검색
  const existing = dataLoader.getJobByGiNo(cleanGiNo);
  if (existing) {
    return res.json({ found: true, source: 'cache', job: existing });
  }

  // 2) 기존에 없으면 단건 크롤링 시도
  try {
    const { crawlSingleJob } = await import('./lib/crawler.js');
    const dataPath = join(__dirname, 'data');

    const crawlResult = await crawlSingleJob({ giNo: cleanGiNo, dataDir: dataPath });

    if (!crawlResult.success) {
      return res.status(404).json({
        found: false,
        error: crawlResult.error || `공고 ${cleanGiNo}을(를) 크롤링할 수 없습니다.`,
      });
    }

    // 3) 크롤링된 refined 데이터를 정규화
    const { normalizeJob } = await import('./lib/job-normalizer.js');
    const normalizedJob = normalizeJob(crawlResult.refinedData);

    // 4) 정규화된 파일 저장 (data/jobs/)
    const jobFilePath = join(dataPath, 'jobs', `job-${cleanGiNo}.json`);
    writeFileSync(jobFilePath, JSON.stringify(normalizedJob, null, 2), 'utf-8');

    // 5) 캐시 리프레시
    dataLoader.refresh();

    return res.json({ found: true, source: 'crawled', job: normalizedJob });
  } catch (err) {
    console.error(`[/api/jobs/resolve] GI_No ${cleanGiNo} 크롤링 오류:`, err.message);
    return res.status(500).json({
      found: false,
      error: `크롤링 중 오류가 발생했습니다: ${err.message}`,
    });
  }
});

// ── API: 크롤러 (백그라운드 실행 + SSE 진행 스트림) ─────────────────────────
// ★ 크롤링은 백그라운드 작업으로 실행하고, SSE는 진행 상황만 스트리밍.
//   Vite 프록시가 SSE 연결을 조기 종료해도 크롤링 자체는 계속 진행됨.
let crawlState = {
  running: false,
  abortController: null,
  log: [],           // 진행 로그 누적 (SSE 재연결 시 이력 전송용)
  lastEvent: null,   // 마지막 이벤트
};

// ── 크롤링 시작 (백그라운드 실행, 즉시 응답) ──
app.post('/api/crawl/start', async (req, res) => {
  if (crawlState.running) {
    return res.status(409).json({ error: '이미 크롤링이 진행 중입니다.' });
  }

  const { targets } = req.body;
  const crawlTargets = targets && targets.length > 0 ? targets : ['게임기획', '신입'];

  crawlState.running = true;
  crawlState.abortController = new AbortController();
  crawlState.log = [];
  crawlState.lastEvent = null;

  // 즉시 응답 — 크롤링은 백그라운드에서 진행
  res.json({ success: true, message: `크롤링 시작: [${crawlTargets.join(', ')}]` });

  // ── 백그라운드 크롤링 실행 (요청 수명과 무관) ──
  (async () => {
    try {
      const { runCrawler } = await import('./lib/crawler.js');
      const dataPath = join(__dirname, 'data');

      const pushEvent = (data) => {
        crawlState.lastEvent = data;
        crawlState.log.push(data);
        // 로그가 너무 커지지 않도록 최근 100건만 유지
        if (crawlState.log.length > 100) crawlState.log.shift();
      };

      pushEvent({ stage: 'init', message: `크롤링 시작: [${crawlTargets.join(', ')}]`, percent: 0 });

      const result = await runCrawler({
        targets: crawlTargets,
        dataDir: dataPath,
        signal: crawlState.abortController.signal,
        onProgress: (progress) => {
          pushEvent(progress);
        },
      });

      if (result.success && result.count > 0) {
        pushEvent({ stage: 'normalize', message: '정규화 처리 중...', percent: 96 });
        try {
          const refinedDir = join(dataPath, 'refined');
          const jobsDir = join(dataPath, 'jobs');
          const { report } = normalizeAll(refinedDir, jobsDir, false);
          pushEvent({ stage: 'normalize', message: `정규화 완료: ${report.success}건`, percent: 98 });
        } catch (normErr) {
          pushEvent({ stage: 'normalize', message: `정규화 오류: ${normErr.message}`, percent: 98 });
        }

        dataLoader.refresh();
        pushEvent({ stage: 'refresh', message: '데이터 캐시 갱신 완료', percent: 99 });
      }

      pushEvent({
        stage: 'complete',
        message: `완료! ${result.count}건 수집 (오류: ${result.errors.length}건)`,
        percent: 100,
        result,
      });
    } catch (err) {
      const errEvent = { stage: 'error', message: err.message, percent: 0 };
      crawlState.lastEvent = errEvent;
      crawlState.log.push(errEvent);
    } finally {
      crawlState.running = false;
      crawlState.abortController = null;
    }
  })();
});

// ── 크롤링 진행 상황 SSE 스트림 (GET — 언제든 재연결 가능) ──
app.get('/api/crawl/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');
  res.statusCode = 200;
  res.flushHeaders();
  res.write(': connected\n\n');

  const sendEvent = (data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  // 기존 로그 이력 전송 (재연결 시 누락분 보충)
  let sentIdx = crawlState.log.length;
  crawlState.log.forEach(evt => sendEvent(evt));

  // 새 이벤트 폴링 (200ms 간격)
  const interval = setInterval(() => {
    if (sentIdx < crawlState.log.length) {
      for (let i = sentIdx; i < crawlState.log.length; i++) {
        sendEvent(crawlState.log[i]);
      }
      sentIdx = crawlState.log.length;
    }

    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }

    // 크롤링 종료 시 스트림 닫기
    if (!crawlState.running && sentIdx >= crawlState.log.length) {
      clearInterval(interval);
      if (!res.writableEnded) res.end();
    }
  }, 200);

  req.on('close', () => {
    clearInterval(interval);
    // ★ SSE 연결 끊김 ≠ 크롤링 중단 (핵심 변경)
    //   사용자가 명시적으로 /api/crawl/stop을 호출해야만 중단됨
  });
});

app.post('/api/crawl/stop', (req, res) => {
  if (crawlState.running && crawlState.abortController) {
    crawlState.abortController.abort();
    res.json({ success: true, message: '크롤링 중단 요청됨' });
  } else {
    res.json({ success: false, message: '진행 중인 크롤링이 없습니다.' });
  }
});

app.get('/api/crawl/status', (req, res) => {
  res.json({
    running: crawlState.running,
    lastEvent: crawlState.lastEvent,
    logCount: crawlState.log.length,
  });
});

// ── 프로덕션: React 빌드 정적 파일 서빙 ──────────────────────────────────
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
