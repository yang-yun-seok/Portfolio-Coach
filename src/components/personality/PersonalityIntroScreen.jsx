import React from 'react';
import { AlertCircle, Brain, ClipboardCheck, Clock, Play } from 'lucide-react';

export default function PersonalityIntroScreen({ personalityPlaybook, onStartPractice }) {
  return (
    <div className="apple-module personality-intro animate-in fade-in">
      <section className="personality-hero">
        <div className="personality-hero-copy">
          <p className="studio-eyebrow">Personality Simulation</p>
          <h2>인성검사 시뮬레이션</h2>
          <p>
            {personalityPlaybook.introTitle}. 실제 기업 인적성 흐름을 따라 연습 문항, 리커트형 본문,
            선택형 문항 순서로 진행합니다. 빠르게 통과하는 것보다 일관된 응답 흐름을 유지하는 편이 중요합니다.
          </p>
          <button type="button" onClick={onStartPractice} className="personality-primary-action">
            <Play size={18} /> 연습 문항 시작
          </button>
        </div>

        <div className="personality-hero-summary">
          <div className="personality-summary-row">
            <span>Flow</span>
            <strong>연습 5문항 → 리커트 94문항 → 선택형 31문항</strong>
          </div>
          <div className="personality-summary-row">
            <span>Time Limit</span>
            <strong>본 검사 총 40분</strong>
          </div>
          <p>{personalityPlaybook.summaryTitle}: {personalityPlaybook.summaryBody}</p>
        </div>
      </section>

      <section className="personality-intro-grid">
        <article className="personality-info-card personality-info-card-blue">
          <ClipboardCheck className="w-5 h-5" />
          <div>
            <h3>검사 구성</h3>
            <p><strong>연습 문항</strong>: 응답 방식에 먼저 적응합니다.</p>
            <p><strong>리커트 본문</strong>: 6점 척도로 성향 분포를 봅니다.</p>
            <p><strong>선택형 문항</strong>: 두 응답 중 가까운 방향을 고릅니다.</p>
          </div>
        </article>

        <article className="personality-info-card personality-info-card-sky">
          <Clock className="w-5 h-5" />
          <div>
            <h3>시간 제한</h3>
            <p>본 검사는 총 <strong>40분</strong> 안에 응답합니다. 오래 고민하기보다 직관적인 선택이 더 자연스럽습니다.</p>
          </div>
        </article>

        <article className="personality-info-card personality-info-card-emerald">
          <Brain className="w-5 h-5" />
          <div>
            <h3>분석 결과</h3>
            <p>성격 특성, 업무 스타일, 강점과 주의점, 게임 업계 적합도까지 한 번에 정리합니다.</p>
          </div>
        </article>

        <article className="personality-info-card personality-info-card-amber">
          <AlertCircle className="w-5 h-5" />
          <div>
            <h3>주의 사항</h3>
            <p>일관성 확인 문항이 포함되어 있어 지나치게 완벽한 사람처럼 보이려는 응답은 오히려 부자연스럽게 보일 수 있습니다.</p>
          </div>
        </article>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-slate-950 px-8 py-8 text-white shadow-xl">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">Role Lens</p>
        <h3 className="mb-2 text-2xl font-black">{personalityPlaybook.summaryTitle}</h3>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-300">{personalityPlaybook.introDescription}</p>
      </section>
    </div>
  );
}
