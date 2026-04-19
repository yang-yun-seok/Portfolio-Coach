import React, { useState, useEffect, useRef } from 'react';
import {
  Clock, Video, CheckCircle, RefreshCcw, AlertCircle,
  Image as ImageIcon, Play, ArrowLeft, Code2, FileQuestion,
} from 'lucide-react';
import { staticAssetUrl } from '../lib/runtime-config';
import { normalizeUserProfile } from '../data/skills';

const TECH_ASSESSMENT_IMAGE = staticAssetUrl('assets/tech-assessment-sequence.svg');

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
    imageUrl: TECH_ASSESSMENT_IMAGE,
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

const ASSESSMENT_DATA_BY_ROLE = {
  기획: TEST_DATA,
  프로그래밍: [
    {
      id: 1, type: 'code',
      question: '1. 캐릭터 상태 전환 구조를 설계하라',
      description: 'Idle, Move, Attack, Hit, Dead 상태를 가진 캐릭터 FSM을 설계하고, 전환 조건과 예외 처리를 작성하세요.',
      example: '<Idle>\n  <BranchEvent="Input_Move" Execute="Move"/>\n</Idle>',
      feedback: {
        intent: '게임플레이 로직의 상태 관리, 예외 처리, 유지보수성을 평가합니다.',
        ideal: '상태 책임이 분리되어 있고, 입력/피격/사망 같은 우선순위가 명확한 구조.',
        avoid: '모든 조건을 한 함수에 몰아넣거나 전환 우선순위가 불명확한 구조.',
      },
    },
    {
      id: 2, type: 'text',
      question: '2. 프레임 드랍 원인을 찾는 절차를 설명하라',
      description: '전투 중 특정 스킬 사용 시 FPS가 급락한다는 리포트가 들어왔을 때 원인 분석 순서와 확인 지표를 작성하세요.',
      feedback: {
        intent: '프로파일링 접근법과 CPU/GPU/메모리 병목 구분 능력을 평가합니다.',
        ideal: '재현 조건 고정 → 프로파일러 측정 → 병목 구간 분리 → 수정 전후 수치 비교.',
        avoid: '감으로 최적화하거나 그래픽/코드 중 하나만 단정하는 답변.',
      },
    },
    {
      id: 3, type: 'text',
      question: '3. 서버 장애 상황에서 우선순위를 정하라',
      description: '로그인 성공률이 급락하고 매칭 대기열이 증가하는 상황에서 어떤 지표를 먼저 보고 어떤 순서로 대응할지 작성하세요.',
      feedback: {
        intent: '서비스 안정성, 장애 대응, 관측 지표 이해도를 평가합니다.',
        ideal: '영향 범위 파악, 롤백/트래픽 제어, DB/캐시/네트워크 지표 확인 순서가 명확한 답변.',
        avoid: '코드 수정부터 시작하거나 사용자 영향도 판단 없이 원인만 파고드는 답변.',
      },
    },
    {
      id: 4, type: 'code',
      question: '4. 아이템 쿨타임 시스템을 설계하라',
      description: '클라이언트와 서버가 함께 검증하는 아이템 쿨타임 시스템의 데이터 구조와 처리 흐름을 작성하세요.',
      feedback: {
        intent: '클라이언트 예측, 서버 권위, 악용 방지 관점을 평가합니다.',
        ideal: '서버 기준 시간, 클라이언트 표시 보정, 재접속/패킷 지연 예외 처리가 포함된 구조.',
        avoid: '클라이언트 시간만 신뢰하거나 동기화 실패 상황을 고려하지 않는 답변.',
      },
    },
    {
      id: 5, type: 'text',
      question: '5. 본인이 가장 자신 있는 기술 문제 해결 사례를 설명하라',
      description: '문제 상황, 원인 분석, 해결 방식, 결과 수치를 중심으로 작성하세요.',
      feedback: {
        intent: '실제 구현 경험과 트러블슈팅 깊이를 확인합니다.',
        ideal: '문제 규모, 사용 도구, 개선 수치, 재발 방지까지 연결된 답변.',
        avoid: '사용 기술만 나열하고 본인의 판단과 결과가 빠진 답변.',
      },
    },
    {
      id: 6, type: 'text',
      question: '6. 코드 리뷰에서 중요하게 보는 기준은 무엇인가?',
      description: '가독성, 성능, 테스트, 아키텍처 중 본인의 우선순위와 이유를 작성하세요.',
      feedback: {
        intent: '협업 개발 태도와 코드 품질 기준을 평가합니다.',
        ideal: '팀 생산성과 장애 예방 관점에서 기준을 제시하고 예시를 드는 답변.',
        avoid: '취향 중심의 스타일 논쟁으로만 접근하는 답변.',
      },
    },
  ],
  아트: [
    {
      id: 1, type: 'text',
      question: '1. 대표 작업물 1개의 제작 의도를 설명하라',
      description: '레퍼런스, 콘셉트 키워드, 시각적 목표, 완성 기준을 중심으로 작성하세요.',
      feedback: {
        intent: '작업 의도와 결과물의 설득력을 평가합니다.',
        ideal: '목표 분위기와 디자인 선택 이유가 작업 결과와 연결되는 답변.',
        avoid: '예쁘게 만들었다는 감상만 있고 기준과 의도가 없는 답변.',
      },
    },
    {
      id: 2, type: 'image-desc',
      question: '2. 이미지를 보고 개선 방향을 제안하라',
      description: '아래 참고 이미지를 보고 가독성, 실루엣, 시선 흐름, 연출 관점에서 개선 포인트를 작성하세요.',
      imageUrl: TECH_ASSESSMENT_IMAGE,
      feedback: {
        intent: '시각적 분석력과 피드백 언어의 구체성을 평가합니다.',
        ideal: '형태, 명도, 색, 동선, 정보 우선순위를 기준으로 구체적인 개선안을 제시한 답변.',
        avoid: '좋다/나쁘다 수준의 취향 평가에 그치는 답변.',
      },
    },
    {
      id: 3, type: 'text',
      question: '3. 엔진 적용 과정에서 발생할 수 있는 문제를 설명하라',
      description: '작업물을 Unity/Unreal에 적용할 때 텍스처, 머티리얼, LOD, 최적화 관점에서 주의할 점을 작성하세요.',
      feedback: {
        intent: '아트 결과물을 실제 게임에 올리는 파이프라인 이해도를 평가합니다.',
        ideal: '용량, 드로우콜, 셰이더 비용, 플랫폼 제약을 고려한 답변.',
        avoid: '원본 퀄리티만 중시하고 런타임 제약을 무시하는 답변.',
      },
    },
    {
      id: 4, type: 'text',
      question: '4. 스타일 가이드를 맞추는 방법을 설명하라',
      description: '기존 프로젝트의 화풍이나 UI 톤앤매너에 맞춰 작업할 때 어떤 기준으로 맞출지 작성하세요.',
      feedback: {
        intent: '스타일 적응력과 팀 프로젝트 협업 능력을 평가합니다.',
        ideal: '비율, 색상, 브러시, 밀도, 명암, 레퍼런스 보드 기준을 구체화한 답변.',
        avoid: '본인 스타일만 강조하고 프로젝트 일관성을 고려하지 않는 답변.',
      },
    },
    {
      id: 5, type: 'text',
      question: '5. 피드백을 받아 작업물을 수정한 경험을 설명하라',
      description: '초안의 문제점, 받은 피드백, 수정 방향, 최종 변화가 드러나게 작성하세요.',
      feedback: {
        intent: '피드백 수용 태도와 반복 개선 능력을 평가합니다.',
        ideal: '수정 전후 차이와 판단 근거가 명확한 답변.',
        avoid: '피드백을 감정적으로 받아들이거나 수정 이유가 불명확한 답변.',
      },
    },
    {
      id: 6, type: 'text',
      question: '6. 포트폴리오 첫 화면에 무엇을 배치할 것인가?',
      description: '채용 담당자가 30초 안에 강점을 파악할 수 있도록 구성 순서와 이유를 작성하세요.',
      feedback: {
        intent: '포트폴리오 큐레이션과 자기 강점 전달 능력을 평가합니다.',
        ideal: '대표작, 역할, 제작 기간, 사용 툴, 핵심 강점을 첫 화면에 압축하는 답변.',
        avoid: '작업물을 시간순으로만 나열하고 강점이 보이지 않는 구성.',
      },
    },
  ],
};

