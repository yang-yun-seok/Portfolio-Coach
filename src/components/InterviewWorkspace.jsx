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
    <div className="apple-view coach-interview-workspace animate-in fade-in slide-in-from-bottom-4">
      <div className="apple-intro coach-interview-hero">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{interviewPlaybook.title}</h2>
        <p className="text-slate-500">{interviewPlaybook.description}</p>
      </div>

      <div className="coach-interview-overview">
        <div className="coach-interview-card-grid">
          {interviewPlaybook.cards.map((card) => (
            <article key={card.label} className="coach-interview-card">
              <p className="coach-interview-kicker">{card.label}</p>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
        <aside className="coach-interview-strategy">
          <p className="coach-interview-kicker">Answer Lens</p>
          <h3>{interviewPlaybook.strategyTitle}</h3>
          <p>{interviewPlaybook.strategyBody}</p>
          <div className="coach-interview-strategy-divider">
            <p className="coach-interview-strategy-title">{interviewPlaybook.assignmentTitle}</p>
            <p>{interviewPlaybook.assignmentBody}</p>
          </div>
        </aside>
      </div>

      <div className="coach-interview-tabs" role="tablist" aria-label="면접 준비 회사 목록">
        {interviewPreps.map((prep, idx) => (
          <button
            key={`${prep.rank}-${prep.company}-${idx}`}
            onClick={() => setActiveInterviewTab(idx)}
            className={`coach-interview-tab ${activeInterviewTab === idx ? 'is-active' : ''}`}
          >
            {prep.rank}순위: {prep.company.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="coach-interview-detail">
        {activePrep && (
          <>
            <div className="coach-interview-focus">
              <div className="coach-interview-focus-head">
                <p className="coach-interview-kicker">Current Company Brief</p>
                <h3 className="flex items-center gap-2"><Target size={20} className="text-indigo-500" /> 인재상 및 어필 전략</h3>
              </div>
              <p className="coach-interview-focus-body">{activePrep.idealCandidateReflected}</p>
              {activePrep.assignmentGuide && (
                <div className="coach-interview-focus-subsection">
                  <h4 className="flex items-center gap-2"><FileText size={16} className="text-slate-500" /> 과제 대비 가이드</h4>
                  <p>{activePrep.assignmentGuide}</p>
                </div>
              )}
            </div>

            <div className="coach-interview-question-list">
              {(Array.isArray(activePrep.questions) ? activePrep.questions : []).map((item, qIdx) => (
                <article key={qIdx} className="coach-interview-question-card">
                  <div className="coach-interview-question-shell">
                    <div className="coach-interview-question-index">Q{qIdx + 1}</div>
                    <div className="coach-interview-question-copy">
                      <h3>{item.question}</h3>
                      <div className="coach-interview-answer-grid">
                        <div className="coach-interview-answer-panel is-danger">
                          <div className="coach-interview-answer-title"><XCircle size={18} /> 피해야 할 답변</div>
                          <p>{item.avoid}</p>
                        </div>
                        <div className="coach-interview-answer-panel is-success">
                          <div className="coach-interview-answer-title"><CheckCircle size={18} /> 권장하는 두괄식 답변</div>
                          <p>{item.recommend}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="coach-interview-tip">
              <p className="coach-interview-kicker">Answer Framework</p>
              <strong>면접 답변 기법 안내</strong>
              <p>{interviewPlaybook.answerTip}</p>
              <div className="coach-interview-tip-grid">
                <div>
              <strong className="text-indigo-600">STAR 기법</strong>: 상황(<strong>S</strong>ituation), 과제(<strong>T</strong>ask), 행동(<strong>A</strong>ction), 결과(<strong>R</strong>esult)의 구조로 경험을 구체적으로 증명하는 면접 표준 답변 방식입니다.<br />
                </div>
                <div>
              <strong className="text-indigo-600">두괄식 답변(BLUF)</strong>: 결론(Bottom Line Up Front)을 가장 첫 문장에 배치하여 면접관의 집중도를 높이는 방식입니다.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
