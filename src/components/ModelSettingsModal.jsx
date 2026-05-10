import React from 'react';
import { Sparkles, X } from 'lucide-react';
import ModelSelector from './ModelSelector';

export default function ModelSettingsModal({
  currentProvider,
  disabledProviders,
  enabledProviders,
  modelsLoading,
  onClose,
  onModelChange,
  onProviderChange,
  open,
  selectedModelId,
  selectedProvider,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg"><Sparkles size={20} className="text-blue-600" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">AI 모델 설정</h2>
              <p className="text-sm text-slate-500">분석에 사용할 엔진과 세부 모델을 조정합니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-sky-600">Current</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {currentProvider?.label || '모델 선택'} {selectedModelId ? `· ${selectedModelId}` : ''}
            </p>
          </div>

          <ModelSelector
            enabledProviders={enabledProviders}
            disabledProviders={disabledProviders}
            selectedProvider={selectedProvider}
            selectedModelId={selectedModelId}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
            modelsLoading={modelsLoading}
            variant="modal"
          />
        </div>
      </div>
    </div>
  );
}
