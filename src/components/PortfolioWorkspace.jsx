import React from 'react';
import { FileText } from 'lucide-react';

export default function PortfolioWorkspace({
  parseFeedbackItem,
  portfolioFiles,
  resultPlaybook,
  results,
}) {
  return (
    <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="apple-intro">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{resultPlaybook.portfolioTitle}</h2>
        <p className="text-slate-500">{resultPlaybook.portfolioDescription}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {resultPlaybook.portfolioCards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
            <h3 className="mt-2 text-base font-bold leading-snug text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
          </article>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
        <ul className="space-y-5">
          {Array.isArray(results.portfolioImprovements) && results.portfolioImprovements.length > 0
            ? results.portfolioImprovements.map((item, idx) => {
                const { title, body } = parseFeedbackItem(item);
                const pfName = portfolioFiles[idx]?.name;
                return (
                  <li key={idx} className="flex items-start gap-3 bg-slate-50 p-5 rounded-xl text-sm leading-relaxed">
                    <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{idx + 1}</div>
                    <div className="flex-1">
                      {pfName && !title?.includes(pfName) && (
                        <p className="text-xs text-indigo-500 font-bold mb-1 flex items-center gap-1"><FileText size={12} /> {pfName}</p>
                      )}
                      {title && <p className="font-semibold text-slate-800 mb-0.5">{title}</p>}
                      {body && <p className="text-slate-600">{body}</p>}
                    </div>
                  </li>
                );
              })
            : <li className="text-slate-400">포트폴리오 내용이 없습니다.</li>}
        </ul>
      </div>

      {results.githubPortfolioAnalysis?.repoUrl && (
        <div className="bg-slate-950 rounded-2xl p-8 shadow-sm border border-slate-800 text-white">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">GitHub Technical Doc</p>
              <h3 className="mt-1 text-2xl font-black tracking-tight">플밍 포트폴리오 기술문서 초안</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                public GitHub 저장소의 README, 핵심 디렉터리, 설정 파일, 자동화 신호를 기준으로 기술 설명용 초안을 정리했습니다.
              </p>
            </div>
            <a
              href={results.githubPortfolioAnalysis.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900 transition hover:bg-sky-100"
            >
              저장소 열기
            </a>
          </div>

          {results.githubPortfolioAnalysis.summary && (
            <div className="mb-5 rounded-2xl bg-white/8 p-4 text-sm leading-relaxed text-slate-200">
              {results.githubPortfolioAnalysis.summary}
            </div>
          )}

          <div className="mb-5 flex flex-wrap gap-2">
            {[
              results.githubPortfolioAnalysis.topLanguages?.length
                ? `언어 ${results.githubPortfolioAnalysis.topLanguages.join(', ')}`
                : null,
              results.githubPortfolioAnalysis.defaultBranch
                ? `기본 브랜치 ${results.githubPortfolioAnalysis.defaultBranch}`
                : null,
              results.githubPortfolioAnalysis.updatedAt
                ? `최근 업데이트 ${results.githubPortfolioAnalysis.updatedAt}`
                : null,
              Number.isFinite(results.githubPortfolioAnalysis.stars)
                ? `Stars ${results.githubPortfolioAnalysis.stars}`
                : null,
              Number.isFinite(results.githubPortfolioAnalysis.forks)
                ? `Forks ${results.githubPortfolioAnalysis.forks}`
                : null,
            ].filter(Boolean).map((item) => (
              <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-slate-200">
                {item}
              </span>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { title: '기술 스택', items: results.githubPortfolioAnalysis.techStack, tone: 'text-sky-200' },
              { title: '구조 해석', items: results.githubPortfolioAnalysis.architecture, tone: 'text-cyan-200' },
              { title: '프로젝트 하이라이트', items: results.githubPortfolioAnalysis.projectHighlights, tone: 'text-emerald-200' },
              { title: '면접 포인트', items: results.githubPortfolioAnalysis.interviewTalkingPoints, tone: 'text-indigo-200' },
            ].map(({ title, items, tone }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <h4 className={`mb-3 text-sm font-bold ${tone}`}>{title}</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  {(Array.isArray(items) && items.length > 0 ? items : ['분석된 항목이 없습니다.']).map((item) => (
                    <li key={item} className="leading-relaxed">- {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { title: '품질 신호', items: results.githubPortfolioAnalysis.qualitySignals, tone: 'text-lime-200' },
              { title: '출시/협업 신호', items: results.githubPortfolioAnalysis.shippingSignals, tone: 'text-violet-200' },
              { title: '보완 제안', items: results.githubPortfolioAnalysis.refactorSuggestions, tone: 'text-amber-200' },
              { title: '리스크', items: results.githubPortfolioAnalysis.risks, tone: 'text-rose-200' },
            ].map(({ title, items, tone }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <h4 className={`mb-3 text-sm font-bold ${tone}`}>{title}</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  {(Array.isArray(items) && items.length > 0 ? items : ['분석된 항목이 없습니다.']).map((item) => (
                    <li key={item} className="leading-relaxed">- {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {results.githubPortfolioAnalysis.documentation && (
            <pre className="mt-5 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-2xl bg-black/40 p-5 text-xs leading-6 text-slate-200 custom-scrollbar">
              {results.githubPortfolioAnalysis.documentation}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
