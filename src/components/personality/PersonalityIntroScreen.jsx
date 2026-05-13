import React from 'react';
import { AlertCircle, Brain, ClipboardCheck, Clock, Play } from 'lucide-react';

const OVERVIEW_CARDS = [
  {
    icon: ClipboardCheck,
    label: '검사 구성',
    title: '연습 후 본 검사를 진행합니다',
    body: '연습 5문항으로 응답 방식에 적응한 뒤, 리커트형 본문과 선택형 문항 순서로 진행합니다.',
  },
  {
    icon: Clock,
    label: '시간 기준',
    title: '본 검사는 총 40분입니다',
    body: '지나치게 오래 고민하기보다 실제 업무 상황에서의 기본 반응을 기준으로 답하는 편이 더 안정적입니다.',
  },
  {
    icon: Brain,
    label: '해석 방식',
    title: '직군 맥락으로 결과를 읽습니다',
    body: '성향 점수만 보여주지 않고, 현재 직군에서 어떤 강점과 리스크로 보일지까지 같이 정리합니다.',
  },
  {
    icon: AlertCircle,
    label: '주의 사항',
    title: '과한 미화 응답은 일관성에서 드러납니다',
    body: '좋아 보이는 답만 반복하기보다 평소 자주 보이는 행동과 선택을 기준으로 답하는 편이 낫습니다.',
  },
];

export default function PersonalityIntroScreen({ personalityPlaybook, onStartPractice }) {
  return (
    <div className="coach-personality-page coach-review-page animate-in fade-in">
      <section className="coach-review-shell">
        <header className="coach-review-header">
          <div className="coach-review-header-main">
            <p className="coach-review-eyebrow">인성검사</p>
            <h2>응답 성향을 직군 맥락으로 해석합니다</h2>
            <p>
              {personalityPlaybook.introTitle} 응답 결과는 점수 자체보다도 협업 방식, 스트레스 대응,
              설명 방식, 판단 안정성을 함께 읽는 자료로 사용됩니다.
            </p>
          </div>
          <div className="coach-review-chip-row">
            <span>연습 5문항</span>
            <span>본 검사 94문항</span>
            <span>선택형 31문항</span>
          </div>
        </header>

        <div className="coach-review-meta-grid">
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">진행 흐름</span>
            <strong>연습 → 리커트형 → 선택형</strong>
            <p>응답 방식에 적응한 뒤 본 검사로 넘어가도록 설계했습니다.</p>
          </article>
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">제한 시간</span>
            <strong>총 40분</strong>
            <p>속도보다 일관성이 중요하지만, 지나친 지연은 분포를 왜곡할 수 있습니다.</p>
          </article>
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">결과 구성</span>
            <strong>성향 · 업무 스타일 · 주의점</strong>
            <p>결과는 직군 해석 메모와 함께 정리되어 면접 대비 자료로도 활용할 수 있습니다.</p>
          </article>
        </div>
      </section>

      <section className="coach-review-surface">
        <div className="coach-review-section-head">
          <div>
            <span className="coach-review-badge">검사 안내</span>
            <h3>시작 전에 확인할 기준</h3>
          </div>
        </div>
        <div className="coach-review-principles-grid">
          {OVERVIEW_CARDS.map(({ icon: Icon, label, title, body }, index) => (
            <article key={label} className="coach-review-principle">
              <span className="coach-review-principle-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="coach-personality-overview-copy">
                <div className="coach-personality-overview-icon">
                  <Icon size={18} />
                </div>
                <span className="coach-review-principle-label">{label}</span>
                <h4>{title}</h4>
                <p>{body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="coach-review-surface">
        <div className="coach-review-section-head">
          <div>
            <span className="coach-review-badge">직군 해석 기준</span>
            <h3>{personalityPlaybook.summaryTitle}</h3>
          </div>
        </div>
        <p className="coach-review-section-body">{personalityPlaybook.introDescription}</p>
        <div className="coach-personality-fit-grid">
          {personalityPlaybook.resultCards.map((card) => (
            <article key={card.label} className="coach-personality-fit-card">
              <span className="coach-review-principle-label">{card.label}</span>
              <h4>{card.title}</h4>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="coach-personality-actions">
        <button type="button" onClick={onStartPractice} className="coach-personality-primary">
          <Play size={18} />
          연습 문항 시작
        </button>
      </div>
    </div>
  );
}
