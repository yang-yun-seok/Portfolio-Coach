import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Briefcase, Image as ImageIcon, Target, MessageSquare,
  ChevronRight, AlertCircle, CheckCircle, XCircle, Loader2, Gamepad2,
  UploadCloud, Trash2, User, Star, Plus, X, ExternalLink,
  Building2, Users, Coins, Sparkles, Clock, Shirt, Smile, Brain, Gift,
  Settings, RefreshCw, Database, ClipboardList, Code2, Download, BookOpen,
  Pin, Search, Hash,
} from 'lucide-react';
import { SKILL_CATEGORIES, ROLES } from './data/skills';
import { analyzeViaProxy } from './lib/gemini-client';
import { apiUrl, eventSourceUrl, staticAssetUrl } from './lib/runtime-config';
import { useModels } from './hooks/useModels';
import ModelSelector from './components/ModelSelector';
import AssignmentTest from './components/AssignmentTest';
import TechAssessment from './components/TechAssessment';
import PersonalityTest from './components/PersonalityTest';
import PdfExport from './components/PdfExport';
import InstructorFeedbackForm, { EMPTY_INSTRUCTOR } from './components/InstructorFeedbackForm';

// ── 아이콘 맵 (interview-basic.json에서 문자열로 지정된 아이콘을 컴포넌트로 매핑) ──
const ICON_MAP = { Shirt, Clock, Brain, Sparkles };

const INTERVIEW_THEME_MAP = {
  blue: {
    accent: '#0071e3',
    soft: 'rgba(0, 113, 227, 0.1)',
    border: 'rgba(0, 113, 227, 0.16)',
    kicker: 'Appearance',
  },
  amber: {
    accent: '#d97706',
    soft: 'rgba(217, 119, 6, 0.11)',
    border: 'rgba(217, 119, 6, 0.18)',
    kicker: 'Timing',
  },
  purple: {
    accent: '#7c3aed',
    soft: 'rgba(124, 58, 237, 0.1)',
    border: 'rgba(124, 58, 237, 0.16)',
    kicker: 'Mindset',
  },
  emerald: {
    accent: '#059669',
    soft: 'rgba(5, 150, 105, 0.1)',
    border: 'rgba(5, 150, 105, 0.16)',
    kicker: 'Attitude',
  },
};

const INTERVIEW_QUICK_CHECKS = [
  '도착 15분 전까지 주변 환경과 호흡을 정리합니다.',
  '복장, 카메라, 마이크, 포트폴리오 링크를 마지막으로 확인합니다.',
  '첫 인사와 자기소개 첫 문장을 미리 입 밖으로 한번 꺼내 봅니다.',
];

// ── 피드백 아이템 파서 ────────────────────────────────────────────────────
// "- **제목**: 내용" 또는 "**제목**: 내용" → { title, body } 로 분리
function parseFeedbackItem(text) {
  const cleaned = text.replace(/^[\-\*\s]+/, '').trim(); // 앞의 - * 공백 제거
  const match = cleaned.match(/^\*\*(.+?)\*\*[:：]?\s*([\s\S]*)/);
  if (match) return { title: match[1].trim(), body: match[2].trim() };
  return { title: null, body: cleaned };
}

// ── 스킬 매칭 헬퍼 ─────────────────────────────────────────────────────────
function skillMatches(userSkillName, reqSkill) {
  const u = userSkillName.toLowerCase();
  const r = reqSkill.toLowerCase();
  return r.includes(u) || u.includes(r);
}

// ── 매칭 점수 v3 — 변별력 강화 ───────────────────────────────────────────
// 배점 구조 (최대 100점):
//   직군 매칭            +15
//   경력 매칭            +15   (0차이=15, 1=10, 2=5)
//   스킬 가중 매칭       +30   (上=1.5, 中=1.0, 下=0.4 × 매칭건별 배점)
//   스킬 정합도 보너스   +25   (매칭된 스킬의 숙련도 가중 평균 × 커버리지)
//   다수 매칭 보너스     +15   (2개+5, 3개+10, 4개이상+15)
//   패널티: reqSkills없음 -15, 완전불일치 -10, 경력초과 -5
// ────────────────────────────────────────────────────────────────────────────
function calculateMatchScore(user, job, detailed = false) {
  const d = { roleScore: 0, expScore: 0, skillScore: 0, fitScore: 0, multiScore: 0, penalty: 0, matchedSkills: [], unmatchedSkills: [] };

  // ── 직군 매칭 (+15) ──────────────────────────────────────
  const jobRoles = job.roles && job.roles.length > 0 ? job.roles : [job.role];
  if (jobRoles.includes(user.role)) d.roleScore = 15;

  // ── 경력 매칭 (+15 / +10 / +5) ───────────────────────────
  const userExp = Number(user.experience) || 0;
  const jobExp = job.reqExp || 0;
  const expDiff = Math.abs(userExp - jobExp);
  if (expDiff === 0) d.expScore = 15;
  else if (expDiff === 1) d.expScore = 10;
  else if (expDiff === 2) d.expScore = 5;
  if (jobExp === 0 && userExp >= 5) d.penalty -= 5;

  // ── 스킬 영역 ─────────────────────────────────────────────
  if (job.reqSkills && job.reqSkills.length > 0) {
    const reqLen = job.reqSkills.length;
    let weightedSum = 0;
    let matchedCount = 0;

    job.reqSkills.forEach((req) => {
      const matched = user.skills.find((s) => skillMatches(s.name, req));
      if (matched) {
        matchedCount++;
        const lw = matched.level === '상' ? 1.5 : matched.level === '중' ? 1.0 : 0.4;
        weightedSum += lw;
        d.matchedSkills.push({ name: req, level: matched.level });
      } else {
        d.unmatchedSkills.push(req);
      }
    });

    d.skillScore = Math.round(Math.min(30, reqLen > 0 ? (weightedSum / reqLen) * 30 : 0));
    if (matchedCount > 0) {
      d.fitScore = Math.round((matchedCount / reqLen) * (weightedSum / matchedCount) * 25);
    }
    if (matchedCount >= 4) d.multiScore = 15;
    else if (matchedCount >= 3) d.multiScore = 10;
    else if (matchedCount >= 2) d.multiScore = 5;
    if (matchedCount === 0) d.penalty -= 10;
  } else {
    d.penalty -= 15;
  }

  const total = Math.min(100, Math.max(0, d.roleScore + d.expScore + d.skillScore + d.fitScore + d.multiScore + d.penalty));
  return detailed ? { score: total, ...d } : total;
}

function generateInterviewQuestionsLocal(topJobs, user) {
  return topJobs.map((job, idx) => {
    const reqSkills = Array.isArray(job.reqSkills) ? job.reqSkills : [];
    const matched = user.skills.filter((s) =>
      reqSkills.some(
        (req) => req.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(req.toLowerCase())
      )
    );
    const topSkill = matched.length > 0 ? matched[0] : { name: reqSkills[0] || '해당 기술', level: '중' };
    const q1 = job.role.includes('기획')
      ? `[핵심 지표 검증]\n"${topSkill.name}" 역량을 바탕으로 신규 시스템 기획 시, 가장 먼저 확인할 3가지 지표와 그 이유는 무엇인가요?`
      : `[직무 기여도]\n당사 프로젝트에서 "${topSkill.name}" 기술을 구체적으로 어떻게 활용하여 기여할 수 있는지 2가지 사례를 들어 설명해주세요.`;
    const shortNews = job.companyInfo?.news?.[0]?.split(' 및 ')[0].split(' 등 ')[0] || '최근 시장 트렌드';
    const expText = user.experience > 0 ? `${user.experience}년차 ` : '신입 ';
    const q2 = `[산업 인사이트]\n최근 '${shortNews}' 이슈와 관련하여, ${expText}${job.role} 실무자로서 예상되는 리스크 1가지와 해결 방안을 제시해주세요.`;
    return {
      rank: idx + 1,
      company: job.companyInfo?.name || job.company,
      idealCandidateReflected: `- **인재상 매칭**: '${job.companyInfo?.idealCandidate || '전문성과 열정'}'\n- **어필 전략**: 본인의 과거 실패 극복 경험이나 집요한 문제 해결 사례를 강조하여 회사의 방향성과 일치함을 증명하세요.`,
      assignmentGuide: job.hasAssignment
        ? `- **[${job.assignmentType}] 대비**\n- 사전 공지된 요구사항과 제한 조건을 철저히 분석하고, 실무와 유사한 환경에서 모의 테스트를 진행하세요.`
        : '',
      questions: [
        {
          question: q1,
          avoid: '- 두괄식 결론 없이 배경 설명만 길게 나열하는 답변\n- 구체적 근거 없는 추상적인 자신감 표현',
          recommend: '- **STAR 기법**을 활용한 성과 중심의 1분 내외 스피치\n- 첫 문장에서 명확한 지표나 결과를 먼저 제시(두괄식)',
        },
        {
          question: q2,
          avoid: '- 기업 이슈를 모른 채 일반적인 직무 이야기만 하는 것\n- 리스크만 나열하고 본인만의 해결책이 부재한 답변',
          recommend: '- 기업의 최신 동향을 먼저 언급하며 직무 이해도 어필\n- 논리적인 인과관계에 따른 창의적 대안 제시',
        },
      ],
    };
  });
}

