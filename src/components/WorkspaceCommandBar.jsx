import React from 'react';
import { BookOpen, ChevronDown, KeyRound, Loader2, LogIn, LogOut, Moon, Settings, Sparkles } from 'lucide-react';

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
      <button type="button" onClick={onSelectInput} className="coach-navigator-breadcrumb">
        <span>{currentTrackLabel}</span>
        <em>›</em>
        <strong>{activeLabel}</strong>
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

        <button type="button" onClick={onOpenGuide} title="사용 설명서" aria-label="사용 설명서">
          <BookOpen size={17} />
          <span>사용 설명서</span>
        </button>
        <button type="button" onClick={onOpenSettings} title="설정" aria-label="설정">
          <Settings size={17} />
          <span>설정</span>
        </button>
        <button type="button" onClick={onOpenModelSettings} className="coach-api-command" title={`AI API 키 설정: ${modelSummary}`} aria-label="AI API 키 설정">
          <KeyRound size={17} />
          <span>AI API 연결</span>
        </button>
        <button type="button" onClick={onOpenModelSettings} className="coach-model-command" title={`AI 모델: ${modelSummary}`} aria-label="AI 모델">
          <Sparkles size={17} />
          <span>AI 모델</span>
          <small>{modelSummary}</small>
        </button>
        <button type="button" onClick={onOpenSettings} className="coach-theme-command" title="화면 모드" aria-label="화면 모드">
          <Moon size={20} />
          <span>화면 모드</span>
        </button>
        {!authUser ? (
          <button type="button" onClick={onRequestLogin} className="coach-login-command" title={authEnabled ? '로그인' : '로그인 화면 확인'} aria-label="로그인">
            <LogIn size={17} />
            <span>로그인</span>
          </button>
        ) : null}
        {authUser ? (
          <button type="button" onClick={onSignOut} className="coach-login-command" title="로그아웃" aria-label="로그아웃">
            <LogOut size={17} />
            <span>로그아웃</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
