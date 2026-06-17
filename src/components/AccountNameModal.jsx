import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, UserRound, X } from 'lucide-react';

export default function AccountNameModal({
  authUser,
  onClose,
  onSave,
  open,
  userProfile,
}) {
  const savedName = useMemo(
    () => userProfile?.studentName || userProfile?.displayName || authUser?.displayName || '',
    [authUser?.displayName, userProfile?.displayName, userProfile?.studentName],
  );
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraftName(savedName);
    setSaving(false);
    setError('');
  }, [open, savedName]);

  if (!open) return null;

  const trimmedName = draftName.trim().replace(/\s+/g, ' ');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await onSave(trimmedName);
    } catch (saveError) {
      setError(saveError.message || '이름 설정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-900 p-2">
              <UserRound size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">이름 설정</h2>
              <p className="text-sm text-slate-500">수업 담당자가 확인할 수 있는 이름을 입력해 주세요.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 transition-colors hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-500">Google 계정</p>
            <p className="mt-1 break-all text-sm font-semibold text-slate-800">{authUser?.email || '이메일 없음'}</p>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-bold text-slate-700">학생 이름</span>
            <input
              type="text"
              value={draftName}
              onChange={(event) => {
                setDraftName(event.target.value);
                setError('');
              }}
              placeholder="예: 홍길동"
              maxLength={40}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              autoComplete="name"
              autoFocus
            />
          </label>

          {error ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              <span>이 이름은 담당자가 제출자를 확인할 때 사용합니다.</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving || !trimmedName}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            완료
          </button>
        </div>
      </form>
    </div>
  );
}
