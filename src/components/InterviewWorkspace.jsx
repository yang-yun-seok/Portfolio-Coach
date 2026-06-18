import React, { useEffect, useState } from 'react';
import { CheckCircle2, Target, XCircle } from 'lucide-react';

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
    <div className="coach-interview-page">
      <section className="coach-review-shell">
        <div className="coach-review-header">
          <div className="coach-review-header-main">
            <p className="coach-review-eyebrow">면접 대비</p>
            <h2>{interviewPlaybook.title}</h2>
            <p>{interviewPlaybook.description}</p>
          </div>

          <div className="coach-review-meta-grid">
            <article className="coach-review-meta-card">
              <p className="coach-review-meta-label">예상 회사</p>
              <strong>{interviewPreps.length}개</strong>
              <p>추천 공고를 바탕으로 회사별 질문 세트를 정리합니다.</p>
            </article>
            <article className="coach-review-meta-card">
              <p className="coach-review-meta-label">현재 선택</p>
              <strong>{activePrep ? activePrep.company : '대기 중'}</strong>
              <p>{activePrep ? `${activePrep.rank}순위 추천 공고 면접 브리프` : '추천 공고를 계산한 뒤 회사별 대비를 확인합니다.'}</p>
            </article>
            <article className="coach-review-meta-card">
              <p className="coach-review-meta-label">답변 프레임</p>
              <strong>{interviewPlaybook.strategyTitle}</strong>
              <p>{interviewPlaybook.strategyBody}</p>
            </article>
          </div>
        </div>
      </section>

      <div className="coach-interview-overview-grid">
        <aside className="coach-review-surface coach-interview-brief-panel">
          <div className="coach-review-section-head">
            <div>
              <p className="coach-review-eyebrow">답변 전략</p>
              <h3>{interviewPlaybook.strategyTitle}</h3>
            </div>
          </div>
          <p className="coach-review-section-body">{interviewPlaybook.strategyBody}</p>

          <div className="coach-interview-brief-block">
            <p className="coach-review-principle-label">{interviewPlaybook.assignmentTitle}</p>
            <p>{interviewPlaybook.assignmentBody}</p>
          </div>
        </aside>
      </div>

      <section className="coach-review-surface">
        <div className="coach-review-section-head">
          <div>
            <p className="coach-review-eyebrow">회사 선택</p>
            <h3>공고별 면접 브리프</h3>
          </div>
        </div>

        {interviewPreps.length > 0 ? (
          <div className="coach-interview-tab-row" role="tablist" aria-label="면접 준비 회사 목록">
            {interviewPreps.map((prep, idx) => (
              <button
                key={`${prep.rank}-${prep.company}-${idx}`}
                type="button"
                onClick={() => setActiveInterviewTab(idx)}
                className={`coach-interview-tab-button ${activeInterviewTab === idx ? 'is-active' : ''}`}
              >
                <span>{prep.rank}순위</span>
                <strong>{prep.company}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="coach-review-empty-box">
            <p className="coach-review-empty-title">아직 회사별 면접 브리프가 없습니다.</p>
            <p className="coach-review-empty-body">추천 공고를 계산하면 공고별 예상 질문과 답변 포인트를 여기서 확인할 수 있습니다.</p>
          </div>
        )}
      </section>

      {activePrep ? (
        <div className="coach-interview-detail-grid">
          <section className="coach-review-surface">
            <div className="coach-review-section-head">
              <div>
                <p className="coach-review-eyebrow">회사 브리프</p>
                <h3>{activePrep.company}</h3>
              </div>
              <span className="coach-review-badge">
                <Target size={14} />
                추천 {activePrep.rank}순위
              </span>
            </div>

            <div className="coach-interview-focus-block">
              <h4>인재상 반영 포인트</h4>
              <p>{activePrep.idealCandidateReflected}</p>
            </div>

            {activePrep.assignmentGuide ? (
              <div className="coach-interview-focus-block">
                <h4>과제형 질문 대응</h4>
                <p>{activePrep.assignmentGuide}</p>
              </div>
            ) : null}
          </section>

          <section className="coach-review-surface">
            <div className="coach-review-section-head">
              <div>
                <p className="coach-review-eyebrow">질문 대응</p>
                <h3>예상 질문과 답변 방향</h3>
              </div>
            </div>

            <div className="coach-interview-question-stack">
              {(Array.isArray(activePrep.questions) ? activePrep.questions : []).map((item, qIdx) => (
                <article key={qIdx} className="coach-interview-question-item">
                  <div className="coach-interview-question-top">
                    <div className="coach-review-principle-index">{String(qIdx + 1).padStart(2, '0')}</div>
                    <div>
                      <p className="coach-review-principle-label">{item.type || '예상 질문'}</p>
                      <h4>{item.question}</h4>
                    </div>
                  </div>

                  <div className="coach-interview-answer-grid">
                    <div className="coach-interview-answer-block is-danger">
                      <div className="coach-interview-answer-title">
                        <XCircle size={16} />
                        피해야 할 답변
                      </div>
                      <p>{item.avoid}</p>
                    </div>
                    <div className="coach-interview-answer-block is-success">
                      <div className="coach-interview-answer-title">
                        <CheckCircle2 size={16} />
                        권장 답변 방향
                      </div>
                      <p>{item.recommend}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="coach-review-surface">
            <div className="coach-review-section-head">
              <div>
                <p className="coach-review-eyebrow">답변 프레임</p>
                <h3>짧고 구조적으로 말하기</h3>
              </div>
            </div>

            <p className="coach-review-section-body">{interviewPlaybook.answerTip}</p>

            <div className="coach-interview-framework-grid">
              <article className="coach-interview-framework-card">
                <p className="coach-review-principle-label">STAR</p>
                <h4>상황, 과제, 행동, 결과</h4>
                <p>경험 답변은 상황과 과제를 짧게 열고, 본인이 한 행동과 결과를 수치나 변화 중심으로 정리합니다.</p>
              </article>
              <article className="coach-interview-framework-card">
                <p className="coach-review-principle-label">BLUF</p>
                <h4>결론을 먼저</h4>
                <p>첫 문장에 답을 두고, 근거와 예외 처리를 뒤에 붙이면 면접관이 판단 흐름을 놓치지 않습니다.</p>
              </article>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
