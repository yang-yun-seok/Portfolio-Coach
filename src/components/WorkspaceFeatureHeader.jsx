import React from 'react';

export default function WorkspaceFeatureHeader({
  activeLabel,
  activeSectionLabel,
  activeFeatureGuide,
  ActiveNavIcon,
  roleFocus,
  roleGroup,
}) {
  return (
    <section className="coach-dossier-header">
      <div className="coach-dossier-tab">
        <span className="coach-workbench-icon"><ActiveNavIcon size={20} /></span>
        <div className="coach-dossier-copy">
          <p className="coach-overline">{activeSectionLabel} · {activeLabel}</p>
          <div className="coach-dossier-heading">
            <h2>{activeFeatureGuide.title}</h2>
          </div>
          <p>{activeFeatureGuide.description}</p>
        </div>
      </div>
      <div className="coach-dossier-meta">
        <div>
          <span>트랙</span>
          <strong>{roleGroup}</strong>
        </div>
        <div>
          <span>현재 초점</span>
          <strong>{roleFocus}</strong>
        </div>
        <div>
          <span>이 화면에서 할 일</span>
          <strong>{activeFeatureGuide.hint}</strong>
        </div>
      </div>
    </section>
  );
}
