import React from 'react';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';

export default function ModelSelector({
  enabledProviders,
  disabledProviders: _disabledProviders,
  selectedProvider,
  selectedModelId,
  onProviderChange,
  onModelChange,
  modelsLoading,
  variant = 'sidebar',
}) {
  const currentProvider = enabledProviders.find((provider) => provider.id === selectedProvider);
  const currentModels = currentProvider?.models || [];
  const currentModel = currentModels.find((model) => model.id === selectedModelId) || currentModels[0];

  if (modelsLoading) {
    return (
      <div className={`model-selector-shell model-selector-loading ${variant === 'modal' ? 'model-selector-shell-modal' : ''}`}>
        <Loader2 size={16} className="mx-auto animate-spin text-slate-300" />
        <p className="mt-2 text-[10px] text-slate-400">모델 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className={`model-selector-shell ${variant === 'modal' ? 'model-selector-shell-modal' : ''}`}>
      <div className="model-selector-header">
        <div className="model-selector-title">
          <Sparkles size={15} />
          <span>AI 모델 선택</span>
        </div>
        <p className="model-selector-caption">학생 API 키로 직접 호출할 제공자와 모델을 정합니다.</p>
      </div>

      <div className="model-selector-providers">
        {enabledProviders.map((provider) => (
          <button
            type="button"
            key={provider.id}
            onClick={() => onProviderChange(provider.id)}
            className={`model-selector-provider ${
              selectedProvider === provider.id
                ? 'model-selector-provider-active'
                : 'model-selector-provider-idle'
            }`}
          >
            {provider.label}
          </button>
        ))}
      </div>

      {currentModels.length > 1 && (
        <div className="model-selector-select-wrap">
          <select
            value={selectedModelId}
            onChange={(event) => onModelChange(event.target.value)}
            className="model-selector-select"
          >
            {currentModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label} · {model.description}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="model-selector-chevron" />
        </div>
      )}

      {currentProvider && !currentProvider.supportsFiles && (
        <p className="model-selector-note">PDF 파일 분석은 Gemini에서만 지원됩니다.</p>
      )}

      <div className="model-selector-current">
        <span className="model-selector-current-label">현재 선택</span>
        <p>{currentProvider?.label} · {currentModel?.id || ''}</p>
      </div>
    </div>
  );
}
