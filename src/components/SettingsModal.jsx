import React from 'react';
import { Database, RefreshCw, Settings, X } from 'lucide-react';

const CRAWL_STATUS_LABELS = {
  success: '성공',
  'partial-success': '부분 성공',
  failed: '실패',
  idle: '대기',
};

export default function SettingsModal({
  jobs,
  jobsMetadata,
  onClose,
  onGoToJobs,
  open,
}) {
  if (!open) return null;

  const crawlStatusClassName = jobsMetadata.lastCrawlStatus === 'failed'
    ? 'text-rose-600'
    : jobsMetadata.lastCrawlStatus === 'partial-success'
      ? 'text-amber-600'
      : 'text-emerald-600';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg"><Settings size={20} className="text-indigo-600" /></div>
            <h2 className="text-xl font-bold text-slate-800">설정</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database size={18} className="text-slate-500" />
              <h3 className="font-semibold text-slate-700">공고 데이터</h3>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p>현재 로드된 공고: <span className="font-bold text-indigo-600">{jobs.length}건</span></p>
              <p>데이터 소스: <span className="font-medium">GameJob</span></p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw size={18} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-700">자동 크롤링 상태</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              매일 00:00 기준으로 게임잡 공고를 자동 수집합니다. 사용자 페이지에서는 수동 크롤링을 제공하지 않으며, 아래 메타 정보만 공개됩니다.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
              <p>최근 반영일: <strong className="text-slate-900">{jobsMetadata.latestAppliedDate || '정보 없음'}</strong></p>
              <p className="mt-1">참고 공고 수: <strong className="text-slate-900">{jobsMetadata.referenceJobCount || jobs.length}건</strong></p>
              <p className="mt-1">마지막 성공 시각: <strong className="text-slate-900">{jobsMetadata.lastSuccessfulCrawlAt ? new Date(jobsMetadata.lastSuccessfulCrawlAt).toLocaleString('ko-KR') : '정보 없음'}</strong></p>
              <p className="mt-1">상태: <strong className={crawlStatusClassName}>{CRAWL_STATUS_LABELS[jobsMetadata.lastCrawlStatus] || CRAWL_STATUS_LABELS.idle}</strong></p>
            </div>
            <button
              onClick={onGoToJobs}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              추천 공고 탭 열기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
