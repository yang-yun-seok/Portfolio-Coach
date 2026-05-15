export async function buildAuthorizedHeaders(getAccessToken, baseHeaders = {}) {
  const headers = {
    ...baseHeaders,
  };

  if (typeof getAccessToken === 'function') {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

