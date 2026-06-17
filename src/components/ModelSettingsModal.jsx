import React, { useEffect, useState } from 'react';
import { CheckCircle, KeyRound, Loader2, Sparkles, Trash2, X } from 'lucide-react';
import ModelSelector from './ModelSelector';
import { maskAiApiKey } from '../lib/ai-key-storage';
import { validateAiApiKey } from '../lib/gemini-client';

export default function ModelSettingsModal({
  currentProvider,
  disabledProviders,
  enabledProviders,
  modelsLoading,
  onApiKeyChange,
  onApiKeyDelete,
  onClose,
  onModelChange,
  onProviderChange,
  open,
  providerApiKey,
  selectedModelId,
  selectedProvider,
}) {
  const [draftKey, setDraftKey] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftKey(providerApiKey || '');
    setStatus(providerApiKey ? { type: 'saved', message: `설정된 키: ${maskAiApiKey(providerApiKey)}` } : { type: '', message: '' });
  }, [open, providerApiKey, selectedProvider]);

  if (!open) return null;

  const providerLabel = currentProvider?.label || selectedProvider || 'AI';
  const hasDraftKey = Boolean(draftKey.trim());

  const handleSave = () => {
    onApiKeyChange?.(selectedProvider, draftKey.trim());
    setStatus({
      type: draftKey.trim() ? 'saved' : 'error',
      message: draftKey.trim() ? `설정된 키: ${maskAiApiKey(draftKey)}` : 'API 키가 비어 있습니다.',
    });
  };

  const handleDelete = () => {
    setDraftKey('');
    onApiKeyDelete?.(selectedProvider);
    setStatus({ type: 'deleted', message: 'API 키 설정을 초기화했습니다.' });
  };

  const handleValidate = async () => {
    setValidating(true);
    setStatus({ type: '', message: '' });
    try {
      await validateAiApiKey({
        provider: selectedProvider,
        apiKey: draftKey.trim(),
        modelId: selectedModelId,
      });
      onApiKeyChange?.(selectedProvider, draftKey.trim());
      setStatus({ type: 'ok', message: 'API 키 검증에 성공했습니다.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'API 키 검증에 실패했습니다.' });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Sparkles size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">AI 모델 설정</h2>
              <p className="text-sm text-slate-500">학생 개인 API 키와 사용할 모델을 설정합니다.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 transition-colors hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">Current</p>
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

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <div className="mb-3 flex items-center gap-2">
              <KeyRound size={17} className="text-slate-500" />
              <div>
                <p className="text-sm font-bold text-slate-800">{providerLabel} API 키</p>
                <p className="text-xs text-slate-500">AI 요청에 사용할 개인 키를 입력합니다.</p>
              </div>
            </div>

            <input
              type="password"
              value={draftKey}
              onChange={(event) => {
                setDraftKey(event.target.value);
                setStatus({ type: '', message: '' });
              }}
              placeholder={selectedProvider === 'openai' ? 'sk-...' : 'Gemini API key'}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              autoComplete="off"
            />

            {status.message ? (
              <p className={`mt-2 text-xs ${status.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                {status.message}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleValidate}
                disabled={!hasDraftKey || validating}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {validating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                검증 후 적용
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasDraftKey}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                적용
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={14} />
                삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
