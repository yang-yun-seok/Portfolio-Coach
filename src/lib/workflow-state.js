export const WORKFLOW_STEPS = [
  { id: 'profile', label: '기본 정보', tab: 'input' },
  { id: 'files', label: '자료 첨부', tab: 'input' },
  { id: 'analysis', label: 'AI 분석', tab: 'feedback' },
  { id: 'submit', label: '제출', tab: 'portfolio' },
  { id: 'review', label: '담당자 검토', tab: 'portfolio' },
];

export function getLatestSubmission(submissions = []) {
  return Array.isArray(submissions) && submissions.length > 0 ? submissions[0] : null;
}

export function getWorkflowState({
  coverLetterFile,
  loading,
  normalizedUserInfo,
  portfolioFiles,
  results,
  resumeFile,
  submissionAvailable = true,
  submissionSaving,
  submissions,
}) {
  const documentCount = (resumeFile ? 1 : 0) + (coverLetterFile ? 1 : 0) + (portfolioFiles?.length || 0);
  const skillCount = normalizedUserInfo?.skills?.length || 0;
  const hasProfile = Boolean(normalizedUserInfo?.name && normalizedUserInfo?.subRole && skillCount > 0);
  const submissionCount = submissions?.length || 0;
  const latestSubmission = getLatestSubmission(submissions);
  const hasReviewOutcome = Boolean(
    latestSubmission
    && ['reviewed', 'rejected'].includes(latestSubmission.status),
  );

  return {
    documentCount,
    hasFeedback: Boolean(latestSubmission?.studentFeedback),
    hasProfile,
    hasReviewOutcome,
    hasResults: Boolean(results),
    hasSubmission: submissionCount > 0,
    latestSubmission,
    loading,
    skillCount,
    submissionCount,
    submissionAvailable,
    submissionSaving,
  };
}

export function getStepState(stepId, state) {
  if (stepId === 'profile') return state.hasProfile ? 'done' : 'active';
  if (stepId === 'files') return state.documentCount > 0 ? 'done' : 'pending';
  if (stepId === 'analysis') {
    if (state.loading) return 'active';
    if (state.hasResults) return 'done';
    return state.hasProfile && state.documentCount > 0 ? 'active' : 'pending';
  }
  if (stepId === 'submit') {
    if (state.hasSubmission) return 'done';
    if (!state.submissionAvailable) return 'pending';
    return state.hasResults ? 'active' : 'pending';
  }
  if (stepId === 'review') {
    if (state.hasReviewOutcome) return 'done';
    return state.hasSubmission ? 'active' : 'pending';
  }
  return 'pending';
}

export function getStepMeta(stepId, state) {
  if (stepId === 'profile') return state.hasProfile ? `${state.skillCount}개 역량` : '이름과 직무 입력';
  if (stepId === 'files') return state.documentCount > 0 ? `${state.documentCount}개 선택` : '선택 사항';
  if (stepId === 'analysis') {
    if (state.loading) return '진행 중';
    return state.hasResults ? '완료' : '대기';
  }
  if (stepId === 'submit') {
    if (state.submissionSaving) return '진행 중';
    if (!state.submissionAvailable && !state.hasSubmission) return '담당자 준비 중';
    return state.hasSubmission ? `${state.submissionCount}건` : '준비 후 가능';
  }
  if (stepId === 'review') {
    if (state.hasReviewOutcome) return state.hasFeedback ? '피드백 도착' : '검토 완료';
    if (state.latestSubmission?.status === 'reviewing') return '검토 중';
    return state.hasSubmission ? '확인 대기' : '제출 후 시작';
  }
  return '';
}

export function getPrimaryWorkflowAction(state) {
  if (!state.hasProfile) return { label: '정보 입력하기', tab: 'input' };
  if (state.documentCount === 0) return { label: '자료 첨부하기', tab: 'input' };
  if (!state.hasResults) return { label: state.loading ? '분석 진행 중' : 'AI 분석 시작', tab: 'input', analyze: true };
  if (!state.submissionAvailable && !state.hasSubmission) return { label: '분석 결과 보완', tab: 'feedback' };
  if (!state.hasSubmission) return { label: '제출 화면 열기', tab: 'portfolio' };
  if (state.latestSubmission?.status === 'rejected') {
    return { label: '보완 내용 확인', tab: 'portfolio' };
  }
  if (state.latestSubmission?.status === 'reviewed') return { label: '검토 결과 확인', tab: 'portfolio' };
  return { label: '제출 상태 확인', tab: 'portfolio' };
}
