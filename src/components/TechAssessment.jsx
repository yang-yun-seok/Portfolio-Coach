import React, { useState, useEffect, useRef } from 'react';
import {
  Clock, Video, CheckCircle, RefreshCcw, AlertCircle,
  Image as ImageIcon, Play, ArrowLeft, Code2, FileQuestion,
} from 'lucide-react';

// ── 문제 및 피드백 데이터 ───────────────────────────────────────────────
const TEST_DATA = [
  {
    id: 1, type: 'text',
    question: '1. 퀘스트 시놉시스 제작 (5문장)',
    description: '주어진 제약 조건(5문장) 내에 기승전결이 있는 퀘스트 시놉시스를 작성하세요.',
    feedback: {
      intent: '기획자로서의 핵심 요약 능력, 내러티브 구성력, 그리고 "5문장"이라는 제약 조건 준수 여부를 평가합니다.',
      ideal: '배경 설명 → 사건 발생 → 목표 부여 → 갈등/위기 → 보상 및 결과로 이어지는 깔끔한 5문장 구성.',
      avoid: '제한을 어기고 6문장 이상 작성하거나, 너무 장황한 미사여구만 나열한 답변.',
    },
  },
  {
    id: 2, type: 'image-desc',
    question: '2. 그림을 보고 무슨 상황인지 서술하라',
    description: '아래 4컷의 상황을 보고 현재 어떤 상황이 벌어지고 있는지 상황, 인물의 감정, 향후 전개될 일을 유추하여 서술하세요.',
    imageUrl: '4컷.jfif',
    feedback: {
      intent: '관찰력과 상황 묘사 능력, 정지된 화면에서 앞뒤 맥락을 상상해내는 기획적 상상력을 평가합니다.',
      ideal: '시각적 정보(촛농, 표정 등)를 바탕으로 논리적인 인과관계를 설정하고 캐릭터의 목적을 생동감 있게 묘사한 답변.',
      avoid: '단순히 "사람이 누워 있다" 수준의 1차원적인 사실 나열에 그치는 답변.',
    },
  },
  {
    id: 3, type: 'code',
    question: '3. [코딩] 아래 4가지 상태를 정의하고 브랜치하라',
    description: '상태머신(FSM)의 기본 개념을 활용하여 <달리기>, <점프>, <추락>, <공격 콤보> 상태의 전환(Branch) 조건을 작성하세요.',
    example: '<Idle>\n  <BranchEvent="Input_Attack" Execute="Attack"/>\n</Idle>',
    feedback: {
      intent: 'FSM에 대한 이해도와 논리적 사고력을 평가합니다.',
      ideal: '각 상태에서 넘어갈 수 있는 예외 처리가 논리적으로 구현된 코드.',
      avoid: '상태 전환의 흐름이 끊기거나 비논리적인 구조.',
    },
  },
  {
    id: 4, type: 'code',
    question: '4. [코딩] 본인이 생각하는 격투게임의 상태를 정의하고 브랜치하라',
    description: '격투 게임의 핵심 캐릭터 상태를 3~5개 정의하고 상태 전환 트리를 작성하세요.',
    feedback: {
      intent: '특정 장르의 시스템에 대한 깊은 이해도를 평가합니다.',
      ideal: '가드, 피격 경직 등 격투 게임 특유의 상태를 정의한 답변.',
      avoid: '장르적 이해가 부족한 단순한 구조.',
    },
  },
  {
    id: 5, type: 'text',
    question: '5. 인상깊었던 게임이 무엇인가? 그 이유는? 플레이타임은?',
    description: '가장 깊게 플레이했거나 영감을 준 게임 한 가지를 선정하여 분석적으로 서술하세요.',
    feedback: {
      intent: '지원자의 게임 분석 능력을 확인합니다.',
      ideal: '핵심 재미 요소나 독특한 시스템을 구체적으로 분석한 답변.',
      avoid: '시스템 분석 없이 감상만 적은 답변.',
    },
  },
  {
    id: 6, type: 'text',
    question: '6. 어떤 게임을 만들고 싶은가? 어떤 사람이 되고싶은가?',
    description: '본인의 개발 철학과 커리어 비전을 서술하세요.',
    feedback: {
      intent: '지원자의 비전과 회사와의 컬쳐 핏을 확인합니다.',
      ideal: '명확한 기획 철학과 회사의 방향성이 일치하는 답변.',
      avoid: '뜬구름 잡는 추상적인 목표.',
    },
  },
  {
    id: 7, type: 'text',
    question: '7. 인성/성실함/업무능력 세 가지 역량에 대해 본인이 생각하기에 점수를 표기하고 그 이유를 서술하라',
    description: '각 항목을 10점 만점으로 평가하고 객관적인 근거를 제시하세요.',
    feedback: {
      intent: '자기 객관화 능력과 솔직함을 평가합니다.',
      ideal: '강점은 사례로 뒷받침하고 부족한 점은 개선 의지를 보여주는 답변.',
      avoid: '근거 없는 자화자찬.',
    },
  },
  {
    id: 8, type: 'text',
    question: '8. 팀 활동을 하면서 성공했던 기억, 팀에서 작업 분배 방법, 그 이유를 서술하라',
    description: '협업 경험을 바탕으로 본인의 롤과 문제 해결 방식을 설명하세요.',
    feedback: {
      intent: '협업 능력과 프로젝트 매니지먼트 역량을 평가합니다.',
      ideal: '합리적으로 업무를 분배하고 갈등을 해결한 구체적인 사례 중심의 답변.',
      avoid: '성공의 공을 본인에게만 돌리는 답변.',
    },
  },
  {
    id: 9, type: 'text',
    question: '9. 회사에서 어떤 일을 이루고 싶은가?',
    description: '입사 후 단기적/장기적 목표를 서술하세요.',
    feedback: {
      intent: '입사 후 기여 의지와 로드맵을 확인합니다.',
      ideal: '실질적인 성과를 내겠다는 구체적인 포부.',
      avoid: '수동적인 태도.',
    },
  },
  {
    id: 10, type: 'text',
    question: '10. 최근 3년간 집요하게 노력했던 일은?',
    description: '분야에 상관없이 가장 몰입했던 경험과 그 결과를 서술하세요.',
    feedback: {
      intent: '지원자의 근성과 몰입력을 평가합니다.',
      ideal: '실패를 겪으면서도 끝까지 노력해 깨달음을 얻은 스토리텔링.',
      avoid: '과정이 구체적이지 않은 답변.',
    },
  },
  {
    id: 11, type: 'text',
    question: '11. 본인이 생각하는 "일"은 무엇인가?',
    description: '직업관에 대한 본인만의 정의를 서술하세요.',
    feedback: {
      intent: '지원자의 근본적인 직업 의식을 확인합니다.',
      ideal: '가치 창출과 책임감을 강조하는 성숙한 답변.',
      avoid: '단순히 보상만을 위한 시간으로 치부하는 답변.',
    },
  },
  {
    id: 12, type: 'text',
    question: '12. 게임에 여러 주요기능이 있는데 그중에 가장 중요하다고 생각하는건? 그 이유는?',
    description: '게임의 본질에 대한 본인의 철학을 서술하세요.',
    feedback: {
      intent: '게임 디자인 우선순위에 대한 가치관을 확인합니다.',
      ideal: '핵심 재미를 정의하고 논리적으로 설득하는 답변.',
      avoid: '요소 간의 유기적 결합을 무시하는 답변.',
    },
  },
  {
    id: 13, type: 'text',
    question: '13. 주변에서 이야기하는 본인의 단점은 무엇인가?',
    description: '제3자의 시선에서 본 본인의 치명적인 단점 한 가지와 극복 과정을 서술하세요.',
    feedback: {
      intent: '진실성과 피드백 수용 태도를 평가합니다.',
      ideal: '단점을 솔직하게 인정하고 구체적인 보완책을 제시하는 답변.',
      avoid: '포장된 장점을 단점으로 말하는 답변.',
    },
  },
];

