import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Save,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { fetchAdminOverview, updateAdminSubmissionReview } from '../lib/admin-api';

const REVIEW_STATUS_OPTIONS = [
  { id: 'submitted', label: '제출 완료' },
  { id: 'reviewing', label: '검토 중' },
  { id: 'reviewed', label: '검토 완료' },
  { id: 'rejected', label: '반려' },
];

const REVIEW_STATUS_LABELS = Object.fromEntries(REVIEW_STATUS_OPTIONS.map((status) => [status.id, status.label]));
const MAX_ADMIN_MEMO_LENGTH = 2000;
const MAX_STUDENT_FEEDBACK_LENGTH = 3000;

const REVIEW_FILTER_SHORTCUTS = [
  { id: 'submitted', label: '확인 필요' },
  { id: 'reviewing', label: '검토 중' },
  { id: 'rejected', label: '반려' },
];

function formatDateTime(value) {
  if (!value) return '정보 없음';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('ko-KR');
  } catch {
    return value;
  }
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getStatusLabel(status) {
  return REVIEW_STATUS_LABELS[status] || status || '상태 확인 필요';
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

function getStudentName(submission) {
  return submission.accountStudentName
    || submission.account?.studentName
    || submission.userDisplayName
    || submission.account?.displayName
    || submission.applicantName
    || '이름 미설정';
}

function getStudentEmail(submission) {
  return submission.userEmail || submission.account?.email || '이메일 없음';
}

function getUserDisplayName(user) {
  return user.studentName || user.displayName || user.email || '이름 미설정';
}

function flattenFiles(files = {}) {
  return [
    files.resume ? { label: '이력서', ...files.resume } : null,
    files.coverLetter ? { label: '자기소개서', ...files.coverLetter } : null,
    ...(Array.isArray(files.portfolio) ? files.portfolio.map((file, index) => ({
      label: `포트폴리오 ${index + 1}`,
      ...file,
    })) : []),
  ].filter(Boolean);
}

function getFileTotal(fileCounts = {}) {
  return (Number(fileCounts.resume) || 0) + (Number(fileCounts.coverLetter) || 0) + (Number(fileCounts.portfolio) || 0);
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function getOperationalFlags(submission) {
  const flags = [];
  if (!submission.accountStudentName && !submission.account?.studentName) {
    flags.push('이름 미설정');
  }
  if (getFileTotal(submission.fileCounts) === 0) {
    flags.push('파일 미제출');
  }
  if (!submission.latestAnalysisSummary && !submission.latestRecommendedJobsSnapshot?.length) {
    flags.push('분석 미완료');
  }
  return flags;
}

function buildAdminSummary(submissions = [], users = []) {
  const uniqueSubmitters = new Set(submissions.map((item) => item.userId).filter(Boolean));
  return {
    totalSubmissions: submissions.length,
    totalUsers: users.length,
    uniqueSubmitters: uniqueSubmitters.size,
    submittedCount: submissions.filter((item) => item.status === 'submitted').length,
    reviewingCount: submissions.filter((item) => item.status === 'reviewing').length,
    reviewedCount: submissions.filter((item) => item.status === 'reviewed').length,
    rejectedCount: submissions.filter((item) => item.status === 'rejected').length,
    todayActionCount: submissions.filter((item) => (
      ['submitted', 'reviewing'].includes(item.status) && isToday(item.submittedAtIso)
    )).length,
    resubmissionWaitCount: submissions.filter((item) => item.status === 'rejected').length,
    latestSubmittedAtIso: submissions[0]?.submittedAtIso || '',
  };
}

function escapeCsvValue(value) {
  const text = value == null ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function FileLinks({ files }) {
  const fileRows = flattenFiles(files);

  if (fileRows.length === 0) {
    return <span className="text-xs text-slate-400">파일 링크 없음</span>;
  }

  return (
    <div className="grid gap-2">
      {fileRows.map((file) => (
        <a
          key={`${file.label}-${file.storagePath || file.url || file.fileName}`}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
        >
          <span className="flex min-w-0 items-center gap-2">
            <FileText size={15} className="shrink-0 text-slate-400" />
            <span className="truncate">{file.label}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
            {formatBytes(file.size)}
            <ExternalLink size={13} />
          </span>
        </a>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${getStatusTone(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function Metric({ icon: Icon, label, value, helper }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-slate-400">{label}</p>
        <Icon size={16} className="text-slate-400" />
      </div>
      <strong className="mt-2 block text-2xl font-black text-slate-900">{value}</strong>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </article>
  );
}

export default function AdminWorkspace({
  getAccessToken,
  isAdmin,
  userProfile,
}) {
  const [overview, setOverview] = useState({ summary: {}, submissions: [], users: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trackFilter, setTrackFilter] = useState('all');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('');
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [savingSubmissionId, setSavingSubmissionId] = useState('');

  const loadOverview = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const nextOverview = await fetchAdminOverview(getAccessToken);
      setOverview({
        ...nextOverview,
        summary: buildAdminSummary(nextOverview.submissions, nextOverview.users),
      });
      setActionMessage('');
    } catch (loadError) {
      setError(loadError.message || '관리자 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, isAdmin]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!overview.submissions.length) {
      setSelectedSubmissionId('');
      return;
    }
    if (!overview.submissions.some((submission) => submission.id === selectedSubmissionId)) {
      setSelectedSubmissionId(overview.submissions[0].id);
    }
  }, [overview.submissions, selectedSubmissionId]);

  const summary = overview.summary || {};
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const trackOptions = useMemo(() => (
    [...new Set(overview.submissions.map((submission) => submission.track).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'ko-KR'))
  ), [overview.submissions]);

  const filteredSubmissions = useMemo(() => overview.submissions.filter((submission) => {
    if (statusFilter !== 'all' && submission.status !== statusFilter) return false;
    if (trackFilter !== 'all' && submission.track !== trackFilter) return false;
    if (!normalizedQuery) return true;
    return [
      getStudentName(submission),
      getStudentEmail(submission),
      submission.applicantName,
      submission.track,
      submission.subRole,
      submission.userId,
      submission.adminMemo,
      submission.studentFeedback,
    ].join(' ').toLowerCase().includes(normalizedQuery);
  }), [normalizedQuery, overview.submissions, statusFilter, trackFilter]);

  const selectedSubmission = useMemo(() => (
    filteredSubmissions.find((submission) => submission.id === selectedSubmissionId)
    || filteredSubmissions[0]
    || null
  ), [filteredSubmissions, selectedSubmissionId]);

  const selectedDraft = selectedSubmission
    ? reviewDrafts[selectedSubmission.id] || {
      status: selectedSubmission.status || 'submitted',
      adminMemo: selectedSubmission.adminMemo || '',
      studentFeedback: selectedSubmission.studentFeedback || '',
    }
    : null;

  const isReviewDirty = Boolean(selectedSubmission && selectedDraft && (
    selectedDraft.status !== (selectedSubmission.status || 'submitted')
    || selectedDraft.adminMemo !== (selectedSubmission.adminMemo || '')
    || selectedDraft.studentFeedback !== (selectedSubmission.studentFeedback || '')
  ));

  const userRows = useMemo(() => {
    const submissionMap = new Map();
    overview.submissions.forEach((submission) => {
      if (!submission.userId) return;
      const current = submissionMap.get(submission.userId) || { count: 0, latestSubmittedAtIso: '' };
      submissionMap.set(submission.userId, {
        count: current.count + 1,
        latestSubmittedAtIso: current.latestSubmittedAtIso || submission.submittedAtIso || '',
      });
    });

    return overview.users
      .map((user) => ({
        ...user,
        submissionCount: submissionMap.get(user.uid)?.count || 0,
        latestSubmittedAtIso: submissionMap.get(user.uid)?.latestSubmittedAtIso || '',
      }))
      .filter((user) => {
        if (!normalizedQuery) return true;
        return [
          getUserDisplayName(user),
          user.email,
          user.uid,
          user.role,
          user.trackDefault,
        ].join(' ').toLowerCase().includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (right.submissionCount !== left.submissionCount) return right.submissionCount - left.submissionCount;
        return getUserDisplayName(left).localeCompare(getUserDisplayName(right), 'ko-KR');
      });
  }, [normalizedQuery, overview.submissions, overview.users]);

  const updateSelectedDraft = (patch) => {
    if (!selectedSubmission) return;
    setReviewDrafts((current) => ({
      ...current,
      [selectedSubmission.id]: {
        status: selectedSubmission.status || 'submitted',
        adminMemo: selectedSubmission.adminMemo || '',
        studentFeedback: selectedSubmission.studentFeedback || '',
        ...(current[selectedSubmission.id] || {}),
        ...patch,
      },
    }));
  };

  const handleSaveReview = async () => {
    if (!selectedSubmission || !selectedDraft || !isReviewDirty) return;
    setSavingSubmissionId(selectedSubmission.id);
    setError('');
    setActionMessage('');

    try {
      const updatedSubmission = await updateAdminSubmissionReview(getAccessToken, selectedSubmission.id, {
        status: selectedDraft.status,
        adminMemo: selectedDraft.adminMemo,
        studentFeedback: selectedDraft.studentFeedback,
      });

      setOverview((current) => {
        const nextSubmissions = current.submissions.map((submission) => (
          submission.id === updatedSubmission.id
            ? { ...submission, ...updatedSubmission, account: submission.account || updatedSubmission.account || null }
            : submission
        ));
        return {
          ...current,
          submissions: nextSubmissions,
          summary: buildAdminSummary(nextSubmissions, current.users),
        };
      });
      setReviewDrafts((current) => {
        const next = { ...current };
        delete next[selectedSubmission.id];
        return next;
      });
      setActionMessage('검토 상태를 저장했습니다.');
    } catch (saveError) {
      setError(saveError.message || '검토 상태를 저장하지 못했습니다.');
    } finally {
      setSavingSubmissionId('');
    }
  };

  const handleDownloadCsv = () => {
    const rows = [
      [
        'submissionId',
        'status',
        'studentName',
        'applicantName',
        'email',
        'track',
        'subRole',
        'submittedAt',
        'fileCount',
        'flags',
        'studentFeedback',
        'adminMemo',
      ],
      ...filteredSubmissions.map((submission) => [
        submission.id,
        getStatusLabel(submission.status),
        getStudentName(submission),
        submission.applicantName || '',
        getStudentEmail(submission),
        submission.track || '',
        submission.subRole || '',
        submission.submittedAtIso || '',
        getFileTotal(submission.fileCounts),
        getOperationalFlags(submission).join(' / '),
        submission.studentFeedback || '',
        submission.adminMemo || '',
      ]),
    ];
    downloadCsv(`portfolio-submissions-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  if (!isAdmin) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold">관리자 권한이 필요합니다.</h3>
            <p className="mt-1 text-sm leading-relaxed">
              현재 계정은 관리자 화면을 볼 수 없습니다. Firebase 사용자 문서에서 role 값을 admin으로 지정한 계정만 접근합니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="coach-admin-workspace space-y-5 animate-in fade-in slide-in-from-bottom-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400">Admin Console</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">제출 운영 관리</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              학생 계정, 제출 파일, 검토 상태와 관리자 메모를 한 화면에서 관리합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              {userProfile?.studentName || userProfile?.displayName || '관리자'}
            </span>
            <button
              type="button"
              onClick={loadOverview}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              새로고침
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={filteredSubmissions.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={15} />
              CSV
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Metric icon={FileText} label="전체 제출" value={`${summary.totalSubmissions || 0}건`} helper={`최근 제출 ${formatDateTime(summary.latestSubmittedAtIso)}`} />
        <Metric icon={UsersRound} label="사용자" value={`${summary.totalUsers || 0}명`} helper={`${summary.uniqueSubmitters || 0}명이 제출함`} />
        <Metric icon={Clock3} label="오늘 확인" value={`${summary.todayActionCount || 0}건`} helper="오늘 들어온 확인 대상" />
        <Metric icon={Clock3} label="확인 필요" value={`${summary.submittedCount || 0}건`} helper="신규 제출 상태" />
        <Metric icon={MessageSquare} label="검토 중" value={`${summary.reviewingCount || 0}건`} helper="진행 중인 검토" />
        <Metric icon={CheckCircle2} label="재제출 대기" value={`${summary.resubmissionWaitCount || 0}건`} helper={`검토 완료 ${summary.reviewedCount || 0}건`} />
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {actionMessage ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto_auto] xl:items-center">
          <div>
            <h3 className="text-lg font-black text-slate-900">제출 목록</h3>
            <p className="mt-1 text-sm text-slate-500">총 {overview.submissions.length}건 중 {filteredSubmissions.length}건 표시</p>
          </div>
          <label className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-slate-400">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="이름, 이메일, 직무 검색"
              className="min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 xl:w-72"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="all">전체 상태</option>
            {REVIEW_STATUS_OPTIONS.map((status) => (
              <option key={status.id} value={status.id}>{status.label}</option>
            ))}
          </select>
          <select
            value={trackFilter}
            onChange={(event) => setTrackFilter(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="all">전체 트랙</option>
            {trackOptions.map((track) => (
              <option key={track} value={track}>{track}</option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
              statusFilter === 'all'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400'
            }`}
          >
            전체
          </button>
          {REVIEW_FILTER_SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut.id}
              type="button"
              onClick={() => setStatusFilter(shortcut.id)}
              className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                statusFilter === shortcut.id
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400'
              }`}
            >
              {shortcut.label} {overview.submissions.filter((submission) => submission.status === shortcut.id).length}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 space-y-2">
            {loading && overview.submissions.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-6 py-12 text-center">
                <Loader2 size={24} className="mx-auto mb-3 animate-spin text-slate-500" />
                <p className="font-semibold text-slate-700">관리자 데이터를 불러오는 중입니다.</p>
              </div>
            ) : null}

            {!loading && filteredSubmissions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                표시할 제출 내역이 없습니다.
              </div>
            ) : null}

            {filteredSubmissions.map((submission) => {
              const selected = selectedSubmission?.id === submission.id;
              const flags = getOperationalFlags(submission);
              return (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => setSelectedSubmissionId(submission.id)}
                  className={`block w-full rounded-lg border px-4 py-3 text-left transition ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400 hover:bg-white'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={submission.status} />
                        <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                          selected ? 'border-white/20 bg-white/10 text-white' : 'border-slate-200 bg-white text-slate-600'
                        }`}>
                          {submission.track || '트랙 없음'} · {submission.subRole || '세부 직무 없음'}
                        </span>
                        {flags.map((flag) => (
                          <span
                            key={flag}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                              selected ? 'border-white/20 bg-white/10 text-white' : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                      <h4 className="mt-3 truncate text-lg font-black">{submission.applicantName || getStudentName(submission)}</h4>
                      <p className={`mt-1 truncate text-sm ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {getStudentEmail(submission)}
                      </p>
                    </div>
                    <div className={`shrink-0 text-sm ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                      <p>{formatDateTime(submission.submittedAtIso)}</p>
                      <p className="mt-1 font-semibold">{getFileTotal(submission.fileCounts)}개 파일</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <aside className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 xl:sticky xl:top-4 xl:self-start">
            {selectedSubmission ? (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={selectedSubmission.status} />
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                      {selectedSubmission.track || '트랙 없음'}
                    </span>
                    {getOperationalFlags(selectedSubmission).map((flag) => (
                      <span key={flag} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                        {flag}
                      </span>
                    ))}
                  </div>
                  <h4 className="mt-3 text-xl font-black text-slate-900">{selectedSubmission.applicantName || '지원자 이름 없음'}</h4>
                  <p className="mt-1 text-sm text-slate-500">{selectedSubmission.subRole || '세부 직무 없음'} · {formatDateTime(selectedSubmission.submittedAtIso)}</p>
                </div>

                <div className="grid gap-2 border-t border-slate-200 pt-4 text-sm">
                  <p className="flex items-center gap-2 text-slate-700">
                    <UserRound size={15} className="text-slate-400" />
                    <span className="font-semibold text-slate-900">학생 이름</span>
                    <span className="min-w-0 truncate">{getStudentName(selectedSubmission)}</span>
                  </p>
                  <p className="flex items-center gap-2 text-slate-700">
                    <Mail size={15} className="text-slate-400" />
                    <span className="font-semibold text-slate-900">Google</span>
                    <span className="min-w-0 truncate">{getStudentEmail(selectedSubmission)}</span>
                  </p>
                  <p className="break-all text-xs text-slate-400">UID: {selectedSubmission.userId || '정보 없음'}</p>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FolderOpen size={16} className="text-slate-400" />
                    <h5 className="font-bold text-slate-900">제출 파일</h5>
                  </div>
                  <FileLinks files={selectedSubmission.files} />
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <h5 className="font-bold text-slate-900">검토 상태</h5>
                  <div className="mt-3 grid gap-3">
                    <select
                      value={selectedDraft?.status || 'submitted'}
                      onChange={(event) => updateSelectedDraft({ status: event.target.value })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400"
                    >
                      {REVIEW_STATUS_OPTIONS.map((status) => (
                        <option key={status.id} value={status.id}>{status.label}</option>
                      ))}
                    </select>
                    <label className="grid gap-1">
                      <span className="text-xs font-bold text-slate-500">학생 공개 피드백</span>
                      <textarea
                        value={selectedDraft?.studentFeedback || ''}
                        onChange={(event) => updateSelectedDraft({ studentFeedback: event.target.value })}
                        rows={5}
                        maxLength={MAX_STUDENT_FEEDBACK_LENGTH}
                        placeholder="학생 화면에 표시할 검토 결과를 입력하세요."
                        className="resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400"
                      />
                      <span className="text-right text-xs text-slate-400">{(selectedDraft?.studentFeedback || '').length}/{MAX_STUDENT_FEEDBACK_LENGTH}</span>
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-bold text-slate-500">관리자 메모</span>
                      <textarea
                        value={selectedDraft?.adminMemo || ''}
                        onChange={(event) => updateSelectedDraft({ adminMemo: event.target.value })}
                        rows={4}
                        maxLength={MAX_ADMIN_MEMO_LENGTH}
                        placeholder="관리자 내부 확인용 메모"
                        className="resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400"
                      />
                      <span className="text-right text-xs text-slate-400">{(selectedDraft?.adminMemo || '').length}/{MAX_ADMIN_MEMO_LENGTH}</span>
                    </label>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-400">
                        {selectedSubmission.reviewUpdatedAtIso ? `최근 검토 ${formatDateTime(selectedSubmission.reviewUpdatedAtIso)}` : '검토 전'}
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveReview}
                        disabled={!isReviewDirty || savingSubmissionId === selectedSubmission.id}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {savingSubmissionId === selectedSubmission.id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        저장
                      </button>
                    </div>
                  </div>
                </div>

                {selectedSubmission.latestAnalysisSummary || selectedSubmission.latestRecommendedJobsSnapshot?.length ? (
                  <div className="border-t border-slate-200 pt-4">
                    <h5 className="font-bold text-slate-900">분석 스냅샷</h5>
                    {selectedSubmission.latestAnalysisSummary ? (
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{selectedSubmission.latestAnalysisSummary}</p>
                    ) : null}
                    {selectedSubmission.latestRecommendedJobsSnapshot?.length ? (
                      <div className="mt-3 grid gap-2">
                        {selectedSubmission.latestRecommendedJobsSnapshot.map((job) => (
                          <div key={`${job.id}-${job.company}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                            <p className="font-semibold text-slate-900">{job.company || '회사 정보 없음'}</p>
                            <p className="mt-1 text-slate-500">{job.title || '공고명 없음'} · {job.score || 0}점</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
                제출을 선택하면 상세 정보가 표시됩니다.
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">사용자 명단</h3>
            <p className="mt-1 text-sm text-slate-500">학생이 설정한 이름, Google 계정, 제출 횟수를 확인합니다.</p>
          </div>
          <p className="text-sm font-semibold text-slate-500">{userRows.length}명 표시</p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-400">
                <th className="px-3 py-3">이름</th>
                <th className="px-3 py-3">이메일</th>
                <th className="px-3 py-3">권한</th>
                <th className="px-3 py-3">제출</th>
                <th className="px-3 py-3">최근 제출</th>
                <th className="px-3 py-3">최근 로그인</th>
              </tr>
            </thead>
            <tbody>
              {userRows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-3 py-8 text-center text-slate-400">표시할 사용자가 없습니다.</td>
                </tr>
              ) : null}
              {userRows.map((user) => (
                <tr key={user.uid} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-3 py-3 font-semibold text-slate-900">{getUserDisplayName(user)}</td>
                  <td className="px-3 py-3 text-slate-600">{user.email || '이메일 없음'}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                      user.role === 'admin'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}>
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{user.submissionCount}건</td>
                  <td className="px-3 py-3 text-slate-500">{formatDateTime(user.latestSubmittedAtIso)}</td>
                  <td className="px-3 py-3 text-slate-500">{formatDateTime(user.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
