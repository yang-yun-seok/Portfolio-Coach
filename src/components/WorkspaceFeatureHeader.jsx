import React from 'react';

export default function WorkspaceFeatureHeader({
  activeLabel,
  activeFeatureGuide,
  ActiveNavIcon,
}) {
  return (
    <>
      <section className="coach-dossier-header">
        <div className="coach-dossier-tab">
          <span className="coach-workbench-icon"><ActiveNavIcon size={20} /></span>
          <div>
            <p className="coach-overline">기능 화면</p>
            <h2>{activeLabel}</h2>
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
