import { apiUrl } from './runtime-config.js';

export const CHECKING_SITE_CAPABILITIES = Object.freeze({
  portfolioSubmissions: Object.freeze({
    enabled: null,
    status: 'checking',
  }),
});

const SUBMISSION_CAPABILITY_STATUSES = new Set([
  'admin_not_configured',
  'bucket_missing',
  'not_configured',
  'storage_unavailable',
]);

export function normalizeSiteCapabilities(payload = {}) {
  const submissionCapability = payload?.portfolioSubmissions || {};
  const enabled = submissionCapability.enabled === true;
  return {
    portfolioSubmissions: {
      enabled,
      status: enabled
        ? 'ready'
        : SUBMISSION_CAPABILITY_STATUSES.has(submissionCapability.status)
          ? submissionCapability.status
          : 'not_configured',
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
