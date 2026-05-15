import React from 'react';
import { AlertCircle, CheckCircle, Loader2, Send } from 'lucide-react';

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

export default function PortfolioSubmissionPanel({
  authEnabled,
  authUser,
  submissionError,
  submissionSaving,
  submissionSuccess,
  submissions,
  submissionsLoading,
  onSubmitPortfolio,
}) {
  if (!authEnabled) {
    return (
      <section className="coach-review-surface">
        <div className="coach-review-empty-box">
          <AlertCircle size={16} />
          <div>
            <p className="coach-review-empty-title">제출 저장 기능이 아직 비활성 상태입니다.</p>
            <p className="coach-review-empty-body">Firebase 인증과 저장소 설정을 마치면 이 화면에서 제출을 저장할 수 있습니다.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="coach-review-surface">
      <div className="coach-review-section-head">
        <div>
          <p className="coach-review-eyebrow">제출 관리</p>
          <h3>포트폴리오 제출 저장</h3>
          <p className="coach-review-section-body">
            로그인한 계정을 기준으로 현재 이력서, 자기소개서, 포트폴리오 파일을 Firebase에 저장합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmitPortfolio}
          disabled={submissionSaving || !authUser}
          className="coach-review-badge is-action"
        >
          {submissionSaving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          제출 저장
        </button>
      </div>

      <div className="coach-submission-meta">
        <div>
          <span>로그인 계정</span>
          <strong>{authUser?.email || '로그인 필요'}</strong>
        </div>
        <div>
          <span>저장 위치</span>
          <strong>Firebase Firestore / Storage</strong>
        </div>
      </div>

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
                </div>
                <span className="coach-submission-history-status">{mapStatus(submission.status)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="coach-review-empty-box">
            <div>
              <p className="coach-review-empty-title">아직 저장된 제출 내역이 없습니다.</p>
              <p className="coach-review-empty-body">현재 문서를 정리한 뒤 제출 저장을 누르면 목록이 여기에 쌓입니다.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
