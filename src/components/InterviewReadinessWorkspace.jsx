import React from 'react';
import { Brain, CheckCircle2, Clock, Shirt, Smile, Sparkles } from 'lucide-react';

const ICON_MAP = { Shirt, Clock, Brain, Sparkles };

const INTERVIEW_THEME_MAP = {
  blue: { accent: '#2563eb', soft: '#eff6ff', kicker: 'Appearance' },
  amber: { accent: '#d97706', soft: '#fff7ed', kicker: 'Timing' },
  purple: { accent: '#7c3aed', soft: '#f5f3ff', kicker: 'Mindset' },
  emerald: { accent: '#059669', soft: '#ecfdf5', kicker: 'Attitude' },
};

export default function InterviewReadinessWorkspace({
  interviewBasicData,
  readinessPlaybook,
}) {
  return (
    <div className="coach-readiness-page">
      <section className="coach-review-shell">
        <div className="coach-review-header">
          <div className="coach-review-header-main">
            <p className="coach-review-eyebrow">면접 기본 준비</p>
            <h2>{readinessPlaybook.heroTitle}</h2>
            <p>{readinessPlaybook.heroDescription}</p>
          </div>

          <div className="coach-review-meta-grid">
            {readinessPlaybook.summaryStats.map((stat) => (
              <article key={stat.label} className="coach-review-meta-card">
                <p className="coach-review-meta-label">{stat.label}</p>
                <strong>{stat.value}</strong>
                <p>면접 전에 한 번 더 확인해야 하는 기준입니다.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="coach-review-surface">
        <div className="coach-review-section-head">
          <div>
            <p className="coach-review-eyebrow">기본 원칙</p>
            <h3>면접 전에 먼저 맞춰둘 것</h3>
          </div>
        </div>

        <div className="coach-review-principles-grid">
          {readinessPlaybook.prepCards.map((card, index) => (
            <article key={card.label} className="coach-review-principle">
              <div className="coach-review-principle-index">{String(index + 1).padStart(2, '0')}</div>
              <div>
                <p className="coach-review-principle-label">{card.label}</p>
                <h4>{card.title}</h4>
                <p>{card.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="coach-readiness-layout-grid">
        <aside className="coach-readiness-side">
          <section className="coach-review-surface">
            <div className="coach-review-section-head">
              <div>
                <p className="coach-review-eyebrow">빠른 체크</p>
                <h3>면접 직전 5분 점검</h3>
              </div>
            </div>

            <ul className="coach-readiness-checklist">
              {readinessPlaybook.quickChecks.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={15} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="coach-review-surface">
            <div className="coach-review-section-head">
              <div>
                <p className="coach-review-eyebrow">답변 프레임</p>
                <h3>{readinessPlaybook.answerFrameTitle}</h3>
              </div>
            </div>
            <p className="coach-review-section-body">{readinessPlaybook.answerFrameBody}</p>
          </section>

          <section className="coach-review-surface">
            <div className="coach-review-section-head">
              <div>
                <p className="coach-review-eyebrow">면접관 시선</p>
                <h3>{readinessPlaybook.reviewerNoteTitle}</h3>
              </div>
            </div>
            <p className="coach-review-section-body">{readinessPlaybook.reviewerNoteBody}</p>
          </section>
        </aside>

        <section className="coach-review-surface">
          <div className="coach-review-section-head">
            <div>
              <p className="coach-review-eyebrow">준비 항목</p>
              <h3>복장, 시간, 태도, 마인드셋</h3>
            </div>
          </div>

          <div className="coach-readiness-flow-list">
            {interviewBasicData.map(({ icon: iconName, color, title, items }, index) => {
              const Icon = ICON_MAP[iconName] || Smile;
              const theme = INTERVIEW_THEME_MAP[color] || INTERVIEW_THEME_MAP.blue;

              return (
                <article key={title} className="coach-readiness-flow-item">
                  <div className="coach-readiness-flow-head">
                    <div className="coach-review-principle-index">{String(index + 1).padStart(2, '0')}</div>
                    <div className="coach-readiness-flow-icon" style={{ background: theme.soft, color: theme.accent }}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="coach-review-principle-label">{theme.kicker}</p>
                      <h4>{title}</h4>
                    </div>
                  </div>

                  <div className="coach-readiness-flow-points">
                    {items.map((item) => (
                      <div key={item.label} className="coach-readiness-flow-point">
                        <p className="coach-readiness-flow-label">{item.label}</p>
                        <p className="coach-readiness-flow-body">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
