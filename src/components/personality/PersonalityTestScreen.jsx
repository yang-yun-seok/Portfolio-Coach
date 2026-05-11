import React from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import QuestionCard from './QuestionCard';

export default function PersonalityTestScreen({
  autoAdvance,
  binaryAnswers,
  currentPage,
  getCurrentQuestions,
  getTotalPages,
  handleGoToBinary,
  handleSubmit,
  likertAnswers,
  questionTimeLeft,
  scrollRef,
  setBinaryAnswers,
  setCurrentPage,
  setLikertAnswers,
  showConfirm,
  showTimeWarning,
  step,
  timeLeft,
  formatTime,
  confirmSubmit,
  cancelSubmit,
}) {
  const isLikert = step === 'test-likert';
  const pageQuestions = getCurrentQuestions();
  const totalPages = getTotalPages();
  const globalOffset = currentPage;

  return (
    <div className="apple-module apple-module-practice personality-test-shell flex flex-col h-full bg-slate-50">
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-3">최종 제출 확인</h3>
            <p className="text-slate-600 mb-2 text-sm">현재 입력한 응답을 기준으로 분석 화면으로 이동합니다.</p>
            <p className="text-slate-400 mb-6 text-xs leading-relaxed">제출 후에는 답안을 수정할 수 없습니다.</p>
            <div className="flex gap-3">
              <button type="button" onClick={cancelSubmit} className="flex-1 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold border border-slate-200">취소</button>
              <button type="button" onClick={confirmSubmit} className="flex-1 px-4 py-3 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg">제출하기</button>
            </div>
          </div>
        </div>
      )}

      {showTimeWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce font-bold text-sm">
          종료까지 5분 남았습니다.
        </div>
      )}

      <div className="personality-test-topbar bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 rounded-full p-1">
            <button
              type="button"
              onClick={() => { setCurrentPage(0); }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${isLikert ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              리커트 척도
            </button>
            <button
              type="button"
              onClick={handleGoToBinary}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${!isLikert ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              선택형
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-1 text-sm font-mono font-bold ${questionTimeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-sky-600'}`}>
            <span className="text-xs text-slate-400">문항</span> <span className="tabular-nums text-lg">{questionTimeLeft}s</span>
          </div>
          <div className={`flex items-center gap-2 text-lg font-mono font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
            <Clock className="w-4 h-4" /><span className="tabular-nums">{formatTime(timeLeft)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {step === 'test-likert' ? (
            <button type="button" onClick={handleGoToBinary} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-full text-xs shadow-md flex items-center gap-1.5">
              선택형으로 <ArrowRight size={14} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-full text-xs shadow-md">최종 제출</button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-5xl mx-auto py-6 px-6 space-y-5">
          <div className="personality-guidance rounded-xl p-3">
            <p className="text-sm font-medium text-center">다음 문장을 읽고 본인과 가장 가깝다고 생각하는 선택지를 클릭해 주세요.</p>
          </div>
          {pageQuestions.map((question, index) => (
            <QuestionCard
              key={isLikert ? `l-${question.id}` : `b-${question.id}`}
              number={globalOffset + index + 1}
              text={question.text}
              questionData={question}
              selected={isLikert ? likertAnswers[question.id] : binaryAnswers[question.id]}
              onSelect={(value) => {
                if (isLikert) setLikertAnswers((prev) => ({ ...prev, [question.id]: value }));
                else setBinaryAnswers((prev) => ({ ...prev, [question.id]: value }));
                setTimeout(() => autoAdvance(), 300);
              }}
              type={isLikert ? 'likert' : 'binary'}
              totalNumber={question.id}
            />
          ))}
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center gap-4 shrink-0 shadow-inner">
        <button
          type="button"
          onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
          disabled={currentPage === 0}
          className={`shrink-0 min-w-[72px] whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            currentPage === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 active:scale-95'
          }`}
        >
          <ChevronLeft size={16} /> 이전
        </button>
        <div className="personality-page-strip flex-1 min-w-0 flex items-center justify-center px-2">
          <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
            {isLikert ? '리커트 문항' : '선택형 문항'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (currentPage < totalPages - 1) setCurrentPage((page) => page + 1);
            else if (isLikert) handleGoToBinary();
            else handleSubmit();
          }}
          className="shrink-0 min-w-[92px] whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-sky-600 hover:bg-sky-50 transition-all active:scale-95"
        >
          {currentPage < totalPages - 1 ? '다음' : (isLikert ? '선택형으로' : '제출하기')} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
