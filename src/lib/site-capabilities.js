import { apiUrl } from './runtime-config.js';

export const CHECKING_SITE_CAPABILITIES = Object.freeze({
  portfolioSubmissions: Object.freeze({
    enabled: null,
    status: 'checking',
  }),
});

export function normalizeSiteCapabilities(payload = {}) {
  const submissionCapability = payload?.portfolioSubmissions || {};
  const enabled = submissionCapability.enabled === true;
  return {
    portfolioSubmissions: {
      enabled,
      status: enabled ? 'ready' : 'not_configured',
    },
  };
}

export async function fetchSiteCapabilities() {
  const response = await fetch(apiUrl('api/capabilities'));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || '기능 준비 상태를 확인하지 못했습니다.');
  }
  return normalizeSiteCapabilities(data);
}
