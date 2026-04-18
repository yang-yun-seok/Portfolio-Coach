/**
 * Gemini Client - Supabase Edge Function gemini-proxy 전용
 *
 * Supabase Edge Function이 GEMINI_API_KEY를 서버측에서 관리하므로
 * 프론트엔드에 API 키 입력이 불필요하다.
 */

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
export async function analyzeViaProxy({ modelId, top3, profile, hasFiles, hasPortfolioFile, fileParts, portfolioFileNames }) {
  const { buildUserPromptClient } = await import('./prompt-builder.js');
  const userPrompt = buildUserPromptClient({ top3, profile, hasFiles: !!hasFiles, hasPortfolioFile: !!hasPortfolioFile, portfolioFileNames });

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
