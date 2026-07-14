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

export async function updateAdminSubmissionReview(getAccessToken, submissionId, payload) {
  const headers = await buildAuthorizedHeaders(getAccessToken, {
    'Content-Type': 'application/json',
  });
  const response = await fetch(apiUrl(`api/admin/submissions/${encodeURIComponent(submissionId)}`), {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || '제출 검토 정보를 저장하지 못했습니다.');
  }

  return data.submission || null;
}

export async function updateAdminUserAccess(getAccessToken, uid, active) {
  const headers = await buildAuthorizedHeaders(getAccessToken, {
    'Content-Type': 'application/json',
  });
  const response = await fetch(apiUrl(`api/admin/users/${encodeURIComponent(uid)}`), {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ active }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || '계정 상태를 변경하지 못했습니다.');
  }

  return data.user || null;
}
