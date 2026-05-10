import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

export default function WorkspaceMessages({
  error,
  infoMessage,
  statusCards,
}) {
  return (
    <>
      {error && (
        <div className="apple-alert apple-alert-error mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
          <p className="text-red-700 text-sm whitespace-pre-line">{error}</p>
        </div>
      )}
      {infoMessage && (
        <div className="apple-alert apple-alert-info mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="text-blue-500 mt-0.5 shrink-0" size={20} />
          <p className="text-blue-700 text-sm whitespace-pre-line">{infoMessage}</p>
        </div>
      )}
      {statusCards.length > 0 && (
        <div className="mb-6 space-y-3">
          {statusCards.map((card) => {
            const Icon = card.icon;
            const toneClasses = card.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50'
              : card.tone === 'warning'
                ? 'border-amber-200 bg-amber-50'
                : 'border-slate-200 bg-white';
            const iconClasses = card.tone === 'success'
              ? 'text-emerald-600'
              : card.tone === 'warning'
                ? 'text-amber-600'
                : 'text-slate-700';

            return (
              <section
                key={card.id}
                className={`rounded-[28px] border px-5 py-4 shadow-sm animate-in fade-in slide-in-from-top-2 ${toneClasses}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ${iconClasses}`}>
                    <Icon size={18} className={card.spin ? 'animate-spin' : ''} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{card.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{card.body}</p>
                    {card.actionLabel && (
                      <button
                        type="button"
                        onClick={card.onAction}
                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                      >
                        {card.actionLabel}
                      </button>
                    )}
                  </div>
                  {card.dismissible && (
                    <button
                      type="button"
                      onClick={card.onDismiss}
                      className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                      aria-label="상태 메시지 닫기"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
