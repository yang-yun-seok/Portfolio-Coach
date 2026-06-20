import React from 'react';
import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Clock3,
  FileText,
  Loader2,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import {
  getPrimaryWorkflowAction,
  getStepMeta,
  getStepState,
  getWorkflowState,
  WORKFLOW_STEPS,
} from '../lib/workflow-state';

function WorkflowIcon({ state }) {
  if (state === 'done') return <CheckCircle2 size={15} />;
  if (state === 'active') return <Clock3 size={15} />;
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
  const state = getWorkflowState({
    coverLetterFile,
    loading,
    normalizedUserInfo,
    portfolioFiles,
    results,
    resumeFile,
    submissions,
    submissionSaving,
  });
  const accountName = userProfile?.studentName || userProfile?.displayName || authUser?.displayName || '';
  const nextAction = getPrimaryWorkflowAction(state);

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
            <small>{authUser ? 'Google 로그인' : '로그인 필요'}</small>
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
          <button type="button" onClick={() => onSelectTab('portfolio')} disabled={!state.hasResults}>
            <Send size={15} />
            제출
          </button>
        </div>
      </section>
    </aside>
  );
}
