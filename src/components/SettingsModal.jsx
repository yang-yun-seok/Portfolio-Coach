import React, { useEffect, useState } from 'react';
import { Database, KeyRound, Settings, ShieldCheck, X } from 'lucide-react';

export default function SettingsModal({
  adminModeUnlocked,
  jobs,
  jobsMetadata,
  onClose,
  onGoToJobs,
  onGoToAdmin,
  onLockAdminMode,
  onUnlockAdminMode,
  open,
}) {
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [adminUnlocking, setAdminUnlocking] = useState(false);

  useEffect(() => {
    if (!open) {
      setAdminPassword('');
      setAdminPasswordError('');
      setAdminUnlocking(false);
    }
  }, [open]);

  if (!open) return null;

  const handleAdminSubmit = async (event) => {
    event.preventDefault();
    if (adminUnlocking) return;

    setAdminUnlocking(true);
    try {
      const result = await onUnlockAdminMode?.(adminPassword);
      if (result?.ok) {
        setAdminPassword('');
        setAdminPasswordError('');
        return;
      }
      setAdminPasswordError(result?.message || '비밀번호를 다시 확인해 주세요.');
    } catch (error) {
      setAdminPasswordError(error.message || '관리자 모드를 열지 못했습니다.');
    } finally {
      setAdminUnlocking(false);
    }
  };

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
              type="button"
              onClick={onGoToJobs}
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              추천 공고 탭 열기
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-900 p-2 text-white">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-800">관리자 모드</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  비밀번호 확인 후 현재 브라우저 세션에서 관리자 화면으로 이동합니다.
                </p>
              </div>
            </div>

            {adminModeUnlocked ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <button
                  type="button"
                  onClick={onGoToAdmin}
                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  관리자 화면 열기
                </button>
                <button
                  type="button"
                  onClick={onLockAdminMode}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  잠그기
                </button>
              </div>
            ) : (
              <form className="mt-4 space-y-3" onSubmit={handleAdminSubmit}>
                <label className="sr-only" htmlFor="admin-mode-password">관리자 모드 비밀번호</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-slate-900 focus-within:bg-white">
                  <KeyRound size={18} className="shrink-0 text-slate-400" />
                  <input
                    id="admin-mode-password"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={adminUnlocking}
                    value={adminPassword}
                    onChange={(event) => {
                      setAdminPassword(event.target.value);
                      setAdminPasswordError('');
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                    placeholder="비밀번호"
                  />
                </div>
                {adminPasswordError && (
                  <p className="text-xs font-semibold text-rose-600">{adminPasswordError}</p>
                )}
                <button
                  type="submit"
                  disabled={adminUnlocking}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {adminUnlocking ? '확인 중...' : '관리자 모드 열기'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
