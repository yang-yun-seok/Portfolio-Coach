import React from 'react';
import { AlertCircle, ExternalLink, FileText, Github, Sparkles } from 'lucide-react';
import PortfolioSubmissionPanel from './PortfolioSubmissionPanel';

function FeedbackRow({ item, index, parseFeedbackItem, portfolioFiles }) {
  const { title, body } = parseFeedbackItem(item);
  const fileName = portfolioFiles[index]?.name;

  return (
    <li className="coach-portfolio-queue-row">
      <div className="coach-portfolio-queue-index">{index + 1}</div>
      <div className="coach-portfolio-queue-copy">
        {fileName && !title?.includes(fileName) ? (
          <p className="coach-portfolio-file-label">
            <FileText size={12} />
            {fileName}
          </p>
        ) : null}
        {title ? <p className="coach-portfolio-queue-title">{title}</p> : null}
        {body ? <p className="coach-portfolio-queue-body">{body}</p> : null}
      </div>
    </li>
  );
}

function SignalColumn({ title, items }) {
  const rows = Array.isArray(items) && items.length > 0 ? items : ['아직 정리된 항목이 없습니다.'];

  return (
    <article className="coach-portfolio-signal-panel">
      <h4>{title}</h4>
      <ul>
        {rows.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export default function PortfolioWorkspace({
  authEnabled,
  authUser,
  onSubmitPortfolio,
  parseFeedbackItem,
  portfolioFiles,
  resultPlaybook,
  results,
  submissionCapability,
  submissionError,
  submissionSaving,
  submissionSuccess,
  submissions,
  submissionsLoading,
  userProfile,
}) {
  const improvementItems = Array.isArray(results.portfolioImprovements) ? results.portfolioImprovements : [];
  const github = results.githubPortfolioAnalysis;
  const hasGithubAnalysis = Boolean(github?.repoUrl);

  const portfolioMeta = [
    {
      label: '첨부 자료',
      value: `${portfolioFiles.length}개`,
      helper: '현재 포트폴리오로 등록된 파일 수입니다.',
    },
    {
      label: '수정 항목',
      value: `${improvementItems.length || 0}개`,
      helper: '분석 결과 기준으로 바로 손볼 포인트입니다.',
    },
    {
      label: 'GitHub 분석',
      value: hasGithubAnalysis ? '연결됨' : '미연결',
      helper: hasGithubAnalysis ? '기술 문서 초안과 면접 포인트까지 정리합니다.' : '프로그래밍 트랙에서 가장 강하게 동작합니다.',
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
    <div className="coach-portfolio-page">
      <section className="coach-review-shell">
        <div className="coach-review-header">
          <div className="coach-review-header-main">
            <p className="coach-review-eyebrow">포트폴리오</p>
            <h2>{resultPlaybook.portfolioTitle}</h2>
            <p>{resultPlaybook.portfolioDescription}</p>
          </div>

          <div className="coach-review-meta-grid">
            {portfolioMeta.map((item) => (
              <article key={item.label} className="coach-review-meta-card">
                <p className="coach-review-meta-label">{item.label}</p>
                <strong>{item.value}</strong>
                <p>{item.helper}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="coach-portfolio-grid">
        <section className="coach-review-surface">
          <div className="coach-review-section-head">
            <div>
              <p className="coach-review-eyebrow">수정 우선순위</p>
              <h3>포트폴리오에서 먼저 손볼 항목</h3>
            </div>
            <span className="coach-review-badge">
              <Sparkles size={14} />
              우선 수정
            </span>
          </div>

          {improvementItems.length > 0 ? (
            <ul className="coach-portfolio-queue-list">
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
            <div className="coach-review-empty-box">
              <p className="coach-review-empty-title">아직 포트폴리오 수정 항목이 없습니다.</p>
              <p className="coach-review-empty-body">먼저 분석을 실행하면 구조, 설명, 전달력을 보완할 항목이 여기에 정리됩니다.</p>
            </div>
          )}
        </section>
      </div>

      {hasGithubAnalysis ? (
        <section className="coach-review-surface coach-portfolio-github-surface">
          <div className="coach-review-section-head">
            <div>
              <p className="coach-review-eyebrow">GitHub 기술 문서</p>
              <h3>저장소를 기술 설명 자료로 다시 읽습니다</h3>
              <p className="coach-review-section-body">
                README, 폴더 구조, 설정 파일, 릴리스 신호를 묶어서 면접 설명 포인트와 보완 지점을 정리합니다.
              </p>
            </div>
            <a href={github.repoUrl} target="_blank" rel="noreferrer" className="coach-review-badge is-link">
              <Github size={14} />
              저장소 열기
              <ExternalLink size={13} />
            </a>
          </div>

          {github.summary ? (
            <div className="coach-portfolio-github-summary">
              <p>{github.summary}</p>
            </div>
          ) : null}

          {githubHighlights.length > 0 ? (
            <div className="coach-review-chip-row">
              {githubHighlights.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}

          <div className="coach-portfolio-signal-grid">
            <SignalColumn title="기술 스택" items={github.techStack} />
            <SignalColumn title="구조 해석" items={github.architecture} />
            <SignalColumn title="프로젝트 하이라이트" items={github.projectHighlights} />
            <SignalColumn title="면접 포인트" items={github.interviewTalkingPoints} />
            <SignalColumn title="품질 신호" items={github.qualitySignals} />
            <SignalColumn title="출시·협업 신호" items={github.shippingSignals} />
            <SignalColumn title="보완 제안" items={github.refactorSuggestions} />
            <SignalColumn title="리스크" items={github.risks} />
          </div>

          {github.documentation ? (
            <div className="coach-portfolio-doc-block">
              <div className="coach-review-section-head">
                <div>
                  <p className="coach-review-eyebrow">문서 초안</p>
                  <h3>기술 설명 초안</h3>
                </div>
              </div>
              <pre className="coach-portfolio-doc-pre custom-scrollbar">{github.documentation}</pre>
            </div>
          ) : null}
        </section>
      ) : (
        <section className="coach-review-surface">
          <div className="coach-review-empty-box">
            <AlertCircle size={16} />
            <div>
              <p className="coach-review-empty-title">GitHub 분석이 아직 연결되지 않았습니다.</p>
              <p className="coach-review-empty-body">
                프로그래밍 트랙에서는 GitHub 저장소를 연결하면 코드 구조, 기술 스택, 면접 설명 포인트까지 같이 정리합니다.
              </p>
            </div>
          </div>
        </section>
      )}

      <PortfolioSubmissionPanel
        authEnabled={authEnabled}
        authUser={authUser}
        submissionCapability={submissionCapability}
        submissionError={submissionError}
        submissionSaving={submissionSaving}
        submissionSuccess={submissionSuccess}
        submissions={submissions}
        submissionsLoading={submissionsLoading}
        userProfile={userProfile}
        onSubmitPortfolio={onSubmitPortfolio}
      />
    </div>
  );
}
