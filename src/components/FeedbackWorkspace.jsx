import React from 'react';
import { Briefcase, CheckCircle2, FileText, Target } from 'lucide-react';
import { getProfileDisplayRole } from '../data/skills';
import AnalysisHistoryPanel from './AnalysisHistoryPanel';

function FeedbackList({ icon: Icon, iconTone, items, parseFeedbackItem, title, subtitle }) {
  return (
    <section className="coach-review-surface coach-review-doc-panel">
      <div className="coach-review-section-head">
        <div>
          <p className="coach-review-eyebrow">{subtitle}</p>
          <h3>{title}</h3>
        </div>
      </div>

      <ul className="coach-review-list">
        {Array.isArray(items) && items.length > 0 ? (
          items.map((item, index) => {
            const { title: itemTitle, body } = parseFeedbackItem(item);
            return (
              <li key={`${title}-${index}`} className="coach-review-list-row">
                <span className={`coach-review-list-icon ${iconTone}`}>
                  <Icon size={15} />
                </span>
                <div className="coach-review-list-copy">
                  {itemTitle ? <p className="coach-review-list-title">{itemTitle}</p> : null}
                  {body ? <p className="coach-review-list-body">{body}</p> : null}
                </div>
              </li>
            );
          })
        ) : (
          <li className="coach-review-empty-inline">아직 정리된 피드백이 없습니다.</li>
        )}
      </ul>
    </section>
  );
}

