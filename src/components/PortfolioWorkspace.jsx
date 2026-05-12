import React from 'react';
import { AlertCircle, FileText, Github, Layers3, Sparkles } from 'lucide-react';

function FeedbackRow({ item, index, parseFeedbackItem, portfolioFiles }) {
  const { title, body } = parseFeedbackItem(item);
  const fileName = portfolioFiles[index]?.name;

  return (
    <li className="coach-portfolio-review-row">
      <div className="coach-portfolio-review-index">{index + 1}</div>
      <div className="coach-portfolio-review-copy">
        {fileName && !title?.includes(fileName) ? (
          <p className="coach-portfolio-review-file">
            <FileText size={12} />
            {fileName}
          </p>
        ) : null}
        {title ? <p className="coach-portfolio-review-title">{title}</p> : null}
        {body ? <p className="coach-portfolio-review-body">{body}</p> : null}
      </div>
    </li>
  );
}

function SignalColumn({ title, items, toneClass }) {
  return (
    <div className="coach-portfolio-signal-card">
      <h4 className={`coach-portfolio-signal-title ${toneClass}`}>{title}</h4>
      <ul className="coach-portfolio-signal-list">
        {(Array.isArray(items) && items.length > 0 ? items : ['분석된 항목이 없습니다.']).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function PortfolioWorkspace({
  parseFeedbackItem,
  portfolioFiles,
  resultPlaybook,
  results,
}) {
  const improvementItems = Array.isArray(results.portfolioImprovements) ? results.portfolioImprovements : [];
  const github = results.githubPortfolioAnalysis;
  const hasGithubAnalysis = Boolean(github?.repoUrl);

  const portfolioMeta = [
    {
      label: '첨부 자료',
      value: `${portfolioFiles.length}개`,
      helper: '현재 검토 대상으로 등록된 파일 수',
    },
    {
      label: '검토 포인트',
      value: `${improvementItems.length || 0}개`,
      helper: '지금 바로 손대면 체감이 큰 수정 포인트',
    },
    {
      label: 'GitHub 분석',
      value: hasGithubAnalysis ? '연결됨' : '미연결',
      helper: hasGithubAnalysis ? '기술 문서화 초안까지 생성됨' : '프로그래밍 트랙에서 더 강하게 작동',
    },
  ];

  const githubHighlights = [
    github?.topLanguages?.length ? `언어 ${github.topLanguages.join(', ')}` : null,
    github?.defaultBranch ? `기본 브랜치 ${github.defaultBranch}` : null,
    github?.updatedAt ? `최근 업데이트 ${github.updatedAt}` : null,
    Number.isFinite(github?.stars) ? `Stars ${github.stars}` : null,
    Number.isFinite(github?.forks) ? `Forks ${github.forks}` : null,
  ].filter(Boolean);

  return (
    <div className="coach-portfolio-workspace apple-view animate-in fade-in slide-in-from-bottom-4">
      <section className="coach-portfolio-hero">
        <div className="coach-portfolio-hero-copy">
          <p className="coach-portfolio-kicker">PORTFOLIO REVIEW</p>
          <h2>{resultPlaybook.portfolioTitle}</h2>
          <p>{resultPlaybook.portfolioDescription}</p>
        </div>

        <div className="coach-portfolio-hero-meta">
          {portfolioMeta.map((item) => (
            <article key={item.label} className="coach-portfolio-meta-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.helper}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="coach-portfolio-main-grid">
        <section className="coach-portfolio-lens-panel">
          <div className="coach-portfolio-section-head">
            <div>
              <p className="coach-portfolio-kicker">EDITOR'S LENS</p>
              <h3>무엇을 먼저 보완할지 기준을 고정합니다</h3>
            </div>
            <span className="coach-portfolio-head-pill">
              <Layers3 size={14} />
              정리 기준
            </span>
          </div>

          <div className="coach-portfolio-lens-list">
            {resultPlaybook.portfolioCards.map((card, index) => (
              <article key={card.label} className="coach-portfolio-lens-card">
                <div className="coach-portfolio-lens-index">{String(index + 1).padStart(2, '0')}</div>
                <div>
                  <p className="coach-portfolio-lens-label">{card.label}</p>
                  <h4>{card.title}</h4>
                  <p>{card.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="coach-portfolio-review-panel">
          <div className="coach-portfolio-section-head">
            <div>
              <p className="coach-portfolio-kicker">REVISION QUEUE</p>
              <h3>수정 순서대로 검토 포인트를 확인합니다</h3>
            </div>
            <span className="coach-portfolio-head-pill">
              <Sparkles size={14} />
              우선 수정
            </span>
          </div>

          {improvementItems.length > 0 ? (
            <ul className="coach-portfolio-review-list">
              {improvementItems.map((item, index) => (
                <FeedbackRow
                  key={`${index}-${item}`}
                  item={item}
                  index={index}
                  parseFeedbackItem={parseFeedbackItem}
                  portfolioFiles={portfolioFiles}
                />
              ))}
            </ul>
          ) : (
            <div className="coach-portfolio-empty">
              <AlertCircle size={16} />
              <p>분석 결과가 아직 없습니다. 먼저 분석을 실행하면 보완 포인트가 여기에 정리됩니다.</p>
            </div>
          )}
        </section>
      </div>

      {hasGithubAnalysis ? (
        <section className="coach-portfolio-github">
          <div className="coach-portfolio-github-head">
            <div>
              <p className="coach-portfolio-kicker">GITHUB TECHNICAL DOC</p>
              <h3>코드 저장소를 기술 문서 관점으로 다시 읽습니다</h3>
              <p>
                README, 폴더 구조, 설정 파일, 릴리스/협업 신호를 묶어서 면접 설명 포인트와 보완 지점을
                함께 정리합니다.
              </p>
            </div>

            <a href={github.repoUrl} target="_blank" rel="noreferrer" className="coach-portfolio-github-link">
              <Github size={15} />
              저장소 열기
            </a>
          </div>

          {github.summary ? (
            <div className="coach-portfolio-github-summary">
              <p>{github.summary}</p>
            </div>
          ) : null}

          {githubHighlights.length > 0 ? (
            <div className="coach-portfolio-github-chips">
              {githubHighlights.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}

          <div className="coach-portfolio-signal-grid">
            <SignalColumn title="기술 스택" items={github.techStack} toneClass="is-sky" />
            <SignalColumn title="구조 해석" items={github.architecture} toneClass="is-cyan" />
            <SignalColumn title="프로젝트 하이라이트" items={github.projectHighlights} toneClass="is-emerald" />
            <SignalColumn title="면접 포인트" items={github.interviewTalkingPoints} toneClass="is-indigo" />
          </div>

          <div className="coach-portfolio-signal-grid">
            <SignalColumn title="품질 신호" items={github.qualitySignals} toneClass="is-lime" />
            <SignalColumn title="출시/협업 신호" items={github.shippingSignals} toneClass="is-violet" />
            <SignalColumn title="보완 제안" items={github.refactorSuggestions} toneClass="is-amber" />
            <SignalColumn title="리스크" items={github.risks} toneClass="is-rose" />
          </div>

          {github.documentation ? (
            <div className="coach-portfolio-doc-shell">
              <div className="coach-portfolio-doc-head">
                <p className="coach-portfolio-kicker">DOCUMENT DRAFT</p>
                <h4>기술 문서화 초안</h4>
              </div>
              <pre className="coach-portfolio-doc-body custom-scrollbar">{github.documentation}</pre>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
