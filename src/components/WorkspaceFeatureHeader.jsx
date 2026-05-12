import React from 'react';

export default function WorkspaceFeatureHeader({
  activeLabel,
  activeFeatureGuide,
  ActiveNavIcon,
  roleFocus,
  roleGroup,
}) {
  return (
    <>
      <section className="coach-dossier-header">
        <div className="coach-dossier-tab">
          <span className="coach-workbench-icon"><ActiveNavIcon size={20} /></span>
          <div className="coach-dossier-copy">
            <p className="coach-overline">기능 화면</p>
            <div className="coach-dossier-heading">
              <h2>{activeLabel}</h2>
              <span className="coach-track-pill">{roleGroup} 트랙</span>
            </div>
            <p>{activeFeatureGuide.description}</p>
            <div className="coach-dossier-notes">
              <span>{roleFocus}</span>
              <span>{activeFeatureGuide.hint}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="coach-content-brief">
        <div>
          <span>기능 설명</span>
          <strong>{activeLabel}</strong>
        </div>
        <p>{activeFeatureGuide.hint}</p>
      </section>
    </>
  );
}
