import React from 'react';

export default function WorkspaceSidebar({
  activeFeatureGuide,
  activeTab,
  navItems,
  results,
  onOpenGuide,
  onSelectTab,
}) {
  return (
    <aside className="coach-side-panel custom-scrollbar" aria-label="작업 안내">
      <section className="coach-side-card coach-side-current">
        <p className="coach-side-eyebrow">기능 설명</p>
        <h2>{activeFeatureGuide.title}</h2>
        <p>{activeFeatureGuide.description}</p>
        <div className="coach-side-actions">
          <button type="button" onClick={onOpenGuide}>사용 방법 보기</button>
          {!results && activeTab !== 'input' && (
            <button type="button" onClick={() => onSelectTab('input')} className="coach-secondary-action">
              정보 입력으로 이동
            </button>
          )}
        </div>
      </section>

      <section className="coach-side-card coach-side-context-card">
        <p className="coach-side-eyebrow">사용 방식</p>
        <strong>각 기능은 독립 메뉴입니다</strong>
        <p>입력, 피드백, 포트폴리오, 공고, 면접, 검사는 서로 따로 열어볼 수 있습니다.</p>
      </section>

      <nav className="coach-side-card coach-side-tools" aria-label="Portfolio Coach 기능 바로가기">
        <p className="coach-side-eyebrow">기능 바로가기</p>
        <p className="coach-side-helper">필요한 메뉴로 바로 이동하세요. 이 목록은 순서표가 아니라 도구 모음입니다.</p>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`coach-side-tool ${isActive ? 'is-active' : ''}`}
            >
              <span className="coach-side-tool-icon"><item.icon size={16} /></span>
              <span className="coach-side-tool-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
