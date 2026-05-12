import React from 'react';
import { BookOpen, Gamepad2, Loader2, Settings, Sparkles } from 'lucide-react';

export default function WorkspaceCommandBar({
  activeLabel,
  currentTrackLabel,
  loading,
  modelSummary,
  onOpenGuide,
  onOpenModelSettings,
  onOpenSettings,
  onSelectInput,
}) {
  return (
    <>
      <header className="coach-commandbar">
        <button type="button" onClick={onSelectInput} className="coach-brandlockup">
          <span className="apple-brandmark coach-brandmark bg-indigo-500 p-2 rounded-lg">
            <Gamepad2 size={24} className="text-white" />
          </span>
          <span className="coach-brandcopy">
            <span className="coach-brand-title">Portfolio Coach</span>
            <strong>Game Career Workbench</strong>
          </span>
        </button>

        <div className="coach-command-status" aria-live="polite">
          <span>{loading ? 'AI 분석' : '현재 작업'}</span>
          <strong>{activeLabel}</strong>
          <em className="coach-command-track">{currentTrackLabel} 트랙</em>
          {loading && <Loader2 size={16} className="animate-spin" />}
        </div>

        <div className="coach-command-tools">
          <button type="button" onClick={onOpenGuide}>
            <BookOpen size={17} />
            <span>사용 설명서</span>
          </button>
          <button type="button" onClick={onOpenSettings}>
            <Settings size={17} />
            <span>설정</span>
          </button>
          <button type="button" onClick={onOpenModelSettings} className="coach-model-command">
            <Sparkles size={17} />
            <span>AI 모델</span>
            <small>{modelSummary}</small>
          </button>
        </div>
      </header>

      <div className="coach-mobile-tools">
        <button type="button" onClick={onOpenGuide}>
          <BookOpen size={16} /> 사용 설명서
        </button>
        <button type="button" onClick={onOpenSettings}>
          <Settings size={16} /> 설정
        </button>
        <button type="button" onClick={onOpenModelSettings}>
          <Sparkles size={16} /> AI 모델
        </button>
      </div>
    </>
  );
}
