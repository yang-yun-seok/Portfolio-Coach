import React from 'react';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';

/**
 * AI 모델 선택 사이드바 위젯.
 * API 키는 Supabase Edge Function(gemini-proxy)이 서버측에서 관리하므로 입력 불필요.
 *
 * Props:
 * - enabledProviders: 활성화된 프로바이더 목록
 * - disabledProviders: 비활성화된 프로바이더 목록
 * - selectedProvider: 현재 선택된 프로바이더 ID
 * - selectedModelId: 현재 선택된 모델 ID
 * - onProviderChange: 프로바이더 변경 콜백
 * - onModelChange: 모델 변경 콜백
 * - modelsLoading: 모델 목록 로딩 중 여부
 */
export default function ModelSelector({
  enabledProviders,
  disabledProviders,
  selectedProvider,
  selectedModelId,
  onProviderChange,
  onModelChange,
  modelsLoading,
}) {
  const currentProvider = enabledProviders.find((p) => p.id === selectedProvider);
  const currentModels = currentProvider?.models || [];
  const currentModel = currentModels.find((m) => m.id === selectedModelId) || currentModels[0];

  if (modelsLoading) {
    return (
      <div className="model-selector-shell model-selector-loading">
        <Loader2 size={16} className="animate-spin text-slate-300 mx-auto" />
        <p className="text-[10px] text-slate-400 mt-2">모델 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="model-selector-shell">
      <div className="model-selector-header">
        <div className="model-selector-title">
          <Sparkles size={15} />
          <span>AI 모델 선택</span>
        </div>
        <p className="model-selector-caption">분석에 사용할 엔진과 세부 모델을 정합니다.</p>
      </div>

      <div className="model-selector-providers">
        {enabledProviders.map((p) => (
          <button
            key={p.id}
            onClick={() => onProviderChange(p.id)}
            className={`model-selector-provider
              ${selectedProvider === p.id
                ? 'model-selector-provider-active'
                : 'model-selector-provider-idle'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {currentModels.length > 1 && (
        <div className="model-selector-select-wrap">
          <select
            value={selectedModelId}
            onChange={(e) => onModelChange(e.target.value)}
            className="model-selector-select"
          >
            {currentModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.description}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="model-selector-chevron" />
        </div>
      )}

      {currentProvider && !currentProvider.supportsFiles && (
        <p className="model-selector-note">※ PDF 업로드는 Gemini만 지원합니다.</p>
      )}

      <div className="model-selector-current">
        <span className="model-selector-current-label">현재 선택</span>
        <p>{currentProvider?.label} · {currentModel?.id || ''}</p>
      </div>
    </div>
  );
}
