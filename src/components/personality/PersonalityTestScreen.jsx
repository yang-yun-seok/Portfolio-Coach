import React from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import QuestionCard from './QuestionCard';

export default function PersonalityTestScreen({
  autoAdvance,
  binaryAnswers,
  currentPage,
  getCurrentQuestions,
  getTotalPages,
  handleGoToBinary,
  handleSubmit,
  likertAnswers,
  questionTimeLeft,
  scrollRef,
  setBinaryAnswers,
  setCurrentPage,
  setLikertAnswers,
  showConfirm,
  showTimeWarning,
  step,
  timeLeft,
  formatTime,
  confirmSubmit,
  cancelSubmit,
}) {
  const isLikert = step === 'test-likert';
  const pageQuestions = getCurrentQuestions();
  const totalPages = getTotalPages();
  const answeredCount = isLikert
    ? Object.keys(likertAnswers).length
    : Object.keys(binaryAnswers).length;

  return (
    <div className="coach-personality-page coach-review-page animate-in fade-in">
      {showConfirm && (
        <div className="coach-personality-modal-backdrop">
          <div className="coach-personality-modal">
            <h3>최종 제출 확인</h3>
            <p>현재까지 입력한 응답을 기준으로 분석 화면으로 이동합니다.</p>
            <div className="coach-history-actions">
              <button type="button" onClick={cancelSubmit} className="coach-history-action">
                취소
              </button>
              <button type="button" onClick={confirmSubmit} className="coach-history-action is-primary">
                제출하기
              </button>
            </div>
          </div>
        </div>
      )}

      {showTimeWarning && (
        <div className="coach-personality-floating-alert">
          종료까지 5분 남았습니다.
        </div>
      )}

      <section className="coach-review-shell">
        <header className="coach-review-header">
          <div className="coach-review-header-main">
            <p className="coach-review-eyebrow">본 검사</p>
            <h2>{isLikert ? '리커트형 본문 진행 중' : '선택형 문항 진행 중'}</h2>
            <p>
              문항을 읽고 가장 가까운 선택지를 고르면 다음 문항으로 자동 이동합니다.
              지나치게 오래 멈추기보다 현재 반응에 가까운 답을 선택하는 편이 안정적입니다.
            </p>
          </div>
          <div className="coach-personality-phase-tabs">
            <button
              type="button"
              onClick={() => { setCurrentPage(0); }}
              className={isLikert ? 'is-active' : ''}
            >
              리커트형
            </button>
            <button
              type="button"
              onClick={handleGoToBinary}
              className={!isLikert ? 'is-active' : ''}
            >
              선택형
            </button>
          </div>
        </header>

        <div className="coach-review-meta-grid">
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">현재 응답</span>
            <strong>{answeredCount}문항</strong>
            <p>선택 즉시 다음 문항으로 넘어가므로, 각 문항의 첫 반응을 유지하는 편이 낫습니다.</p>
          </article>
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">문항 타이머</span>
            <strong>{questionTimeLeft}초</strong>
            <p>개별 문항에서 오래 멈추면 자동으로 다음 문항으로 이동합니다.</p>
          </article>
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">전체 남은 시간</span>
            <strong>{formatTime(timeLeft)}</strong>
            <p>전체 제한 시간 안에서 본문과 선택형 문항을 모두 완료해야 합니다.</p>
          </article>
        </div>
      </section>

      <section className="coach-review-surface">
        <div className="coach-review-section-head">
          <div>
            <span className="coach-review-badge">진행 안내</span>
            <h3>현재 답변 기준</h3>
          </div>
          <div className="coach-review-chip-row">
            <span>{isLikert ? '6점 척도' : 'A/B 선택형'}</span>
            <span>{currentPage + 1} / {totalPages} 페이지</span>
          </div>
        </div>
        <p className="coach-review-section-body">
          {isLikert
            ? '문장을 읽고 본인에게 가장 가까운 정도를 선택합니다. 응답 후에는 자동으로 다음 문항으로 넘어갑니다.'
            : '두 선택지 중 현재 본인에게 더 가까운 방향을 고릅니다. 설명이 더 좋아 보이는 쪽보다 실제 판단과 가까운 쪽을 고르는 편이 낫습니다.'}
        </p>
      </section>

      <div className="coach-personality-question-list" ref={scrollRef}>
        {pageQuestions.map((question, index) => (
          <QuestionCard
            key={isLikert ? `l-${question.id}` : `b-${question.id}`}
            number={currentPage + index + 1}
            text={question.text}
            questionData={question}
            selected={isLikert ? likertAnswers[question.id] : binaryAnswers[question.id]}
            onSelect={(value) => {
              if (isLikert) {
                setLikertAnswers((prev) => ({ ...prev, [question.id]: value }));
              } else {
                setBinaryAnswers((prev) => ({ ...prev, [question.id]: value }));
              }
              setTimeout(() => autoAdvance(), 300);
            }}
            type={isLikert ? 'likert' : 'binary'}
            totalNumber={question.id}
          />
        ))}
      </div>

      <section className="coach-review-surface coach-personality-nav-shell">
        <div className="coach-personality-nav">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
            disabled={currentPage === 0}
            className="coach-history-action"
          >
            <ChevronLeft size={16} />
            이전
          </button>

          <div className="coach-personality-nav-center">
            <span>{isLikert ? '리커트형 문항' : '선택형 문항'}</span>
            <strong>{currentPage + 1} / {totalPages}</strong>
          </div>

          <button
            type="button"
            onClick={() => {
              if (currentPage < totalPages - 1) {
                setCurrentPage((page) => page + 1);
              } else if (isLikert) {
                handleGoToBinary();
              } else {
                handleSubmit();
              }
            }}
            className="coach-history-action is-primary"
          >
            {currentPage < totalPages - 1 ? '다음' : isLikert ? '선택형으로' : '제출하기'}
            {currentPage < totalPages - 1 ? <ChevronRight size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </section>
    </div>
  );
}
