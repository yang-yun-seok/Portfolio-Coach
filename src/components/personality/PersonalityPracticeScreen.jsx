import React from 'react';
import { ArrowRight, ClipboardCheck, Clock, PlayCircle } from 'lucide-react';
import { PRACTICE_QUESTIONS } from '../../data/personalityTestData';
import QuestionCard from './QuestionCard';

export default function PersonalityPracticeScreen({
  onPracticeSelect,
  onStartTest,
  practiceAnswers,
}) {
  const answeredCount = Object.keys(practiceAnswers).length;

  return (
    <div className="coach-personality-page coach-review-page animate-in fade-in">
      <section className="coach-review-shell">
        <header className="coach-review-header">
          <div className="coach-review-header-main">
            <p className="coach-review-eyebrow">연습 문항</p>
            <h2>응답 방식에 먼저 익숙해집니다</h2>
            <p>
              본 검사 전에 5문항으로 응답 감각을 맞춥니다. 정답을 찾는 단계가 아니라,
              문장을 읽고 본인과 가장 가까운 선택지를 고르는 연습입니다.
            </p>
          </div>
          <div className="coach-review-chip-row">
            <span>시간 제한 없음</span>
            <span>연습 5문항</span>
            <span>응답 방식 확인</span>
          </div>
        </header>

        <div className="coach-review-meta-grid">
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">진행률</span>
            <strong>{answeredCount} / {PRACTICE_QUESTIONS.length}</strong>
            <p>모든 문항을 답하지 않아도 시작은 가능하지만, 감각을 맞춘 뒤 본 검사로 넘어가는 편이 좋습니다.</p>
          </article>
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">응답 기준</span>
            <strong>가장 가까운 반응 선택</strong>
            <p>좋아 보이는 답이 아니라 평소 자주 보이는 행동과 판단을 기준으로 답하면 됩니다.</p>
          </article>
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">다음 단계</span>
            <strong>본 검사 40분</strong>
            <p>연습이 끝나면 리커트형 본문과 선택형 문항이 이어서 진행됩니다.</p>
          </article>
        </div>
      </section>

      <section className="coach-review-surface">
        <div className="coach-review-section-head">
          <div>
            <span className="coach-review-badge">연습 안내</span>
            <h3>이 화면에서 확인할 것</h3>
          </div>
        </div>
        <div className="coach-review-principles-grid">
          <article className="coach-review-principle">
            <span className="coach-review-principle-index">01</span>
            <div className="coach-personality-overview-icon"><ClipboardCheck size={18} /></div>
            <span className="coach-review-principle-label">응답 방식</span>
            <h4>문항마다 가장 가까운 선택지를 바로 고릅니다</h4>
            <p>정답을 맞히는 검사가 아니라, 평소 반응을 일정한 방식으로 답하는 과정입니다.</p>
          </article>
          <article className="coach-review-principle">
            <span className="coach-review-principle-index">02</span>
            <div className="coach-personality-overview-icon"><Clock size={18} /></div>
            <span className="coach-review-principle-label">속도 감각</span>
            <h4>본 검사는 제한 시간 안에서 진행됩니다</h4>
            <p>연습 단계에서 답변 속도와 버튼 위치를 미리 익혀두면 본 검사 흐름이 훨씬 안정적입니다.</p>
          </article>
          <article className="coach-review-principle">
            <span className="coach-review-principle-index">03</span>
            <div className="coach-personality-overview-icon"><PlayCircle size={18} /></div>
            <span className="coach-review-principle-label">전환 준비</span>
            <h4>연습이 끝나면 바로 본 검사로 넘어갑니다</h4>
            <p>문항을 읽고 반응을 고르는 흐름에 무리가 없다면 본 검사 시작 버튼을 눌러 진행하면 됩니다.</p>
          </article>
        </div>
      </section>

      <div className="coach-personality-question-list">
        {PRACTICE_QUESTIONS.map((question, index) => (
          <QuestionCard
            key={question.id}
            number={index + 1}
            text={question.text}
            selected={practiceAnswers[question.id]}
            onSelect={(value) => onPracticeSelect(question.id, value)}
            type="likert"
          />
        ))}
      </div>

      <div className="coach-personality-actions">
        <button type="button" onClick={onStartTest} className="coach-personality-primary">
          <ArrowRight size={18} />
          본 검사 시작
        </button>
      </div>
    </div>
  );
}
