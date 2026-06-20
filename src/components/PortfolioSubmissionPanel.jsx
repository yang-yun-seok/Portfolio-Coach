import React from 'react';
import { AlertCircle, CheckCircle, Loader2, MessageSquare, Send } from 'lucide-react';

function formatDateTime(value) {
  if (!value) return '시간 정보 없음';
  try {
    return new Date(value).toLocaleString('ko-KR');
  } catch {
    return value;
  }
}

function mapStatus(status) {
  switch (status) {
    case 'submitted':
      return '제출 완료';
    case 'reviewing':
      return '검토 중';
    case 'reviewed':
      return '검토 완료';
    case 'rejected':
      return '반려';
    default:
      return status || '상태 확인 필요';
  }
}

function getStatusTone(status) {
  switch (status) {
    case 'reviewing':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'reviewed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'rejected':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700';
  }
}

function getStatusHelp(status) {
  switch (status) {
    case 'reviewing':
      return '담당자가 자료를 확인하고 있습니다.';
    case 'reviewed':
      return '검토가 완료되었습니다. 공개 피드백을 확인하세요.';
    case 'rejected':
      return '보완이 필요한 제출입니다. 피드백을 확인한 뒤 다시 제출하세요.';
    case 'submitted':
      return '제출이 완료되었고 확인을 기다리고 있습니다.';
    default:
      return '제출 상태를 확인하고 있습니다.';
  }
}

export default function PortfolioSubmissionPanel({
  authEnabled,
  authUser,
  submissionError,
  submissionSaving,
  submissionSuccess,
  submissions,
  submissionsLoading,
  onSubmitPortfolio,
  userProfile,
}) {
  if (!authEnabled) {
    return (
      <section className="coach-review-surface">
        <div className="coach-review-empty-box">
          <AlertCircle size={16} />
          <div>
            <p className="coach-review-empty-title">제출 기능을 아직 사용할 수 없습니다.</p>
            <p className="coach-review-empty-body">담당자 설정이 완료된 뒤 이 화면에서 자료를 제출할 수 있습니다.</p>
          </div>
        </div>
      </section>
    );
  }

  const accountDisplayName = userProfile?.studentName || userProfile?.displayName || authUser?.displayName || '';
  const latestSubmission = submissions[0] || null;

  return (
    <section className="coach-review-surface">
      <div className="coach-review-section-head">
        <div>
          <p className="coach-review-eyebrow">제출</p>
          <h3>포트폴리오 자료 제출</h3>
          <p className="coach-review-section-body">
            현재 이력서, 자기소개서, 포트폴리오 파일을 담당자 확인용으로 제출합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmitPortfolio}
          disabled={submissionSaving || !authUser}
          className="coach-review-badge is-action"
        >
          {submissionSaving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          제출하기
        </button>
      </div>

      <div className="coach-submission-meta">
        <div>
          <span>제출자</span>
          <strong>{accountDisplayName || '이름 설정 필요'}</strong>
        </div>
        <div>
          <span>제출 상태</span>
          <strong>{latestSubmission ? mapStatus(latestSubmission.status) : '제출 전'}</strong>
        </div>
      </div>

      {latestSubmission ? (
        <div className={`mt-4 rounded-lg border px-4 py-3 ${getStatusTone(latestSubmission.status)}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong className="text-sm">{mapStatus(latestSubmission.status)}</strong>
            <span className="text-xs font-semibold">{formatDateTime(latestSubmission.submittedAtIso)}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed">{getStatusHelp(latestSubmission.status)}</p>
          {latestSubmission.studentFeedback ? (
            <div className="mt-3 rounded-lg border border-white/60 bg-white/70 px-3 py-3 text-sm leading-relaxed text-slate-800">
              <div className="mb-2 flex items-center gap-2 font-bold text-slate-900">
                <MessageSquare size={15} />
                검토 결과
              </div>
              {latestSubmission.studentFeedback}
            </div>
          ) : null}
        </div>
      ) : null}

      {submissionSuccess ? (
        <div className="coach-submission-flash is-success">
          <CheckCircle size={16} />
          <span>{submissionSuccess}</span>
        </div>
      ) : null}

      {submissionError ? (
        <div className="coach-submission-flash is-error">
          <AlertCircle size={16} />
          <span>{submissionError}</span>
        </div>
      ) : null}

      <div className="coach-submission-history">
        <div className="coach-submission-history-head">
          <h4>내 제출 내역</h4>
          {submissionsLoading ? <Loader2 size={16} className="animate-spin" /> : <span>{submissions.length}건</span>}
        </div>

        {submissions.length > 0 ? (
          <ul className="coach-submission-history-list">
            {submissions.map((submission) => (
              <li key={submission.id} className="coach-submission-history-item">
                <div>
                  <p className="coach-submission-history-title">{submission.title || '포트폴리오 제출'}</p>
                  <p className="coach-submission-history-meta">
                    {submission.track} · {submission.subRole} · {formatDateTime(submission.submittedAtIso)}
                  </p>
                  {submission.studentFeedback ? (
                    <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-relaxed text-emerald-900">
                      {submission.studentFeedback}
                    </p>
                  ) : null}
                </div>
                <span className={`coach-submission-history-status border ${getStatusTone(submission.status)}`}>
                  {mapStatus(submission.status)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="coach-review-empty-box">
            <div>
              <p className="coach-review-empty-title">아직 제출 내역이 없습니다.</p>
              <p className="coach-review-empty-body">현재 문서를 정리한 뒤 제출하기를 누르면 상태를 확인할 수 있습니다.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