export default function FeedbackWorkspace({
  analysisHistory,
  formatSavedAt,
  highlightedMatchedSkills,
  historyComparison,
  lastSavedAt,
  loadHistorySnapshot,
  normalizedUserInfo,
  parseFeedbackItem,
  pinnedSlots,
  recommendedJobs,
  resultPlaybook,
  results,
  selectedHistoryEntry,
  selectedHistoryId,
  selectedRoleDetail,
  setSelectedHistoryId,
  topRecommendedJobs,
  userInfo,
}) {
  const resumeItems = Array.isArray(results.resumeImprovements) ? results.resumeImprovements : [];
  const coverItems = results.coverLetterImprovements?.common
    ?? (Array.isArray(results.coverLetterImprovements) ? results.coverLetterImprovements : []);
  const strongSkills = highlightedMatchedSkills.length > 0
    ? highlightedMatchedSkills
    : userInfo.skills.map((skill) => skill.name).slice(0, 5);
  const roleLabel = getProfileDisplayRole(normalizedUserInfo);
  const topCompanies = topRecommendedJobs.slice(0, 3);
  const hasPinnedCustom = pinnedSlots.some((slot) => slot.status === 'resolved' && slot.job);

  const customSections = [
    { key: 'rank1', rankLabel: '1순위 공고', theme: 'is-sky' },
    { key: 'rank2', rankLabel: '2순위 공고', theme: 'is-emerald' },
    { key: 'rank3', rankLabel: '3순위 공고', theme: 'is-amber' },
  ];

  const uniqueCustomSections = (() => {
    const seen = new Set();
    return customSections.filter(({ key, rankLabel }) => {
      const index = Number.parseInt(key.replace('rank', ''), 10) - 1;
      const company = recommendedJobs[index]?.company || rankLabel;
      if (seen.has(company)) return false;
      seen.add(company);
      return true;
    });
  })();

  return (
    <div className="coach-review-page">
      <section className="coach-review-shell">
        <div className="coach-review-header">
          <div className="coach-review-header-main">
            <p className="coach-review-eyebrow">서류 피드백</p>
            <h2>{resultPlaybook.feedbackTitle}</h2>
            <p>{resultPlaybook.feedbackDescription}</p>
          </div>

          <div className="coach-review-meta-grid">
            <article className="coach-review-meta-card">
              <p className="coach-review-meta-label">지원 방향</p>
              <strong>{roleLabel}</strong>
              <p>{selectedRoleDetail.focus}</p>
            </article>
            <article className="coach-review-meta-card">
              <p className="coach-review-meta-label">우선 연결 공고</p>
              <strong>{topCompanies.length > 0 ? `${topCompanies.length}개 확인` : '미설정'}</strong>
              <div className="coach-review-chip-row">
                {topCompanies.length > 0 ? topCompanies.map((job, index) => (
                  <span key={`${job.id}-${index}`}>{index + 1}. {job.company}</span>
                )) : (
                  <span className="is-muted">추천 공고를 계산하면 여기서 바로 비교합니다.</span>
                )}
              </div>
            </article>
            <article className="coach-review-meta-card">
              <p className="coach-review-meta-label">강하게 연결되는 역량</p>
              <strong>{strongSkills.length > 0 ? `${strongSkills.length}개 포인트` : '대기 중'}</strong>
              <div className="coach-review-chip-row">
                {strongSkills.length > 0 ? strongSkills.map((skill) => (
                  <span key={skill}>{skill}</span>
                )) : (
                  <span className="is-muted">분석 후 상위 연결 역량이 여기에 정리됩니다.</span>
                )}
              </div>
            </article>
          </div>
        </div>
      </section>

      <AnalysisHistoryPanel
        analysisHistory={analysisHistory}
        selectedHistoryId={selectedHistoryId}
        selectedHistoryEntry={selectedHistoryEntry}
        lastSavedAt={lastSavedAt}
        historyComparison={historyComparison}
        formatSavedAt={formatSavedAt}
        onSelectHistory={setSelectedHistoryId}
        onLoadHistory={loadHistorySnapshot}
        onResetComparison={() => setSelectedHistoryId('')}
      />

      <div className="coach-review-doc-grid">
        <FeedbackList
          icon={FileText}
          iconTone="is-blue"
          items={resumeItems}
          parseFeedbackItem={parseFeedbackItem}
          title={resultPlaybook.feedbackSectionTitles.resume}
          subtitle="이력서"
        />
        <FeedbackList
          icon={Briefcase}
          iconTone="is-violet"
          items={coverItems}
          parseFeedbackItem={parseFeedbackItem}
          title={resultPlaybook.feedbackSectionTitles.cover}
          subtitle="자기소개서"
        />
      </div>

      {results.coverLetterImprovements && !Array.isArray(results.coverLetterImprovements) ? (
        <section className="coach-review-surface">
          <div className="coach-review-section-head">
            <div>
              <p className="coach-review-eyebrow">공고 맞춤 피드백</p>
              <h3>{resultPlaybook.feedbackSectionTitles.custom}</h3>
            </div>
            <span className="coach-review-badge">
              <Target size={14} />
              우선 공고 기준
            </span>
          </div>

          {!hasPinnedCustom ? (
            <div className="coach-review-empty-box">
              <p className="coach-review-empty-title">우선 공고를 지정하면 공고 맞춤 피드백이 열립니다.</p>
              <p className="coach-review-empty-body">
                정보 입력 탭 아래 우선 공고 영역에서 GameJob 공고 번호를 연결하면, 해당 공고 기준으로 서류 수정 포인트를 따로
                정리합니다.
              </p>
            </div>
          ) : null}

          {hasPinnedCustom ? (
            <div className="coach-review-target-grid">
              {uniqueCustomSections.map(({ key, rankLabel, theme }) => {
                const items = results.coverLetterImprovements?.[key] ?? [];
                const index = Number.parseInt(key.replace('rank', ''), 10) - 1;
                const companyName = recommendedJobs[index]?.company ?? rankLabel;

                return (
                  <article key={key} className={`coach-review-target-card ${theme}`}>
                    <div className="coach-review-target-head">
                      <span>{rankLabel}</span>
                      <strong>{companyName}</strong>
                    </div>
                    <ul className="coach-review-list">
                      {items.length > 0 ? (
                        items.slice(0, 2).map((item, itemIndex) => {
                          const { title, body } = parseFeedbackItem(item);
                          return (
                            <li key={`${key}-${itemIndex}`} className="coach-review-list-row">
                              <span className="coach-review-list-icon is-neutral">
                                <CheckCircle2 size={15} />
                              </span>
                              <div className="coach-review-list-copy">
                                {title ? <p className="coach-review-list-title">{title}</p> : null}
                                {body ? <p className="coach-review-list-body">{body}</p> : null}
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        <li className="coach-review-empty-inline">아직 정리된 맞춤 항목이 없습니다.</li>
                      )}
                    </ul>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
