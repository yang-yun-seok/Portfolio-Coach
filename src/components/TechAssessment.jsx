import React, { useState, useEffect, useRef } from 'react';
import {
  Clock, Video, RefreshCcw, AlertCircle,
  Image as ImageIcon, Play, ArrowLeft, Code2, FileQuestion,
} from 'lucide-react';
import { staticAssetUrl } from '../lib/runtime-config';
import { normalizeUserProfile } from '../data/skills';

const TECH_ASSESSMENT_IMAGE = staticAssetUrl('assets/tech-assessment-sequence.svg');

// ── 문제 및 피드백 데이터 ───────────────────────────────────────────────
const PLANNING_TEST_DATA = [
  {
    id: 1, type: 'text',
    question: '1. 신규 시스템의 목적과 성공 기준을 정의하라',
    description: '신규 유저가 3일 안에 이탈하는 문제가 있습니다. 어떤 시스템을 제안할지, 해결하려는 문제, 핵심 경험, 성공 지표(KPI)를 작성하세요.',
    feedback: {
      intent: '기획 직군의 문제 정의력, 유저 경험 해석, 지표 기반 사고를 평가합니다.',
      ideal: '이탈 원인 가설 → 목표 유저 행동 → 시스템 핵심 규칙 → 측정 지표 → 실패 시 보완 기준이 연결된 답변.',
      avoid: '재미있어 보이는 기능만 나열하고 왜 필요한지, 무엇으로 성공을 판단할지 빠진 답변.',
    },
  },
  {
    id: 2, type: 'text',
    question: '2. 컨텐츠 루프를 설계하라',
    description: '반복 플레이가 필요한 주간 PvE 콘텐츠를 기획한다고 가정하고, 진입 조건, 플레이 목표, 보상, 재방문 동기를 구조화하세요.',
    feedback: {
      intent: '콘텐츠/시스템 기획의 플레이 루프 설계력과 보상 동선 이해도를 평가합니다.',
      ideal: '입장 조건, 1회 플레이 흐름, 난이도 상승, 보상 테이블, 주간 리셋, 지루함 방지 장치가 함께 제시된 답변.',
      avoid: '던전 이름이나 스토리만 설명하고 반복 구조, 보상 이유, 운영 주기를 설명하지 않는 답변.',
    },
  },
  {
    id: 3, type: 'text',
    question: '3. 밸런스 기준과 조정안을 제시하라',
    description: '특정 무기의 선택률은 70%인데 승률은 49%입니다. 이 데이터를 어떻게 해석하고 어떤 추가 지표를 확인한 뒤 조정할지 작성하세요.',
    feedback: {
      intent: '숫자를 단순히 높고 낮게 보지 않고 맥락, 표본, 체감, 메타를 함께 해석하는지 봅니다.',
      ideal: '숙련도 구간, 픽률/밴률, 평균 딜량, 승률 분산, 카운터 존재 여부를 확인한 뒤 너프/버프/사용감 조정안을 나누는 답변.',
      avoid: '선택률이 높으니 바로 하향하거나 승률이 낮으니 바로 상향한다는 단선적인 답변.',
    },
  },
  {
    id: 4, type: 'image-desc',
    question: '4. 화면을 보고 상황과 개선 포인트를 도출하라',
    description: '아래 참고 이미지를 보고 유저가 이해해야 하는 정보, 현재 막힐 수 있는 지점, 튜토리얼/UX 개선안을 기획자 관점으로 작성하세요.',
    imageUrl: TECH_ASSESSMENT_IMAGE,
    feedback: {
      intent: '장면 관찰을 UX 문제, 안내 문구, 플레이 흐름 개선으로 변환하는 능력을 평가합니다.',
      ideal: '시각 단서 → 유저 오해 가능성 → 필요한 피드백/가이드 → 개선 후 기대 행동까지 논리적으로 이어지는 답변.',
      avoid: '이미지 속 사실만 묘사하거나 연출 감상에 머물고 실제 개선안이 없는 답변.',
    },
  },
  {
    id: 5, type: 'text',
    question: '5. 라이브 이슈 대응안을 작성하라',
    description: '업데이트 후 이벤트 보상이 의도보다 3배 많이 지급되고 있습니다. 유저 반발을 줄이면서 문제를 수정하는 공지, 회수, 보상 방향을 제안하세요.',
    feedback: {
      intent: '라이브 서비스 감각, 운영 리스크 판단, 유저 커뮤니케이션 균형을 평가합니다.',
      ideal: '영향 범위 확인, 악용/비악용 구분, 임시 중단, 공지 톤, 회수 기준, 보상안, 재발 방지까지 포함한 답변.',
      avoid: '무조건 회수하거나 무조건 방치하는 식으로 유저 신뢰와 경제 영향을 함께 보지 않는 답변.',
    },
  },
  {
    id: 6, type: 'text',
    question: '6. 기획서를 개발/아트가 바로 이해하게 작성하라',
    description: '새로운 상점 기능의 기획서 목차를 작성하고, 각 파트에 개발자와 아티스트가 반드시 확인해야 할 정보를 구분해 적으세요.',
    feedback: {
      intent: '기획 산출물이 협업 부서의 실행 단위로 번역되는지 평가합니다.',
      ideal: '유저 플로우, 정책, 예외 케이스, 데이터 테이블, UI 상태, 리소스 목록, 로그/QA 체크 항목이 분리된 답변.',
      avoid: '아이디어 설명은 많지만 구현 조건, 화면 상태, 리소스 요청, 예외 규칙이 빠진 답변.',
    },
  },
];

