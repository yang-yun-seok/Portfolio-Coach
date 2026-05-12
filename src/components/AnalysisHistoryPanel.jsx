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
    <div className="coach-analysis-history-panel grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Analysis History</p>
        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">최근 분석 기록</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          현재 결과와 이전 결과를 비교하거나, 원하는 시점의 분석 기록을 다시 불러올 수 있습니다.
        </p>
        <div className="mt-4 space-y-3">
          {analysisHistory.map((entry, idx) => {
            const meta = entry.meta || getSnapshotMeta(entry);
            const isSelected = selectedHistoryId === entry.id || (!selectedHistoryId && idx === 1);
            const isCurrent = lastSavedAt && entry.savedAt === lastSavedAt;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectHistory(entry.id)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${isSelected ? 'border-slate-900 bg-slate-950 text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400 hover:bg-white'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isSelected ? 'text-sky-300' : 'text-slate-400'}`}>
                      {idx === 0 ? 'Latest' : `History ${analysisHistory.length - idx}`}
                    </p>
                    <p className="mt-1 text-sm font-bold">{formatSavedAt(entry.savedAt) || '시점 정보 없음'}</p>
                    <p className={`mt-1 text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {meta.roleLabel} · {meta.subRole || '세부 직무 미정'}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {isCurrent && (
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-900 text-white'}`}>
                        현재
                      </span>
                    )}
                    {meta.hasGithub && (
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isSelected ? 'bg-sky-400/15 text-sky-100' : 'bg-sky-100 text-sky-700'}`}>
                        GitHub
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(meta.topCompanies.length > 0 ? meta.topCompanies.slice(0, 3) : ['추천 공고 정보 없음']).map((company) => (
                    <span
                      key={`${entry.id}-${company}`}
                      className={`rounded-full px-2.5 py-1 text-[11px] ${isSelected ? 'bg-white/10 text-slate-100' : 'bg-white text-slate-600'}`}
                    >
                      {company}
                    </span>
                  ))}
                </div>
                <div className={`mt-3 text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {typeof meta.topScore === 'number' ? `1순위 매칭 ${meta.topScore}점` : '매칭 점수 정보 없음'}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Before / After</p>
        <h3 className="mt-2 text-2xl font-black tracking-tight">현재 결과 비교</h3>
        {historyComparison ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              비교 기준: {formatSavedAt(historyComparison.compareSavedAt) || '이전 분석 기록'} · {historyComparison.compareMeta.roleLabel}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                { label: '현재 직무', value: historyComparison.currentMeta.roleLabel },
                { label: '이전 1순위', value: historyComparison.compareMeta.topCompanies[0] || '없음' },
                { label: 'GitHub 상태', value: historyComparison.githubStatus },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-100">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-bold text-sky-200">핵심 변화</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-200">
                {historyComparison.highlights.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onLoadHistory(selectedHistoryEntry)}
                className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900 transition hover:bg-sky-100"
              >
                이 버전 불러오기
              </button>
              <button
                type="button"
                onClick={onResetComparison}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-white hover:bg-white/10"
              >
                바로 이전 버전 기준으로 보기
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-relaxed text-slate-300">
            비교 가능한 이전 분석 기록이 아직 없습니다. 이번 분석 이후 한 번 더 실행하면 여기서 전/후 차이를 바로 확인할 수 있습니다.
          </div>
        )}
      </section>
    </div>
  );
}
