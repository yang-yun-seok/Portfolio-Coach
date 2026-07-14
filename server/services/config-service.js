import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export function isEnabledFlag(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

const STORAGE_NOT_READY_STATUSES = new Set([
  'admin_not_configured',
  'bucket_missing',
  'storage_unavailable',
]);

export function resolvePortfolioSubmissionCapability({ uploadsRequested, storageReadiness } = {}) {
  if (!uploadsRequested) {
    return { enabled: false, status: 'not_configured' };
  }
  if (storageReadiness?.ready === true) {
    return { enabled: true, status: 'ready' };
  }
  return {
    enabled: false,
    status: STORAGE_NOT_READY_STATUSES.has(storageReadiness?.status)
      ? storageReadiness.status
      : 'storage_unavailable',
  };
}

export function createConfigService({ baseDir, isDev, fetchImpl }) {
  const cache = {
    prompts: null,
    serverConfig: null,
    modelsConfig: null,
  };

  function loadJsonFile(filePath) {
    const fullPath = join(baseDir, filePath);
    if (!existsSync(fullPath)) {
      console.warn(`[Config] 파일 없음: ${filePath}`);
      return null;
    }

    return JSON.parse(readFileSync(fullPath, 'utf-8'));
  }

  function loadTextFile(filePath) {
    const fullPath = join(baseDir, filePath);
    if (!existsSync(fullPath)) {
      console.warn(`[Config] 파일 없음: ${filePath}`);
      return '';
    }

    return readFileSync(fullPath, 'utf-8').trim();
  }

  function loadPrompts() {
    if (!isDev && cache.prompts) return cache.prompts;

    const prompts = {
      systemPrompt: loadTextFile('prompts/system-prompt.md'),
      jsonSchemaPrompt: loadTextFile('prompts/analysis-schema.md'),
      geminiResponseSchema: loadJsonFile('prompts/analysis-schema.json'),
      interviewBasic: loadJsonFile('prompts/interview-basic.json'),
      userPromptTemplate: loadTextFile('prompts/user-prompt-template.md'),
    };

    cache.prompts = prompts;
    if (isDev) {
      console.log('[Config] 프롬프트 파일 핫 리로드 완료');
    }

    return prompts;
  }

  function loadServerConfig() {
    if (!isDev && cache.serverConfig) return cache.serverConfig;

    const config = loadJsonFile('config/server.json') || {
      port: 3002,
      bodyLimit: '100mb',
      cors: true,
      generation: { temperature: 0.7, maxTokens: 8192, responseMimeType: 'application/json' },
      retry: { maxRetries: 3, delays: [1000, 2000, 4000] },
    };

    cache.serverConfig = config;
    return config;
  }

  function loadModelsConfig() {
    if (!isDev && cache.modelsConfig) return cache.modelsConfig;

    const config = loadJsonFile('config/models.json');
    cache.modelsConfig = config;
    return config;
  }

  function getProviderConfig(providerId) {
    const config = loadModelsConfig();
    return config?.providers?.[providerId] || null;
  }

  function getDefaultModel(providerId) {
    const provider = getProviderConfig(providerId);
    if (!provider) return null;
    return provider.models.find((model) => model.default) || provider.models[0];
  }

  function findModel(providerId, modelId) {
    const provider = getProviderConfig(providerId);
    if (!provider) return null;
    return provider.models.find((model) => model.id === modelId) || getDefaultModel(providerId);
  }

  async function fetchWithRetry(url, options) {
    const { maxRetries, delays } = loadServerConfig().retry;

    for (let i = 0; i < maxRetries; i += 1) {
      try {
        const response = await fetchImpl(url, options);
        const data = await response.json();
        if (!response.ok) {
          const errMsg = data.error?.message || data.message || `HTTP ${response.status}`;
          throw new Error(errMsg);
        }

        return data;
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, delays[i]));
      }
    }

    throw new Error('fetchWithRetry failed unexpectedly');
  }

  function getModelsResponse() {
    const config = loadModelsConfig();
    if (!config) return null;

    const result = {};
    for (const [id, provider] of Object.entries(config.providers)) {
      result[id] = {
        label: provider.label,
        enabled: provider.enabled,
        color: provider.color,
        supportsFiles: provider.supportsFiles,
        models: provider.models.map((model) => ({
          id: model.id,
          label: model.label,
          description: model.description,
          default: model.default || false,
        })),
      };
    }

    return result;
  }

  function getInterviewBasicPrompts() {
    return loadPrompts().interviewBasic || [];
  }

  function arePortfolioUploadsRequested() {
    return isEnabledFlag(process.env.PORTFOLIO_UPLOADS_ENABLED);
  }

  function getCapabilitiesResponse({ storageReadiness } = {}) {
    return {
      portfolioSubmissions: resolvePortfolioSubmissionCapability({
        uploadsRequested: arePortfolioUploadsRequested(),
        storageReadiness,
      }),
    };
  }

  async function validateKey({ provider, apiKey, modelId }) {
    if (!provider || (provider !== 'gemini' && !apiKey)) {
      return { valid: false, error: '제공자와 API 키를 모두 입력해 주세요.' };
    }

    const providerConfig = getProviderConfig(provider);
    if (!providerConfig || !providerConfig.enabled) {
      return { valid: false, error: `${provider}는 현재 지원하지 않는 제공자입니다.` };
    }

    try {
      if (provider === 'gemini') {
        const validationModelId = 'gemini-2.5-flash';
        const url = `${providerConfig.apiBase}/${validationModelId}:generateContent?key=${apiKey}`;
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] }),
        });

        if (response.ok) return { valid: true };

        const status = response.status;
        if (status === 401 || status === 403) {
          return { valid: false, error: 'API 키가 유효하지 않습니다.' };
        }

        const errBody = await response.json().catch(() => ({}));
        return { valid: false, error: errBody?.error?.message || `오류 코드: ${status}` };
      }

      if (provider === 'claude') {
        const model = findModel('claude', modelId);
        const response = await fetchImpl(`${providerConfig.apiBase}/messages`, {
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

        return { valid: response.ok };
      }

      if (provider === 'openai') {
        const model = findModel('openai', modelId);
        const response = await fetchImpl(`${providerConfig.apiBase}/chat/completions`, {
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

        return { valid: response.ok };
      }

      return { valid: false, error: '지원하지 않는 제공자입니다.' };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  function getEnabledProviders() {
    const modelsConfig = loadModelsConfig();
    if (!modelsConfig) return ['설정 로드 실패'];

    return Object.entries(modelsConfig.providers)
      .filter(([, provider]) => provider.enabled)
      .map(([, provider]) => `${provider.label}(${provider.models.map((model) => model.id).join(', ')})`);
  }

  return {
    loadPrompts,
    loadServerConfig,
    loadModelsConfig,
    getProviderConfig,
    findModel,
    fetchWithRetry,
    getModelsResponse,
    getInterviewBasicPrompts,
    arePortfolioUploadsRequested,
    getCapabilitiesResponse,
    validateKey,
    getEnabledProviders,
  };
}
