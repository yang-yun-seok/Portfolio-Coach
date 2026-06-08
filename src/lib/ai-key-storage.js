const STORAGE_KEY = 'portfolio-coach-ai-api-keys-v1';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function loadAiApiKeys() {
  if (!canUseStorage()) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveAiApiKeys(keys) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys || {}));
}

export function getAiApiKey(keys, providerId) {
  return String(keys?.[providerId] || '').trim();
}

export function hasAiApiKey(keys, providerId) {
  return Boolean(getAiApiKey(keys, providerId));
}

export function maskAiApiKey(value) {
  const key = String(value || '').trim();
  if (!key) return '';
  if (key.length <= 10) return `${key.slice(0, 2)}****${key.slice(-2)}`;
  return `${key.slice(0, 6)}****${key.slice(-4)}`;
}
