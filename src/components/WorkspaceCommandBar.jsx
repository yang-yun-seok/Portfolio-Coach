import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Gamepad2, KeyRound, Loader2, LogIn, LogOut, Menu, Settings, UserRound, X } from 'lucide-react';

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
  onOpenAccountName,
  onOpenGuide,
  onOpenModelSettings,
  onOpenSettings,
  onPrefetchTab,
  onRequestLogin,
  onSelectInput,
  onSelectTab,
  onSelectTrack,
  onShowTrackGate,
  onSignOut,
  roleGroups,
  userProfile,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const commandRef = useRef(null);
  const navRef = useRef(null);
  const accountDisplayName = userProfile?.studentName || userProfile?.displayName || authUser?.displayName || authUser?.email || '계정';

  useEffect(() => {
    if (!openMenuId) return undefined;

    const handlePointerDown = (event) => {
      if (!commandRef.current?.contains(event.target)) setOpenMenuId(null);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenMenuId(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenuId]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;

    const revealActiveSection = () => {
      const activeSection = nav.querySelector('.coach-top-nav-menu.is-active');
      if (!activeSection || nav.scrollWidth <= nav.clientWidth) return;

      const leftEdge = activeSection.offsetLeft;
      const rightEdge = leftEdge + activeSection.offsetWidth;
      if (leftEdge < nav.scrollLeft) {
        nav.scrollTo({ left: leftEdge, behavior: 'smooth' });
      } else if (rightEdge > nav.scrollLeft + nav.clientWidth) {
        nav.scrollTo({ left: rightEdge - nav.clientWidth, behavior: 'smooth' });
      }
    };

    const frameId = window.requestAnimationFrame(revealActiveSection);
    window.addEventListener('resize', revealActiveSection);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', revealActiveSection);
    };
  }, [activeTab]);

  const handleToggleMenu = (sectionId) => {
    setOpenMenuId((current) => (current === sectionId ? null : sectionId));
  };

  const handleSelectTab = (tabId) => {
    setOpenMenuId(null);
    onSelectTab(tabId);
  };

  return (
    <header ref={commandRef} className="coach-commandbar">
      <button type="button" onClick={onSelectInput} className="coach-brandlockup">
        <span className="apple-brandmark coach-brandmark bg-indigo-500 p-2 rounded-lg">
          <Gamepad2 size={24} className="text-white" />
        </span>
        <span className="coach-brandcopy">
          <span className="coach-brand-title">Portfolio Coach</span>
          <strong>게임 취업 준비 작업공간</strong>
        </span>
      </button>

      <nav ref={navRef} className="coach-top-nav" aria-label="Portfolio Coach 기능 이동">
        {navSections.map((section) => {
          const sectionActive = section.items.some((item) => item.id === activeTab);
          const isOpen = openMenuId === section.id;
          const menuId = `coach-top-nav-menu-${section.id}`;
          return (
            <div key={section.id} className={`coach-top-nav-menu ${sectionActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`}>
              <button
                type="button"
                className="coach-top-nav-trigger"
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={() => handleToggleMenu(section.id)}
              >
                <span>{section.label}</span>
                {section.items.some((item) => item.badge) ? <i className="coach-nav-attention" aria-label="새 검토 결과" /> : null}
                <ChevronDown size={15} />
              </button>
              {isOpen ? (
                <div id={menuId} className="coach-top-nav-dropdown" role="menu">
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      className={`coach-top-nav-item ${isActive ? 'is-active' : ''}`}
                      onFocus={() => onPrefetchTab?.(item.id)}
                      onMouseEnter={() => onPrefetchTab?.(item.id)}
                      onClick={() => handleSelectTab(item.id)}
                    >
                      <item.icon size={15} />
                      <span>{item.label}</span>
                      {item.badge ? <small className="coach-top-nav-badge">{item.badge}</small> : null}
                    </button>
                  );
                })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        className="coach-mobile-nav-trigger"
        aria-expanded={openMenuId === 'mobile'}
        aria-controls="coach-mobile-nav-sheet"
        onClick={() => handleToggleMenu('mobile')}
      >
        {openMenuId === 'mobile' ? <X size={18} /> : <Menu size={18} />}
        <span>메뉴</span>
        {navSections.some((section) => section.items.some((item) => item.badge)) ? <i className="coach-nav-attention" /> : null}
      </button>

      {openMenuId === 'mobile' ? (
        <nav id="coach-mobile-nav-sheet" className="coach-mobile-nav-sheet" aria-label="모바일 기능 이동">
          {navSections.map((section) => (
            <section key={section.id}>
              <strong>{section.label}</strong>
              <div>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={activeTab === item.id ? 'is-active' : ''}
                    onClick={() => handleSelectTab(item.id)}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                    {item.badge ? <small>{item.badge}</small> : null}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>
      ) : null}

      <div className="coach-command-status" aria-live="polite">
        <div className="coach-command-context">
          <span>{activeSectionLabel}</span>
          <strong>{activeLabel}</strong>
        </div>
        <div className="coach-command-meta">
          <em className="coach-command-track">{currentTrackLabel} 트랙</em>
          <small>{loading ? 'AI 분석 중' : '준비 완료'}</small>
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
            <small>사용자</small>
            <strong>{accountDisplayName}</strong>
          </div>
        ) : null}

        <button type="button" onClick={onOpenGuide} title="사용 설명서" aria-label="사용 설명서">
          <BookOpen size={17} />
          <span>사용 설명서</span>
        </button>
        <button type="button" onClick={onOpenModelSettings} className="coach-model-command" title={`AI API 연결: ${modelSummary}`} aria-label="AI API 연결">
          <KeyRound size={17} />
          <span>AI API 연결</span>
          <small>{modelSummary}</small>
        </button>
        <button type="button" onClick={onOpenSettings} className="coach-settings-command" title="설정" aria-label="설정">
          <Settings size={20} />
          <span>설정</span>
        </button>
        {!authUser ? (
          <button type="button" onClick={onRequestLogin} className="coach-login-command" title={authEnabled ? '로그인' : '로그인 화면 확인'} aria-label="로그인">
            <LogIn size={17} />
            <span>로그인</span>
          </button>
        ) : null}
        {authUser ? (
          <button
            type="button"
            onClick={onOpenAccountName}
            className="coach-login-command"
            title={`이름 설정: ${accountDisplayName}`}
            aria-label="이름 설정"
          >
            <UserRound size={17} />
            <span>이름 설정</span>
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
