import React from 'react';
import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileText,
  Loader2,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';

const WORKFLOW_STEPS = [
  { id: 'profile', label: '기본 정보', tab: 'input' },
  { id: 'files', label: '자료 첨부', tab: 'input' },
  { id: 'analysis', label: 'AI 분석', tab: 'feedback' },
  { id: 'review', label: '결과 확인', tab: 'feedback' },
  { id: 'submit', label: '제출', tab: 'portfolio' },
];

function getStepState(stepId, state) {
  if (stepId === 'profile') return state.hasProfile ? 'done' : 'active';
  if (stepId === 'files') return state.documentCount > 0 ? 'done' : 'pending';
  if (stepId === 'analysis') {
    if (state.loading) return 'active';
    return state.hasResults ? 'done' : 'pending';
  }
  if (stepId === 'review') return state.hasResults ? 'done' : 'pending';
  if (stepId === 'submit') return state.hasSubmission ? 'done' : 'pending';
  return 'pending';
}

function getStepMeta(stepId, state) {
  if (stepId === 'profile') return state.hasProfile ? `${state.skillCount}개 역량` : '이름과 직무 입력';
  if (stepId === 'files') return state.documentCount > 0 ? `${state.documentCount}개 선택` : '선택 사항';
  if (stepId === 'analysis') {
    if (state.loading) return '진행 중';
    return state.hasResults ? '완료' : '대기';
  }
  if (stepId === 'review') return state.hasResults ? '확인 가능' : '분석 후 열림';
  if (stepId === 'submit') {
    if (state.submissionSaving) return '진행 중';
    return state.hasSubmission ? `${state.submissionCount}건` : '준비 후 가능';
  }
  return '';
}

function WorkflowIcon({ state }) {
  if (state === 'done') return <CheckCircle2 size={15} />;
  if (state === 'active') return <Loader2 size={15} className="animate-spin" />;
  return <Circle size={15} />;
}

export default function WorkspaceProgressPanel({
  activeFeatureGuide,
  activeLabel,
  activeTab,
  authUser,
  coverLetterFile,
  loading,
  normalizedUserInfo,
  onAnalyze,
  onOpenAccountName,
  onSelectTab,
  portfolioFiles,
  recommendedJobs,
  results,
  resumeFile,
  submissionSaving,
  submissions,
  userProfile,
}) {
  const documentCount = (resumeFile ? 1 : 0) + (coverLetterFile ? 1 : 0) + portfolioFiles.length;
  const skillCount = normalizedUserInfo.skills?.length || 0;
  const hasProfile = Boolean(normalizedUserInfo.name && normalizedUserInfo.subRole && skillCount > 0);
  const hasResults = Boolean(results);
  const submissionCount = submissions?.length || 0;
  const state = {
    documentCount,
    hasProfile,
    hasResults,
    hasSubmission: submissionCount > 0,
    loading,
    skillCount,
    submissionCount,
    submissionSaving,
  };
  const accountName = userProfile?.studentName || userProfile?.displayName || authUser?.displayName || '';
  const nextAction = !hasProfile
    ? { label: '정보 입력 계속', tab: 'input' }
    : !hasResults
      ? { label: loading ? '분석 진행 중' : 'AI 분석 시작', tab: 'input', analyze: true }
      : { label: '결과 확인', tab: 'feedback' };

  return (
    <aside className="coach-progress-panel" aria-label="준비 진행 현황">
      <section className="coach-progress-card coach-progress-current">
        <p className="coach-progress-eyebrow">오늘 할 일</p>
        <h2>{activeFeatureGuide.title}</h2>
        <p>{activeFeatureGuide.description}</p>
        <button
          type="button"
          className="coach-progress-primary"
          disabled={nextAction.analyze && loading}
          onClick={() => {
            onSelectTab(nextAction.tab);
            if (nextAction.analyze && !loading) onAnalyze();
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {nextAction.label}
        </button>
      </section>

      <section className="coach-progress-card">
        <div className="coach-progress-card-head">
          <div>
            <p className="coach-progress-eyebrow">진행 상태</p>
            <h3>{activeLabel}</h3>
          </div>
          <span>{normalizedUserInfo.roleGroup}</span>
        </div>
        <ol className="coach-progress-steps">
          {WORKFLOW_STEPS.map((step) => {
            const stepState = getStepState(step.id, state);
            const isCurrentTab = activeTab === step.tab;
            return (
              <li key={step.id} className={`coach-progress-step is-${stepState} ${isCurrentTab ? 'is-current' : ''}`}>
                <button type="button" aria-current={isCurrentTab ? 'page' : undefined} onClick={() => onSelectTab(step.tab)}>
                  <span className="coach-progress-step-icon">
                    <WorkflowIcon state={stepState} />
                  </span>
                  <span className="coach-progress-step-copy">
                    <strong>{step.label}</strong>
                    <small>{getStepMeta(step.id, state)}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="coach-progress-card coach-progress-compact">
        <p className="coach-progress-eyebrow">계정</p>
        <button type="button" className="coach-progress-account" onClick={onOpenAccountName}>
          <UserRound size={16} />
          <span>
            <strong>{accountName || '이름 설정'}</strong>
            <small>{authUser?.email || 'Google 계정'}</small>
          </span>
        </button>
      </section>

      <section className="coach-progress-card coach-progress-compact">
        <p className="coach-progress-eyebrow">빠른 이동</p>
        <div className="coach-progress-links">
          <button type="button" onClick={() => onSelectTab('input')}>
            <FileText size={15} />
            정보 입력
          </button>
          <button type="button" onClick={() => onSelectTab('jobs')}>
            <ClipboardCheck size={15} />
            추천 공고 {recommendedJobs.length > 0 ? `${recommendedJobs.length}` : ''}
          </button>
          <button type="button" onClick={() => onSelectTab('portfolio')} disabled={!hasResults}>
            <Send size={15} />
            제출
          </button>
        </div>
      </section>
    </aside>
  );
}
