import { buildUserPromptClient } from './prompt-builder';
import { staticAssetUrl } from './runtime-config';
import { getProfileDisplayRole, normalizeUserProfile } from '../data/skills';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_API_BASE = 'https://api.openai.com/v1';

const DEFAULT_MODELS = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
};

const PROMPT_CACHE = {
  systemPrompt: null,
  analysisSchema: null,
};

const PERSONALITY_SYSTEM_PROMPT = `당신은 기업 인적성 분석가이자 조직심리 전문가입니다.
지원자의 인성검사 응답 데이터를 분석하여 게임 업계 직무 적합성 관점의 구조화된 피드백을 제공합니다.

분석 지침:
1. 응답 패턴에서 성격 특성을 추론합니다.
2. 게임 업계 직무 적합성 관점에서 해석합니다.
3. 일관성 지표와 유사 문항 간 응답 일치를 확인합니다.
4. 사회적 바람직성 문항과 응답 경향을 분석합니다.
5. 실제 인적성검사 대비 전략을 개인화해 제시합니다.

반드시 JSON만 반환하세요. 마크다운 코드블록, 설명 문구, 기타 텍스트는 포함하지 마세요.`;

const PERSONALITY_RESPONSE_SCHEMA = {
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

const LIKERT_SCALE = [
  '전혀 그렇지 않다(1점)',
  '그렇지 않다(2점)',
  '그렇지 않은 편이다(3점)',
  '그런 편이다(4점)',
  '그렇다(5점)',
  '매우 그렇다(6점)',
];

function normalizeProvider(provider) {
  return provider === 'openai' ? 'openai' : 'gemini';
}

function getModelId(provider, modelId) {
  const normalizedProvider = normalizeProvider(provider);
  return modelId || DEFAULT_MODELS[normalizedProvider];
}

function requireApiKey(provider, apiKey) {
  const key = String(apiKey || '').trim();
  if (!key) {
    const label = normalizeProvider(provider) === 'openai' ? 'OpenAI' : 'Gemini';
    throw new Error(`${label} API 키를 먼저 입력해 주세요.`);
  }
  return key;
}

async function fetchTextAsset(path) {
  const response = await fetch(staticAssetUrl(path));
  if (!response.ok) throw new Error(`${path} 파일을 불러오지 못했습니다.`);
  return response.text();
}

async function fetchJsonAsset(path) {
  const response = await fetch(staticAssetUrl(path));
  if (!response.ok) throw new Error(`${path} 파일을 불러오지 못했습니다.`);
  return response.json();
}

async function loadPromptAssets() {
  if (!PROMPT_CACHE.systemPrompt) {
    PROMPT_CACHE.systemPrompt = await fetchTextAsset('api/prompts/system-prompt.md')
      .catch(() => fetchTextAsset('prompts/system-prompt.md'));
  }
  if (!PROMPT_CACHE.analysisSchema) {
    PROMPT_CACHE.analysisSchema = await fetchJsonAsset('api/prompts/analysis-schema.json')
      .catch(() => fetchJsonAsset('prompts/analysis-schema.json'));
  }
  return PROMPT_CACHE;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: { message: text } };
    }
  }

  if (!response.ok) {
    const message = data?.error?.message || data?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function parseJsonResponse(text) {
  const cleaned = String(text || '').trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI 응답에서 JSON을 찾지 못했습니다.');
    return JSON.parse(match[0]);
  }
}

function geminiGenerationConfig({ responseSchema, responseMimeType, temperature }) {
  const config = { temperature };
  if (responseMimeType) config.responseMimeType = responseMimeType;
  if (responseSchema) config.responseSchema = responseSchema;
  return config;
}

