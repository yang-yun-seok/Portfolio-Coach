import { useState } from 'react';

/**
 * API 호출 공통 훅.
 * 로딩 상태, 에러 처리, JSON 파싱을 일관되게 관리한다.
 */
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function callApi(url, options = {}) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `서버 오류 (${res.status})`);
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  function clearError() {
    setError('');
  }

  return { loading, error, callApi, setError, clearError, setLoading };
}
