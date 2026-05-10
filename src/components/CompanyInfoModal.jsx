import React from 'react';
import { X, Building2, Gamepad2, Users, Coins, Gift } from 'lucide-react';

export default function CompanyInfoModal({ company, onClose }) {
  if (!company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in slide-in-from-bottom-8 custom-scrollbar" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors">
          <X size={20} />
        </button>
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-6">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white"><Building2 size={28} /></div>
            <div>
              <h2 className="text-2xl font-black text-slate-800">{company.name}</h2>
              <p className="text-indigo-600 font-bold text-sm">기업 상세 정보 및 AI 분석</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {[
              { icon: Gamepad2, label: '대표작', value: company.games },
              { icon: Users, label: '인력 규모', value: company.employees },
              { icon: Coins, label: '매출/자본 규모', value: company.revenue },
              { icon: Gift, label: '주요 사내 복지', value: company.benefits },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 font-bold mb-1 text-sm"><Icon size={16} /> {label}</div>
                <p className="text-slate-800 font-medium text-sm">{value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2 border-l-4 border-indigo-500 pl-3">최근 뉴스 및 동향</h3>
              <ul className="bg-blue-50/50 p-4 rounded-xl text-slate-700 text-sm leading-relaxed border border-blue-100 space-y-2">
                {company.news?.map((item, index) => (
                  <li key={index} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-2 border-l-4 border-purple-500 pl-3">AI 기업 요약 분석</h3>
              <div className="bg-purple-50/50 p-4 rounded-xl text-slate-700 text-sm leading-relaxed border border-purple-100">
                <p className="font-bold text-purple-900 mb-1">핵심 분석</p>
                {company.aiAnalysis}
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <button onClick={onClose} className="bg-slate-800 text-white font-bold py-3 px-10 rounded-xl shadow-md hover:bg-slate-900 transition-colors">닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