const TOTAL_TIME = 55 * 60;
const ASSESSMENT_TIME_BY_ROLE = {
  기획: 55 * 60,
  프로그래밍: 45 * 60,
  아트: 40 * 60,
};

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ══════════════════════════════════════════════════════════════════════
// 기술 과제 평가 컴포넌트
// ══════════════════════════════════════════════════════════════════════
export default function TechAssessment({ userInfo }) {
  const normalizedUser = normalizeUserProfile(userInfo || {});
  const assessmentData = ASSESSMENT_DATA_BY_ROLE[normalizedUser.roleGroup] || TEST_DATA;
  const totalTime = ASSESSMENT_TIME_BY_ROLE[normalizedUser.roleGroup] || TOTAL_TIME;
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
    setTimeLeft(totalTime);
    setStep('test');
  };

  const handleSubmit = () => setShowConfirm(true);
  const confirmSubmit = () => { setShowConfirm(false); clearInterval(timerRef.current); setStep('result'); };
  const cancelSubmit = () => setShowConfirm(false);

  const handleReset = () => {
    setStep('intro');
    setAnswers({});
    setTimeLeft(totalTime);
    setImgError(false);
  };

  const answeredCount = Object.values(answers).filter((v) => v && v.trim().length > 0).length;

  // ═══ Intro 화면 ════════════════════════════════════════════════════
  if (step === 'intro') {
    return (
      <div className="apple-module studio-assessment-intro animate-in fade-in">
        <div className="studio-assessment-hero">
          <div className="studio-assessment-copy">
            <p className="studio-eyebrow">{normalizedUser.roleGroup} · {normalizedUser.subRole}</p>
            <h2>직무 과제 평가</h2>
            <p>
              선택한 세부 직무 기준으로 자주 검증되는 실무형 문항을 묶었습니다.
              답을 맞히는 것보다 조건을 읽고 판단 기준과 작업 과정을 구조화하는 방식이 먼저
              보이도록 답변해 보세요.
            </p>

            <div className="studio-assessment-actions">
              <button
                onClick={handleStart}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 py-3 rounded-full transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <Play size={18} />
                평가 시작
              </button>
              <span className="studio-assessment-chip">{Math.round(totalTime / 60)}분 · {assessmentData.length}문항 · 직무 맞춤형</span>
            </div>
          </div>

          <div className="studio-assessment-facts">
            <article className="studio-assessment-panel studio-assessment-panel-strong">
              <p className="studio-eyebrow">Evaluation Focus</p>
              <h3>정답보다 사고 구조가 먼저 읽히게 답하세요.</h3>
              <p>
                문장 길이나 코드 양보다, 제약 조건을 해석하고 판단 기준을 세우는 과정이 더
                강하게 평가됩니다. 특히 {normalizedUser.subRole} 직무에서는 결과물보다 근거가 먼저 읽혀야 합니다.
              </p>
            </article>

            <div className="studio-assessment-rule-grid">
              <div className="studio-assessment-rule">
                <Video className="w-5 h-5 text-rose-500" />
                <div>
                  <h4>보안 준수</h4>
                  <p>캡처와 외부 공유를 전제하지 않는 실전형 연습 세션입니다.</p>
                </div>
              </div>

              <div className="studio-assessment-rule">
                <Clock className="w-5 h-5 text-sky-500" />
                <div>
                  <h4>시간 운영</h4>
                  <p>{Math.round(totalTime / 60)}분 안에 {assessmentData.length}문항을 다뤄야 하므로 분량 조절이 중요합니다.</p>
                </div>
              </div>

              <div className="studio-assessment-rule">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <div>
                  <h4>제출 후 리뷰</h4>
                  <p>각 문항별 출제 의도와 이상적인 방향을 바로 비교해 볼 수 있습니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══ 시험 화면 ══════════════════════════════════════════════════════
  if (step === 'test') {
    return (
      <div className="apple-module studio-assessment-shell flex flex-col h-full">
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
            <div className="bg-white border border-slate-200 rounded-[28px] p-8 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-black text-slate-900 mb-3">최종 제출 확인</h3>
              <p className="text-slate-600 mb-2 text-sm">작성 완료: {answeredCount} / {assessmentData.length} 문항</p>
              <p className="text-slate-500 mb-8 text-xs leading-relaxed">
                제출 후에는 답안을 수정할 수 없습니다. 지금 상태로 평가를 마무리할까요?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelSubmit}
                  className="flex-1 px-4 py-3 rounded-full text-slate-600 hover:bg-slate-100 transition-colors text-sm font-bold border border-slate-200"
                >
                  취소
                </button>
                <button
                  onClick={confirmSubmit}
                  className="flex-1 px-4 py-3 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-black transition-all text-sm shadow-lg"
                >
                  제출
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="studio-assessment-topbar shrink-0 z-10">
          <div className="studio-assessment-session">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
            </span>
            실전 모드 진행 중
          </div>

          <div className={`studio-assessment-timer ${timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-sky-600'}`}>
            <Clock className="w-5 h-5" />
            <span className="tabular-nums">{formatTime(timeLeft)}</span>
          </div>

          <div className="studio-assessment-progress">
            <span>{answeredCount}/{assessmentData.length} answered</span>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-full text-sm transition-all shadow-md"
            >
              최종 제출
            </button>
          </div>
        </div>

        <div className="studio-assessment-board flex-1 overflow-y-auto custom-scrollbar">
          <div className="studio-assessment-stack">
            {assessmentData.map((item) => (
              <section key={item.id} className="studio-question">
                <div className="studio-question-head">
                  <div className="studio-question-label">Q{String(item.id).padStart(2, '0')}</div>
                  <div>
                    <h2 className="studio-question-title">{item.question}</h2>
                    <p className="studio-question-desc">{item.description}</p>
                  </div>
                </div>

                {item.type === 'image-desc' && (
                  <div className="studio-question-image">
                    {!imgError ? (
                      <img
                        key={imgKey}
                        src={`${item.imageUrl}?v=${imgKey}`}
                        alt="상황 묘사 참고 이미지"
                        className="max-w-full h-auto object-contain"
                        loading="eager"
                        onLoad={() => setImgError(false)}
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <div className="studio-image-fallback">
                        <ImageIcon className="w-14 h-14 text-slate-300" />
                        <p className="text-slate-700 font-bold">참고 이미지를 불러오지 못했습니다.</p>
                        <p className="text-xs text-slate-500 break-all">{item.imageUrl}</p>
                        <button
                          onClick={() => { setImgKey(Date.now()); setImgError(false); }}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs font-bold"
                        >
                          <RefreshCcw className="w-3 h-3" /> 다시 시도
                        </button>
                      </div>
                    )}
                    <div className="studio-question-meta">Reference sequence</div>
                  </div>
                )}

                {item.example && (
                  <div className="studio-code-example">
                    <div className="text-[10px] text-slate-500 mb-2 uppercase font-black">Structure Example</div>
                    {item.example}
                  </div>
                )}

                <div className="studio-answer-wrap">
                  <textarea
                    value={answers[item.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [item.id]: e.target.value })}
                    placeholder="문제 조건을 먼저 정리한 뒤 답변을 작성하세요."
                    className={`studio-answer-sheet ${
                      item.type === 'code'
                        ? 'studio-answer-sheet-code font-mono text-sm leading-relaxed'
                        : 'text-base leading-relaxed'
                    }`}
                  />
                  <div className="studio-answer-count">
                    {(answers[item.id] || '').length} chars
                  </div>
                </div>
              </section>
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
          {assessmentData.map((item) => (
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