async function requestGemini({
  apiKey,
  modelId,
  systemPrompt,
  userPrompt,
  responseSchema,
  responseMimeType,
  temperature = 0.7,
  fileParts = [],
}) {
  const key = requireApiKey('gemini', apiKey);
  const model = getModelId('gemini', modelId);
  const parts = [{ text: userPrompt }];
  if (Array.isArray(fileParts) && fileParts.length > 0) {
    parts.push(...fileParts);
  }

  const data = await fetchJson(`${GEMINI_API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      generationConfig: geminiGenerationConfig({ responseSchema, responseMimeType, temperature }),
    }),
  });

  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) throw new Error('Gemini 응답이 비어 있습니다.');
  return text;
}

async function requestOpenAI({
  apiKey,
  modelId,
  systemPrompt,
  userPrompt,
  json = false,
  responseSchema,
  temperature = 0.7,
}) {
  const key = requireApiKey('openai', apiKey);
  const model = getModelId('openai', modelId);
  const schemaInstruction = json && responseSchema
    ? `\n\nReturn only valid JSON matching this schema:\n${JSON.stringify(responseSchema)}`
    : '';

  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
      { role: 'user', content: `${userPrompt}${schemaInstruction}` },
    ],
    temperature,
  };
  if (json) body.response_format = { type: 'json_object' };

  const data = await fetchJson(`${OPENAI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('OpenAI 응답이 비어 있습니다.');
  return text;
}

async function requestProviderText({ provider, apiKey, modelId, systemPrompt, userPrompt, temperature = 0.7 }) {
  const normalizedProvider = normalizeProvider(provider);
  if (normalizedProvider === 'openai') {
    return requestOpenAI({ apiKey, modelId, systemPrompt, userPrompt, temperature });
  }
  return requestGemini({ apiKey, modelId, systemPrompt, userPrompt, temperature });
}

async function requestProviderJson({
  provider,
  apiKey,
  modelId,
  systemPrompt,
  userPrompt,
  responseSchema,
  temperature = 0.7,
  fileParts = [],
}) {
  const normalizedProvider = normalizeProvider(provider);
  const text = normalizedProvider === 'openai'
    ? await requestOpenAI({
        apiKey,
        modelId,
        systemPrompt,
        userPrompt,
        json: true,
        responseSchema,
        temperature,
      })
    : await requestGemini({
        apiKey,
        modelId,
        systemPrompt,
        userPrompt,
        responseSchema,
        responseMimeType: 'application/json',
        temperature,
        fileParts,
      });

  return parseJsonResponse(text);
}

function buildPersonalityPrompt({ likertAnswers, binaryAnswers, questions, binaryQuestions }) {
  const likertText = Array.isArray(questions)
    ? questions.map((question) => {
        const answer = likertAnswers?.[question.id];
        return `Q${question.id}. "${question.text}" => ${answer !== undefined ? LIKERT_SCALE[answer] : '미응답'}`;
      }).join('\n')
    : '문항 데이터 없음';

  const binaryText = Array.isArray(binaryQuestions)
    ? binaryQuestions.map((question) => {
        const answer = binaryAnswers?.[question.id];
        if (answer === 'A') return `Q${question.id}. "${question.text}" => A: "${question.optionA}"`;
        if (answer === 'B') return `Q${question.id}. "${question.text}" => B: "${question.optionB}"`;
        return `Q${question.id}. "${question.text}" => 미응답`;
      }).join('\n')
    : '문항 데이터 없음';

  return `다음은 게임 업계 지원자의 인성검사 응답 데이터입니다.

## 리커트 척도 응답
${likertText}

## 이항 선택형 응답
${binaryText}

응답 패턴을 분석하여 지정된 JSON 구조로 결과를 반환하세요.`;
}

export async function validateAiApiKey({ provider, apiKey, modelId }) {
  const normalizedProvider = normalizeProvider(provider);
  if (normalizedProvider === 'openai') {
    await requestOpenAI({
      apiKey,
      modelId,
      systemPrompt: 'You validate API connectivity.',
      userPrompt: 'Reply with "ok".',
      temperature: 0,
    });
    return { valid: true };
  }

  await requestGemini({
    apiKey,
    modelId,
    userPrompt: 'Reply with "ok".',
    temperature: 0,
  });
  return { valid: true };
}

export async function analyzeViaProxy({
  provider = 'gemini',
  apiKey,
  modelId,
  profile,
  top3,
  hasFiles,
  hasPortfolioFile,
  fileParts,
  portfolioFileNames,
}) {
  const { systemPrompt, analysisSchema } = await loadPromptAssets();
  const userPrompt = buildUserPromptClient({
    top3: Array.isArray(top3) ? top3 : [],
    profile,
    hasFiles: !!hasFiles,
    hasPortfolioFile: !!hasPortfolioFile,
    portfolioFileNames,
  });

  return requestProviderJson({
    provider,
    apiKey,
    modelId,
    systemPrompt,
    userPrompt,
    responseSchema: analysisSchema,
    temperature: 0.7,
    fileParts,
  });
}

export async function analyzePersonalityViaApi({
  provider = 'gemini',
  apiKey,
  modelId,
  likertAnswers,
  binaryAnswers,
  questions,
  binaryQuestions,
}) {
  return requestProviderJson({
    provider,
    apiKey,
    modelId,
    systemPrompt: PERSONALITY_SYSTEM_PROMPT,
    userPrompt: buildPersonalityPrompt({ likertAnswers, binaryAnswers, questions, binaryQuestions }),
    responseSchema: PERSONALITY_RESPONSE_SCHEMA,
    temperature: 0.7,
  });
}

export async function matchJobsViaProxy({ provider = 'gemini', apiKey, modelId, profile, candidates }) {
  const schema = {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      matches: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING' },
            score: { type: 'NUMBER' },
            reason: { type: 'STRING' },
            strengths: { type: 'ARRAY', items: { type: 'STRING' } },
            cautions: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['id', 'score', 'reason', 'strengths', 'cautions'],
        },
      },
    },
    required: ['summary', 'matches'],
  };

  const selectedCandidates = Array.isArray(candidates) ? candidates.slice(0, 24) : [];
  const profileText = [
    `지원자 이름: ${profile?.name || '미입력'}`,
    `직무 대분류: ${profile?.roleGroup || '미입력'}`,
    `세부 직무: ${profile?.subRole || profile?.role || '미입력'}`,
    `경력: ${profile?.experience ?? 0}년`,
    `보유 기술: ${(profile?.skills || []).map((skill) => `${skill.name}(${skill.level})`).join(', ') || '없음'}`,
  ].join('\n');

  const candidateText = selectedCandidates.map((job, index) => [
    `[후보 ${index + 1}]`,
    `id: ${job.id}`,
    `회사: ${job.company}`,
    `공고명: ${job.title}`,
    `직무: ${job.role}`,
    `경력조건: ${job.reqExp === 0 ? '신입/무관' : `${job.reqExp}년 이상`}`,
    `요구기술: ${(job.reqSkills || []).join(', ') || '없음'}`,
    `로컬 점수: ${job.score ?? 0}`,
    `카테고리: ${[job.mainGame, job.gameCategory].filter(Boolean).join(' / ') || '없음'}`,
  ].join('\n')).join('\n\n');

  return requestProviderJson({
    provider,
    apiKey,
    modelId,
    systemPrompt: [
      '당신은 게임업계 채용공고 추천 분석가입니다.',
      '지원자 프로필과 공고 후보를 비교하여 실제 지원 우선순위가 높은 공고만 고르세요.',
      '반드시 JSON만 반환하세요.',
      '점수는 0~100 정수로 주고, reason은 한 문장 이내로 제한하세요.',
    ].join('\n'),
    userPrompt: [
      '아래 지원자 프로필과 공고 후보를 보고 상위 매칭 공고를 최대 8개 반환하세요.',
      '단순 키워드 일치보다 직무 적합도, 경력 적합도, 실제 지원 가능성을 우선하세요.',
      '',
      '## 지원자 프로필',
      profileText,
      '',
      '## 후보 공고',
      candidateText,
    ].join('\n'),
    responseSchema: schema,
    temperature: 0.4,
  });
}

