/**
 * Gemini Client - Supabase Edge Function gemini-proxy 전용
 *
 * Supabase Edge Function이 GEMINI_API_KEY를 서버측에서 관리하므로
 * 프론트엔드에 API 키 입력이 불필요하다.
 */

import { buildUserPromptClient } from './prompt-builder.js';
import { SUPABASE_URL, staticAssetUrl } from './runtime-config';

const GEMINI_PROXY_URL = `${SUPABASE_URL}/functions/v1/gemini-proxy`;

/**
 * Supabase gemini-proxy를 통한 Gemini API 호출 (재시도 포함)
 */
export async function callGeminiProxy({ contents, systemInstruction, generationConfig, model = 'gemini-2.5-flash' }) {
  const body = { model, contents };
  if (systemInstruction) body.systemInstruction = systemInstruction;
  if (generationConfig) body.generationConfig = generationConfig;

  const maxRetries = 3;
  const delays = [1000, 2000, 4000];
  const timeoutMs = 45000;

  for (let i = 0; i < maxRetries; i++) {
    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(GEMINI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.error?.message || data.error || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('AI 응답 시간이 초과되었습니다.');
      }
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delays[i]));
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * AI 분석 - Supabase gemini-proxy 경유 (API 키 불필요)
 */
export async function analyzeViaProxy({ modelId, top3, profile, hasFiles, hasPortfolioFile, fileParts, portfolioFileNames, githubPortfolio }) {
  const userPrompt = buildUserPromptClient({
    top3,
    profile,
    hasFiles: !!hasFiles,
    hasPortfolioFile: !!hasPortfolioFile,
    portfolioFileNames,
    githubPortfolio,
  });

  const [sysPromptText, schemaJson] = await Promise.all([
    fetch(staticAssetUrl('prompts/system-prompt.md')).then((r) => r.ok ? r.text() : '').catch(() => ''),
    fetch(staticAssetUrl('prompts/analysis-schema.json')).then((r) => r.ok ? r.json() : null).catch(() => null),
  ]);

  const parts = [{ text: userPrompt }];
  if (fileParts && fileParts.length > 0) {
    parts.push(...fileParts);
  }

  const data = await callGeminiProxy({
    model: modelId || 'gemini-2.5-flash',
    contents: [{ parts }],
    systemInstruction: sysPromptText ? { parts: [{ text: sysPromptText }] } : undefined,
    generationConfig: {
      responseMimeType: 'application/json',
      ...(schemaJson ? { responseSchema: schemaJson } : {}),
      temperature: 0.7,
    },
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답을 파싱할 수 없습니다.');
  return JSON.parse(text);
}

export async function matchJobsViaProxy({ modelId, profile, candidates }) {
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
            strengths: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
            cautions: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: ['id', 'score', 'reason', 'strengths', 'cautions'],
        },
      },
    },
    required: ['summary', 'matches'],
  };

  const safeModelId = String(modelId || '').startsWith('gemini-') ? modelId : 'gemini-2.5-flash';
  const profileText = [
    `지원자 이름: ${profile?.name || '미입력'}`,
    `직군 대분류: ${profile?.roleGroup || '미입력'}`,
    `세부 직무: ${profile?.subRole || profile?.role || '미입력'}`,
    `경력: ${profile?.experience ?? 0}년`,
    `보유 기술: ${(profile?.skills || []).map((skill) => `${skill.name}(${skill.level})`).join(', ') || '없음'}`,
  ].join('\n');

  const candidateText = (candidates || []).slice(0, 24).map((job, index) => [
    `[후보 ${index + 1}]`,
    `id: ${job.id}`,
    `회사: ${job.company}`,
    `공고명: ${job.title}`,
    `직무: ${job.role}`,
    `경력조건: ${job.reqExp === 0 ? '신입/무관' : `${job.reqExp}년 이상`}`,
    `요구스킬: ${(job.reqSkills || []).join(', ') || '없음'}`,
    `로컬 점수: ${job.score ?? 0}`,
    `게임/카테고리: ${[job.mainGame, job.gameCategory].filter(Boolean).join(' / ') || '없음'}`,
  ].join('\n')).join('\n\n');

  const systemPrompt = [
    '너는 게임업계 채용공고 추천 어시스턴트다.',
    '지원자 프로필과 게임잡 후보 공고를 비교해 실제 지원 우선순위가 높은 공고만 골라라.',
    '반드시 JSON만 반환한다.',
    '점수는 0~100 정수로 주고, reason은 한국어 2문장 이내로 쓴다.',
  ].join('\n');

  const userPrompt = [
    '아래 지원자 프로필과 후보 공고를 보고 상위 매칭 공고를 최대 8개 반환해라.',
    '단순 키워드 일치보다 직무 적합성, 경력 정합성, 실제 지원 가능성을 우선한다.',
    '',
    '## 지원자 프로필',
    profileText,
    '',
    '## 후보 공고',
    candidateText,
  ].join('\n');

  const data = await callGeminiProxy({
    model: safeModelId,
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.4,
    },
  });

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('추천 공고 매칭 응답이 비어 있습니다.');
  return JSON.parse(text);
}

/**
 * Supabase 프록시 연결 확인
 */
export async function checkProxyHealth() {
  try {
    const data = await callGeminiProxy({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: 'ping' }] }],
    });
    return { ok: !!data.candidates, error: null };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
