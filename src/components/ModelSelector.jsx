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
      <div className="p-4 border-t border-slate-800 text-center">
        <Loader2 size={16} className="animate-spin text-slate-400 mx-auto" />
        <p className="text-[10px] text-slate-500 mt-1">모델 로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-slate-800 space-y-3">
      <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
        <Sparkles size={15} /> AI 모델 선택
      </div>

      {/* 프로바이더 버튼 (활성화된 것) */}
      <div className="flex gap-1.5">
        {enabledProviders.map((p) => (
          <button
            key={p.id}
            onClick={() => onProviderChange(p.id)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors border
              ${selectedProvider === p.id
                ? `${p.color} text-white border-transparent`
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}
          >
            {p.label}
          </button>
        ))}
        {/* 비활성 프로바이더는 표시하지 않음 */}
      </div>

      {/* 모델 드롭다운 */}
      {currentModels.length > 1 && (
        <div className="relative">
          <select
            value={selectedModelId}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
          >
            {currentModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.description}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        </div>
      )}

      {/* 파일 지원 안내 */}
      {currentProvider && !currentProvider.supportsFiles && (
        <p className="text-amber-400 text-[10px] leading-tight">※ PDF 업로드는 Gemini만 지원</p>
      )}

      {/* 현재 선택된 모델 정보 */}
      <p className="text-[10px] text-slate-500 text-center">
        {currentProvider?.label} · {currentModel?.id || ''}
      </p>
    </div>
  );
}
