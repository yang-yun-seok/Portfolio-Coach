import React from 'react';
import { CheckCircle, Clock, Shirt, Smile, Brain, Sparkles } from 'lucide-react';

const ICON_MAP = { Shirt, Clock, Brain, Sparkles };

const INTERVIEW_THEME_MAP = {
  blue: {
    accent: '#0071e3',
    soft: 'rgba(0, 113, 227, 0.1)',
    border: 'rgba(0, 113, 227, 0.16)',
    kicker: 'Appearance',
  },
  amber: {
    accent: '#d97706',
    soft: 'rgba(217, 119, 6, 0.11)',
    border: 'rgba(217, 119, 6, 0.18)',
    kicker: 'Timing',
  },
  purple: {
    accent: '#7c3aed',
    soft: 'rgba(124, 58, 237, 0.1)',
    border: 'rgba(124, 58, 237, 0.16)',
    kicker: 'Mindset',
  },
  emerald: {
    accent: '#059669',
    soft: 'rgba(5, 150, 105, 0.1)',
    border: 'rgba(5, 150, 105, 0.16)',
    kicker: 'Attitude',
  },
};

export default function InterviewReadinessWorkspace({
  interviewBasicData,
  readinessPlaybook,
}) {
  return (
    <div className="apple-view studio-readiness-view animate-in fade-in slide-in-from-bottom-4">
      <section className="studio-readiness-hero">
        <div className="studio-readiness-copy">
          <p className="studio-eyebrow">Interview Readiness</p>
          <h2>{readinessPlaybook.heroTitle}</h2>
          <p>{readinessPlaybook.heroDescription}</p>
        </div>
        <div className="studio-readiness-summary">
          {readinessPlaybook.summaryStats.map((stat) => (
            <div key={stat.label} className="studio-readiness-stat">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
          <p>
            면접관은 정답 암기보다 근거 있는 판단, 협업 가능한 말투, 모르는 것을
            다루는 태도를 봅니다. 짧은 답변 안에 역할과 결과가 보이도록 준비하세요.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {readinessPlaybook.prepCards.map((card) => (
          <article key={card.label} className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-sky-600">{card.label}</p>
            <h3 className="mb-2 text-base font-black text-slate-900">{card.title}</h3>
            <p className="text-sm leading-relaxed text-slate-600">{card.body}</p>
          </article>
        ))}
      </section>

      <section className="studio-readiness-layout">
        <aside className="studio-readiness-aside">
          <div className="studio-readiness-note">
            <p className="studio-eyebrow">Quick Reset</p>
            <h3>면접 직전 5분 체크</h3>
            <ul>
              {readinessPlaybook.quickChecks.map((item) => (
                <li key={item}>
                  <CheckCircle size={16} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="studio-readiness-note studio-readiness-note-muted">
            <p className="studio-eyebrow">{readinessPlaybook.answerFrameTitle}</p>
            <p>{readinessPlaybook.answerFrameBody}</p>
          </div>

          <div className="studio-readiness-note studio-readiness-note-muted">
            <p className="studio-eyebrow">{readinessPlaybook.reviewerNoteTitle}</p>
            <p>{readinessPlaybook.reviewerNoteBody}</p>
          </div>
        </aside>

        <div className="studio-readiness-flow">
          {interviewBasicData.map(({ icon: iconName, color, title, items }, index) => {
            const Icon = ICON_MAP[iconName] || Smile;
            const theme = INTERVIEW_THEME_MAP[color] || INTERVIEW_THEME_MAP.blue;

            return (
              <article
                key={title}
                className="studio-readiness-section"
                style={{
                  '--studio-accent': theme.accent,
                  '--studio-soft': theme.soft,
                  '--studio-border': theme.border,
                }}
              >
                <div className="studio-readiness-section-head">
                  <span className="studio-readiness-index">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div
                    className="studio-readiness-icon"
                    style={{ background: theme.soft, color: theme.accent }}
                  >
                    <Icon size={22} />
                  </div>
                  <div className="studio-readiness-heading">
                    <p className="studio-readiness-kicker">{theme.kicker}</p>
                    <h3>{title}</h3>
                  </div>
                </div>

                <div className="studio-readiness-points">
                  {items.map((item) => (
                    <div key={item.label} className="studio-readiness-point">
                      <p className="studio-readiness-point-label">{item.label}</p>
                      <p className="studio-readiness-point-desc">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
