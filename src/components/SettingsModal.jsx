import React from 'react';
import { Database, Settings, X } from 'lucide-react';

export default function SettingsModal({
  jobs,
  jobsMetadata,
  onClose,
  onGoToJobs,
  open,
}) {
  if (!open) return null;

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
              <p>분석 기준일: <span className="font-bold text-indigo-600">{jobsMetadata.latestAppliedDate || '정보 없음'}</span></p>
              <p>참고 가능한 공고: <span className="font-bold text-indigo-600">{jobsMetadata.referenceJobCount || jobs.length}건</span></p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
            <h3 className="font-semibold text-slate-700">추천 공고</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              현재 입력한 직무와 역량을 기준으로 공고 추천을 확인할 수 있습니다. 모델 설정은 상단의 AI API 연결에서 변경합니다.
            </p>
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
