import { buildAuthorizedHeaders } from './auth-fetch';
import { apiUrl } from './runtime-config';

export async function listMyPortfolioSubmissions(getAccessToken) {
  const headers = await buildAuthorizedHeaders(getAccessToken);
  const response = await fetch(apiUrl('api/me/submissions'), { headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || '제출 이력을 불러오지 못했습니다.');
  }

  return Array.isArray(data.submissions) ? data.submissions : [];
}
