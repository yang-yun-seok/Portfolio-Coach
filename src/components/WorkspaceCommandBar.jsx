import React from 'react';
import { BookOpen, Gamepad2, Loader2, LogOut, Settings, Sparkles } from 'lucide-react';

export default function WorkspaceCommandBar({
  activeLabel,
  activeSectionLabel,
  authUser,
  currentTrackLabel,
  loading,
  modelSummary,
  onOpenGuide,
  onOpenModelSettings,
  onOpenSettings,
  onSelectInput,
  onSignOut,
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
            <strong>게임 취업 준비 작업공간</strong>
          </span>
        </button>

        <div className="coach-command-status" aria-live="polite">
          <div className="coach-command-context">
            <span>{activeSectionLabel}</span>
            <strong>{activeLabel}</strong>
          </div>
          <div className="coach-command-meta">
            <em className="coach-command-track">{currentTrackLabel} 트랙</em>
            <small>{loading ? 'AI 분석 중' : '로컬 상태 보존 중'}</small>
            {loading && <Loader2 size={16} className="animate-spin" />}
          </div>
        </div>

        <div className="coach-command-tools">
          {authUser?.email ? (
            <div className="coach-command-account">
              <small>로그인 계정</small>
              <strong>{authUser.email}</strong>
            </div>
          ) : null}

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
          {authUser ? (
            <button type="button" onClick={onSignOut}>
              <LogOut size={17} />
              <span>로그아웃</span>
            </button>
          ) : null}
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
        {authUser ? (
          <button type="button" onClick={onSignOut}>
            <LogOut size={16} /> 로그아웃
          </button>
        ) : null}
      </div>
    </>
  );
}
