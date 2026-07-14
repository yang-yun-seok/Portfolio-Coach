import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MessageSquare,
  Send,
} from 'lucide-react';

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
    case 'submitted': return '확인 대기';
    case 'reviewing': return '검토 중';
    case 'reviewed': return '검토 완료';
    case 'rejected': return '보완 필요';
    default: return status || '상태 확인 필요';
  }
}

function getStatusHelp(status) {
  switch (status) {
    case 'reviewing': return '담당자가 제출 자료를 확인하고 있습니다.';
    case 'reviewed': return '검토가 완료되었습니다. 공개 피드백을 확인하세요.';
    case 'rejected': return '보완할 내용을 확인한 뒤 수정본을 다시 제출하세요.';
    case 'submitted': return '제출이 전달되었으며 담당자 확인을 기다리고 있습니다.';
    default: return '현재 제출 상태를 확인하고 있습니다.';
  }
}

function getFileTotal(fileCounts = {}) {
  return (Number(fileCounts.resume) || 0)
    + (Number(fileCounts.coverLetter) || 0)
    + (Number(fileCounts.portfolio) || 0);
}

function StatusIcon({ status }) {
  if (status === 'reviewed') return <CheckCircle2 size={18} />;
  if (status === 'rejected') return <AlertCircle size={18} />;
  return <Clock3 size={18} />;
}

export default function PortfolioSubmissionPanel({
  authEnabled,
  authUser,
  submissionCapability,
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
      <section className="coach-submission-console">
        <div className="coach-submission-empty">
          <AlertCircle size={18} />
          <div>
            <strong>제출 기능을 아직 사용할 수 없습니다.</strong>
            <p>담당자 설정이 완료된 뒤 이 화면에서 자료를 제출할 수 있습니다.</p>
          </div>
        </div>
      </section>
    );
  }

  const accountDisplayName = userProfile?.studentName || userProfile?.displayName || authUser?.displayName || '';
  const submissionReady = submissionCapability?.enabled === true;
  const submissionChecking = submissionCapability?.status === 'checking';
  const latestSubmission = submissions[0] || null;
  const submitLabel = latestSubmission?.status === 'rejected'
    ? '보완본 다시 제출'
    : latestSubmission
      ? '새 버전 제출'
      : '검토 요청하기';

  return (
    <section className="coach-submission-console" aria-labelledby="coach-submission-title">
      <header className="coach-submission-heading">
        <div>
          <p className="coach-submission-overline">제출·검토</p>
          <h3 id="coach-submission-title">담당자 검토 요청</h3>
          <p>현재 준비한 자료를 제출하고 검토 상태와 공개 피드백을 이어서 확인합니다.</p>
        </div>
        <button
          type="button"
          onClick={onSubmitPortfolio}
          disabled={submissionSaving || !authUser || !submissionReady}
          className="coach-submission-primary"
          aria-describedby={!submissionReady && !submissionChecking ? 'coach-submission-availability' : undefined}
        >
          {submissionSaving || submissionChecking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {submissionChecking ? '제출 상태 확인 중' : submissionReady ? submitLabel : '검토 요청 준비 중'}
        </button>
      </header>

      <div className="coach-submission-layout">
        <div className="coach-submission-current">
          {latestSubmission ? (
            <>
              <div className={`coach-submission-state is-${latestSubmission.status || 'submitted'}`}>
                <span className="coach-submission-state-icon"><StatusIcon status={latestSubmission.status} /></span>
                <div>
                  <small>현재 상태</small>
                  <strong>{mapStatus(latestSubmission.status)}</strong>
                  <p>{getStatusHelp(latestSubmission.status)}</p>
                </div>
              </div>

              <dl className="coach-submission-facts">
                <div><dt>제출자</dt><dd>{accountDisplayName || '이름 설정 필요'}</dd></div>
                <div><dt>제출 자료</dt><dd>{getFileTotal(latestSubmission.fileCounts)}개</dd></div>
                <div><dt>제출 일시</dt><dd>{formatDateTime(latestSubmission.submittedAtIso)}</dd></div>
              </dl>

              {latestSubmission.studentFeedback ? (
                <div className="coach-submission-feedback">
                  <div>
                    <MessageSquare size={16} />
                    <strong>담당자 검토 결과</strong>
                  </div>
                  <p>{latestSubmission.studentFeedback}</p>
                  {latestSubmission.studentFeedbackUpdatedAtIso ? (
                    <time>{formatDateTime(latestSubmission.studentFeedbackUpdatedAtIso)}</time>
                  ) : null}
                </div>
              ) : (
                <div className="coach-submission-waiting">
                  <Clock3 size={17} />
                  <div>
                    <strong>공개 피드백 대기 중</strong>
                    <p>담당자가 검토 결과를 등록하면 이 영역에 표시됩니다.</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="coach-submission-empty is-large">
              <FileText size={20} />
              <div>
                <strong>아직 제출한 자료가 없습니다.</strong>
                <p>현재 문서를 확인한 뒤 검토 요청하기를 눌러 제출하세요.</p>
              </div>
            </div>
          )}

          {submissionSuccess ? (
            <div className="coach-submission-notice is-success" role="status">
              <CheckCircle2 size={16} />
              <span>{submissionSuccess}</span>
            </div>
          ) : null}

          {!submissionReady && !submissionChecking ? (
            <div id="coach-submission-availability" className="coach-submission-notice is-pending" role="status">
              <Clock3 size={16} />
              <span>자료 제출은 현재 준비 중입니다. 준비가 완료되면 이 화면에서 담당자 검토를 요청할 수 있습니다.</span>
            </div>
          ) : null}

          {submissionError ? (
            <div className="coach-submission-notice is-error" role="alert">
              <AlertCircle size={16} />
              <span>{submissionError}</span>
            </div>
          ) : null}
        </div>

        <aside className="coach-submission-history" aria-label="내 제출 이력">
          <div className="coach-submission-history-head">
            <div>
              <p className="coach-submission-overline">제출 이력</p>
              <h4>최근 버전</h4>
            </div>
            {submissionsLoading ? <Loader2 size={16} className="animate-spin" /> : <span>{submissions.length}건</span>}
          </div>

          {submissions.length > 0 ? (
            <ol className="coach-submission-timeline">
              {submissions.map((submission, index) => (
                <li key={submission.id} className={index === 0 ? 'is-current' : ''}>
                  <span className="coach-submission-timeline-marker" />
                  <div>
                    <div className="coach-submission-timeline-head">
                      <strong>{index === 0 ? '현재 제출' : `${submissions.length - index}차 제출`}</strong>
                      <span className={`is-${submission.status || 'submitted'}`}>{mapStatus(submission.status)}</span>
                    </div>
                    <p>{submission.track || '트랙 없음'} · {submission.subRole || '세부 직무 없음'}</p>
                    <time>{formatDateTime(submission.submittedAtIso)}</time>
                    {submission.studentFeedback && index !== 0 ? (
                      <details className="coach-submission-history-feedback">
                        <summary>
                          이전 피드백 확인
                          <ArrowRight size={14} />
                        </summary>
                        <p>{submission.studentFeedback}</p>
                      </details>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="coach-submission-history-empty">첫 제출 후 이력이 시간순으로 표시됩니다.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
