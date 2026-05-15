import { apiUrl } from './runtime-config';
import { buildAuthorizedHeaders } from './auth-fetch';

async function postJson(path, payload, getAccessToken) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: await buildAuthorizedHeaders(getAccessToken, {
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`);
  }
  return data;
}

export async function analyzeViaProxy({
  getAccessToken,
  modelId,
  profile,
  top3,
  hasFiles,
  hasPortfolioFile,
  fileParts,
}) {
  return postJson('/api/analyze', {
    provider: 'gemini',
    modelId,
    profile,
    top3,
    hasFiles,
    hasPortfolioFile,
    fileParts,
  }, getAccessToken);
}

export async function analyzePersonalityViaApi({
  getAccessToken,
  provider,
  modelId,
  likertAnswers,
  binaryAnswers,
  questions,
  binaryQuestions,
}) {
  return postJson('/api/analyze-personality', {
    provider,
    modelId,
    likertAnswers,
    binaryAnswers,
    questions,
    binaryQuestions,
  }, getAccessToken);
}

export async function matchJobsViaProxy({ getAccessToken, modelId, profile, candidates }) {
  return postJson('/api/match-jobs', {
    modelId,
    profile,
    candidates,
  }, getAccessToken);
}

export async function requestCompanyInsights({ getAccessToken, payload }) {
  return postJson('/api/company-insights', payload, getAccessToken);
}

export async function requestMarketInsights({ getAccessToken, payload }) {
  return postJson('/api/market-insights', payload, getAccessToken);
}

export async function requestInstructorDraft({ getAccessToken, payload }) {
  return postJson('/api/instructor-draft', payload, getAccessToken);
}

