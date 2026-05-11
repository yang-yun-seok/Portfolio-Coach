import React from 'react';
import {
  AlertCircle,
  Brain,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import TipCard from './TipCard';

export default function PersonalityResultScreen({
  aiError,
  aiLoading,
  aiResult,
  analysisSource,
  buildMarkdown,
  downloadMarkdown,
  formatTime,
  likertAnswers,
  normalizedUser,
  onRequestAiAnalysis,
  onReset,
  openPdfPrint,
  personalityPlaybook,
  selectedProvider,
  timeLeft,
  totalTime,
}) {
  const likertDone = Object.keys(likertAnswers).length;
  const elapsedTime = formatTime(totalTime - timeLeft);
  const resultMeta = {
    elapsedTime,
    source: analysisSource === 'ai' ? `AI (${selectedProvider})` : '로컬 분석',
  };

  return (
    <div className="apple-module apple-module-result p-8 animate-in fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="personality-result-hero bg-white rounded-[32px] shadow-lg border border-slate-200 p-10 mb-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-500 via-blue-500 to-slate-900" />
          <Brain className="w-16 h-16 text-sky-500 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-slate-800 mb-2">{normalizedUser.roleGroup} 직군 인성검사 분석</h2>
          <p className="text-slate-500 mb-6">소요 시간: {elapsedTime} · 응답 패턴을 바탕으로 성향 리포트를 구성합니다.</p>

          <div className="flex justify-center gap-3 flex-wrap">
            <button type="button" onClick={onReset} className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm">
              <RotateCcw size={16} /> 다시 시작하기
            </button>
            {!aiResult && (
              <button type="button" onClick={onRequestAiAnalysis} disabled={aiLoading} className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full transition-all text-sm shadow-lg disabled:opacity-70">
                {aiLoading ? <><Loader2 size={16} className="animate-spin" /> AI 분석 중...</> : <><Sparkles size={16} /> AI 분석 요청</>}
              </button>
            )}
            {aiResult && analysisSource === 'local' && !aiLoading && (
              <button type="button" onClick={onRequestAiAnalysis} className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full transition-all text-sm shadow-lg">
                <Sparkles size={16} /> AI로 다시 분석
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden mb-6">
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
            <h3 className="text-lg font-black text-slate-800">응답 분포 요약</h3>
            <p className="text-xs text-slate-400 mt-1">리커트 문항 응답 분포</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-6 gap-2">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const count = Object.values(likertAnswers).filter((value) => value === index).length;
                const pct = likertDone > 0 ? Math.round((count / likertDone) * 100) : 0;
                return (
                  <div key={index} className="text-center">
                    <div className="relative h-28 bg-slate-100 rounded-lg overflow-hidden mb-2">
                      <div className="absolute bottom-0 w-full bg-gradient-to-t from-sky-600 to-blue-400 transition-all duration-700 rounded-b-lg" style={{ height: `${pct}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-700">{count}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">{index + 1}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {aiError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">{aiError}</p>
          </div>
        )}

        {aiLoading && (
          <div className="bg-white rounded-[28px] shadow-lg border border-sky-200 p-12 mb-6 text-center">
            <Loader2 className="w-12 h-12 text-sky-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">AI가 응답 패턴을 분석하고 있습니다.</h3>
            <p className="text-sm text-slate-500">{normalizedUser.roleGroup} 직군 기준으로 성격 특성과 업무 스타일을 정리 중입니다.</p>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-bold text-amber-900">분석 요청은 정상적으로 처리 중입니다.</p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-800">서버와 AI 모델 응답을 기다리는 동안 1분 정도 걸릴 수 있습니다. 진행 중에는 새로고침, 뒤로 가기, 탭 닫기를 하지 않는 편이 안전합니다.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {aiResult && !aiLoading && (
          <div className="space-y-6">
            {analysisSource === 'ai' ? (
              <div className="rounded-2xl p-3 text-center text-xs font-bold bg-sky-50 border border-sky-200 text-sky-700">
                AI 분석 결과 ({selectedProvider})
              </div>
            ) : (
              <div className="rounded-xl p-4 bg-sky-50 border border-sky-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-sky-700">로컬 분석 엔진 결과를 먼저 표시했습니다.</p>
                  <p className="text-xs text-sky-600 mt-0.5">필요하면 다시 AI 분석을 요청해 더 긴 설명을 받을 수 있습니다.</p>
                </div>
                <button type="button" onClick={onRequestAiAnalysis} disabled={aiLoading} className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition-all text-xs shadow disabled:opacity-70">
                  {aiLoading ? <><Loader2 size={13} className="animate-spin" /> 분석 중...</> : <><Sparkles size={13} /> AI 재분석</>}
                </button>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-4 md:grid-cols-3">
                {personalityPlaybook.resultCards.map((card) => (
                  <article key={card.label} className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-sky-600">{card.label}</p>
                    <h3 className="mb-2 text-base font-black text-slate-900">{card.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{card.body}</p>
                  </article>
                ))}
              </div>
              <aside className="rounded-[28px] bg-slate-950 px-6 py-6 text-white shadow-xl">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">Interpretation</p>
                <h3 className="mb-2 text-lg font-black">{personalityPlaybook.fitTitle}</h3>
                <p className="text-sm leading-relaxed text-slate-300">{personalityPlaybook.fitBody}</p>
              </aside>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex items-center gap-3">
                <Brain className="w-5 h-5 text-sky-500" />
                <div>
                  <h3 className="text-lg font-black text-slate-800">성격 특성 분석</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Big5 유사 지표 기반 점수</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {aiResult.traits?.map((trait) => (
                  <div key={trait.name}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-bold text-slate-700">{trait.name}</span>
                      <span className={`text-sm font-black tabular-nums ${trait.score >= 70 ? 'text-emerald-600' : trait.score >= 40 ? 'text-sky-600' : 'text-amber-600'}`}>{trait.score}점</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                      <div className={`h-full rounded-full transition-all duration-1000 ${trait.score >= 70 ? 'bg-emerald-500' : trait.score >= 40 ? 'bg-sky-500' : 'bg-amber-500'}`} style={{ width: `${trait.score}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{trait.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex items-center gap-3">
                <Target className="w-5 h-5 text-slate-700" />
                <div>
                  <h3 className="text-lg font-black text-slate-800">업무 스타일</h3>
                  <p className="text-xs text-slate-400 mt-0.5">이항 선택 응답 기반 직무 성향 분석</p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                {aiResult.workStyle?.axes?.map((axis) => (
                  <div key={`${axis.leftLabel}-${axis.rightLabel}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-600">{axis.leftLabel}</span>
                      <span className="text-xs font-bold text-sky-600">{axis.rightLabel}</span>
                    </div>
                    <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-1/2 w-px h-full bg-slate-300 z-10" />
                      <div
                        className="absolute top-0 h-full bg-gradient-to-r from-slate-900 to-sky-500 rounded-full transition-all duration-1000"
                        style={{
                          left: axis.value < 0 ? `${50 + axis.value / 2}%` : '50%',
                          width: `${Math.abs(axis.value) / 2}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{axis.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
                <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-black text-emerald-800">강점</h3>
                </div>
                <div className="p-5 space-y-3">
                  {aiResult.strengths?.map((item) => (
                    <div key={item.title} className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-50">
                      <h4 className="font-bold text-emerald-800 text-sm mb-1">{item.title}</h4>
                      <p className="text-xs text-emerald-700/80 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
                <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-black text-amber-800">주의점</h3>
                </div>
                <div className="p-5 space-y-3">
                  {aiResult.cautions?.map((item) => (
                    <div key={item.title} className="bg-amber-50/50 rounded-xl p-4 border border-amber-50">
                      <h4 className="font-bold text-amber-800 text-sm mb-1">{item.title}</h4>
                      <p className="text-xs text-amber-700/80 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex items-center gap-3">
                <Shield className="w-5 h-5 text-sky-500" />
                <div>
                  <h3 className="text-lg font-black text-slate-800">응답 일관성 / Lie Scale</h3>
                  <p className="text-xs text-slate-400 mt-0.5">사회적 바람직성 문항과 분포를 함께 봅니다.</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-6 mb-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke={aiResult.consistency?.score >= 70 ? '#22c55e' : aiResult.consistency?.score >= 50 ? '#eab308' : '#ef4444'}
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(aiResult.consistency?.score || 0) * 2.64} 264`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black text-slate-800">{aiResult.consistency?.score || 0}</span>
                    </div>
                  </div>
                  <p className="flex-1 text-sm text-slate-600 leading-relaxed">{aiResult.consistency?.comment}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-sky-50 via-white to-slate-100 rounded-[28px] shadow-lg border border-sky-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-sky-100 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-sky-500" />
                <h3 className="text-lg font-black text-slate-900">{personalityPlaybook.fitTitle}</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-700 leading-relaxed">{aiResult.gameIndustryFit}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
                <h3 className="text-lg font-black text-slate-800">맞춤 준비 전략</h3>
                <p className="text-xs text-slate-400 mt-1">응답 패턴 기준 정리</p>
              </div>
              <div className="p-6 space-y-3">
                {aiResult.testStrategy?.map((tip, index) => (
                  <div key={tip} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="bg-sky-100 text-sky-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0">{index + 1}</span>
                    <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
                <h3 className="text-lg font-black text-slate-800">결과 내보내기</h3>
                <p className="text-xs text-slate-400 mt-1">분석 결과를 파일로 저장합니다.</p>
              </div>
              <div className="p-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => downloadMarkdown(buildMarkdown(aiResult, resultMeta))}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm border border-slate-200"
                >
                  <FileText size={18} /> Markdown (.md)
                </button>
                <button
                  type="button"
                  onClick={() => openPdfPrint(aiResult, resultMeta)}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full transition-all text-sm shadow-lg"
                >
                  <Download size={18} /> PDF 저장
                </button>
              </div>
            </div>
          </div>
        )}

        {!aiResult && !aiLoading && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-800">인성검사 준비 Tip</h3>
            </div>
            <div className="p-8 space-y-4">
              <TipCard emoji="1" title="일관성을 유지하세요" desc="비슷한 성격 특성을 묻는 문항에서는 한쪽으로 급격히 흔들리지 않는 것이 중요합니다." />
              <TipCard emoji="2" title="극단적 응답은 피하세요" desc="'매우 그렇다'나 '전혀 그렇지 않다'만 반복하면 자연스러운 분포로 보기 어렵습니다." />
              <TipCard emoji="3" title="솔직하되 과장하지 마세요" desc="완벽한 사람처럼 보이려는 응답은 Lie Scale에서 오히려 부자연스럽게 읽힐 수 있습니다." />
              <TipCard emoji="4" title="시간 관리가 핵심입니다" desc="너무 오래 고민하기보다 직관적인 첫 반응을 유지하는 편이 자연스럽습니다." />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
