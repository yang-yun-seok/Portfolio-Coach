import React from 'react';
import {
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
      return '반려';
    case 'submitted':
      return '제출 완료';
    default:
      return status || '제출 전';
  }
}

function getStepIcon(state) {
  if (state === 'done') return <CheckCircle2 size={17} />;
  if (state === 'active') return <Clock3 size={17} />;
  return <Circle size={17} />;
}

function HomeMetric({ label, value, helper }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <strong className="mt-2 block text-xl font-black text-slate-900">{value}</strong>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </article>
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
    submissions,
    submissionSaving,
  });
  const primaryAction = getPrimaryWorkflowAction(state);
  const latestSubmission = state.latestSubmission;
  const accountName = userProfile?.studentName || userProfile?.displayName || authUser?.displayName || '';

  const handlePrimaryAction = () => {
    onSelectTab(primaryAction.tab);
    if (primaryAction.analyze && !loading) onAnalyze();
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">오늘 할 일</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">취업 준비 상태를 한 번에 확인하세요</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
              입력, 분석, 제출, 검토 결과까지 지금 필요한 단계만 이어서 진행합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={primaryAction.analyze && loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
            {primaryAction.label}
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HomeMetric label="프로필" value={state.hasProfile ? '준비됨' : '입력 필요'} helper={`${state.skillCount}개 역량 입력`} />
        <HomeMetric label="자료" value={`${state.documentCount}개`} helper="이력서, 자기소개서, 포트폴리오" />
        <HomeMetric label="분석" value={state.hasResults ? '완료' : loading ? '진행 중' : '대기'} helper={`${recommendedJobs.length || 0}개 추천 공고`} />
        <HomeMetric label="제출" value={state.hasSubmission ? `${state.submissionCount}건` : '없음'} helper={latestSubmission ? getSubmissionStatusLabel(latestSubmission.status) : '제출 전'} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">준비 흐름</h3>
            <p className="mt-1 text-sm text-slate-500">완료된 단계와 다음 단계를 확인합니다.</p>
          </div>
          <button
            type="button"
            onClick={onOpenAccountName}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            <UserRound size={16} />
            {accountName || '이름 설정'}
          </button>
        </div>

        <ol className="mt-5 grid gap-3 md:grid-cols-5">
          {WORKFLOW_STEPS.map((step) => {
            const stepState = getStepState(step.id, state);
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => onSelectTab(step.tab)}
                  className={`h-full w-full rounded-lg border px-3 py-4 text-left transition ${
                    stepState === 'done'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : stepState === 'active'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-black">
                    {getStepIcon(stepState)}
                    {step.label}
                  </span>
                  <small className={`mt-2 block text-xs ${stepState === 'active' ? 'text-slate-300' : ''}`}>
                    {getStepMeta(step.id, state)}
                  </small>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_0.8fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Send size={17} className="text-slate-400" />
            <h3 className="text-lg font-black text-slate-900">제출 상태</h3>
          </div>
          {submissionsLoading ? (
            <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              제출 내역 확인 중
            </div>
          ) : latestSubmission ? (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{latestSubmission.title || '포트폴리오 제출'}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(latestSubmission.submittedAtIso)}</p>
                </div>
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                  {getSubmissionStatusLabel(latestSubmission.status)}
                </span>
              </div>
              {latestSubmission.studentFeedback ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-relaxed text-emerald-900">
                  {latestSubmission.studentFeedback}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">검토 결과가 등록되면 제출 화면에서 확인할 수 있습니다.</p>
              )}
              <button
                type="button"
                onClick={() => onSelectTab('portfolio')}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                제출 화면 열기
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-sm text-slate-500">
              아직 제출 내역이 없습니다. 분석 결과를 확인한 뒤 포트폴리오 화면에서 제출하세요.
            </div>
          )}
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Clock3 size={17} className="text-slate-400" />
            <h3 className="text-lg font-black text-slate-900">빠른 이동</h3>
          </div>
          <div className="mt-5 grid gap-2">
            <button type="button" onClick={() => onSelectTab('input')} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400">
              <FileText size={16} />
              정보와 파일 정리
            </button>
            <button type="button" onClick={() => onSelectTab('jobs')} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400">
              <Sparkles size={16} />
              추천 공고 확인
            </button>
            <button type="button" onClick={() => onSelectTab('portfolio')} disabled={!state.hasResults} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50">
              <Send size={16} />
              제출 및 검토 결과
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
