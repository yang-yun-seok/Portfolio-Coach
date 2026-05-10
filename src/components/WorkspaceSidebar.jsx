import React from 'react';

export default function WorkspaceSidebar({
  activeTab,
  navItems,
  onSelectTab,
}) {
  return (
    <aside className="coach-side-panel custom-scrollbar" aria-label="작업 안내">
      <nav className="coach-side-card coach-side-tools" aria-label="Portfolio Coach 기능 바로가기">
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
