import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PRACTICE_QUESTIONS } from '../../data/personalityTestData';
import QuestionCard from './QuestionCard';

export default function PersonalityPracticeScreen({
  onPracticeSelect,
  onStartTest,
  practiceAnswers,
}) {
  return (
    <div className="apple-module apple-module-practice personality-practice-shell flex flex-col h-full bg-slate-50">
      <div className="personality-topbar bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="personality-phase-chip px-3 py-1 rounded-full text-xs font-bold">연습 문항</span>
          <span className="text-sm text-slate-500">시간 제한 없음</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
          <div className="personality-guidance rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-center">다음 문장을 읽고 본인과 가장 가깝다고 생각하는 선택지를 클릭해 주세요.</p>
          </div>
          {PRACTICE_QUESTIONS.map((question, index) => (
            <QuestionCard
              key={question.id}
              number={index + 1}
              text={question.text}
              selected={practiceAnswers[question.id]}
              onSelect={(value) => onPracticeSelect(question.id, value)}
              type="likert"
            />
          ))}
          <div className="pt-4 pb-8">
            <button
              type="button"
              onClick={onStartTest}
              className="w-full py-4 font-bold rounded-full transition-all text-lg shadow-lg flex items-center justify-center gap-3 bg-sky-600 hover:bg-sky-700 text-white active:scale-[0.98]"
            >
              <ArrowRight size={20} /> 본 검사 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
