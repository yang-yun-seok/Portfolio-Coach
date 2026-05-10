import React from 'react';
import { Briefcase, CheckCircle, FileText, Target } from 'lucide-react';
import { getProfileDisplayRole } from '../data/skills';
import AnalysisHistoryPanel from './AnalysisHistoryPanel';

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
  return (
    <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="apple-intro">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{resultPlaybook.feedbackTitle}</h2>
        <p className="text-slate-500">{resultPlaybook.feedbackDescription}</p>
      </div>

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

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4 md:grid-cols-3">
          {resultPlaybook.feedbackCards.map((card) => (
            <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
              <h3 className="mt-2 text-base font-bold leading-snug text-slate-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
            </article>
          ))}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Current Review</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight">{getProfileDisplayRole(normalizedUserInfo)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{selectedRoleDetail.focus}</p>
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-200">우선 확인할 공고</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(topRecommendedJobs.length > 0 ? topRecommendedJobs : []).map((job, idx) => (
                  <span key={`${job.id}-${idx}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
                    {idx + 1}. {job.company}
                  </span>
                ))}
                {topRecommendedJobs.length === 0 && (
                  <span className="text-xs text-slate-400">추천 공고가 아직 없습니다.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">현재 강조할 역량</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(highlightedMatchedSkills.length > 0 ? highlightedMatchedSkills : userInfo.skills.map((skill) => skill.name).slice(0, 5)).map((skill) => (
                  <span key={skill} className="rounded-full bg-sky-400/15 px-3 py-1.5 text-xs text-sky-100">
                    {skill}
                  </span>
                ))}
                {highlightedMatchedSkills.length === 0 && userInfo.skills.length === 0 && (
                  <span className="text-xs text-slate-400">직무 역량을 추가하면 여기서 우선 강조 포인트를 보여줍니다.</span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" /> {resultPlaybook.feedbackSectionTitles.resume}
          </h3>
          <ul className="space-y-4">
            {Array.isArray(results.resumeImprovements) && results.resumeImprovements.length > 0
              ? results.resumeImprovements.map((item, idx) => {
                  const { title, body } = parseFeedbackItem(item);
                  return (
                    <li key={idx} className="flex items-start gap-2 text-slate-700 text-sm leading-relaxed">
                      <CheckCircle size={18} className="text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        {title && <p className="font-semibold text-slate-800 mb-0.5">{title}</p>}
                        {body && <p className="text-slate-600">{body}</p>}
                      </div>
                    </li>
                  );
                })
              : <li className="text-slate-400 text-sm">관련 내용이 없습니다.</li>}
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Briefcase size={20} className="text-purple-500" /> {resultPlaybook.feedbackSectionTitles.cover}
          </h3>
          <ul className="space-y-4">
            {(() => {
              const items = results.coverLetterImprovements?.common
                ?? (Array.isArray(results.coverLetterImprovements) ? results.coverLetterImprovements : []);
              return items.length > 0
                ? items.map((item, idx) => {
                    const { title, body } = parseFeedbackItem(item);
                    return (
                      <li key={idx} className="flex items-start gap-2 text-slate-700 text-sm leading-relaxed">
                        <CheckCircle size={18} className="text-purple-500 mt-0.5 shrink-0" />
                        <div>
                          {title && <p className="font-semibold text-slate-800 mb-0.5">{title}</p>}
                          {body && <p className="text-slate-600">{body}</p>}
                        </div>
                      </li>
                    );
                  })
                : <li className="text-slate-400 text-sm">관련 내용이 없습니다.</li>;
            })()}
          </ul>
        </div>
      </div>

      {results.coverLetterImprovements && !Array.isArray(results.coverLetterImprovements) && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            <Target size={18} className="text-indigo-500" /> {resultPlaybook.feedbackSectionTitles.custom}
          </h3>
          {!pinnedSlots.some((slot) => slot.status === 'resolved' && slot.job) ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
              <p className="text-amber-700 text-sm font-bold mb-2">우선 공고를 지정하면 맞춤 분석이 제공됩니다</p>
              <p className="text-amber-600 text-xs">정보 입력 탭 하단의 &quot;우선 공고 지정&quot;에서 GameJob 공고 번호를 입력해주세요.</p>
            </div>
          ) : null}
          {pinnedSlots.some((slot) => slot.status === 'resolved' && slot.job) && (() => {
            const seen = new Set();
            return [
              { key: 'rank1', rankLabel: '1순위', border: 'border-sky-200', bg: 'bg-sky-50', badge: 'bg-sky-100 text-sky-700', icon: 'text-sky-500' },
              { key: 'rank2', rankLabel: '2순위', border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-500' },
              { key: 'rank3', rankLabel: '3순위', border: 'border-amber-200', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-500' },
            ].filter(({ key }) => {
              const company = recommendedJobs[parseInt(key.replace('rank', ''), 10) - 1]?.company;
              if (!company || seen.has(company)) return false;
              seen.add(company);
              return true;
            });
          })().map(({ key, rankLabel, border, bg, badge, icon }) => {
            const items = results.coverLetterImprovements?.[key] ?? [];
            const jobName = recommendedJobs[parseInt(key.replace('rank', ''), 10) - 1]?.company ?? `${rankLabel} 공고`;
            return (
              <div key={key} className={`bg-white rounded-2xl shadow-sm border ${border} overflow-hidden`}>
                <div className={`${bg} px-6 py-3 flex items-center gap-3 border-b ${border}`}>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge}`}>{rankLabel}</span>
                  <span className="font-bold text-slate-700 text-sm">{jobName}</span>
                </div>
                <ul className="divide-y divide-slate-50">
                  {items.length > 0
                    ? items.slice(0, 2).map((item, idx) => {
                        const { title, body } = parseFeedbackItem(item);
                        return (
                          <li key={idx} className="flex items-start gap-3 px-6 py-4 text-sm leading-relaxed">
                            <CheckCircle size={16} className={`${icon} mt-0.5 shrink-0`} />
                            <div>
                              {title && <p className="font-semibold text-slate-800 mb-0.5">{title}</p>}
                              {body && <p className="text-slate-600">{body}</p>}
                            </div>
                          </li>
                        );
                      })
                    : <li className="px-6 py-4 text-slate-400 text-sm">내용이 없습니다.</li>}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
