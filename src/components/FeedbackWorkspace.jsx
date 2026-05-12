import React from 'react';
import { Briefcase, CheckCircle, FileText, Target } from 'lucide-react';
import { getProfileDisplayRole } from '../data/skills';
import AnalysisHistoryPanel from './AnalysisHistoryPanel';

function FeedbackList({ icon: Icon, iconTone, items, parseFeedbackItem, title }) {
  return (
    <section className="coach-feedback-doc-card">
      <div className="coach-feedback-doc-head">
        <h3>
          <Icon size={18} className={`coach-feedback-doc-icon ${iconTone}`} />
          {title}
        </h3>
      </div>
      <ul className="coach-feedback-doc-list">
        {Array.isArray(items) && items.length > 0 ? (
          items.map((item, index) => {
            const { title: itemTitle, body } = parseFeedbackItem(item);
            return (
              <li key={`${title}-${index}`}>
                <CheckCircle size={16} className={`coach-feedback-doc-icon ${iconTone}`} />
                <div>
                  {itemTitle ? <p className="coach-feedback-doc-title">{itemTitle}</p> : null}
                  {body ? <p className="coach-feedback-doc-body">{body}</p> : null}
                </div>
              </li>
            );
          })
        ) : (
          <li className="coach-feedback-doc-empty">관련 내용이 아직 정리되지 않았습니다.</li>
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

  const customSections = [
    { key: 'rank1', rankLabel: '1순위', theme: 'is-sky' },
    { key: 'rank2', rankLabel: '2순위', theme: 'is-emerald' },
    { key: 'rank3', rankLabel: '3순위', theme: 'is-amber' },
  ];

  const hasPinnedCustom = pinnedSlots.some((slot) => slot.status === 'resolved' && slot.job);
  const uniqueCustomSections = (() => {
    const seen = new Set();
    return customSections.filter(({ key }) => {
      const company = recommendedJobs[parseInt(key.replace('rank', ''), 10) - 1]?.company;
      if (!company || seen.has(company)) return false;
      seen.add(company);
      return true;
    });
  })();

  return (
    <div className="coach-feedback-workspace apple-view animate-in fade-in slide-in-from-bottom-4">
      <section className="coach-feedback-hero">
        <div className="coach-feedback-hero-copy">
          <p className="coach-feedback-kicker">DOCUMENT REVIEW</p>
          <h2>{resultPlaybook.feedbackTitle}</h2>
          <p>{resultPlaybook.feedbackDescription}</p>
        </div>

        <div className="coach-feedback-hero-context">
          <article className="coach-feedback-context-card is-dark">
            <p className="coach-feedback-kicker">CURRENT REVIEW</p>
            <h3>{roleLabel}</h3>
            <p>{selectedRoleDetail.focus}</p>
          </article>

          <article className="coach-feedback-context-card">
            <p className="coach-feedback-kicker">TOP TARGETS</p>
            <div className="coach-feedback-chip-list">
              {topCompanies.length > 0 ? topCompanies.map((job, index) => (
                <span key={`${job.id}-${index}`}>{index + 1}. {job.company}</span>
              )) : (
                <span className="is-muted">추천 공고를 먼저 계산하면 여기서 우선 후보를 바로 볼 수 있습니다.</span>
              )}
            </div>
          </article>

          <article className="coach-feedback-context-card">
            <p className="coach-feedback-kicker">STRONG SIGNALS</p>
            <div className="coach-feedback-chip-list">
              {strongSkills.length > 0 ? strongSkills.map((skill) => (
                <span key={skill}>{skill}</span>
              )) : (
                <span className="is-muted">보유 기술을 입력한 뒤 분석하면 강조 신호를 여기에서 정리합니다.</span>
              )}
            </div>
          </article>
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

      <section className="coach-feedback-lens">
        <div className="coach-feedback-section-head">
          <div>
            <p className="coach-feedback-kicker">REVIEW LENS</p>
            <h3>이번 수정에서 먼저 보는 기준</h3>
          </div>
        </div>

        <div className="coach-feedback-lens-grid">
          {resultPlaybook.feedbackCards.map((card, index) => (
            <article key={card.label} className="coach-feedback-lens-card">
              <div className="coach-feedback-lens-index">{String(index + 1).padStart(2, '0')}</div>
              <div>
                <p className="coach-feedback-lens-label">{card.label}</p>
                <h4>{card.title}</h4>
                <p>{card.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="coach-feedback-doc-grid">
        <FeedbackList
          icon={FileText}
          iconTone="is-blue"
          items={resumeItems}
          parseFeedbackItem={parseFeedbackItem}
          title={resultPlaybook.feedbackSectionTitles.resume}
        />
        <FeedbackList
          icon={Briefcase}
          iconTone="is-violet"
          items={coverItems}
          parseFeedbackItem={parseFeedbackItem}
          title={resultPlaybook.feedbackSectionTitles.cover}
        />
      </div>

      {results.coverLetterImprovements && !Array.isArray(results.coverLetterImprovements) ? (
        <section className="coach-feedback-custom">
          <div className="coach-feedback-section-head">
            <div>
              <p className="coach-feedback-kicker">TARGETED NOTES</p>
              <h3>{resultPlaybook.feedbackSectionTitles.custom}</h3>
            </div>
            <span className="coach-feedback-head-pill">
              <Target size={14} />
              공고 맞춤
            </span>
          </div>

          {!hasPinnedCustom ? (
            <div className="coach-feedback-empty-panel">
              <p className="coach-feedback-empty-title">우선 공고를 지정하면 맞춤 피드백이 열립니다.</p>
              <p className="coach-feedback-empty-body">
                정보 입력 탭 아래의 우선 공고 지정 영역에서 GameJob 공고 번호를 입력하면 이 영역을 채울 수 있습니다.
              </p>
            </div>
          ) : null}

          {hasPinnedCustom ? (
            <div className="coach-feedback-custom-grid">
              {uniqueCustomSections.map(({ key, rankLabel, theme }) => {
                const items = results.coverLetterImprovements?.[key] ?? [];
                const companyName = recommendedJobs[parseInt(key.replace('rank', ''), 10) - 1]?.company ?? `${rankLabel} 공고`;

                return (
                  <article key={key} className={`coach-feedback-custom-card ${theme}`}>
                    <div className="coach-feedback-custom-head">
                      <span>{rankLabel}</span>
                      <strong>{companyName}</strong>
                    </div>
                    <ul className="coach-feedback-custom-list">
                      {items.length > 0 ? (
                        items.slice(0, 2).map((item, index) => {
                          const { title, body } = parseFeedbackItem(item);
                          return (
                            <li key={`${key}-${index}`}>
                              <CheckCircle size={16} />
                              <div>
                                {title ? <p className="coach-feedback-doc-title">{title}</p> : null}
                                {body ? <p className="coach-feedback-doc-body">{body}</p> : null}
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        <li className="coach-feedback-doc-empty">아직 정리된 맞춤 항목이 없습니다.</li>
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
