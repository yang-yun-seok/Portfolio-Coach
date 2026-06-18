import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { fetchAdminOverview } from '../lib/admin-api';

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

function StatCard({ icon: Icon, label, value, helper }) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <Icon size={17} className="text-slate-400" />
      </div>
      <strong className="mt-2 block text-2xl font-black tracking-tight text-slate-900">{value}</strong>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </article>
  );
}

function FileLinks({ files }) {
  const fileRows = flattenFiles(files);

  if (fileRows.length === 0) {
    return <span className="text-xs text-slate-400">파일 링크 없음</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {fileRows.map((file) => (
        <a
          key={`${file.label}-${file.storagePath || file.url || file.fileName}`}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
        >
          <FileText size={13} />
          {file.label}
          <ExternalLink size={12} />
        </a>
      ))}
    </div>
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
  const [searchQuery, setSearchQuery] = useState('');

  const loadOverview = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      setOverview(await fetchAdminOverview(getAccessToken));
    } catch (loadError) {
      setError(loadError.message || '관리자 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, isAdmin]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return overview.submissions;
    return overview.submissions.filter((submission) => [
      getStudentName(submission),
      getStudentEmail(submission),
      submission.applicantName,
      submission.track,
      submission.subRole,
      submission.userId,
    ].join(' ').toLowerCase().includes(query));
  }, [overview.submissions, searchQuery]);

  if (!isAdmin) {
    return (
      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900">
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

  const summary = overview.summary || {};

  return (
    <div className="coach-admin-workspace space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Admin</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">제출 관리</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Google 로그인 계정, 학생이 설정한 이름, 제출 파일 상태를 한 화면에서 확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              {userProfile?.studentName || userProfile?.displayName || '관리자'}
            </span>
            <button
              type="button"
              onClick={loadOverview}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              새로고침
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="제출" value={`${summary.totalSubmissions || 0}건`} helper="최근 제출 목록 기준" />
        <StatCard icon={UsersRound} label="사용자" value={`${summary.totalUsers || 0}명`} helper={`${summary.uniqueSubmitters || 0}명이 제출함`} />
        <StatCard icon={ShieldCheck} label="대기" value={`${summary.submittedCount || 0}건`} helper="담당자 확인 필요" />
        <StatCard icon={CheckCircle2} label="검토 완료" value={`${summary.reviewedCount || 0}건`} helper={`최근 제출 ${formatDateTime(summary.latestSubmittedAtIso)}`} />
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Submissions</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">학생 제출 목록</h3>
            <p className="mt-2 text-sm text-slate-600">학생 이름, Google 계정, 제출 상태와 파일 링크를 확인합니다.</p>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="이름, 이메일, 직무 검색"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-slate-400 lg:max-w-sm"
          />
        </div>

        <div className="mt-6 grid gap-4">
          {loading && overview.submissions.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <Loader2 size={24} className="mx-auto mb-3 animate-spin text-slate-500" />
              <p className="font-semibold text-slate-700">관리자 데이터를 불러오는 중입니다.</p>
            </div>
          ) : null}

          {!loading && filteredSubmissions.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
              표시할 제출 내역이 없습니다.
            </div>
          ) : null}

          {filteredSubmissions.map((submission) => (
            <article key={submission.id} className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
              <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                      {mapStatus(submission.status)}
                    </span>
                    <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
                      {submission.track || '트랙 없음'} · {submission.subRole || '세부 직무 없음'}
                    </span>
                  </div>
                  <h4 className="mt-3 text-xl font-bold text-slate-900">{submission.applicantName || '지원자 이름 없음'}</h4>
                  <p className="mt-1 text-sm text-slate-500">{formatDateTime(submission.submittedAtIso)}</p>
                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-900">계정 이름:</span> {getStudentName(submission)}</p>
                    <p><span className="font-semibold text-slate-900">Google 계정:</span> {getStudentEmail(submission)}</p>
                    <p className="break-all"><span className="font-semibold text-slate-900">UID:</span> {submission.userId || '정보 없음'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">이력서</p>
                      <strong className="text-slate-900">{submission.fileCounts?.resume || 0}개</strong>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">자기소개서</p>
                      <strong className="text-slate-900">{submission.fileCounts?.coverLetter || 0}개</strong>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">포트폴리오</p>
                      <strong className="text-slate-900">{submission.fileCounts?.portfolio || 0}개</strong>
                    </div>
                  </div>
                  <div className="mt-4">
                    <FileLinks files={submission.files} />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