export async function requestCompanyInsights({ provider = 'gemini', apiKey, modelId, payload }) {
  const schema = {
    type: 'OBJECT',
    properties: {
      games: { type: 'STRING' },
      employees: { type: 'STRING' },
      revenue: { type: 'STRING' },
      benefits: { type: 'STRING' },
      news: { type: 'ARRAY', items: { type: 'STRING' } },
      aiAnalysis: { type: 'STRING' },
    },
    required: ['games', 'employees', 'revenue', 'benefits', 'news', 'aiAnalysis'],
  };

  const name = payload?.name || '';
  const roles = payload?.roles || '';
  const skills = payload?.skills || '';
  const gameCategories = payload?.gameCategories || '';
  const companyJobsCount = Number(payload?.companyJobsCount) || 0;

  return requestProviderJson({
    provider,
    apiKey,
    modelId,
    systemPrompt: '당신은 한국 게임회사 리서치 어시스턴트입니다. 확인 가능한 정보와 채용 데이터 기반 추론을 구분해 간결한 JSON으로 정리합니다.',
    userPrompt: [
      `회사명: ${name}`,
      `현재 수집된 공고 수: ${companyJobsCount}`,
      `주요 직군: ${roles || '-'}`,
      `주요 요구 기술: ${skills || '-'}`,
      `카테고리/장르: ${gameCategories || '-'}`,
      '',
      '아래 JSON 형식으로 답하세요.',
      '{"games":"대표 게임 또는 서비스","employees":"직원 수 또는 규모","revenue":"매출 또는 사업 규모","benefits":"복리후생 요약","news":["최근 이슈 1","최근 이슈 2"],"aiAnalysis":"채용 관점 요약"}',
    ].join('\n'),
    responseSchema: schema,
    temperature: 0.3,
  });
}

