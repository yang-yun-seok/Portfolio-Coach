import React from 'react';

export default function WorkspaceSidebar({
  activeTab,
  navSections,
  onSelectTab,
  onSelectTrack,
  onShowTrackGate,
  roleDescription,
  roleDetailLabel,
  roleGroup,
  roleGroups,
}) {
  return (
    <aside className="coach-side-panel custom-scrollbar" aria-label="작업 안내">
      <section className="coach-side-card coach-side-current">
        <p className="coach-side-eyebrow">Current Track</p>
        <h2>{roleGroup} 트랙</h2>
        <p>{roleDescription}</p>

        <div className="coach-side-current-meta">
          <span>현재 세부 초점</span>
          <strong>{roleDetailLabel}</strong>
        </div>

        <div className="coach-side-track-switches" role="tablist" aria-label="직군 트랙 선택">
          {roleGroups.map((group) => {
            const isActive = group.label === roleGroup;
            return (
              <button
                key={group.id}
                type="button"
                className={`coach-side-switch-chip ${isActive ? 'is-active' : ''}`}
                onClick={() => onSelectTrack(group.label)}
              >
                {group.label}
              </button>
            );
          })}
        </div>

        <div className="coach-side-actions">
          <button type="button" onClick={onShowTrackGate}>
            트랙 다시 고르기
          </button>
        </div>
      </section>

      <nav className="coach-side-card coach-side-tools" aria-label="Portfolio Coach 기능 바로가기">
        {navSections.map((section) => (
          <section key={section.id} className="coach-side-tool-group" aria-label={section.label}>
            <p className="coach-side-group-title">{section.label}</p>
            {section.items.map((item) => {
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
          </section>
        ))}
      </nav>
    </aside>
  );
}