// ── 메인 App ──────────────────────────────────────────────────────────────
export default function App() {
  // ── 모델 관련 (서버에서 동적 로드) ──────────────────────────────────────
  const { enabledProviders, disabledProviders, loading: modelsLoading, getDefaultModel } = useModels();
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [selectedModelId, setSelectedModelId] = useState('');
  // API 키는 Supabase Edge Function(gemini-proxy)이 서버측에서 관리

  // 모델 로드 완료 시 기본 모델 선택
  useEffect(() => {
    if (enabledProviders.length > 0 && !selectedModelId) {
      const defaultModel = getDefaultModel(selectedProvider);
      if (defaultModel) setSelectedModelId(defaultModel.id);
    }
  }, [enabledProviders, selectedProvider]);

  // ── 기업/공고 데이터 (서버 API에서 로드) ──────────────────────────────
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // 정적 JSON에서 직접 로드 (GitHub Pages + 로컬 모두 대응)
        const [compRes, jobRes] = await Promise.all([
          fetch(staticAssetUrl('api/companies.json')),
          fetch(staticAssetUrl('api/jobs.json')),
        ]);
        if (compRes.ok) setCompanies(await compRes.json());
        if (jobRes.ok) setJobs(await jobRes.json());
      } catch (err) {
        console.warn('데이터 로드 실패:', err.message);
      } finally {
        setDataLoading(false);
      }
    })();
  }, []);

  // ── 면접 기본 준비 데이터 (서버에서 로드) ──────────────────────────────
  const [interviewBasicData, setInterviewBasicData] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(staticAssetUrl('api/prompts/interview-basic.json'));
        if (res.ok) setInterviewBasicData(await res.json());
      } catch { /* 서버 미응답 시 빈 배열 유지 */ }
    })();
  }, []);

  // 탭 / UI 상태
  const [activeTab, setActiveTab] = useState('input');
  const [activeInterviewTab, setActiveInterviewTab] = useState(0);
  const [visibleJobs, setVisibleJobs] = useState(10);
  const [scoreFilter, setScoreFilter] = useState('all'); // 'all' | '90+' | '80+' | '70+' | '60+' | '60-'
  const [selectedCompanyModal, setSelectedCompanyModal] = useState(null);

  // 로딩 / 메시지
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // 프로필
  const [userInfo, setUserInfo] = useState({ name: '', role: '기획', experience: 0, skills: [] });
  const [skillInput, setSkillInput] = useState({
    category: '기획 관련 항목',
    name: SKILL_CATEGORIES['기획 관련 항목'][0],
    level: '중',
  });

  // 파일
  const [resumeFile, setResumeFile] = useState(null);
  const [coverLetterFile, setCoverLetterFile] = useState(null);
  const [portfolioFiles, setPortfolioFiles] = useState([]);

  // 강사 피드백
  const [instructorFeedback, setInstructorFeedback] = useState(EMPTY_INSTRUCTOR);

  // 결과
  const [results, setResults] = useState(null);
  const [recommendedJobs, setRecommendedJobs] = useState([]);

  // 우선 공고 지정 (1~3순위)
  const [pinnedSlots, setPinnedSlots] = useState([
    { rank: 1, giNo: '', job: null, status: 'empty', error: '' },
    { rank: 2, giNo: '', job: null, status: 'empty', error: '' },
    { rank: 3, giNo: '', job: null, status: 'empty', error: '' },
  ]);

  // 우선 공고 GI_No 입력값 변경
  const handlePinnedGiNoChange = (rank, value) => {
    setPinnedSlots((prev) =>
      prev.map((s) => (s.rank === rank ? { ...s, giNo: value, error: '' } : s))
    );
  };

  // 우선 공고 조회 (서버에 요청: 기존 데이터 확인 → 없으면 자동 크롤링)
  const resolvePinnedJob = async (rank) => {
    const slot = pinnedSlots.find((s) => s.rank === rank);
    if (!slot || !slot.giNo.trim()) return;

    setPinnedSlots((prev) =>
      prev.map((s) => (s.rank === rank ? { ...s, status: 'loading', error: '', job: null } : s))
    );

    try {
      const res = await fetch(apiUrl('api/jobs/resolve'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ giNo: slot.giNo.trim() }),
      });
      const data = await res.json();

      if (res.ok && data.found) {
        setPinnedSlots((prev) =>
          prev.map((s) =>
            s.rank === rank
              ? { ...s, status: 'resolved', job: data.job, error: '' }
              : s
          )
        );
        // 크롤링으로 새로 가져온 경우 jobs 목록도 갱신
        if (data.source === 'crawled') {
          let jobRes = await fetch(staticAssetUrl('api/jobs.json')).catch(() => null);
          if (jobRes.ok) setJobs(await jobRes.json());
        }
      } else {
        setPinnedSlots((prev) =>
          prev.map((s) =>
            s.rank === rank
              ? { ...s, status: 'error', error: data.error || '조회 실패' }
              : s
          )
        );
      }
    } catch (err) {
      setPinnedSlots((prev) =>
        prev.map((s) =>
          s.rank === rank
            ? { ...s, status: 'error', error: `네트워크 오류: ${err.message}` }
            : s
        )
      );
    }
  };

  // 우선 공고 슬롯 초기화
  const clearPinnedSlot = (rank) => {
    setPinnedSlots((prev) =>
      prev.map((s) => (s.rank === rank ? { rank, giNo: '', job: null, status: 'empty', error: '' } : s))
    );
  };

  // 설정 / 크롤링
  const [showSettings, setShowSettings] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [crawlStatus, setCrawlStatus] = useState({ running: false, message: '', percent: 0, log: [], isError: false });
  const crawlEventSourceRef = useRef(null);
  const crawlPollerRef = useRef(null);

  // ── 크롤링 태그 선택 ──────────────────────────────────────────────────
  const CRAWL_JOB_TAGS = [
    '게임기획', '게임개발(클라이언트)', '게임개발(모바일)', '게임AI개발',
    '인터페이스디자인', '원화', '모델링', '애니메이션', '이펙트·FX',
  ];
  const CRAWL_CAREER_TAGS = [
    '신입', '1~3년', '4~6년', '7~9년', '10~15년', '16년~20년', '21년이상', '경력무관',
  ];
  const [crawlJobTags, setCrawlJobTags] = useState(['게임기획']);
  const [crawlCareerTags, setCrawlCareerTags] = useState(['신입']);

  const toggleCrawlTag = (tag, list, setter) => {
    setter(list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag]);
  };

  const stopCrawlMonitoring = () => {
    if (crawlEventSourceRef.current) {
      crawlEventSourceRef.current.close();
      crawlEventSourceRef.current = null;
    }
    if (crawlPollerRef.current) {
      clearInterval(crawlPollerRef.current);
      crawlPollerRef.current = null;
    }
  };

  const reloadJobsAfterCrawl = async () => {
    const jobRes = await fetch(staticAssetUrl('api/jobs.json')).catch(() => null);
    if (jobRes?.ok) {
      setJobs(await jobRes.json());
    }
  };

  const applyCrawlEvent = async (data) => {
    if (!data?.message) return;

    const isErr = data.stage === 'error';
    const isDone = data.stage === 'complete';

    setCrawlStatus((prev) => {
      const nextLog =
        prev.log[prev.log.length - 1] === data.message
          ? prev.log
          : [...prev.log.slice(-49), data.message];

      return {
        running: !isErr && !isDone,
        message: data.message,
        percent: data.percent || 0,
        log: nextLog,
        isError: isErr,
      };
    });

    if (isErr || isDone) {
      stopCrawlMonitoring();
      if (isDone) {
        await reloadJobsAfterCrawl();
      }
    }
  };

  const startCrawlPolling = () => {
    if (crawlPollerRef.current) clearInterval(crawlPollerRef.current);

    crawlPollerRef.current = setInterval(async () => {
      try {
        const res = await fetch(apiUrl('api/crawl/status'));
        if (!res.ok) return;

        const status = await res.json();
        if (status.lastEvent) {
          await applyCrawlEvent(status.lastEvent);
        }

        if (!status.running && !status.lastEvent) {
          stopCrawlMonitoring();
          setCrawlStatus((prev) => ({
            ...prev,
            running: false,
            isError: true,
            message: prev.message || '크롤링 상태를 확인할 수 없습니다.',
          }));
        }
      } catch {
        // polling은 다음 주기에 재시도
      }
    }, 2000);
  };

  const connectCrawlStream = () => {
    if (typeof EventSource === 'undefined') {
      setCrawlStatus((prev) => ({
        ...prev,
        message: '브라우저 실시간 연결을 지원하지 않아 상태 확인 모드로 진행합니다.',
      }));
      return;
    }

    if (crawlEventSourceRef.current) {
      crawlEventSourceRef.current.close();
    }

    const evtSource = new EventSource(eventSourceUrl('api/crawl/stream'));
    crawlEventSourceRef.current = evtSource;

    evtSource.onmessage = async (e) => {
      try {
        const data = JSON.parse(e.data);
        await applyCrawlEvent(data);
      } catch {
        // 파싱 오류는 무시하고 polling이 보완
      }
    };

    evtSource.onerror = () => {
      if (crawlEventSourceRef.current === evtSource) {
        evtSource.close();
        crawlEventSourceRef.current = null;
      }

      setCrawlStatus((prev) => ({
        ...prev,
        message: prev.running
          ? '실시간 연결이 불안정해 상태 확인 모드로 전환했습니다.'
          : prev.message,
      }));
    };
  };

  // ── 크롤링 함수 ──────────────────────────────────────────────────────
  const startCrawl = async () => {
    stopCrawlMonitoring();
    setCrawlStatus({ running: true, message: '크롤링 준비 중...', percent: 0, log: [], isError: false });
    try {
      // 1) 크롤링 시작 요청 (백그라운드 실행, 즉시 응답)
      const targets = [...crawlJobTags, ...crawlCareerTags];
      const startRes = await fetch(apiUrl('api/crawl/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets }),
      });

      if (!startRes.ok) {
        const err = await startRes.json().catch(() => ({}));
        setCrawlStatus((prev) => ({ ...prev, running: false, message: err.error || '크롤링 시작 실패', isError: true }));
        return;
      }

      startCrawlPolling();
      connectCrawlStream();
      return;

      // 2) SSE 스트림으로 진행 상황 수신 (GET — 연결 끊겨도 크롤링은 계속)
      const evtSource = new EventSource(eventSourceUrl('api/crawl/stream'));

      evtSource.onmessage = async (e) => {
        try {
          const data = JSON.parse(e.data);
          const isErr = data.stage === 'error';
          const isDone = data.stage === 'complete';

          setCrawlStatus((prev) => ({
            running: !isErr && !isDone,
            message: data.message,
            percent: data.percent || 0,
            log: [...prev.log.slice(-49), data.message],
            isError: isErr,
          }));

          // 크롤링 완료 시 공고 데이터 리로드
          if (isDone) {
            evtSource.close();
          let jobRes = await fetch(staticAssetUrl('api/jobs.json')).catch(() => null);
            if (jobRes.ok) setJobs(await jobRes.json());
          }

          if (isErr) {
            evtSource.close();
          }
        } catch { /* 파싱 실패 무시 */ }
      };

      evtSource.onerror = () => {
        // SSE 연결 끊김 — 크롤링 상태 폴링으로 전환
        evtSource.close();
        // 크롤링이 아직 진행 중인지 확인 후 재연결
          fetch(apiUrl('api/crawl/status')).then(r => r.json()).then(status => {
          if (status.running) {
            // 아직 진행 중이면 잠시 후 재연결
            setTimeout(() => {
              const retry = new EventSource(eventSourceUrl('api/crawl/stream'));
              retry.onmessage = evtSource.onmessage;
              retry.onerror = () => {
                retry.close();
                setCrawlStatus((prev) => ({ ...prev, running: false, message: '연결이 끊겼습니다. 크롤링은 백그라운드에서 계속 진행 중입니다.', isError: false }));
              };
            }, 1000);
          } else if (status.lastEvent) {
            // 이미 완료됨
            const isErr = status.lastEvent.stage === 'error';
            setCrawlStatus((prev) => ({
              running: false,
              message: status.lastEvent.message,
              percent: status.lastEvent.percent || 0,
              log: [...prev.log, status.lastEvent.message],
              isError: isErr,
            }));
            if (!isErr) {
                  fetch(staticAssetUrl('api/jobs.json')).then(r => r.ok ? r.json() : null).then(jobs => { if (jobs) setJobs(jobs); });
            }
          }
        }).catch(() => {
          setCrawlStatus((prev) => ({ ...prev, running: false, message: '서버 연결 실패', isError: true }));
        });
      };
    } catch (err) {
      setCrawlStatus((prev) => ({ ...prev, running: false, message: `오류: ${err.message}`, isError: true }));
    }
  };

  const stopCrawl = async () => {
    stopCrawlMonitoring();
    try {
      const res = await fetch(apiUrl('api/crawl/stop'), { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      setCrawlStatus((prev) => ({
        ...prev,
        running: false,
        isError: false,
        message: data.message || '크롤링이 중단되었습니다.',
      }));
    } catch {
      setCrawlStatus((prev) => ({
        ...prev,
        running: false,
        isError: true,
        message: '크롤링 중단 요청에 실패했습니다.',
      }));
    }
  };

  useEffect(() => () => {
    stopCrawlMonitoring();
  }, []);

  // ── 헬퍼 ──────────────────────────────────────────────────────────────
  const currentProvider = enabledProviders.find((p) => p.id === selectedProvider);

  const handleProviderChange = (providerId) => {
    setSelectedProvider(providerId);
    const defaultModel = getDefaultModel(providerId);
    if (defaultModel) setSelectedModelId(defaultModel.id);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = () => {
    if (!userInfo.skills.find((s) => s.name === skillInput.name)) {
      setUserInfo((prev) => ({ ...prev, skills: [...prev.skills, { ...skillInput }] }));
    }
  };

  const handleRemoveSkill = (skillName) => {
    setUserInfo((prev) => ({ ...prev, skills: prev.skills.filter((s) => s.name !== skillName) }));
  };

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
        if (encoded.length % 4 > 0) encoded += '='.repeat(4 - (encoded.length % 4));
        resolve(encoded);
      };
      reader.onerror = (err) => reject(err);
    });

  // ── 포트폴리오 파일 핸들러 ───────────────────────────────────────────
  const handlePortfolioChange = (e) => {
    const files = Array.from(e.target.files);
    if (portfolioFiles.length + files.length > 8) {
      setError('포트폴리오는 최대 8개까지만 업로드 가능합니다.');
      return;
    }
    setPortfolioFiles((prev) => [...prev, ...files]);
    setError('');
  };

  // ── 공고 매칭 점수 계산 (pinned jobs 우선 반영) ────────────────────────
  const computeJobsWithScores = () => {
    const allWithScores = jobs.map((job) => {
      const detail = calculateMatchScore(userInfo, job, true);
      const companyInfo = companies.find((c) => c.name === job.company);
      return { ...job, score: detail.score, matchDetail: detail, companyInfo };
    }).sort((a, b) => b.score - a.score);

    // 지정된 우선 공고(pinned)를 top3 자리에 끼워넣기
    const resolvedPinned = pinnedSlots
      .filter((s) => s.status === 'resolved' && s.job)
      .sort((a, b) => a.rank - b.rank);

    if (resolvedPinned.length === 0) return allWithScores;

    // pinned job의 id Set (중복 방지용)
    const pinnedIds = new Set(resolvedPinned.map((s) => s.job.id));

    // pinned 제외한 나머지 공고 (점수 순 유지)
    const remaining = allWithScores.filter((j) => !pinnedIds.has(j.id));

    // pinned jobs에 score/companyInfo 부여
    const pinnedWithScores = resolvedPinned.map((s) => {
      const existing = allWithScores.find((j) => j.id === s.job.id);
      if (existing) return { ...existing, pinned: true, pinnedRank: s.rank };
      const companyInfo = companies.find((c) => c.name === s.job.company);
      const score = calculateMatchScore(userInfo, s.job);
      return { ...s.job, score, companyInfo, pinned: true, pinnedRank: s.rank };
    });

    // top3 구성: rank 1,2,3 자리에 pinned가 있으면 해당 자리에, 없으면 remaining에서 채움
    const top3 = [];
    let remainIdx = 0;
    for (let rank = 1; rank <= 3; rank++) {
      const pinForRank = pinnedWithScores.find((p) => p.pinnedRank === rank);
      if (pinForRank) {
        top3.push(pinForRank);
      } else if (remainIdx < remaining.length) {
        top3.push(remaining[remainIdx++]);
      }
    }

    // top3 이후의 나머지 공고 이어붙이기
    const top3Ids = new Set(top3.map((j) => j.id));
    const rest = remaining.filter((j) => !top3Ids.has(j.id));

    return [...top3, ...rest];
  };

  // ── Fallback 적용 ─────────────────────────────────────────────────────
  const applyLocalFallback = (jobsWithScores, message) => {
    setRecommendedJobs(jobsWithScores);
    setVisibleJobs(10);
    const top3 = jobsWithScores.slice(0, 3);
    const localQs = generateInterviewQuestionsLocal(top3, userInfo);
    setResults({
      resumeImprovements: [
        `**성과 중심 재배치**: ${userInfo.experience}년차 ${userInfo.role} 경험을 상단에 두괄식으로 배치하세요.`,
        `**핵심 기술 증명**: [${userInfo.skills[0]?.name || '주요 기술'}] 활용 프로젝트 사례를 수치화하여 보강하세요.`,
      ],
      coverLetterImprovements: {
        common: [
          `**지원 동기 구체화**: 본인의 가치관과 목표가 게임 업계 방향성과 어떻게 일치하는지 첫 문장에 두괄식으로 서술하세요.`,
          `**논리적 트러블슈팅**: '문제 발생 → 가설 수립 → 기술적 해결 → 결과 지표' 순으로 개조식 정리하세요.`,
        ],
        rank1: [
          `**${top3[0]?.company || '1순위 공고'} 맞춤 전략**: 해당 공고의 핵심 인재상 키워드를 자소서 도입부에 직접 언급하고, 본인의 경험과 연결하세요.`,
          `**직무 이해도 어필**: ${top3[0]?.company || '1순위 회사'}의 최신 이슈·신작·방향성을 인용하여 진정성 있는 지원 동기를 구성하세요.`,
        ],
        rank2: [
          `**${top3[1]?.company || '2순위 공고'} 맞춤 전략**: 해당 공고가 요구하는 역량 중 본인의 경험과 가장 가까운 사례를 중심으로 자소서를 재구성하세요.`,
          `**차별화 포인트 강조**: ${top3[1]?.company || '2순위 회사'} 관점에서 다른 지원자와 차별화되는 본인의 강점을 구체적인 수치·결과물로 뒷받침하세요.`,
        ],
        rank3: [
          `**${top3[2]?.company || '3순위 공고'} 맞춤 전략**: 해당 공고의 요구 조건 중 충족하는 항목을 먼저 명시하고, 부족한 부분은 성장 의지와 대안으로 보완하세요.`,
          `**문화 핏 어필**: ${top3[2]?.company || '3순위 회사'}의 개발 철학·장르 특성과 본인의 커리어 방향성이 일치함을 구체적으로 서술하세요.`,
        ],
      },
      portfolioImprovements: portfolioFiles.length > 0
        ? portfolioFiles.map((f, i) => `**포트폴리오 ${i+1} (${f.name})**: 해당 문서의 핵심 기여도와 문제 해결 과정을 수치화하여 보강하세요.`)
        : [
          `**과정 및 최적화 문서화**: 결과물 외에 문제 해결 과정(퍼포먼스 향상 등)을 노션/깃허브에 문서화하여 링크하세요.`,
          `**기여도 명시**: 팀 프로젝트 내 본인의 명확한 역할과 기여도(%)를 앞장에 요약하세요.`,
        ],
      interviewPreps: localQs,
    });
    setInfoMessage(message);
    setActiveTab('feedback');
    setActiveInterviewTab(0);
    // 자동 저장
    try { localStorage.setItem('portfolio_bot_save', JSON.stringify({ userInfo, results: { resumeImprovements: ['로컬 분석'], coverLetterImprovements: {}, portfolioImprovements: ['로컬 분석'], interviewPreps: localQs }, instructorFeedback, savedAt: new Date().toISOString() })); } catch {}
  };

  // ── 메인 분석 함수 ────────────────────────────────────────────────────
  const analyzeApplication = async () => {
    if (!userInfo.name || userInfo.skills.length === 0) {
      setError('지원자 이름과 최소 1개 이상의 스킬을 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const jobsWithScores = computeJobsWithScores();
      setRecommendedJobs(jobsWithScores);
      setVisibleJobs(10);
      const top3 = jobsWithScores.slice(0, 3);

      // 파일 변환 (이력서 + 자소서 + 포트폴리오 최대 8개, 각 10MB)
      let fileParts = [];
      if (currentProvider?.supportsFiles) {
        try {
          const MAX_FILE = 10 * 1024 * 1024;
          const addFile = async (label, file) => {
            if (!file || file.size > MAX_FILE) return;
            fileParts.push({ text: label }, { inlineData: { mimeType: 'application/pdf', data: await fileToBase64(file) } });
          };
          await addFile('이력서 첨부:', resumeFile);
          await addFile('자기소개서 첨부:', coverLetterFile);
          for (let i = 0; i < portfolioFiles.length; i++) {
            await addFile(`포트폴리오 ${i + 1}:`, portfolioFiles[i]);
          }
        } catch { fileParts = []; }
      }

      // Supabase gemini-proxy 경유 (API 키 불필요)
      const data = await analyzeViaProxy({
        modelId: selectedModelId,
        top3,
        profile: userInfo,
        hasFiles: fileParts.length > 0,
        hasPortfolioFile: portfolioFiles.length > 0,
        fileParts: fileParts.length > 0 ? fileParts : undefined,
        portfolioFileNames: portfolioFiles.map(f => f.name),
      });
      // 결과 데이터 안전 정규화
      const safeData = {
        ...data,
        resumeImprovements: Array.isArray(data.resumeImprovements) ? data.resumeImprovements : [],
        portfolioImprovements: Array.isArray(data.portfolioImprovements) ? data.portfolioImprovements : [],
        interviewPreps: Array.isArray(data.interviewPreps) ? data.interviewPreps.map(p => ({
          ...p,
          questions: Array.isArray(p.questions) ? p.questions : [],
        })) : [],
        coverLetterImprovements: data.coverLetterImprovements || {},
        profileAnalysis: data.profileAnalysis || {},
      };
      setResults(safeData);
      setActiveTab('feedback');
      setActiveInterviewTab(0);
      // AI 강사피드백 초안은 백그라운드로 생성해 결과 탭 전환을 막지 않음
      void generateInstructorDraft(safeData, userInfo)
        .then((draft) => {
          if (!draft) return;
          const saveData = { userInfo, results: safeData, instructorFeedback: draft, savedAt: new Date().toISOString() };
          localStorage.setItem('portfolio_bot_save', JSON.stringify(saveData));
        })
        .catch(() => {});
      const baseSaveData = { userInfo, results: safeData, instructorFeedback, savedAt: new Date().toISOString() };
      localStorage.setItem('portfolio_bot_save', JSON.stringify(baseSaveData));
    } catch (err) {
      console.warn('AI 분석 오류 → 로컬 Fallback:', err.message);
      try {
        const jobsWithScores = computeJobsWithScores();
        applyLocalFallback(
          jobsWithScores,
          `AI API 연동 오류로 로컬 분석 엔진으로 결과를 대체 생성했습니다. (${err.message})`
        );
      } catch (fallbackErr) {
        console.warn('로컬 Fallback도 실패:', fallbackErr.message);
        setError(`분석 실패: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── AI 강사피드백 초고 생성 ─────────────────────────────────────────
  const generateInstructorDraft = async (aiResults, profile) => {
    try {
      const { callGeminiProxy } = await import('./lib/gemini-client');
      const today = new Date().toISOString().slice(0, 10);
      const prompt = `당신은 게임 업계 취업 컨설팅 강사입니다. 아래 AI 분석 결과를 바탕으로 강사 피드백 초고를 작성하세요.

지원자: ${profile.name} | 직군: ${profile.role} | 경력: ${profile.experience}년
스킬: ${(profile.skills || []).map(s => `${s.name}(${s.level})`).join(', ')}

AI 분석 요약:
- 프로필: ${JSON.stringify(aiResults.profileAnalysis || {}).slice(0, 500)}
- 이력서: ${JSON.stringify(aiResults.resumeImprovements || []).slice(0, 500)}
- 포트폴리오: ${JSON.stringify(aiResults.portfolioImprovements || []).slice(0, 500)}

아래 마크다운 형식으로 정확히 작성하세요:

# 통합 피드백

## 전체 평가
(2~3문장 종합 평가)

## 주요 개선사항
- (핵심 개선 항목 3~5개)

# 이력서 피드백

## 강점
- (2~3개)

## 개선 포인트
- (2~3개)

# 자기소개서 피드백

## 강점
- (2~3개)

## 개선 포인트
- (2~3개)

# 포트폴리오 피드백

## 강점
- (2~3개)

## 개선 포인트
- (2~3개)

# 면접 대비

## 예상 질문
- (3~4개)

## 준비 방향
- (2~3개)

게임 업계 실무 관점에서 구체적으로 작성하세요.`;

      const data = await callGeminiProxy({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      });
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const { parseInstructorMd } = await import('./components/InstructorFeedbackForm');
        const parsed = parseInstructorMd(`# 강사명\nAI 초고\n\n# 피드백 일자\n${today}\n\n${text}`);
        setInstructorFeedback(parsed);
        return parsed;
      }
    } catch (err) {
      console.warn('강사피드백 AI 초고 생성 실패:', err.message);
    }
    return null;
  };

  // ── AI 기업 정보 조회 ─────────────────────────────────────────────
  const companyInfoCache = useRef({});
  const fetchCompanyInfoAI = async (job) => {
    const name = job.company;
    // 캐시 확인
    if (companyInfoCache.current[name]) {
      setSelectedCompanyModal(companyInfoCache.current[name]);
      return;
    }
    // 크롤링 데이터 기반 기본 정보
    const companyJobs = jobs.filter(j => j.company === name);
    const roles = [...new Set(companyJobs.map(j => j.role).filter(Boolean))].join(', ');
    const skills = [...new Set(companyJobs.flatMap(j => Array.isArray(j.reqSkills) ? j.reqSkills : []))].slice(0, 10).join(', ');
    const gameCategories = [...new Set(companyJobs.map(j => j.gameCategory).filter(Boolean))].join(', ');

    // 즉시 기본 정보 표시 (로딩 중)
    const baseInfo = {
      name,
      games: job.mainGame || gameCategories || '-',
      employees: 'AI 조회 중...',
      revenue: 'AI 조회 중...',
      benefits: 'AI 조회 중...',
      news: [`채용 공고 ${companyJobs.length}건`, `주요 직군: ${roles || '-'}`],
      aiAnalysis: `주요 요구 기술: ${skills || '-'}\n\nAI가 기업 정보를 조회하고 있습니다...`,
    };
    setSelectedCompanyModal(baseInfo);

    // Gemini로 기업 상세 정보 요청
    try {
      const { callGeminiProxy } = await import('./lib/gemini-client');
      const prompt = `한국 게임 회사 "${name}"에 대해 아래 JSON 형식으로 간결하게 답변하세요. 정확한 정보만 작성하고, 모르면 "-"로 표기하세요.
{"games":"대표 게임 타이틀 (쉼표 구분, 최대 5개)","employees":"직원 수 (예: 약 500명)","revenue":"최근 연 매출 또는 자본 규모","benefits":"주요 복리후생 (2~3개)","news":["최근 뉴스 1","최근 뉴스 2"],"aiAnalysis":"2~3문장 기업 분석 요약"}`;

      const data = await callGeminiProxy({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
      });
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const ai = JSON.parse(text);
        const enriched = {
          name,
          games: ai.games || baseInfo.games,
          employees: ai.employees || '-',
          revenue: ai.revenue || '-',
          benefits: ai.benefits || '-',
          news: [...(Array.isArray(ai.news) ? ai.news : []), `채용 공고 ${companyJobs.length}건 등록`],
          aiAnalysis: (ai.aiAnalysis || '') + `\n\n주요 요구 기술: ${skills || '-'}`,
        };
        companyInfoCache.current[name] = enriched;
        setSelectedCompanyModal(enriched);
      }
    } catch (err) {
      console.warn('AI 기업 정보 조회 실패:', err.message);
      companyInfoCache.current[name] = baseInfo;
    }
  };

  // ── 저장 기능 ───────────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState('');
  const saveProfile = async () => {
    try {
      let feedback = instructorFeedback;
      const isEmpty = !feedback.general && !feedback.resume;
      if (isEmpty && results) {
        setSaveStatus('generating');
        const draft = await generateInstructorDraft(results, userInfo);
        if (draft) feedback = draft;
      }
      const saveData = { userInfo, results, instructorFeedback: feedback, savedAt: new Date().toISOString() };
      localStorage.setItem('portfolio_bot_save', JSON.stringify(saveData));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch {
      const saveData = { userInfo, results, instructorFeedback, savedAt: new Date().toISOString() };
      localStorage.setItem('portfolio_bot_save', JSON.stringify(saveData));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };
  // 저장 데이터 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem('portfolio_bot_save');
      if (saved) {
        const { userInfo: si, results: sr, instructorFeedback: sf } = JSON.parse(saved);
        if (si) setUserInfo({ ...si, skills: Array.isArray(si.skills) ? si.skills : [] });
        if (sr) setResults(sr);
        if (sf) setInstructorFeedback(sf);
      }
    } catch {}
  }, []);

  // ── 네비게이션 ────────────────────────────────────────────────────────
  const navItems = [
    { id: 'input',           label: '정보 입력',       icon: User },
    { id: 'feedback',        label: '서류 피드백',      icon: FileText },
    { id: 'portfolio',       label: '포트폴리오',       icon: ImageIcon },
    { id: 'jobs',            label: '추천 공고',        icon: Target },
    { id: 'interview',       label: '면접 대비',        icon: MessageSquare },
    { id: 'interview-basic', label: '면접 기본 준비',   icon: Smile },
    { id: 'tech-assessment', label: '기술 과제 평가',   icon: Code2 },
    { id: 'personality-test', label: '인성검사',         icon: ClipboardList },
    { id: 'pdf-export',     label: 'PDF 출력',          icon: Download },
  ];

  const renderEmptyState = (icon, title, desc) => (
    <div className="apple-empty-state flex flex-col items-center justify-center py-24 text-center animate-in fade-in">
      <div className="bg-slate-200/50 p-6 rounded-full text-slate-400 mb-6">{icon}</div>
      <h3 className="text-2xl font-bold text-slate-700 mb-2">{title}</h3>
      <p className="text-slate-500 mb-8">{desc}</p>
      <button
        onClick={() => setActiveTab('input')}
        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-all"
      >
        정보 입력하러 가기
      </button>
    </div>
  );

  // ── 렌더링 ────────────────────────────────────────────────────────────
  return (
    <div className="apple-shell apple-app-shell flex h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 relative">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <div className="apple-sidebar apple-rail w-64 bg-slate-900 text-white flex flex-col shadow-xl z-10 shrink-0">
        {/* 로고 */}
        <div className="apple-brandbar p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="apple-brandmark bg-indigo-500 p-2 rounded-lg"><Gamepad2 size={24} className="text-white" /></div>
          <div className="apple-brandcopy">
            <h1 className="font-bold text-lg leading-tight">Portfolio Coach</h1>
            <p className="text-xs text-indigo-300">for Game Creators</p>
          </div>
        </div>

        {/* 네비 */}
        <nav className="apple-nav flex-1 py-6 overflow-y-auto">
          <ul className="apple-nav-list space-y-2 px-4">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`apple-nav-button w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${activeTab === item.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                  <item.icon size={20} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {activeTab === item.id && <ChevronRight size={16} className="ml-auto opacity-70" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* 설정 버튼 */}
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowSettings(true)}
            className="apple-nav-button apple-settings-button w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200"
          >
            <Settings size={20} />
            <span className="font-medium text-sm">설정</span>
            {crawlStatus.running && (
              <Loader2 size={16} className="ml-auto animate-spin text-indigo-400" />
            )}
          </button>
        </div>

        {/* AI 모델 선택 위젯 */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setShowModelSettings(true)}
            className="apple-nav-button apple-settings-button w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all duration-200"
          >
            <Sparkles size={20} />
            <div className="min-w-0 text-left">
              <div className="font-medium text-sm">AI 모델 설정</div>
              <div className="text-[11px] text-slate-500 truncate">
                {currentProvider?.label || '모델 선택'} {selectedModelId ? `· ${selectedModelId}` : ''}
              </div>
            </div>
            <ChevronRight size={16} className="ml-auto opacity-70" />
          </button>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="apple-main apple-workspace flex-1 overflow-auto bg-slate-50 p-8 custom-scrollbar">
        <div className="apple-stage max-w-5xl mx-auto pb-20">

          {/* 에러 / 정보 메시지 */}
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

          {/* ── TAB 1: 정보 입력 ───────────────────────────────────── */}
          {activeTab === 'input' && (
            <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="apple-intro">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">분석 프로필 & 서류 입력</h2>
                <p className="text-slate-500">정확한 매칭과 피드백을 위해 정보를 입력하고 관련 서류를 첨부해 주세요.</p>
              </div>

              {/* 프로필 */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><User size={20} className="text-indigo-500" /> 내 프로필 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">지원자 이름</label>
                    <input type="text" name="name" value={userInfo.name} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="양윤석" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">희망 직무</label>
                    <select name="role" value={userInfo.role} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">총 경력 (년)</label>
                    <input type="number" name="experience" min="0" max="30" value={userInfo.experience} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                {/* 스킬 입력 */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">보유 기술 및 숙련도</label>
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <select
                      value={skillInput.category}
                      onChange={(e) => setSkillInput({ category: e.target.value, name: SKILL_CATEGORIES[e.target.value][0], level: '중' })}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm"
                    >
                      {Object.keys(SKILL_CATEGORIES).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <select
                      value={skillInput.name}
                      onChange={(e) => setSkillInput((prev) => ({ ...prev, name: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm"
                    >
                      {SKILL_CATEGORIES[skillInput.category].map((skill) => <option key={skill} value={skill}>{skill}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <select
                        value={skillInput.level}
                        onChange={(e) => setSkillInput((prev) => ({ ...prev, level: e.target.value }))}
                        className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm font-bold text-center"
                      >
                        <option value="상">상</option>
                        <option value="중">중</option>
                        <option value="하">하</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg flex items-center gap-1 text-sm font-semibold transition-colors shrink-0"
                      >
                        <Plus className="w-4 h-4" /> 추가
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 min-h-[44px] p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {userInfo.skills.length === 0
                      ? <span className="text-sm text-slate-400 my-auto">추가된 기술이 없습니다.</span>
                      : userInfo.skills.map((skill, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-white border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-sm shadow-sm">
                            <span className="font-semibold">{skill.name}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${skill.level === '상' ? 'bg-emerald-100 text-emerald-700' : skill.level === '중' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{skill.level}</span>
                            <button onClick={() => handleRemoveSkill(skill.name)} className="text-indigo-300 hover:text-red-500 ml-0.5"><X className="w-4 h-4" /></button>
                          </div>
                        ))}
                  </div>
                </div>
              </div>

              {/* 파일 업로드 */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <UploadCloud size={20} className="text-emerald-500" /> 서류 첨부
                  <span className="text-slate-400 font-normal text-sm ml-1">(선택)</span>
                </h3>
                {currentProvider && !currentProvider.supportsFiles && (
                  <p className="text-amber-600 text-xs mb-4 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                    ※ PDF 파일 분석은 <strong>Gemini</strong> 제공자에서만 지원됩니다. 다른 제공자는 프로필 정보만으로 분석합니다.
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`border border-slate-200 rounded-xl p-4 ${currentProvider && !currentProvider.supportsFiles ? 'opacity-50 pointer-events-none' : ''}`}>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">이력서 (PDF)</label>
                    <input type="file" accept=".pdf" onChange={(e) => { if (e.target.files[0]) setResumeFile(e.target.files[0]); }} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    {resumeFile && (
                      <div className="mt-2 text-xs text-slate-600 bg-slate-100 p-2 rounded flex justify-between">
                        <span className="truncate">{resumeFile.name}</span>
                        <button onClick={() => setResumeFile(null)}><Trash2 size={14} className="text-red-500" /></button>
                      </div>
                    )}
                  </div>
                  <div className={`border border-slate-200 rounded-xl p-4 ${currentProvider && !currentProvider.supportsFiles ? 'opacity-50 pointer-events-none' : ''}`}>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">자기소개서 (PDF)</label>
                    <input type="file" accept=".pdf" onChange={(e) => { if (e.target.files[0]) setCoverLetterFile(e.target.files[0]); }} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
                    {coverLetterFile && (
                      <div className="mt-2 text-xs text-slate-600 bg-slate-100 p-2 rounded flex justify-between">
                        <span className="truncate">{coverLetterFile.name}</span>
                        <button onClick={() => setCoverLetterFile(null)}><Trash2 size={14} className="text-red-500" /></button>
                      </div>
                    )}
                  </div>
                  <div className={`border border-slate-200 rounded-xl p-4 md:col-span-2 ${currentProvider && !currentProvider.supportsFiles ? 'opacity-50 pointer-events-none' : ''}`}>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">
                      <span>포트폴리오 (PDF 다중)</span>
                      <span className={`text-xs font-normal ${portfolioFiles.length >= 8 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                        {portfolioFiles.length} / 8
                      </span>
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      multiple
                      disabled={portfolioFiles.length >= 8}
                      onChange={handlePortfolioChange}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    {portfolioFiles.length >= 8 && (
                      <p className="mt-1 text-xs text-red-500">최대 8개까지 업로드할 수 있습니다. (각 10MB 이하)</p>
                    )}
                    {portfolioFiles.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {portfolioFiles.map((f, idx) => (
                          <div key={idx} className="text-xs text-slate-600 bg-slate-100 p-2 rounded flex justify-between items-center">
                            <span className="truncate flex-1">{f.name}</span>
                            <button onClick={() => setPortfolioFiles((prev) => prev.filter((_, i) => i !== idx))} className="ml-2"><Trash2 size={14} className="text-red-500" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 우선 공고 지정 (1~3순위) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <Pin size={20} className="text-rose-500" /> 우선 공고 지정
                  <span className="text-slate-400 font-normal text-sm ml-1">(선택)</span>
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  GameJob 공고 번호(GI_No)를 입력하면 해당 공고가 1~3순위에 고정됩니다.
                  기존 데이터에 없는 공고는 자동으로 크롤링합니다.
                  <span className="text-slate-400 ml-1">(예: 258667 또는 URL 전체 붙여넣기 가능)</span>
                </p>
                <div className="space-y-3">
                  {pinnedSlots.map((slot) => (
                    <div key={slot.rank} className="flex items-start gap-3">
                      {/* 순위 뱃지 */}
                      <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        slot.rank === 1 ? 'bg-sky-100 text-sky-700 border border-sky-200' :
                        slot.rank === 2 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                          'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {slot.rank}
                      </span>

                      {/* 입력 + 조회 버튼 */}
                      <div className="flex-1">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={slot.giNo}
                              onChange={(e) => handlePinnedGiNoChange(slot.rank, e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') resolvePinnedJob(slot.rank); }}
                              placeholder="공고 번호 (예: 258667)"
                              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              disabled={slot.status === 'loading'}
                            />
                          </div>
                          <button
                            onClick={() => resolvePinnedJob(slot.rank)}
                            disabled={!slot.giNo.trim() || slot.status === 'loading'}
                            className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {slot.status === 'loading'
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Search size={14} />}
                            조회
                          </button>
                          {slot.status === 'resolved' && (
                            <button
                              onClick={() => clearPinnedSlot(slot.rank)}
                              className="px-2 py-2 text-slate-400 hover:text-red-500 transition-colors"
                              title="초기화"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        {/* 상태 표시 */}
                        {slot.status === 'loading' && (
                          <p className="mt-1.5 text-xs text-indigo-500 flex items-center gap-1">
                            <Loader2 size={12} className="animate-spin" />
                            공고 조회 중... (없으면 자동 크롤링)
                          </p>
                        )}
                        {slot.status === 'error' && (
                          <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle size={12} /> {slot.error}
                          </p>
                        )}
                        {slot.status === 'resolved' && slot.job && (
                          <div className="mt-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                              <span className="font-bold text-slate-700">{slot.job.company}</span>
                              <span className="text-slate-500">—</span>
                              <span className="text-slate-600 truncate">{slot.job.title}</span>
                              {slot.job.url && (
                                <a href={slot.job.url} target="_blank" rel="noopener noreferrer"
                                   className="text-indigo-500 hover:text-indigo-700 flex-shrink-0">
                                  <ExternalLink size={11} />
                                </a>
                              )}
                            </div>
                            <div className="flex gap-1.5 mt-1 flex-wrap">
                              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px]">{slot.job.role}</span>
                              {slot.job.reqSkills?.slice(0, 4).map((sk, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px]">{sk}</span>
                              ))}
                              {(slot.job.reqSkills?.length || 0) > 4 && (
                                <span className="px-1.5 py-0.5 text-slate-400 text-[10px]">+{slot.job.reqSkills.length - 4}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 강사 피드백 */}
              <InstructorFeedbackForm value={instructorFeedback} onChange={setInstructorFeedback} />

              {/* 분석 버튼 */}
              <button
                onClick={analyzeApplication}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {loading
                  ? <><Loader2 size={20} className="animate-spin" /> AI 분석 진행 중 ({currentProvider?.label || 'Gemini'})...</>
                  : <><Target size={20} /> AI 분석 시작 및 저장</>}
              </button>
            </div>
          )}

          {/* ── TAB 2: 서류 피드백 ─────────────────────────────────── */}
          {activeTab === 'feedback' && (
            results ? (
              <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="apple-intro">
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">서류 분석 피드백</h2>
                  <p className="text-slate-500">결론 중심의 두괄식/개조식 피드백입니다.</p>
                </div>

                {/* ① 공통 피드백 — 이력서(좌) / 자소서(우) 2열 */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* 이력서 */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <FileText size={20} className="text-blue-500" /> 이력서 피드백
                    </h3>
                    <ul className="space-y-4">
                      {Array.isArray(results.resumeImprovements) && results.resumeImprovements.length > 0
                        ? results.resumeImprovements.map((item, idx) => {
                            const { title, body } = parseFeedbackItem(item);
                            return (
                              <li key={idx} className="flex items-start gap-2 text-slate-700 text-sm leading-relaxed">
                                <CheckCircle size={18} className="text-blue-500 mt-0.5 shrink-0" />
                                <div>
                                  {title && <p className="font-semibold text-slate-800 mb-0.5">{title}</p>}
                                  {body && <p className="text-slate-600">{body}</p>}
                                </div>
                              </li>
                            );
                          })
                        : <li className="text-slate-400 text-sm">관련 내용이 없습니다.</li>}
                    </ul>
                  </div>

                  {/* 자소서 공통 */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Briefcase size={20} className="text-purple-500" /> 자기소개서 피드백
                    </h3>
                    <ul className="space-y-4">
                      {(() => {
                        const items = results.coverLetterImprovements?.common
                          ?? (Array.isArray(results.coverLetterImprovements) ? results.coverLetterImprovements : []);
                        return items.length > 0
                          ? items.map((item, idx) => {
                              const { title, body } = parseFeedbackItem(item);
                              return (
                                <li key={idx} className="flex items-start gap-2 text-slate-700 text-sm leading-relaxed">
                                  <CheckCircle size={18} className="text-purple-500 mt-0.5 shrink-0" />
                                  <div>
                                    {title && <p className="font-semibold text-slate-800 mb-0.5">{title}</p>}
                                    {body && <p className="text-slate-600">{body}</p>}
                                  </div>
                                </li>
                              );
                            })
                          : <li className="text-slate-400 text-sm">관련 내용이 없습니다.</li>;
                      })()}
                    </ul>
                  </div>
                </div>

                {/* ② 공고별 맞춤 분석 — 우선 공고 지정 시에만 표시 */}
                {results.coverLetterImprovements && !Array.isArray(results.coverLetterImprovements) && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                      <Target size={18} className="text-indigo-500" /> 공고별 맞춤 분석
                    </h3>
                    {!pinnedSlots.some(s => s.status === 'resolved' && s.job) ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                        <p className="text-amber-700 text-sm font-bold mb-2">우선 공고를 지정하면 맞춤 분석이 제공됩니다</p>
                        <p className="text-amber-600 text-xs">정보 입력 탭 하단의 &quot;우선 공고 지정&quot;에서 GameJob 공고 번호를 입력해주세요.</p>
                      </div>
                    ) : null}
                    {pinnedSlots.some(s => s.status === 'resolved' && s.job) && (() => {
                      const seen = new Set();
                      return [
                        { key: 'rank1', rankLabel: '1순위', border: 'border-sky-200', bg: 'bg-sky-50', badge: 'bg-sky-100 text-sky-700', icon: 'text-sky-500' },
                        { key: 'rank2', rankLabel: '2순위', border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-500' },
                        { key: 'rank3', rankLabel: '3순위', border: 'border-amber-200', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-500' },
                      ].filter(({ key }) => {
                        const company = recommendedJobs[parseInt(key.replace('rank','')) - 1]?.company;
                        if (!company || seen.has(company)) return false;
                        seen.add(company);
                        return true;
                      });
                    })().map(({ key, rankLabel, border, bg, badge, icon }) => {
                      const items = results.coverLetterImprovements?.[key] ?? [];
                      const jobName = recommendedJobs[parseInt(key.replace('rank','')) - 1]?.company ?? `${rankLabel} 공고`;
                      return (
                        <div key={key} className={`bg-white rounded-2xl shadow-sm border ${border} overflow-hidden`}>
                          <div className={`${bg} px-6 py-3 flex items-center gap-3 border-b ${border}`}>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge}`}>{rankLabel}</span>
                            <span className="font-bold text-slate-700 text-sm">{jobName}</span>
                          </div>
                          <ul className="divide-y divide-slate-50">
                            {items.length > 0
                              ? items.slice(0, 2).map((item, idx) => {
                                  const { title, body } = parseFeedbackItem(item);
                                  return (
                                    <li key={idx} className="flex items-start gap-3 px-6 py-4 text-sm leading-relaxed">
                                      <CheckCircle size={16} className={`${icon} mt-0.5 shrink-0`} />
                                      <div>
                                        {title && <p className="font-semibold text-slate-800 mb-0.5">{title}</p>}
                                        {body && <p className="text-slate-600">{body}</p>}
                                      </div>
                                    </li>
                                  );
                                })
                              : <li className="px-6 py-4 text-slate-400 text-sm">내용이 없습니다.</li>}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : renderEmptyState(<FileText size={48} />, '서류 피드백 결과가 없습니다', '정보를 입력하고 AI 분석을 진행해주세요.')
          )}

          {/* ── TAB 3: 포트폴리오 ─────────────────────────────────── */}
          {activeTab === 'portfolio' && (
            results ? (
              <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="apple-intro">
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">포트폴리오 가이드</h2>
                  <p className="text-slate-500">포트폴리오 합격률을 높이는 핵심 가이드입니다.</p>
                </div>
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                  <ul className="space-y-5">
                    {Array.isArray(results.portfolioImprovements) && results.portfolioImprovements.length > 0
                      ? results.portfolioImprovements.map((item, idx) => {
                          const { title, body } = parseFeedbackItem(item);
                          const pfName = portfolioFiles[idx]?.name;
                          return (
                            <li key={idx} className="flex items-start gap-3 bg-slate-50 p-5 rounded-xl text-sm leading-relaxed">
                              <div className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{idx + 1}</div>
                              <div className="flex-1">
                                {pfName && !title?.includes(pfName) && (
                                  <p className="text-xs text-indigo-500 font-bold mb-1 flex items-center gap-1"><FileText size={12} /> {pfName}</p>
                                )}
                                {title && <p className="font-semibold text-slate-800 mb-0.5">{title}</p>}
                                {body && <p className="text-slate-600">{body}</p>}
                              </div>
                            </li>
                          );
                        })
                      : <li className="text-slate-400">포트폴리오 내용이 없습니다.</li>}
                  </ul>
                </div>
              </div>
            ) : renderEmptyState(<ImageIcon size={48} />, '포트폴리오 가이드가 없습니다', '정보를 입력하고 AI 분석을 진행해주세요.')
          )}

          {/* ── TAB 4: 추천 공고 ───────────────────────────────────── */}
          {activeTab === 'jobs' && (
            recommendedJobs.length > 0 ? (
              <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="apple-intro">
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">추천 공고 리스트</h2>
                  <p className="text-slate-500 mb-4">입력하신 보유 역량에 적합한 공고 순위입니다.</p>
                  {/* 점수 구간 필터 */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: '전체', color: 'bg-slate-100 text-slate-700' },
                      { key: '90+', label: '90점↑', color: 'bg-emerald-100 text-emerald-700' },
                      { key: '80+', label: '80점↑', color: 'bg-green-100 text-green-700' },
                      { key: '70+', label: '70점↑', color: 'bg-blue-100 text-blue-700' },
                      { key: '60+', label: '60점↑', color: 'bg-amber-100 text-amber-700' },
                      { key: '60-', label: '60점↓', color: 'bg-red-100 text-red-700' },
                    ].map(f => (
                      <button key={f.key} onClick={() => { setScoreFilter(f.key); setVisibleJobs(10); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${scoreFilter === f.key ? f.color + ' border-current shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}>
                        {f.label}
                        <span className="ml-1 opacity-60">
                          ({f.key === 'all' ? recommendedJobs.length
                            : f.key === '60-' ? recommendedJobs.filter(j => j.score < 60).length
                            : recommendedJobs.filter(j => j.score >= parseInt(f.key)).length})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4">
                  {recommendedJobs
                    .filter(j => scoreFilter === 'all' ? true : scoreFilter === '60-' ? j.score < 60 : j.score >= parseInt(scoreFilter))
                    .slice(0, visibleJobs).map((job, idx) => (
                    <div key={job.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:shadow-md hover:border-indigo-200">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md border border-slate-200">{job.company}</span>
                          {idx === 0 && !job.pinned && <span className="text-xs font-bold px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200 flex items-center gap-1"><Star size={12} className="fill-current" /> Best Match</span>}
                          {job.pinned && <span className="text-xs font-bold px-2.5 py-1 bg-rose-100 text-rose-700 rounded-md border border-rose-200 flex items-center gap-1"><Pin size={12} /> {job.pinnedRank}순위 지정</span>}
                        </div>
                        <h4 className="font-bold text-slate-800 text-xl mb-1">{job.title}</h4>
                        <p className="text-sm text-slate-500 mb-3">{job.role} · 경력 {job.reqExp === 0 ? '신입' : `${job.reqExp}년 이상`}</p>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(job.reqSkills) ? job.reqSkills : []).map((skill) => (
                            <span key={skill} className="text-xs font-medium bg-slate-50 border border-slate-200 px-2 py-1 rounded-md text-slate-600"># {skill}</span>
                          ))}
                        </div>
                        {/* 매칭 상세 분석 */}
                        {job.matchDetail && (
                          <div className="mt-3 bg-slate-50 rounded-lg border border-slate-100 p-3">
                            <div className="grid grid-cols-5 gap-1 text-center mb-2">
                              {[
                                { label: '직군', score: job.matchDetail.roleScore, max: 15, color: 'bg-blue-500', tip: '희망 직무와 공고 직군이 일치하면 15점' },
                                { label: '경력', score: job.matchDetail.expScore, max: 15, color: 'bg-green-500', tip: '요구 경력과 보유 경력 차이: 동일=15, 1년차이=10, 2년차이=5' },
                                { label: '스킬', score: job.matchDetail.skillScore, max: 30, color: 'bg-purple-500', tip: '매칭된 스킬의 숙련도 가중합 (上×1.5, 中×1.0, 下×0.4)' },
                                { label: '정합도', score: job.matchDetail.fitScore, max: 25, color: 'bg-orange-500', tip: '스킬 커버리지 × 평균 숙련도 — 많이 & 높게 매칭될수록 높음' },
                                { label: '복수매칭', score: job.matchDetail.multiScore, max: 15, color: 'bg-pink-500', tip: '2개 매칭=+5, 3개=+10, 4개 이상=+15' },
                              ].map(item => (
                                <div key={item.label} title={item.tip} className="cursor-help">
                                  <div className="text-[10px] text-slate-500 mb-1">{item.label}</div>
                                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.max > 0 ? (item.score / item.max) * 100 : 0}%` }} />
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-600 mt-0.5">{item.score}/{item.max}</div>
                                </div>
                              ))}
                            </div>
                            {job.matchDetail.matchedSkills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {job.matchDetail.matchedSkills.map((s, i) => (
                                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">{s.name} ({s.level})</span>
                                ))}
                                {job.matchDetail.unmatchedSkills.map((s, i) => (
                                  <span key={'u'+i} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-400 line-through">{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="mt-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 flex items-center gap-2 overflow-hidden">
                          <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap shrink-0">직접 링크:</span>
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-500 hover:text-indigo-700 truncate underline underline-offset-2" title={job.url}>{job.url}</a>
                        </div>
                      </div>
                      <div className="flex flex-col items-center shrink-0 min-w-[130px] gap-2">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 w-full flex flex-col items-center">
                          <div className="text-3xl font-black text-slate-800 mb-1 tracking-tight">{job.score}<span className="text-sm font-medium text-slate-400"> / 100</span></div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full ${job.score >= 80 ? 'bg-emerald-500' : job.score >= 60 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${job.score}%` }} />
                          </div>
                        </div>
                        <div className="w-full flex flex-col gap-1.5">
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-sm">
                            공고 바로가기 <ExternalLink size={12} />
                          </a>
                          {job.companyInfo ? (
                            <button onClick={() => setSelectedCompanyModal(job.companyInfo)} className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-lg transition-colors border border-slate-200">
                              회사 정보 보기 <Building2 size={12} />
                            </button>
                          ) : (
                            <button onClick={() => fetchCompanyInfoAI(job)} className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-lg transition-colors border border-slate-200">
                              회사 정보 보기 <Building2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {(() => {
                  const filtered = recommendedJobs.filter(j => scoreFilter === 'all' ? true : scoreFilter === '60-' ? j.score < 60 : j.score >= parseInt(scoreFilter));
                  return visibleJobs < filtered.length ? (
                    <div className="flex justify-center pt-4">
                      <button onClick={() => setVisibleJobs(prev => prev + 10)} className="bg-white border border-slate-200 text-slate-600 font-bold py-3 px-8 rounded-full shadow-sm hover:bg-slate-50 transition-colors">
                        더보기 ({Math.min(visibleJobs, filtered.length)} / {filtered.length})
                      </button>
                    </div>
                  ) : null;
                })()}
              </div>
            ) : renderEmptyState(<Target size={48} />, '추천 공고 결과가 없습니다', '정보를 입력하고 AI 분석을 진행해주세요.')
          )}

          {/* ── TAB 5: 면접 대비 ───────────────────────────────────── */}
          {activeTab === 'interview' && (
            results?.interviewPreps?.length > 0 ? (
              <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="apple-intro">
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">예상 면접 질문 & 가이드</h2>
                  <p className="text-slate-500">1~3순위 추천 공고별 인재상과 과제 유형을 반영한 두괄식 면접 대비 가이드입니다.</p>
                </div>
                <div className="flex bg-slate-200 p-1 rounded-xl w-full">
                  {(Array.isArray(results.interviewPreps) ? results.interviewPreps : []).map((prep, idx) => (
                    <button key={idx} onClick={() => setActiveInterviewTab(idx)} className={`flex-1 py-2 px-4 text-sm font-bold rounded-lg transition-colors ${activeInterviewTab === idx ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {prep.rank}순위: {prep.company.split(' ')[0]}
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  {Array.isArray(results.interviewPreps) && results.interviewPreps[activeInterviewTab] && (
                    <>
                      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 shadow-sm mb-6">
                        <h3 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2"><Target size={20} className="text-indigo-500" /> 인재상 및 어필 전략</h3>
                        <p className="text-indigo-800 text-sm whitespace-pre-line leading-relaxed mb-4">{results.interviewPreps[activeInterviewTab].idealCandidateReflected}</p>
                        {results.interviewPreps[activeInterviewTab].assignmentGuide && (
                          <div className="mt-4 pt-4 border-t border-indigo-200/60">
                            <h4 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><FileText size={16} className="text-slate-500" /> 과제 대비 가이드</h4>
                            <p className="text-slate-700 text-sm whitespace-pre-line leading-relaxed">{results.interviewPreps[activeInterviewTab].assignmentGuide}</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-4">
                        {(Array.isArray(results.interviewPreps?.[activeInterviewTab]?.questions) ? results.interviewPreps[activeInterviewTab].questions : []).map((item, qIdx) => (
                          <div key={qIdx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                            <div className="flex gap-4">
                              <div className="bg-indigo-100 w-10 h-10 rounded-full flex items-center justify-center text-indigo-700 font-bold shrink-0 mt-1">Q{qIdx + 1}</div>
                              <div className="space-y-4 flex-1">
                                <h3 className="text-xl font-bold text-slate-800 leading-tight whitespace-pre-line">{item.question}</h3>
                                <div className="grid md:grid-cols-2 gap-4 mt-4">
                                  <div className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                                    <div className="flex items-center gap-2 text-red-700 font-bold mb-2"><XCircle size={18} /> 피해야 할 답변</div>
                                    <p className="text-sm text-red-900/80 whitespace-pre-line leading-relaxed">{item.avoid}</p>
                                  </div>
                                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                                    <div className="flex items-center gap-2 text-emerald-700 font-bold mb-2"><CheckCircle size={18} /> 권장하는 두괄식 답변</div>
                                    <p className="text-sm text-emerald-900/80 whitespace-pre-line leading-relaxed">{item.recommend}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-slate-100 border-l-4 border-slate-400 p-4 rounded-r-lg text-sm text-slate-600 mt-6 leading-relaxed">
                        <strong>※ 면접 답변 기법 안내</strong><br />
                        <strong className="text-indigo-600">STAR 기법</strong>: 상황(<strong>S</strong>ituation), 과제(<strong>T</strong>ask), 행동(<strong>A</strong>ction), 결과(<strong>R</strong>esult)의 구조로 경험을 구체적으로 증명하는 면접 표준 답변 방식입니다.<br />
                        <strong className="text-indigo-600">두괄식 답변(BLUF)</strong>: 결론(Bottom Line Up Front)을 가장 첫 문장에 배치하여 면접관의 집중도를 높이는 방식입니다.
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : renderEmptyState(<MessageSquare size={48} />, '면접 예상 질문이 없습니다', '정보를 입력하고 AI 분석을 진행해주세요.')
          )}

          {/* ── TAB 6: 면접 기본 준비 (서버 데이터 기반) ─────────────── */}
          {activeTab === 'interview-basic' && (
            <div className="apple-view studio-readiness-view animate-in fade-in slide-in-from-bottom-4">
              <section className="studio-readiness-hero">
                <div className="studio-readiness-copy">
                  <p className="studio-eyebrow">Interview Readiness</p>
                  <h2>면접장에 들어가기 전, 이미 평가가 시작됩니다.</h2>
                  <p>
                    게임 회사 면접에서 바로 체감되는 복장, 시간, 태도, 마인드셋을
                    한 화면에 정리했습니다. 답변 실력만큼 중요한 건 들어오기 전의 인상과
                    흐름입니다.
                  </p>
                </div>
                <div className="studio-readiness-summary">
                  <div className="studio-readiness-stat">
                    <span>4 Areas</span>
                    <strong>복장 · 시간 · 태도 · 집중</strong>
                  </div>
                  <div className="studio-readiness-stat">
                    <span>15 Min Before</span>
                    <strong>도착 · 장비 · 첫 문장 점검</strong>
                  </div>
                  <p>
                    작은 신호가 전체 분위기를 결정합니다. 시선 처리, 첫 인사, 준비된
                    호흡까지 같이 챙겨두면 답변의 설득력도 훨씬 안정적으로 전달됩니다.
                  </p>
                </div>
              </section>

              <section className="studio-readiness-layout">
                <aside className="studio-readiness-aside">
                  <div className="studio-readiness-note">
                    <p className="studio-eyebrow">Quick Reset</p>
                    <h3>면접 직전 3분 체크</h3>
                    <ul>
                      {INTERVIEW_QUICK_CHECKS.map((item) => (
                        <li key={item}>
                          <CheckCircle size={16} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="studio-readiness-note studio-readiness-note-muted">
                    <p className="studio-eyebrow">Small Signal</p>
                    <p>
                      답변을 잘해도 처음 30초가 정리되지 않으면 인상이 흐려집니다.
                      반대로 준비된 태도는 아직 말하지 않은 역량까지 정돈되어 보이게 만듭니다.
                    </p>
                  </div>
                </aside>

                <div className="studio-readiness-flow">
                  {interviewBasicData.map(({ icon: iconName, color, title, items }, index) => {
                    const Icon = ICON_MAP[iconName] || Smile;
                    const theme = INTERVIEW_THEME_MAP[color] || INTERVIEW_THEME_MAP.blue;

                    return (
                      <article
                        key={title}
                        className="studio-readiness-section"
                        style={{
                          '--studio-accent': theme.accent,
                          '--studio-soft': theme.soft,
                          '--studio-border': theme.border,
                        }}
                      >
                        <div className="studio-readiness-section-head">
                          <span className="studio-readiness-index">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div
                            className="studio-readiness-icon"
                            style={{ background: theme.soft, color: theme.accent }}
                          >
                            <Icon size={22} />
                          </div>
                          <div className="studio-readiness-heading">
                            <p className="studio-readiness-kicker">{theme.kicker}</p>
                            <h3>{title}</h3>
                          </div>
                        </div>

                        <div className="studio-readiness-points">
                          {items.map((item) => (
                            <div key={item.label} className="studio-readiness-point">
                              <p className="studio-readiness-point-label">{item.label}</p>
                              <p className="studio-readiness-point-desc">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* ── TAB 7: 과제 평가 연습 ─────────────────────────────── */}
          {activeTab === 'assignment-test' && <AssignmentTest />}

          {/* ── TAB 8: 기술 과제 평가 ─────────────────────────────── */}
          {activeTab === 'tech-assessment' && <TechAssessment />}

          {/* ── TAB 9: 인성검사 (탭 전환 시 상태 유지를 위해 항상 마운트, display로 토글) ── */}
          <div style={{ display: activeTab === 'personality-test' ? 'block' : 'none' }}>
            <PersonalityTest
              selectedProvider={selectedProvider}
              selectedModelId={selectedModelId}
            />
          </div>

          {/* ── TAB: PDF 출력 ─────────────────────────────────────── */}
          {activeTab === 'pdf-export' && (
            <PdfExport
              results={results}
              userInfo={userInfo}
              recommendedJobs={recommendedJobs}
              instructorFeedback={instructorFeedback}
            />
          )}
        </div>
      </div>

      {/* ── 회사 정보 모달 ──────────────────────────────────────────── */}
      {selectedCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setSelectedCompanyModal(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in slide-in-from-bottom-8 custom-scrollbar" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedCompanyModal(null)} className="absolute top-5 right-5 p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors">
              <X size={20} />
            </button>
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-6">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white"><Building2 size={28} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{selectedCompanyModal.name}</h2>
                  <p className="text-indigo-600 font-bold text-sm">기업 상세 정보 및 AI 분석</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {[
                  { icon: Gamepad2, label: '대표작', value: selectedCompanyModal.games },
                  { icon: Users,    label: '인력 규모', value: selectedCompanyModal.employees },
                  { icon: Coins,    label: '매출/자본 규모', value: selectedCompanyModal.revenue },
                  { icon: Gift,     label: '주요 사내 복지', value: selectedCompanyModal.benefits },
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
                    {selectedCompanyModal.news?.map((n, i) => (
                      <li key={i} className="flex gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <span>{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2 border-l-4 border-purple-500 pl-3">AI 기업 요약 분석</h3>
                  <div className="bg-purple-50/50 p-4 rounded-xl text-slate-700 text-sm leading-relaxed border border-purple-100">
                    <p className="font-bold text-purple-900 mb-1">핵심 분석</p>
                    {selectedCompanyModal.aiAnalysis}
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <button onClick={() => setSelectedCompanyModal(null)} className="bg-slate-800 text-white font-bold py-3 px-10 rounded-xl shadow-md hover:bg-slate-900 transition-colors">닫기</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 설정 모달 ─────────────────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg"><Settings size={20} className="text-indigo-600" /></div>
                <h2 className="text-xl font-bold text-slate-800">설정</h2>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* 데이터 상태 */}
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Database size={18} className="text-slate-500" />
                  <h3 className="font-semibold text-slate-700">공고 데이터</h3>
                </div>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>현재 로드된 공고: <span className="font-bold text-indigo-600">{jobs.length}건</span></p>
                  <p>데이터 소스: <span className="font-medium">GameJob</span></p>
                </div>
              </div>

              {/* 크롤링 실행 */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={18} className="text-indigo-500" />
                  <h3 className="font-semibold text-slate-700">공고 데이터 최신화</h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  GameJob에서 최신 공고를 크롤링하여 데이터를 갱신합니다.
                </p>

                {/* 직종 태그 선택 */}
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Briefcase size={12} /> 직종
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CRAWL_JOB_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleCrawlTag(tag, crawlJobTags, setCrawlJobTags)}
                        disabled={crawlStatus.running}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          crawlJobTags.includes(tag)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                        } ${crawlStatus.running ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 경력 태그 선택 */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Users size={12} /> 경력
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CRAWL_CAREER_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleCrawlTag(tag, crawlCareerTags, setCrawlCareerTags)}
                        disabled={crawlStatus.running}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                          crawlCareerTags.includes(tag)
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:text-purple-600'
                        } ${crawlStatus.running ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 선택된 조건 요약 */}
                {(crawlJobTags.length > 0 || crawlCareerTags.length > 0) && (
                  <p className="text-[11px] text-slate-500 mb-3">
                    검색 조건: <span className="font-medium text-indigo-600">[{[...crawlJobTags, ...crawlCareerTags].join(', ')}]</span>
                  </p>
                )}

                {/* 진행 바 */}
                {crawlStatus.running && (
                  <div className="mb-4 space-y-2">
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${crawlStatus.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-2">
                      <Loader2 size={12} className="animate-spin" />
                      {crawlStatus.message}
                    </p>
                  </div>
                )}

                {/* 완료 메시지 */}
                {!crawlStatus.running && crawlStatus.message && crawlStatus.percent === 100 && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500 shrink-0" />
                    <p className="text-xs text-green-700">{crawlStatus.message}</p>
                  </div>
                )}

                {/* 오류 메시지 */}
                {!crawlStatus.running && crawlStatus.isError && crawlStatus.message && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-red-700 font-semibold mb-1">크롤링 오류</p>
                        <p className="text-xs text-red-600 break-all">{crawlStatus.message}</p>
                        {crawlStatus.message.includes('Chrome') && (
                          <a
                            href="https://www.google.com/chrome"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-indigo-600 underline mt-2 block"
                          >
                            Chrome 다운로드 →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 로그 (크롤링 중일 때) */}
                {crawlStatus.running && crawlStatus.log.length > 0 && (
                  <div className="mb-4 bg-slate-900 rounded-lg p-3 max-h-32 overflow-y-auto text-xs font-mono">
                    {crawlStatus.log.map((line, i) => (
                      <div key={i} className="text-slate-300 leading-relaxed">{line}</div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {!crawlStatus.running ? (
                    <button
                      onClick={startCrawl}
                      disabled={crawlJobTags.length === 0 && crawlCareerTags.length === 0}
                      className={`flex-1 flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-xl transition-colors shadow-md ${
                        crawlJobTags.length === 0 && crawlCareerTags.length === 0
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      <RefreshCw size={18} />
                      크롤링 시작
                    </button>
                  ) : (
                    <button
                      onClick={stopCrawl}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white font-semibold py-3 px-4 rounded-xl hover:bg-red-600 transition-colors shadow-md"
                    >
                      <XCircle size={18} />
                      중단
                    </button>
                  )}
                </div>

                {/* 태그 미선택 경고 */}
                {crawlJobTags.length === 0 && crawlCareerTags.length === 0 && (
                  <p className="text-[10px] text-amber-500 mt-3 text-center">
                    ⚠ 직종 또는 경력 태그를 하나 이상 선택하세요.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModelSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg"><Sparkles size={20} className="text-blue-600" /></div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">AI 모델 설정</h2>
                  <p className="text-sm text-slate-500">분석에 사용할 엔진과 세부 모델을 조정합니다.</p>
                </div>
              </div>
              <button onClick={() => setShowModelSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-sky-600">Current</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {currentProvider?.label || '모델 선택'} {selectedModelId ? `· ${selectedModelId}` : ''}
                </p>
              </div>

              <ModelSelector
                enabledProviders={enabledProviders}
                disabledProviders={disabledProviders}
                selectedProvider={selectedProvider}
                selectedModelId={selectedModelId}
                onProviderChange={handleProviderChange}
                onModelChange={setSelectedModelId}
                modelsLoading={modelsLoading}
                variant="modal"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