const PROGRAMMING_TEST_DATA = [
  {
    id: 1, type: 'code',
    question: '1. 전투 스킬 기능을 구현 단위로 분해하라',
    description: '돌진 후 범위 피해를 주는 스킬을 만든다고 가정하고, 클라이언트, 서버, 애니메이션, 이펙트, 로그가 각각 무엇을 책임져야 하는지 작성하세요.',
    example: 'SkillRequest -> ServerValidate -> ApplyMovement -> HitScan -> DamageResult -> ClientPresentation',
    feedback: {
      intent: '프로그래밍 직군의 책임 분리, 데이터 흐름, 서버 권위 이해도를 평가합니다.',
      ideal: '입력, 검증, 판정, 데미지 적용, 연출, 로그, 예외 처리를 분리하고 동기화 실패 상황까지 고려한 답변.',
      avoid: '화면에 보이는 동작만 설명하고 서버 검증, 판정 기준, 실패 처리, 로그 설계를 빼는 답변.',
    },
  },
  {
    id: 2, type: 'code',
    question: '2. 상태 동기화와 악용 방지를 설계하라',
    description: '클라이언트가 이동을 예측하지만 최종 위치는 서버가 결정하는 구조에서 순간이동, 지연, 패킷 누락을 어떻게 처리할지 작성하세요.',
    example: 'clientPrediction + serverSnapshot + reconciliation + antiTeleportThreshold',
    feedback: {
      intent: '실시간 게임 개발에서 네트워크, 보정, 치팅 방지 사고를 구분하는지 평가합니다.',
      ideal: '입력 시퀀스, 서버 스냅샷, 보간/보정, 허용 오차, 비정상 이동 탐지, 롤백 기준이 함께 제시된 답변.',
      avoid: '클라이언트 좌표를 그대로 믿거나 서버 보정만 말하고 체감 품질과 악용 방지를 함께 보지 않는 답변.',
    },
  },
  {
    id: 3, type: 'text',
    question: '3. 프레임 드랍 원인을 찾는 절차를 설명하라',
    description: '전투 중 특정 스킬 사용 시 FPS가 급락한다는 리포트가 들어왔을 때 재현, 계측, 원인 분리, 수정 검증 순서를 작성하세요.',
    feedback: {
      intent: '프로파일링 접근법과 CPU/GPU/메모리/GC 병목을 구분하는 능력을 평가합니다.',
      ideal: '동일 조건 재현 → 프로파일러 기록 → 병목 구간 분리 → 리소스/코드 가설 검증 → 수정 전후 수치 비교로 이어지는 답변.',
      avoid: '감으로 최적화하거나 그래픽, 서버, 코드 중 하나만 단정하고 계측 없이 수정하는 답변.',
    },
  },
  {
    id: 4, type: 'text',
    question: '4. 라이브 버그의 원인을 좁혀라',
    description: '일부 유저만 결투 보상을 두 번 받는 버그가 있습니다. 어떤 로그와 데이터, 재현 조건을 확인하고 임시 방어 코드를 어떻게 둘지 작성하세요.',
    feedback: {
      intent: '트러블슈팅, 데이터 정합성, 임시 대응과 근본 해결을 나누는 능력을 평가합니다.',
      ideal: '요청 중복, 트랜잭션, 재시도, 네트워크 끊김, 보상 지급 로그, 멱등성 키, 핫픽스/복구 절차를 다루는 답변.',
      avoid: '버그 위치를 추측만 하거나 전체 코드를 갈아엎는 식으로 서비스 영향을 고려하지 않는 답변.',
    },
  },
  {
    id: 5, type: 'text',
    question: '5. 코드 리뷰에서 리팩토링 기준을 제시하라',
    description: '하나의 함수가 입력 처리, 판정, 보상 지급, UI 갱신을 모두 담당합니다. 무엇을 기준으로 분리하고 어떤 테스트를 추가할지 작성하세요.',
    feedback: {
      intent: '유지보수성, 테스트 가능성, 변경 위험 관리에 대한 실무 감각을 평가합니다.',
      ideal: '책임 단위 분리, 순수 로직 추출, 외부 의존성 경계, 회귀 테스트, 리팩토링 순서와 롤백 가능성을 제시한 답변.',
      avoid: '코드 스타일 취향만 말하거나 리팩토링 범위와 테스트 없이 구조 변경만 주장하는 답변.',
    },
  },
  {
    id: 6, type: 'text',
    question: '6. 배포 전 안정성 점검 항목을 작성하라',
    description: '신규 매칭 기능을 배포하기 전 반드시 확인해야 할 테스트, 모니터링 지표, 롤백 조건을 작성하세요.',
    feedback: {
      intent: '기능 구현을 넘어 서비스 출시 안정성까지 보는지 평가합니다.',
      ideal: '단위/통합/부하 테스트, 매칭 성공률, 대기 시간, 에러율, 알림 기준, 점진 배포, 롤백 트리거가 포함된 답변.',
      avoid: '기능이 로컬에서 동작한다는 수준에서 멈추고 운영 지표와 장애 대응을 고려하지 않는 답변.',
    },
  },
];

