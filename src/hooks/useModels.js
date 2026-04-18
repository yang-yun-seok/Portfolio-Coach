import { useState, useEffect } from 'react';
import { staticAssetUrl } from '../lib/runtime-config';

/**
 * 서버에서 모델 목록을 동적으로 로드하는 훅.
 * /api/models 엔드포인트에서 providers 정보를 가져온다.
 */
export function useModels() {
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(staticAssetUrl('api/models.json'));
        if (!res.ok) throw new Error('모델 목록을 불러올 수 없습니다.');
        const data = await res.json();
        if (!cancelled) setProviders(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /**
   * 활성화된 프로바이더 목록 (UI 렌더링용)
   * [{ id, label, color, supportsFiles, models: [...] }]
   */
  const enabledProviders = providers
    ? Object.entries(providers)
        .filter(([, p]) => p.enabled)
        .map(([id, p]) => ({ id, ...p }))
    : [];

  /**
   * 비활성화된 프로바이더 목록 (준비 중 표시용)
   */
  const disabledProviders = providers
    ? Object.entries(providers)
        .filter(([, p]) => !p.enabled)
        .map(([id, p]) => ({ id, ...p }))
    : [];

  /**
   * 특정 프로바이더의 기본 모델 가져오기
   */
  function getDefaultModel(providerId) {
    if (!providers?.[providerId]) return null;
    const models = providers[providerId].models;
    return models.find((m) => m.default) || models[0];
  }

  return {
    providers,
    enabledProviders,
    disabledProviders,
    loading,
    error,
    getDefaultModel,
  };
}
