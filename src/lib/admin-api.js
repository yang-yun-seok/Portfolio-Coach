import { buildAuthorizedHeaders } from './auth-fetch';
import { apiUrl } from './runtime-config';

export async function fetchAdminOverview(getAccessToken) {
  const headers = await buildAuthorizedHeaders(getAccessToken);
  const response = await fetch(apiUrl('api/admin/overview'), {
    headers,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || '관리자 데이터를 불러오지 못했습니다.');
  }

  return {
    summary: data.summary || {},
    submissions: Array.isArray(data.submissions) ? data.submissions : [],
    users: Array.isArray(data.users) ? data.users : [],
  };
}
