import React from 'react';
import { getSnapshotMeta } from '../lib/analysis-history';

export default function AnalysisHistoryPanel({
  analysisHistory,
  selectedHistoryId,
  selectedHistoryEntry,
  lastSavedAt,
  historyComparison,
  formatSavedAt,
  onSelectHistory,
  onLoadHistory,
  onResetComparison,
}) {
  if (!Array.isArray(analysisHistory) || analysisHistory.length === 0) return null;

  return (
    <div className="coach-history-panel">
      <aside className="coach-history-list-panel">
        <p className="coach-review-eyebrow">분석 이력</p>
        <h3>최근 분석 기록</h3>
        <p className="coach-history-copy">
          현재 결과와 이전 결과를 비교하거나, 필요한 시점의 분석 기록을 다시 불러올 수 있습니다.
        </p>

        <div className="coach-history-list">
          {analysisHistory.map((entry, idx) => {
            const meta = entry.meta || getSnapshotMeta(entry);
            const isSelected = selectedHistoryId === entry.id || (!selectedHistoryId && idx === 1);
            const isCurrent = Boolean(lastSavedAt && entry.savedAt === lastSavedAt);

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectHistory(entry.id)}
                className={`coach-history-item ${isSelected ? 'is-selected' : ''}`}
              >
                <div className="coach-history-item-head">
                  <div>
                    <p className="coach-history-item-label">{idx === 0 ? '최신 결과' : `기록 ${analysisHistory.length - idx}`}</p>
                    <strong>{formatSavedAt(entry.savedAt) || '시점 정보 없음'}</strong>
                    <p>{meta.roleLabel} · {meta.subRole || '세부 직무 미설정'}</p>
                  </div>

                  <div className="coach-history-item-flags">
                    {isCurrent ? <span>현재</span> : null}
                    {meta.hasGithub ? <span>GitHub</span> : null}
                  </div>
                </div>

                <div className="coach-review-chip-row">
                  {(meta.topCompanies.length > 0 ? meta.topCompanies.slice(0, 3) : ['추천 공고 정보 없음']).map((company) => (
                    <span key={`${entry.id}-${company}`}>{company}</span>
                  ))}
                </div>

                <p className="coach-history-item-score">
                  {typeof meta.topScore === 'number' ? `1순위 매칭 ${meta.topScore}점` : '매칭 점수 정보 없음'}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="coach-history-compare-panel">
        <p className="coach-review-eyebrow">비교 보기</p>
        <h3>현재 결과 비교</h3>

        {historyComparison ? (
          <>
            <p className="coach-history-copy">
              비교 기준: {formatSavedAt(historyComparison.compareSavedAt) || '이전 분석 기록'} · {historyComparison.compareMeta.roleLabel}
            </p>

            <div className="coach-history-metric-grid">
              {[
                { label: '현재 직군', value: historyComparison.currentMeta.roleLabel },
                { label: '이전 1순위 공고', value: historyComparison.compareMeta.topCompanies[0] || '없음' },
                { label: 'GitHub 상태', value: historyComparison.githubStatus },
              ].map((item) => (
                <article key={item.label} className="coach-history-metric-card">
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>

            <div className="coach-history-highlight-box">
              <p className="coach-history-highlight-title">핵심 변화</p>
              <ul>
                {historyComparison.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="coach-history-actions">
              <button type="button" onClick={() => onLoadHistory(selectedHistoryEntry)} className="coach-history-action is-primary">
                이 버전 불러오기
              </button>
              <button type="button" onClick={onResetComparison} className="coach-history-action">
                비교 해제
              </button>
            </div>
          </>
        ) : (
          <div className="coach-review-empty-box">
            <p className="coach-review-empty-title">비교할 이전 분석 기록이 아직 없습니다.</p>
            <p className="coach-review-empty-body">
              한 번 더 분석을 실행하면 여기서 현재 결과와 이전 결과의 차이를 바로 확인할 수 있습니다.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
