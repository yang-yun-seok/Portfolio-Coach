import React from 'react';

export default function TipCard({ emoji, title, desc }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
      <span className="personality-tip-badge w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0">{emoji}</span>
      <div>
        <h4 className="font-bold text-slate-800 text-sm mb-1">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