const ART_TEST_DATA = [
  {
    id: 1, type: 'text',
    question: '1. 아트 브리프를 시각 전략으로 바꾸라',
    description: '"초보자도 믿을 수 있는 따뜻한 판타지 상점"이라는 브리프를 받았을 때, 실루엣, 색감, 재질, 조명, 화면 밀도를 어떻게 잡을지 작성하세요.',
    feedback: {
      intent: '아트 직군의 추상 키워드 해석력과 시각 언어 전환 능력을 평가합니다.',
      ideal: '형태 언어, 컬러 팔레트, 레퍼런스 방향, 금지 요소, 완성 기준이 콘셉트와 연결된 답변.',
      avoid: '예쁘다/따뜻하다 같은 감상어만 반복하고 실제 제작 기준으로 내려오지 않는 답변.',
    },
  },
  {
    id: 2, type: 'image-desc',
    question: '2. 이미지를 보고 시각적 우선순위를 개선하라',
    description: '아래 참고 이미지를 보고 가독성, 실루엣, 명도 대비, 시선 흐름, 정보 우선순위 관점에서 개선 포인트를 작성하세요.',
    imageUrl: TECH_ASSESSMENT_IMAGE,
    feedback: {
      intent: '이미지를 감상하는 것이 아니라 채용 과제식 피드백 언어로 분석하는지 평가합니다.',
      ideal: '큰 형태, 명암 구조, 초점, 색 대비, UI/연출 간섭을 근거로 구체적인 수정안을 제시한 답변.',
      avoid: '좋다/별로다 수준의 취향 평가나 퀄리티가 낮다는 식의 추상적 피드백.',
    },
  },
  {
    id: 3, type: 'text',
    question: '3. 게임 적용용 에셋 제작 파이프라인을 설명하라',
    description: '캐릭터 또는 배경 에셋을 엔진에 넣기까지 원화/모델링/스프라이트/텍스처/압축/네이밍/버전 관리에서 확인할 점을 작성하세요.',
    feedback: {
      intent: '아트 결과물을 실제 게임 빌드에 안전하게 넣는 파이프라인 이해도를 평가합니다.',
      ideal: '원본 관리, 해상도, 피벗, 아틀라스, 머티리얼, 용량, 드로우콜, 플랫폼 제약, 전달 규칙을 함께 다루는 답변.',
      avoid: '원본 퀄리티만 이야기하고 엔진 적용, 최적화, 협업 전달 기준을 무시하는 답변.',
    },
  },
  {
    id: 4, type: 'text',
    question: '4. 기존 스타일 가이드에 맞추는 기준을 제시하라',
    description: '이미 출시된 프로젝트에 신규 아이콘 20개를 추가해야 합니다. 기존 톤을 맞추기 위해 어떤 기준표를 만들지 작성하세요.',
    feedback: {
      intent: '개인 화풍보다 프로젝트 일관성을 우선하는 협업형 아트 감각을 평가합니다.',
      ideal: '라인 두께, 코너 반경, 명암 레벨, 색상 수, 광원 방향, 디테일 밀도, 사용 금지 표현을 기준화한 답변.',
      avoid: '기존 스타일을 참고하겠다는 말만 있고 실제 검수 기준이나 반복 생산 규칙이 없는 답변.',
    },
  },
  {
    id: 5, type: 'text',
    question: '5. 피드백 반영 과정을 설계하라',
    description: 'AD가 "캐릭터가 약해 보인다"고 피드백했습니다. 어떤 질문으로 의도를 좁히고, 어떤 수정안을 비교해 제시할지 작성하세요.',
    feedback: {
      intent: '모호한 피드백을 제작 가능한 수정 항목으로 바꾸는 커뮤니케이션 능력을 평가합니다.',
      ideal: '실루엣, 자세, 비율, 표정, 장비 크기, 색 대비 등 수정 축을 나누고 A/B 시안을 제안하는 답변.',
      avoid: '피드백을 감정적으로 받아들이거나 무작정 디테일을 추가해 문제를 흐리는 답변.',
    },
  },
  {
    id: 6, type: 'text',
    question: '6. 포트폴리오 첫 화면을 큐레이션하라',
    description: '채용 담당자가 1분 안에 강점을 파악할 수 있도록 대표작 순서, 썸네일, 역할 표기, 제작 과정을 어떻게 배치할지 작성하세요.',
    feedback: {
      intent: '아트 포트폴리오를 작품 나열이 아니라 채용 설득 자료로 구성하는지 평가합니다.',
      ideal: '대표작, 담당 범위, 제작 기간, 툴, 원본/완성 비교, 확대 컷, 문제 해결 과정을 첫 화면에서 읽히게 하는 답변.',
      avoid: '작업물을 시간순으로만 나열하거나 역할과 판단 근거가 보이지 않는 구성.',
    },
  },
];

