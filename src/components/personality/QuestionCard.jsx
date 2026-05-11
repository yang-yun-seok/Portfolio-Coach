import React from 'react';
import { LIKERT_OPTIONS } from '../../data/personalityTestData';

export default function QuestionCard({ number, text, questionData, selected, onSelect, type, totalNumber }) {
  if (type === 'likert') {
    return (
      <div className="personality-question-card bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <span className="personality-question-badge w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5">{totalNumber || number}</span>
            <p className="text-base font-bold text-slate-800 leading-relaxed">{text}</p>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="personality-likert-grid grid grid-cols-6 gap-2">
            {LIKERT_OPTIONS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => onSelect(index)}
                className={`py-3 px-1 rounded-xl text-center transition-all duration-200 border-2 ${
                  selected === index
                    ? 'bg-sky-600 text-white border-sky-600 shadow-lg scale-105 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700'
                }`}
              >
                <span className="text-[11px] leading-tight block font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const question = questionData;
  return (
    <div className="personality-question-card bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
      <div className="bg-slate-50 px-6 py-5 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <span className="personality-question-badge w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5">{question.id}</span>
          <div>
            {question.group && <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">{question.group}</span>}
            <p className="text-base font-bold text-slate-800 leading-relaxed">{question.text}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 space-y-2">
        <button
          type="button"
          onClick={() => onSelect('A')}
          className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 border-2 flex items-start gap-3 ${
            selected === 'A'
              ? 'bg-sky-600 text-white border-sky-600 shadow-lg'
              : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50'
          }`}
        >
          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${selected === 'A' ? 'border-white text-white' : 'border-slate-300 text-slate-400'}`}>A</span>
          <span className="text-sm font-medium leading-relaxed">{question.optionA}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect('B')}
          className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 border-2 flex items-start gap-3 ${
            selected === 'B'
              ? 'bg-sky-600 text-white border-sky-600 shadow-lg'
              : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50'
          }`}
        >
          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${selected === 'B' ? 'border-white text-white' : 'border-slate-300 text-slate-400'}`}>B</span>
          <span className="text-sm font-medium leading-relaxed">{question.optionB}</span>
        </button>
      </div>
    </div>
  );
}
