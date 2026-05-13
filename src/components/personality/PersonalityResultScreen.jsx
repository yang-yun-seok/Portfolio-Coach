import React from 'react';
import {
  AlertCircle,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import TipCard from './TipCard';

const FALLBACK_TIPS = [
  {
    emoji: '1',
    title: '응답 일관성을 먼저 보세요',
    desc: '같은 성향 문항에서 방향이 과하게 흔들리지 않는지 확인하는 것이 기본입니다.',
  },
  {
    emoji: '2',
    title: '극단 응답 반복은 피하는 편이 낫습니다',
    desc: '모든 문항에 강한 긍정이나 부정을 반복하면 실제 성향보다 연출된 반응처럼 보일 수 있습니다.',
  },
  {
    emoji: '3',
    title: '좋아 보이는 답보다 실제 행동을 기준으로',
    desc: '면접에서 이어질 설명까지 생각하면, 평소 자주 보이는 판단과 태도로 답하는 편이 더 안정적입니다.',
  },
  {
    emoji: '4',
    title: '직군 맥락으로 해석해야 의미가 생깁니다',
    desc: '같은 점수여도 기획, 프로그래밍, 아트에서 보이는 강점과 리스크는 다르게 읽힙니다.',
  },
];

export default function PersonalityResultScreen({
  aiError,
  aiLoading,
  aiResult,
  analysisSource,
  buildMarkdown,
  downloadMarkdown,
  formatTime,
  likertAnswers,
  normalizedUser,
  onRequestAiAnalysis,
  onReset,
  openPdfPrint,
  personalityPlaybook,
  selectedProvider,
  timeLeft,
  totalTime,
}) {
  const likertDone = Object.keys(likertAnswers).length;
  const elapsedTime = formatTime(totalTime - timeLeft);
  const resultMeta = {
    elapsedTime,
    source: analysisSource === 'ai' ? `AI (${selectedProvider || '기본 모델'})` : '로컬 분석',
  };
  const distribution = Array.from({ length: 6 }, (_, index) => {
    const count = Object.values(likertAnswers).filter((value) => value === index).length;
    const pct = likertDone > 0 ? Math.round((count / likertDone) * 100) : 0;
    return { label: `${index + 1}점`, count, pct };
  });
  const hasAiResult = Boolean(aiResult) && !aiLoading;
  const hasLocalFallback = analysisSource === 'local' && hasAiResult;

  return (
    <div className="coach-personality-page coach-review-page animate-in fade-in">
      <section className="coach-review-shell">
        <header className="coach-review-header">
          <div className="coach-review-header-main">
            <p className="coach-review-eyebrow">인성검사 결과</p>
            <h2>{normalizedUser.roleGroup} 직군 기준 응답 해석</h2>
            <p>
              성향 점수, 업무 스타일, 강점과 주의점을 현재 직군 기준으로 정리합니다.
              면접 답변과 자기소개 보강에 바로 연결할 수 있는 형태로 구성했습니다.
            </p>
          </div>
          <div className="coach-personality-toolbar">
            <button type="button" onClick={onReset} className="coach-history-action">
              <RotateCcw size={16} />
              다시 시작
            </button>
            {!hasAiResult && (
              <button
                type="button"
                onClick={onRequestAiAnalysis}
                disabled={aiLoading}
                className="coach-history-action is-primary"
              >
                {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                AI 분석 요청
              </button>
            )}
            {hasLocalFallback && (
              <button type="button" onClick={onRequestAiAnalysis} className="coach-history-action is-primary">
                <Sparkles size={16} />
                AI로 다시 분석
              </button>
            )}
          </div>
        </header>

        <div className="coach-review-meta-grid">
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">응답 수</span>
            <strong>{likertDone}문항</strong>
            <p>리커트형 본문 응답을 기준으로 분포를 계산합니다.</p>
          </article>
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">소요 시간</span>
            <strong>{elapsedTime}</strong>
            <p>제한 시간 안에서 얼마나 안정적으로 응답했는지 함께 봅니다.</p>
          </article>
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">해석 방식</span>
            <strong>{resultMeta.source}</strong>
            <p>AI 분석과 로컬 분석 모두 직군 해석 기준은 동일하게 유지합니다.</p>
          </article>
        </div>
      </section>

      <section className="coach-review-surface coach-personality-distribution">
        <div className="coach-review-section-head">
          <div>
            <span className="coach-review-badge">응답 분포</span>
            <h3>리커트 응답 요약</h3>
          </div>
        </div>
        <div className="coach-personality-distribution-bar">
          {distribution.map(({ label, count, pct }) => (
            <div key={label}>
              <div className="coach-personality-distribution-track">
                <div
                  className="coach-personality-distribution-fill"
                  style={{ width: `${Math.max(pct, pct > 0 ? 14 : 0)}%` }}
                />
              </div>
              <div className="coach-personality-distribution-label">
                <span>{label}</span>
                <strong>
                  {count}회 · {pct}%
                </strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {aiError && (
        <div className="coach-personality-inline-alert">
          <AlertCircle size={18} />
          <p>{aiError}</p>
        </div>
      )}

      {aiLoading && (
        <section className="coach-review-surface coach-personality-loading">
          <Loader2 size={28} className="animate-spin" />
          <div>
            <h3>AI가 응답을 해석 중입니다</h3>
            <p>
              서버와 모델 응답을 기다리는 동안 최대 1분 정도 걸릴 수 있습니다. 이 과정에서는
              새로고침하거나 뒤로 가지 않는 편이 안전합니다.
            </p>
          </div>
        </section>
      )}

      {hasAiResult && (
        <div className="coach-personality-results">
          <section className="coach-personality-card-grid">
            {personalityPlaybook.resultCards.map((card) => (
              <article key={card.label} className="coach-review-meta-card">
                <span className="coach-review-meta-label">{card.label}</span>
                <strong>{card.title}</strong>
                <p>{card.body}</p>
              </article>
            ))}
          </section>

          <section className="coach-review-surface">
            <div className="coach-review-section-head">
              <div>
                <span className="coach-review-badge">성향 특성</span>
                <h3>핵심 특성 점수</h3>
              </div>
            </div>
            <div className="coach-personality-traits">
              {(aiResult.traits || []).map((trait) => (
                <article key={trait.name} className="coach-personality-trait">
                  <div className="coach-personality-trait-head">
                    <strong>{trait.name}</strong>
                    <span>{trait.score}점</span>
                  </div>
                  <div className="coach-personality-trait-track">
                    <div className="coach-personality-trait-fill" style={{ width: `${trait.score}%` }} />
                  </div>
                  <p>{trait.description}</p>
                </article>
              ))}
            </div>
          </section>

          <div className="coach-personality-split-grid">
            <section className="coach-review-surface">
              <div className="coach-review-section-head">
                <div>
                  <span className="coach-review-badge">업무 스타일</span>
                  <h3>축으로 읽는 작업 성향</h3>
                </div>
              </div>
              <div className="coach-personality-axes">
                {(aiResult.workStyle?.axes || []).map((axis) => {
                  const width = Math.min(Math.abs(axis.value), 100) / 2;
                  const left = axis.value < 0 ? 50 - width : 50;
                  return (
                    <article key={`${axis.leftLabel}-${axis.rightLabel}`} className="coach-personality-axis">
                      <div className="coach-personality-axis-head">
                        <span>{axis.leftLabel}</span>
                        <span>{axis.rightLabel}</span>
                      </div>
                      <div className="coach-personality-axis-track">
                        <span className="coach-personality-axis-mid" />
                        <div
                          className="coach-personality-axis-fill"
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />
                      </div>
                      <p>{axis.description}</p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="coach-review-surface coach-personality-consistency">
              <div className="coach-review-section-head">
                <div>
                  <span className="coach-review-badge">일관성</span>
                  <h3>응답 안정성 체크</h3>
                </div>
              </div>
              <div className="coach-personality-score-ring">
                <div className="coach-personality-score-ring-inner">
                  <strong>{aiResult.consistency?.score || 0}</strong>
                  <span>/ 100</span>
                </div>
              </div>
              <p>{aiResult.consistency?.comment}</p>
            </section>
          </div>

          <div className="coach-personality-split-grid">
            <section className="coach-review-surface">
              <div className="coach-review-section-head">
                <div>
                  <span className="coach-review-badge">강점</span>
                  <h3>현재 결과에서 강하게 보이는 요소</h3>
                </div>
              </div>
              <div className="coach-personality-note-list">
                {(aiResult.strengths || []).map((item) => (
                  <article key={item.title} className="coach-personality-note-card">
                    <div className="coach-personality-note-head">
                      <TrendingUp size={16} />
                      <strong>{item.title}</strong>
                    </div>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="coach-review-surface">
              <div className="coach-review-section-head">
                <div>
                  <span className="coach-review-badge">주의점</span>
                  <h3>면접에서 보완 설명이 필요한 요소</h3>
                </div>
              </div>
              <div className="coach-personality-note-list">
                {(aiResult.cautions || []).map((item) => (
                  <article key={item.title} className="coach-personality-note-card">
                    <div className="coach-personality-note-head">
                      <AlertCircle size={16} />
                      <strong>{item.title}</strong>
                    </div>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className="coach-review-surface">
            <div className="coach-review-section-head">
              <div>
                <span className="coach-review-badge">직군 해석</span>
                <h3>{personalityPlaybook.fitTitle}</h3>
              </div>
            </div>
            <p className="coach-review-section-body">{aiResult.gameIndustryFit}</p>
          </section>

          <section className="coach-review-surface">
            <div className="coach-review-section-head">
              <div>
                <span className="coach-review-badge">준비 전략</span>
                <h3>결과를 지원 준비로 연결하는 방법</h3>
              </div>
            </div>
            <div className="coach-personality-strategy-list">
              {(aiResult.testStrategy || []).map((tip, index) => (
                <div key={tip} className="coach-personality-strategy-row">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{tip}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="coach-review-surface">
            <div className="coach-review-section-head">
              <div>
                <span className="coach-review-badge">내보내기</span>
                <h3>결과 파일 저장</h3>
              </div>
            </div>
            <div className="coach-personality-export-actions">
              <button
                type="button"
                onClick={() => downloadMarkdown(buildMarkdown(aiResult, resultMeta))}
                className="coach-history-action"
              >
                <FileText size={16} />
                Markdown 저장
              </button>
              <button
                type="button"
                onClick={() => openPdfPrint(aiResult, resultMeta)}
                className="coach-history-action is-primary"
              >
                <Download size={16} />
                PDF 저장
              </button>
            </div>
          </section>
        </div>
      )}

      {!hasAiResult && !aiLoading && (
        <section className="coach-review-surface">
          <div className="coach-review-section-head">
            <div>
              <span className="coach-review-badge">검사 팁</span>
              <h3>결과를 읽기 전에 확인할 점</h3>
            </div>
          </div>
          <div className="coach-personality-tip-grid">
            {FALLBACK_TIPS.map((tip) => (
              <TipCard key={tip.title} emoji={tip.emoji} title={tip.title} desc={tip.desc} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
