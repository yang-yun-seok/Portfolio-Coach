import React, { useEffect, useState } from 'react';
import { CheckCircle, FileText, Target, XCircle } from 'lucide-react';

export default function InterviewWorkspace({
  interviewPlaybook,
  results,
}) {
  const [activeInterviewTab, setActiveInterviewTab] = useState(0);
  const interviewPreps = Array.isArray(results?.interviewPreps) ? results.interviewPreps : [];
  const activePrep = interviewPreps[activeInterviewTab];

  useEffect(() => {
    setActiveInterviewTab(0);
  }, [interviewPreps.length]);

  return (
    <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="apple-intro">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{interviewPlaybook.title}</h2>
        <p className="text-slate-500">{interviewPlaybook.description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 md:grid-cols-3">
          {interviewPlaybook.cards.map((card) => (
            <article key={card.label} className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-sky-600">{card.label}</p>
              <h3 className="mb-2 text-base font-black text-slate-900">{card.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{card.body}</p>
            </article>
          ))}
        </div>
        <aside className="rounded-[28px] bg-slate-950 px-6 py-6 text-white shadow-xl">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">Answer Lens</p>
          <h3 className="mb-2 text-lg font-black">{interviewPlaybook.strategyTitle}</h3>
          <p className="text-sm leading-relaxed text-slate-300">{interviewPlaybook.strategyBody}</p>
          <div className="mt-5 border-t border-white/10 pt-5">
            <p className="mb-2 text-sm font-bold text-white">{interviewPlaybook.assignmentTitle}</p>
            <p className="text-sm leading-relaxed text-slate-300">{interviewPlaybook.assignmentBody}</p>
          </div>
        </aside>
      </div>

      <div className="flex bg-slate-200 p-1 rounded-xl w-full">
        {interviewPreps.map((prep, idx) => (
          <button
            key={`${prep.rank}-${prep.company}-${idx}`}
            onClick={() => setActiveInterviewTab(idx)}
            className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg transition-colors ${activeInterviewTab === idx ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {prep.rank}순위: {prep.company.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activePrep && (
          <>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm mb-6">
              <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2"><Target size={20} className="text-indigo-500" /> 인재상 및 어필 전략</h3>
              <p className="text-indigo-800 text-sm whitespace-pre-line leading-relaxed mb-4">{activePrep.idealCandidateReflected}</p>
              {activePrep.assignmentGuide && (
                <div className="mt-4 pt-4 border-t border-indigo-200/60">
                  <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><FileText size={16} className="text-slate-500" /> 과제 대비 가이드</h4>
                  <p className="text-slate-700 text-sm whitespace-pre-line leading-relaxed">{activePrep.assignmentGuide}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {(Array.isArray(activePrep.questions) ? activePrep.questions : []).map((item, qIdx) => (
                <div key={qIdx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex gap-4">
                    <div className="bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center text-indigo-700 font-bold shrink-0 mt-1">Q{qIdx + 1}</div>
                    <div className="space-y-4 flex-1">
                      <h3 className="text-xl font-bold text-slate-800 leading-tight whitespace-pre-line">{item.question}</h3>
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                          <div className="flex items-center gap-2 text-red-700 font-bold mb-2"><XCircle size={18} /> 피해야 할 답변</div>
                          <p className="text-sm text-red-900/80 whitespace-pre-line leading-relaxed">{item.avoid}</p>
                        </div>
                        <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                          <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2"><CheckCircle size={18} /> 권장하는 두괄식 답변</div>
                          <p className="text-sm text-emerald-900/80 whitespace-pre-line leading-relaxed">{item.recommend}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-slate-100 px-5 py-5 text-sm leading-relaxed text-slate-600">
              <strong>※ 면접 답변 기법 안내</strong><br />
              <span className="text-slate-700">{interviewPlaybook.answerTip}</span><br /><br />
              <strong className="text-indigo-600">STAR 기법</strong>: 상황(<strong>S</strong>ituation), 과제(<strong>T</strong>ask), 행동(<strong>A</strong>ction), 결과(<strong>R</strong>esult)의 구조로 경험을 구체적으로 증명하는 면접 표준 답변 방식입니다.<br />
              <strong className="text-indigo-600">두괄식 답변(BLUF)</strong>: 결론(Bottom Line Up Front)을 가장 첫 문장에 배치하여 면접관의 집중도를 높이는 방식입니다.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
