import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
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

function formatDateTime(value) {
  if (!value) return '정보 없음';
  try {
    return new Date(value).toLocaleString('ko-KR');
  } catch {
    return value;
  }
}

function getSubmissionStatusLabel(status) {
  switch (status) {
    case 'reviewing':
      return '검토 중';
    case 'reviewed':
      return '검토 완료';
    case 'rejected':
      return '보완 필요';
    case 'submitted':
      return '확인 대기';
    default:
      return status || '제출 전';
  }
}

function getStepIcon(state) {
  if (state === 'done') return <CheckCircle2 size={17} />;
  if (state === 'active') return <Clock3 size={17} />;
  return <Circle size={17} />;
}

function getActionDescription(state) {
  if (!state.hasProfile) return '지원 직무와 보유 역량을 먼저 정리하세요.';
  if (state.documentCount === 0) return '분석할 이력서나 포트폴리오를 첨부하세요.';
  if (!state.hasResults) return '현재 자료를 기준으로 지원 전략을 분석할 차례입니다.';
  if (!state.hasSubmission && !state.submissionAvailable) return '검토 요청 기능을 준비하는 동안 분석 결과를 바탕으로 자료를 보완하세요.';
  if (!state.hasSubmission) return '분석 결과를 확인했다면 담당자 검토를 요청하세요.';
  if (state.latestSubmission?.status === 'rejected') return '담당자 피드백을 확인하고 보완할 항목을 정리하세요.';
  if (state.latestSubmission?.status === 'reviewed') return '도착한 검토 결과를 확인하고 다음 준비를 이어가세요.';
  return '제출이 정상적으로 전달되었습니다. 현재 검토 상태를 확인하세요.';
}

function HomeMetric({ label, value, helper }) {
  return (
    <div className="coach-home-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

export default function StudentHomeWorkspace({
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
  submissionAvailable,
  submissionSaving,
  submissions,
  submissionsLoading,
  userProfile,
}) {
  const state = getWorkflowState({
    coverLetterFile,
    loading,
    normalizedUserInfo,
    portfolioFiles,
    results,
    resumeFile,
    submissionAvailable,
    submissions,
    submissionSaving,
  });
  const primaryAction = getPrimaryWorkflowAction(state);
  const latestSubmission = state.latestSubmission;
  const accountName = userProfile?.studentName || userProfile?.displayName || authUser?.displayName || '';
  const topJobs = recommendedJobs.slice(0, 3);

  const handlePrimaryAction = () => {
    onSelectTab(primaryAction.tab);
    if (primaryAction.analyze && !loading) onAnalyze();
  };

  return (
    <div className="coach-home-workspace coach-view-enter">
      <header className="coach-home-heading">
        <div className="coach-home-heading-copy">
          <p className="coach-home-overline">오늘의 준비</p>
          <h2>{accountName ? `${accountName}님, 다음 단계입니다` : '다음 준비 단계를 확인하세요'}</h2>
          <p>{getActionDescription(state)}</p>
        </div>
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={primaryAction.analyze && loading}
          className="coach-home-primary"
        >
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
          <span>{primaryAction.label}</span>
          {!loading ? <ArrowRight size={16} /> : null}
        </button>
      </header>

      <section className="coach-home-metrics" aria-label="현재 준비 상태">
        <HomeMetric label="프로필" value={state.hasProfile ? '준비됨' : '입력 필요'} helper={`${state.skillCount}개 역량`} />
        <HomeMetric label="첨부 자료" value={`${state.documentCount}개`} helper="이력서·포트폴리오" />
        <HomeMetric label="AI 분석" value={state.hasResults ? '완료' : loading ? '진행 중' : '대기'} helper={`${recommendedJobs.length || 0}개 추천 공고`} />
        <HomeMetric label="제출·검토" value={latestSubmission ? getSubmissionStatusLabel(latestSubmission.status) : '제출 전'} helper={latestSubmission ? formatDateTime(latestSubmission.submittedAtIso) : '분석 후 제출 가능'} />
      </section>

      <div className="coach-home-grid">
        <section className="coach-home-flow" aria-labelledby="coach-home-flow-title">
          <div className="coach-home-section-head">
            <div>
              <p className="coach-home-overline">준비 흐름</p>
              <h3 id="coach-home-flow-title">완료한 단계와 다음 할 일</h3>
            </div>
            <button type="button" onClick={onOpenAccountName} className="coach-home-account">
              <UserRound size={16} />
              <span>{accountName || '이름 설정'}</span>
            </button>
          </div>

          <ol className="coach-home-steps">
            {WORKFLOW_STEPS.map((step, index) => {
              const stepState = getStepState(step.id, state);
              return (
                <li key={step.id} className={`is-${stepState}`}>
                  <button type="button" onClick={() => onSelectTab(step.tab)}>
                    <span className="coach-home-step-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="coach-home-step-icon">{getStepIcon(stepState)}</span>
                    <span className="coach-home-step-copy">
                      <strong>{step.label}</strong>
                      <small>{getStepMeta(step.id, state)}</small>
                    </span>
                    <ArrowRight size={15} className="coach-home-step-arrow" />
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="coach-home-context">
          <section className="coach-home-submission" aria-labelledby="coach-home-submission-title">
            <div className="coach-home-section-head is-compact">
              <div>
                <p className="coach-home-overline">최근 제출</p>
                <h3 id="coach-home-submission-title">검토 상태</h3>
              </div>
              <Send size={18} />
            </div>

            {submissionsLoading ? (
              <div className="coach-home-loading">
                <Loader2 size={16} className="animate-spin" />
                제출 내역 확인 중
              </div>
            ) : latestSubmission ? (
              <div className="coach-home-submission-body">
                <div className="coach-home-submission-status">
                  <span className={`is-${latestSubmission.status || 'submitted'}`}>
                    {getSubmissionStatusLabel(latestSubmission.status)}
                  </span>
                  <time>{formatDateTime(latestSubmission.submittedAtIso)}</time>
                </div>
                <strong>{latestSubmission.title || '포트폴리오 제출'}</strong>
                {latestSubmission.studentFeedback ? (
                  <blockquote>{latestSubmission.studentFeedback}</blockquote>
                ) : (
                  <p>검토 결과가 도착하면 이곳에서 바로 확인할 수 있습니다.</p>
                )}
                <button type="button" onClick={() => onSelectTab('portfolio')}>
                  제출과 검토 결과 보기
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <div className="coach-home-empty">
                <FileText size={18} />
                <p>아직 제출한 자료가 없습니다.</p>
                <span>AI 분석을 마친 뒤 담당자 검토를 요청할 수 있습니다.</span>
              </div>
            )}
          </section>

          <section className="coach-home-jobs" aria-labelledby="coach-home-jobs-title">
            <div className="coach-home-section-head is-compact">
              <div>
                <p className="coach-home-overline">추천 공고</p>
                <h3 id="coach-home-jobs-title">지원 우선순위</h3>
              </div>
              <span>{recommendedJobs.length}개</span>
            </div>
            {topJobs.length > 0 ? (
              <ul>
                {topJobs.map((job) => (
                  <li key={job.id}>
                    <span>{job.company || '회사 정보 없음'}</span>
                    <strong>{job.title || '공고명 없음'}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="coach-home-jobs-empty">AI 분석 후 지원 우선순위가 표시됩니다.</p>
            )}
            <button type="button" onClick={() => onSelectTab('jobs')} disabled={!state.hasResults}>
              추천 공고 전체 보기
              <ArrowRight size={15} />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
