import { buildAuthorizedHeaders } from './auth-fetch.js';
import { apiUrl } from './runtime-config.js';

async function readApiResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || fallbackMessage || '관리자 요청을 처리하지 못했습니다.');
  }
  return data;
}

function getResponseFileName(contentDisposition, fallbackName) {
  const encodedMatch = String(contentDisposition || '').match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      // Fall through to the plain filename value.
    }
  }

  const plainMatch = String(contentDisposition || '').match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] || fallbackName;
}

export async function unlockAdminMode(getAccessToken, password) {
  const headers = await buildAuthorizedHeaders(getAccessToken, {
    'Content-Type': 'application/json',
  });
  const response = await fetch(apiUrl('api/admin/unlock'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ password }),
  });
  const data = await readApiResponse(response, '관리자 모드를 열지 못했습니다.');
  return data.ok === true;
}

export async function fetchAdminOverview(getAccessToken) {
  const headers = await buildAuthorizedHeaders(getAccessToken);
  const response = await fetch(apiUrl('api/admin/overview'), {
    headers,
  });
  const data = await readApiResponse(response, '관리자 데이터를 불러오지 못했습니다.');

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
  const data = await readApiResponse(response, '제출 검토 정보를 저장하지 못했습니다.');

  return data.submission || null;
}

export async function updateAdminSubmissionStatuses(getAccessToken, submissionIds, status) {
  const headers = await buildAuthorizedHeaders(getAccessToken, {
    'Content-Type': 'application/json',
  });
  const response = await fetch(apiUrl('api/admin/submissions/bulk'), {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ submissionIds, status }),
  });
  const data = await readApiResponse(response, '제출 상태를 일괄 변경하지 못했습니다.');
  return Array.isArray(data.submissions) ? data.submissions : [];
}

export async function downloadAdminSubmissionFile(getAccessToken, submissionId, fileKey) {
  const headers = await buildAuthorizedHeaders(getAccessToken);
  const response = await fetch(apiUrl(
    `api/admin/submissions/${encodeURIComponent(submissionId)}/files/${encodeURIComponent(fileKey)}`,
  ), { headers });

  if (!response.ok) {
    await readApiResponse(response, '제출 파일을 받지 못했습니다.');
  }

  return {
    blob: await response.blob(),
    fileName: getResponseFileName(
      response.headers.get('Content-Disposition'),
      `${fileKey}.pdf`,
    ),
  };
}

export async function deleteAdminSubmission(getAccessToken, submissionId) {
  const headers = await buildAuthorizedHeaders(getAccessToken, {
    'Content-Type': 'application/json',
  });
  const response = await fetch(apiUrl(`api/admin/submissions/${encodeURIComponent(submissionId)}`), {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ confirmSubmissionId: submissionId }),
  });
  const data = await readApiResponse(response, '제출 내역을 정리하지 못했습니다.');

  return {
    deletedSubmission: data.deletedSubmission || null,
    deletedFileCount: Number(data.deletedFileCount) || 0,
    releasedStorageBytes: Number(data.releasedStorageBytes) || 0,
  };
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
  const data = await readApiResponse(response, '계정 상태를 변경하지 못했습니다.');

  return data.user || null;
}