const ASSESSMENT_DATA_BY_ROLE = {
  기획: PLANNING_TEST_DATA,
  프로그래밍: PROGRAMMING_TEST_DATA,
  아트: ART_TEST_DATA,
};

const ASSESSMENT_TRACK_META = {
  기획: {
    label: '기획',
    eyebrow: 'Planning Track',
    title: '문제 정의와 설계 판단을 보는 과제입니다.',
    description: '시스템, 콘텐츠, 밸런스, 라이브 운영을 하나의 설계 문서로 묶어내는 힘을 확인합니다.',
    focus: '기획 트랙은 아이디어의 멋짐보다 조건 해석, 유저 행동 가설, 지표, 협업 전달력이 더 중요합니다.',
  },
  프로그래밍: {
    label: '플밍',
    eyebrow: 'Programming Track',
    title: '구현 구조와 장애 대응력을 보는 과제입니다.',
    description: '게임 기능을 안정적으로 만들기 위한 책임 분리, 서버 권위, 성능, 로그, 배포 관점을 확인합니다.',
    focus: '플밍 트랙은 코드 양보다 데이터 흐름, 실패 케이스, 검증 방법, 운영 안정성을 먼저 보여줘야 합니다.',
  },
  아트: {
    label: '아트',
    eyebrow: 'Art Track',
    title: '시각 의도와 제작 파이프라인을 보는 과제입니다.',
    description: '작품 감상이 아니라 브리프 해석, 시각 우선순위, 스타일 일관성, 엔진 적용 가능성을 확인합니다.',
    focus: '아트 트랙은 예쁜 결과물만이 아니라 왜 그렇게 만들었는지, 어떻게 게임에 들어가는지까지 설명해야 합니다.',
  },
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
  const trackMeta = ASSESSMENT_TRACK_META[normalizedUser.roleGroup] || ASSESSMENT_TRACK_META.기획;
  const assessmentData = ASSESSMENT_DATA_BY_ROLE[normalizedUser.roleGroup] || PLANNING_TEST_DATA;
  const totalTime = ASSESSMENT_TIME_BY_ROLE[normalizedUser.roleGroup] || TOTAL_TIME;
  const [step, setStep] = useState('intro');
  const [timeLeft, setTimeLeft] = useState(totalTime);
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

  // ═══ Intro 화면 ════════════════════════════════════════════════════
  if (step === 'intro') {
    return (
      <div className="apple-module studio-assessment-intro animate-in fade-in">
        <div className="studio-assessment-hero">
          <div className="studio-assessment-copy">
            <p className="studio-eyebrow">{trackMeta.eyebrow}</p>
            <h2>직무 과제 평가</h2>
            <p>
              {trackMeta.description}
              {' '}답을 맞히는 것보다 조건을 읽고 판단 기준과 작업 과정을 구조화하는 방식이 먼저
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
              <span className="studio-assessment-chip">{trackMeta.label} 실무형 과제</span>
            </div>
          </div>

          <div className="studio-assessment-facts">
            <article className="studio-assessment-panel studio-assessment-panel-strong">
              <p className="studio-eyebrow">Evaluation Focus</p>
              <h3>{trackMeta.title}</h3>
              <p>{trackMeta.focus}</p>
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
                <FileQuestion className="w-5 h-5 text-emerald-500" />
                <div>
                  <h4>답변 리뷰</h4>
                  <p>각 문항별 출제 의도와 이상적인 방향을 비교해 볼 수 있습니다.</p>
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
              <p className="text-slate-600 mb-2 text-sm">현재 작성한 답안을 리뷰 화면으로 보낼까요?</p>
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
            {trackMeta.label} 트랙 세션
          </div>

          <div className={`studio-assessment-timer ${timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-sky-600'}`}>
            <Clock className="w-5 h-5" />
            <span className="tabular-nums">{formatTime(timeLeft)}</span>
          </div>

          <div className="studio-assessment-actions">
            <span>문항별 답안을 자유롭게 작성하세요</span>
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
        {/* 리뷰 헤더 */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-10 mb-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-500 to-indigo-500"></div>
          <FileQuestion className="w-16 h-16 text-sky-500 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-slate-800 mb-2">직무 과제 리뷰 화면</h2>
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