const TOTAL_TIME = 55 * 60;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ══════════════════════════════════════════════════════════════════════
// 기술 과제 평가 컴포넌트
// ══════════════════════════════════════════════════════════════════════
export default function TechAssessment() {
  const [step, setStep] = useState('intro');
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [answers, setAnswers] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [imgKey, setImgKey] = useState(Date.now());
  const [imgError, setImgError] = useState(false);
  const timerRef = useRef(null);

  // 타이머
  useEffect(() => {
    if (step === 'test') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setStep('result');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [step]);

  const handleStart = () => {
    setAnswers({});
    setTimeLeft(TOTAL_TIME);
    setStep('test');
  };

  const handleSubmit = () => setShowConfirm(true);
  const confirmSubmit = () => { setShowConfirm(false); clearInterval(timerRef.current); setStep('result'); };
  const cancelSubmit = () => setShowConfirm(false);

  const handleReset = () => {
    setStep('intro');
    setAnswers({});
    setTimeLeft(TOTAL_TIME);
    setImgError(false);
  };

  const answeredCount = Object.values(answers).filter((v) => v && v.trim().length > 0).length;

  // ═══ Intro 화면 ════════════════════════════════════════════════════
  if (step === 'intro') {
    return (
      <div className="apple-module apple-module-intro p-8 animate-in fade-in">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">기술 과제 평가</h2>
            <p className="text-slate-500">실제 게임회사의 기술 과제 평가를 시뮬레이션합니다. 제한 시간 내에 과제를 수행하고 상세 피드백을 확인하세요.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-900 to-indigo-900 p-8 text-center">
              <p className="text-slate-300 text-sm font-medium">실무 역량 평가 테스트</p>
              <p className="text-slate-500 mt-1 text-xs">Game Design Position Assessment</p>
            </div>

            <div className="p-8 space-y-5">
              <div className="flex items-start gap-4 bg-red-50 p-4 rounded-xl border border-red-100">
                <Video className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-700 text-sm mb-1">보안 정책 안내</h4>
                  <p className="text-xs text-red-600/80 leading-relaxed">
                    본 평가는 엄격한 보안 하에 진행됩니다. <strong>화면 캡쳐, 녹화 및 외부 유출</strong> 시 법적 책임을 물을 수 있으며, 모든 과정은 로그로 기록됩니다.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-sky-50 p-4 rounded-xl border border-sky-100">
                <Clock className="w-6 h-6 text-sky-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sky-700 text-sm mb-1">진행 방식</h4>
                  <p className="text-xs text-sky-600/80 leading-relaxed">
                    총 <strong>13문항</strong>, 제한 시간 <strong>55분</strong>. 서술형 + 코딩 + 이미지 분석 복합 문제로 구성되어 있습니다. 자동 저장 기능이 없으므로 유의하십시오.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-700 text-sm mb-1">제출 후 피드백</h4>
                  <p className="text-xs text-emerald-600/80 leading-relaxed">
                    제출 후 각 문항의 <strong>출제 의도, 이상적인 답변 방향, 피해야 할 답변</strong>을 확인할 수 있습니다.
                  </p>
                </div>
              </div>

              <button
                onClick={handleStart}
                className="w-full py-4 mt-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-all text-lg shadow-lg active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <Play size={20} />
                평가 시작
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ 시험 화면 ══════════════════════════════════════════════════════
  if (step === 'test') {
    return (
      <div className="apple-module apple-module-test flex flex-col h-full bg-slate-950 text-slate-100">
        {/* 제출 확인 모달 */}
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-black text-white mb-3">최종 제출 확인</h3>
              <p className="text-slate-400 mb-2 text-sm">작성 완료: {answeredCount} / {TEST_DATA.length} 문항</p>
              <p className="text-slate-500 mb-8 text-xs leading-relaxed">제출 후에는 답안을 수정할 수 없습니다. 정말로 전송하시겠습니까?</p>
              <div className="flex gap-3">
                <button onClick={cancelSubmit} className="flex-1 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors text-sm font-bold border border-slate-700">취소</button>
                <button onClick={confirmSubmit} className="flex-1 px-4 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-black transition-all text-sm shadow-lg">전송</button>
              </div>
            </div>
          </div>
        )}

        {/* 상단 타이머 바 */}
        <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex justify-between items-center shrink-0 z-10">
          <div className="flex items-center gap-3 text-red-500 font-black tracking-widest text-[10px] uppercase">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
            SECURED SESSION
          </div>
          <div className={`flex items-center gap-2 text-2xl font-mono font-black ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-sky-400'}`}>
            <Clock className="w-5 h-5" />
            <span className="tabular-nums">{formatTime(timeLeft)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{answeredCount}/{TEST_DATA.length}</span>
            <button onClick={handleSubmit} className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-md text-sm transition-all shadow-md">
              최종 제출
            </button>
          </div>
        </div>

        {/* 문제 목록 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto py-8 px-6 space-y-10">
            {TEST_DATA.map((item) => (
              <div key={item.id} className="bg-slate-900/60 rounded-2xl p-8 border border-slate-800 transition-all hover:border-slate-700">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h2 className="text-xl font-black mb-1 text-white tracking-tight">{item.question}</h2>
                    <p className="text-slate-400 text-sm">{item.description}</p>
                  </div>
                  <span className="bg-slate-800 text-slate-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ml-4">
                    Q{item.id}
                  </span>
                </div>

                {/* 이미지 문제 */}
                {item.type === 'image-desc' && (
                  <div className="mb-6 rounded-xl overflow-hidden border border-slate-700 bg-black relative group min-h-[300px] flex flex-col items-center justify-center">
                    {!imgError ? (
                      <img
                        key={imgKey}
                        src={`${item.imageUrl}?v=${imgKey}`}
                        alt="상황 묘사 이미지"
                        className="max-w-full h-auto object-contain"
                        loading="eager"
                        onLoad={() => setImgError(false)}
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                        <ImageIcon className="w-16 h-16 text-slate-800" />
                        <p className="text-slate-500 font-bold">이미지를 불러올 수 없습니다</p>
                        <p className="text-xs text-slate-600">{item.imageUrl}</p>
                        <button
                          onClick={() => { setImgKey(Date.now()); setImgError(false); }}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700"
                        >
                          <RefreshCcw className="w-3 h-3" /> 새로고침
                        </button>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-black/60 text-white px-2 py-1 rounded text-[10px] font-bold">REFERENCE IMAGE</span>
                    </div>
                  </div>
                )}

                {/* 코드 예시 */}
                {item.example && (
                  <div className="mb-5 p-4 bg-black/40 rounded-xl border border-slate-800/50 font-mono text-xs text-emerald-400/90 leading-relaxed">
                    <div className="text-[10px] text-slate-600 mb-2 uppercase font-black">Structure Example:</div>
                    {item.example}
                  </div>
                )}

                {/* 답변 입력 */}
                <div className="relative">
                  <textarea
                    value={answers[item.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [item.id]: e.target.value })}
                    placeholder="내용을 입력하세요..."
                    className={`w-full bg-slate-950/50 border border-slate-800 rounded-xl p-6 text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-sky-500/50 focus:ring-4 focus:ring-sky-500/5 focus:bg-slate-950 transition-all resize-none min-h-[200px] ${
                      item.type === 'code' ? 'font-mono text-sm leading-relaxed' : 'text-base leading-relaxed'
                    }`}
                  />
                  <div className="absolute bottom-3 right-4 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                    {(answers[item.id] || '').length} chars
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══ 결과 화면 ══════════════════════════════════════════════════════
  return (
    <div className="apple-module apple-module-result p-8 animate-in fade-in">
      <div className="max-w-5xl mx-auto">
        {/* 완료 헤더 */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 mb-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-500 to-indigo-500"></div>
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-slate-800 mb-2">평가가 완료되었습니다</h2>
          <p className="text-slate-500">제출된 답안에 대한 상세 피드백을 확인하세요.</p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm"
            >
              <ArrowLeft size={16} /> 다시 도전하기
            </button>
          </div>
        </div>

        {/* 문항별 피드백 */}
        <div className="space-y-8">
          {TEST_DATA.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden transition-all hover:shadow-xl">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">{item.question}</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Review {item.id}</span>
              </div>
              <div className="p-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* 제출한 답안 */}
                <div className="lg:col-span-3 space-y-3">
                  <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>제출한 답안
                  </h4>
                  <div className={`p-6 rounded-xl border border-slate-100 min-h-[140px] whitespace-pre-wrap ${
                    item.type === 'code'
                      ? 'font-mono text-sm bg-slate-950 text-slate-200'
                      : 'text-slate-700 bg-slate-50/50'
                  }`}>
                    {answers[item.id] || <span className="text-slate-300 italic text-sm">미작성</span>}
                  </div>
                </div>

                {/* 피드백 */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="bg-sky-50 p-5 rounded-xl border border-sky-100">
                    <h4 className="font-bold text-sky-800 text-[10px] mb-2 uppercase tracking-widest">출제 의도</h4>
                    <p className="text-sm text-sky-900/80 leading-relaxed">{item.feedback.intent}</p>
                  </div>
                  <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
                    <h4 className="font-bold text-emerald-800 text-[10px] mb-2 uppercase tracking-widest">이상적인 답변</h4>
                    <p className="text-sm text-emerald-900/80 leading-relaxed">{item.feedback.ideal}</p>
                  </div>
                  <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
                    <h4 className="font-bold text-amber-800 text-[10px] mb-2 uppercase tracking-widest">피해야 할 답변</h4>
                    <p className="text-sm text-amber-900/80 leading-relaxed">{item.feedback.avoid}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