export async function requestMarketInsights({ provider = 'gemini', apiKey, modelId, payload }) {
  const topCompanies = Array.isArray(payload?.topCompanies) ? payload.topCompanies : [];
  const topKeywords = Array.isArray(payload?.topKeywords) ? payload.topKeywords : [];
  const topSkills = Array.isArray(payload?.topSkills) ? payload.topSkills : [];
  const historyIndex = Array.isArray(payload?.historyIndex) ? payload.historyIndex : [];
  const trendSummary = historyIndex
    .slice(0, 7)
    .reverse()
    .map((entry) => `${entry.date}: 전체 ${entry.referenceJobCount}건 / 신규 ${entry.newJobsCount}건`)
    .join('\n');

  const text = await requestProviderText({
    provider,
    apiKey,
    modelId,
    systemPrompt: [
      '당신은 게임업계 채용시장 분석가입니다.',
      '과장하지 말고 제공된 데이터만 근거로 간결한 한국어 보고서를 작성합니다.',
    ].join('\n'),
    userPrompt: [
      '다음 데이터를 근거로 시장 보고서를 작성하세요.',
      '- 제목 없이 바로 1. 시장 개요, 2. 채용 선호, 3. 직무별 인사이트, 4. 지원 전략, 5. 한 줄 결론 순서로 작성',
      '- 각 항목은 2~4문장',
      '',
      `[분석 범위] ${payload?.scopeLabel || '전체 공고'} / ${payload?.scopeDescription || ''}`,
      `[총 공고 수] ${payload?.totalJobs || 0}`,
      `[최다 직군] ${payload?.dominantRole || '정보 없음'}`,
      `[최다 경력 조건] ${payload?.dominantCareer || '정보 없음'}`,
      `[상위 기업] ${topCompanies.slice(0, 8).map(([name, count]) => `${name}(${count})`).join(', ')}`,
      `[상위 키워드] ${topKeywords.slice(0, 12).map(([label, count]) => `${label}(${count})`).join(', ')}`,
      `[상위 요구 기술] ${topSkills.slice(0, 10).map(([label, count]) => `${label}(${count})`).join(', ')}`,
      '',
      '[최근 추이]',
      trendSummary || '추이 데이터 없음',
    ].join('\n'),
    temperature: 0.5,
  });

  return { text };
}

export async function requestInstructorDraft({ provider = 'gemini', apiKey, modelId, payload }) {
  const normalizedProfile = normalizeUserProfile(payload?.profile || {});
  const aiResults = payload?.aiResults || {};
  const today = new Date().toISOString().slice(0, 10);

  const markdown = await requestProviderText({
    provider,
    apiKey,
    modelId,
    systemPrompt: '당신은 게임업계 취업 컨설턴트 강사입니다. 마크다운 형식만 반환하세요.',
    userPrompt: `당신은 게임업계 취업 컨설턴트 강사입니다. 아래 AI 분석 결과를 바탕으로 강사 피드백 초안을 작성하세요.

지원자: ${normalizedProfile.name} | 직무: ${getProfileDisplayRole(normalizedProfile)} | 경력: ${normalizedProfile.experience}년 | 기술: ${(normalizedProfile.skills || []).map((skill) => `${skill.name}(${skill.level})`).join(', ')}

AI 분석 요약:
- 프로필: ${JSON.stringify(aiResults.profileAnalysis || {}).slice(0, 600)}
- 이력서: ${JSON.stringify(aiResults.resumeImprovements || []).slice(0, 600)}
- 포트폴리오: ${JSON.stringify(aiResults.portfolioImprovements || []).slice(0, 600)}

아래 마크다운 형식으로 작성하세요.

# 강사명
AI 초안

# 피드백 일자
${today}

# 통합 피드백
## 전체 평가

## 주요 개선사항
- 항목

# 이력서 피드백
## 강점
- 항목

## 개선 사항
- 항목

# 자기소개서 피드백
## 강점
- 항목

## 개선 사항
- 항목

# 포트폴리오 피드백
## 강점
- 항목

## 개선 사항
- 항목

# 면접 준비
## 예상 질문
- 항목

## 준비 방향
- 항목`,
    temperature: 0.7,
  });

  return { markdown };
}
