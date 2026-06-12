import React from 'react';
import { BookOpen, ChevronDown, Gamepad2, Loader2, LogIn, LogOut, Settings, Sparkles } from 'lucide-react';

export default function WorkspaceCommandBar({
  activeTab,
  activeLabel,
  activeSectionLabel,
  authEnabled,
  authUser,
  currentTrackLabel,
  loading,
  modelSummary,
  navSections,
  onOpenGuide,
  onOpenModelSettings,
  onOpenSettings,
  onRequestLogin,
  onSelectInput,
  onSelectTab,
  onSelectTrack,
  onShowTrackGate,
  onSignOut,
  roleGroups,
}) {
  return (
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

      <nav className="coach-top-nav" aria-label="Portfolio Coach 기능 이동">
        {navSections.map((section) => {
          const sectionActive = section.items.some((item) => item.id === activeTab);
          return (
            <details key={section.id} className={`coach-top-nav-menu ${sectionActive ? 'is-active' : ''}`}>
              <summary>
                <span>{section.label}</span>
                <ChevronDown size={15} />
              </summary>
              <div className="coach-top-nav-dropdown">
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`coach-top-nav-item ${isActive ? 'is-active' : ''}`}
                      onClick={() => onSelectTab(item.id)}
                    >
                      <item.icon size={15} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </details>
          );
        })}
      </nav>

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
        <details className="coach-track-menu">
          <summary>
            <span>{currentTrackLabel}</span>
            <ChevronDown size={15} />
          </summary>
          <div className="coach-track-dropdown">
            {roleGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={group.label === currentTrackLabel ? 'is-active' : ''}
                onClick={() => onSelectTrack(group.label)}
              >
                {group.label}
              </button>
            ))}
            <button type="button" className="coach-track-reset" onClick={onShowTrackGate}>
              트랙 다시 고르기
            </button>
          </div>
        </details>

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
        {authEnabled && !authUser ? (
          <button type="button" onClick={onRequestLogin}>
            <LogIn size={17} />
            <span>로그인</span>
          </button>
        ) : null}
        {authUser ? (
          <button type="button" onClick={onSignOut}>
            <LogOut size={17} />
            <span>로그아웃</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
