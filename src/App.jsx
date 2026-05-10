import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Image as ImageIcon, Target, MessageSquare,
  ChevronRight, AlertCircle, CheckCircle, XCircle, Loader2, Gamepad2,
  User, X, ExternalLink,
  Sparkles, Clock, Shirt, Smile, Brain,
  Settings, RefreshCw, Database, ClipboardList, Code2, Download, BookOpen,
} from 'lucide-react';
import {
  ROLE_GROUPS,
  getDefaultRoleDetail,
  getDefaultSkillInput,
  getProfileDisplayRole,
  getProfileMatchRoles,
  getRoleDetail,
  getSkillCategoriesForRoleGroup,
  normalizeUserProfile,
  ROLE_GUIDE_PLAYBOOK,
  ROLE_INPUT_PLAYBOOK,
  ROLE_INTERVIEW_PLAYBOOK,
  ROLE_READINESS_PLAYBOOK,
  ROLE_RESULT_PLAYBOOK,
} from './data/skills';
import { analyzeViaProxy, matchJobsViaProxy } from './lib/gemini-client';
import { analyzeGitHubPortfolio } from './lib/github-analyzer';
import { apiUrl, staticAssetUrl } from './lib/runtime-config';
import { useModels } from './hooks/useModels';
import { useWorkspacePersistence } from './hooks/useWorkspacePersistence';
import ModelSelector from './components/ModelSelector';
import TechAssessment from './components/TechAssessment';
import PersonalityTest from './components/PersonalityTest';
import PdfExport from './components/PdfExport';
import { EMPTY_INSTRUCTOR } from './components/InstructorFeedbackForm';
import WorkspaceSidebar from './components/WorkspaceSidebar';
import CompanyInfoModal from './components/CompanyInfoModal';
import FeedbackWorkspace from './components/FeedbackWorkspace';
import InputWorkspace from './components/InputWorkspace';
import JobsWorkspace from './components/JobsWorkspace';
import UserGuideModal from './components/UserGuideModal';

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

const CRAWL_STATUS_LABELS = {
  success: '성공',
  'partial-success': '부분 성공',
  failed: '실패',
  idle: '대기',
};

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
  const normalize = (value) => String(value || '')
    .toLowerCase()
    .replace(/콘텐츠/g, '컨텐츠')
    .replace(/[\/\s·_\-()]/g, '');
  const expand = (value) => {
    const normalized = normalize(value);
    const variants = [normalized];
    if (normalized.includes('시스템컨텐츠기획')) variants.push('시스템기획', '컨텐츠기획');
    if (normalized.includes('qa테스트')) variants.push('qa', '테스트', '게임테스터');
    if (normalized.includes('2d그래픽디자인')) variants.push('2d그래픽', '그래픽디자인');
    if (normalized.includes('도트아트')) variants.push('도트', '픽셀아트');
    return variants;
  };
  const userVariants = expand(userSkillName);
  const reqVariants = expand(reqSkill);
  return userVariants.some((u) => reqVariants.some((r) => r.includes(u) || u.includes(r)));
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
  const normalizedUser = normalizeUserProfile(user);
  const userMatchRoles = getProfileMatchRoles(normalizedUser);

  // ── 직군 매칭 (+15 / 대분류 일치 +10) ─────────────────────
  const jobRoles = job.roles && job.roles.length > 0 ? job.roles : [job.role];
  if (jobRoles.includes(normalizedUser.role)) d.roleScore = 15;
  else if (jobRoles.some((role) => userMatchRoles.includes(role))) d.roleScore = 10;

  // ── 경력 매칭 (+15 / +10 / +5) ───────────────────────────
  const userExp = Number(normalizedUser.experience) || 0;
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
      const matched = normalizedUser.skills.find((s) => skillMatches(s.name, req));
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
  const normalizedUser = normalizeUserProfile(user);
  return topJobs.map((job, idx) => {
    const reqSkills = Array.isArray(job.reqSkills) ? job.reqSkills : [];
    const matched = normalizedUser.skills.filter((s) =>
      reqSkills.some(
        (req) => req.toLowerCase().includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(req.toLowerCase())
      )
    );
    const topSkill = matched.length > 0 ? matched[0] : { name: reqSkills[0] || '해당 기술', level: '중' };
    const q1ByGroup = {
      기획: `[핵심 지표 검증]\n"${topSkill.name}" 역량을 바탕으로 ${normalizedUser.subRole} 업무를 맡는다면 가장 먼저 확인할 지표 3가지와 그 이유는 무엇인가요?`,
      프로그래밍: `[구현 역량 검증]\n"${topSkill.name}" 역량을 실제 게임 프로젝트에 적용할 때 구조 설계, 성능, 유지보수 측면에서 어떤 판단을 하겠습니까?`,
      아트: `[제작 역량 검증]\n"${topSkill.name}" 역량을 활용한 대표 작업물의 의도, 제작 과정, 퀄리티 기준, 엔진 적용 경험을 설명해주세요.`,
    };
    const q1 = q1ByGroup[normalizedUser.roleGroup] || `[직무 기여도]\n당사 프로젝트에서 "${topSkill.name}" 역량을 구체적으로 어떻게 활용하여 기여할 수 있는지 2가지 사례를 들어 설명해주세요.`;
    const shortNews = job.companyInfo?.news?.[0]?.split(' 및 ')[0].split(' 등 ')[0] || '최근 시장 트렌드';
    const expText = normalizedUser.experience > 0 ? `${normalizedUser.experience}년차 ` : '신입 ';
    const q2 = `[산업 인사이트]\n최근 '${shortNews}' 이슈와 관련하여, ${expText}${normalizedUser.subRole} 실무자로서 예상되는 리스크 1가지와 해결 방안을 제시해주세요.`;
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

  // 모델 로드 후 기본 모델 선택
  useEffect(() => {
    if (enabledProviders.length > 0 && !selectedModelId) {
      const defaultModel = getDefaultModel(selectedProvider);
      if (defaultModel) setSelectedModelId(defaultModel.id);
    }
  }, [enabledProviders, selectedProvider]);

  // ── 기업/공고 데이터 (서버 API에서 로드) ──────────────────────────────
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobsMetadata, setJobsMetadata] = useState({
    latestAppliedDate: null,
    referenceJobCount: 0,
    lastSuccessfulCrawlAt: null,
    lastCrawlStatus: 'idle',
    newJobsCount: 0,
    activeJobsCount: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        // 정적 JSON에서 직접 로드 (GitHub Pages + 로컬 모두 대응)
        const [compRes, jobRes, metaRes] = await Promise.all([
          fetch(staticAssetUrl('api/companies.json')),
          fetch(staticAssetUrl('api/jobs.json')),
          fetch(staticAssetUrl('api/jobs-metadata.json')).catch(() => null),
        ]);
        if (compRes.ok) setCompanies(await compRes.json());
        let loadedJobs = [];
        if (jobRes.ok) {
          loadedJobs = await jobRes.json();
          setJobs(loadedJobs);
        }
        if (metaRes?.ok) {
          setJobsMetadata(await metaRes.json());
        } else {
          const latestUpdatedAt = loadedJobs
            .map((job) => job.updatedAt)
            .filter(Boolean)
            .sort()
            .reverse()[0] || null;

          setJobsMetadata((prev) => ({
            ...prev,
            latestAppliedDate: latestUpdatedAt,
            referenceJobCount: loadedJobs.length,
            activeJobsCount: loadedJobs.length,
          }));
        }
      } catch (err) {
        console.warn('데이터 로드 실패:', err.message);
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
  const defaultRoleDetail = getDefaultRoleDetail('기획');
  const [userInfo, setUserInfo] = useState({
    name: '',
    roleGroup: '기획',
    subRole: defaultRoleDetail.label,
    role: defaultRoleDetail.matchRole,
    experience: 0,
    githubUrl: '',
    skills: [],
  });
  const [skillInput, setSkillInput] = useState(getDefaultSkillInput('기획'));

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

  // 설정 / 추천 공고
  const [showSettings, setShowSettings] = useState(false);
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [matchedJobs, setMatchedJobs] = useState([]);
  const [jobMatchState, setJobMatchState] = useState({
    running: false,
    attempted: false,
    summary: '',
    error: '',
    matchedAt: '',
  });

  // ── 헬퍼 ──────────────────────────────────────────────────────────────
  const currentProvider = enabledProviders.find((p) => p.id === selectedProvider);
  const normalizedUserInfo = normalizeUserProfile(userInfo);
  const selectedRoleGroupInfo = ROLE_GROUPS.find((group) => group.label === normalizedUserInfo.roleGroup) || ROLE_GROUPS[0];
  const selectedRoleDetail = getRoleDetail(normalizedUserInfo.roleGroup, normalizedUserInfo.subRole);
  const guidePlaybook = ROLE_GUIDE_PLAYBOOK[normalizedUserInfo.roleGroup] || ROLE_GUIDE_PLAYBOOK.기획;
  const rolePlaybook = ROLE_INPUT_PLAYBOOK[normalizedUserInfo.roleGroup] || ROLE_INPUT_PLAYBOOK.기획;
  const interviewPlaybook = ROLE_INTERVIEW_PLAYBOOK[normalizedUserInfo.roleGroup] || ROLE_INTERVIEW_PLAYBOOK.기획;
  const readinessPlaybook = ROLE_READINESS_PLAYBOOK[normalizedUserInfo.roleGroup] || ROLE_READINESS_PLAYBOOK.기획;
  const resultPlaybook = ROLE_RESULT_PLAYBOOK[normalizedUserInfo.roleGroup] || ROLE_RESULT_PLAYBOOK.기획;
  const skillCategories = getSkillCategoriesForRoleGroup(normalizedUserInfo.roleGroup);
  const selectedSkillSuggestions = (skillCategories[skillInput.category] || Object.values(skillCategories)[0] || []).slice(0, 6);
  const topRecommendedJobs = recommendedJobs.slice(0, 3);
  const highlightedMatchedSkills = [...new Set(
    topRecommendedJobs.flatMap((job) => (job.matchDetail?.matchedSkills || []).map((skill) => skill.name))
  )].slice(0, 6);
  const highlightedGapSkills = [...new Set(
    topRecommendedJobs.flatMap((job) => job.matchDetail?.unmatchedSkills || [])
  )].slice(0, 6);
  const {
    saveStatus,
    setSaveStatus,
    restoreNotice,
    setRestoreNotice,
    lastSavedAt,
    analysisHistory,
    selectedHistoryId,
    setSelectedHistoryId,
    selectedHistoryEntry,
    historyComparison,
    formatSavedAt,
    persistWorkspaceSnapshot,
    loadHistorySnapshot,
  } = useWorkspacePersistence({
    userInfo,
    results,
    recommendedJobs,
    instructorFeedback,
    loading,
    crawlRunning: false,
    setUserInfo,
    setResults,
    setRecommendedJobs,
    setInstructorFeedback,
    normalizeProfile: normalizeUserProfile,
    emptyInstructorFeedback: EMPTY_INSTRUCTOR,
    setActiveTab,
    setInfoMessage,
  });

  const handleProviderChange = (providerId) => {
    setSelectedProvider(providerId);
    const defaultModel = getDefaultModel(providerId);
    if (defaultModel) setSelectedModelId(defaultModel.id);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleGroupSelect = (roleGroup) => {
    const detail = getDefaultRoleDetail(roleGroup);
    setUserInfo((prev) => ({
      ...prev,
      roleGroup,
      subRole: detail.label,
      role: detail.matchRole,
    }));
    setSkillInput(getDefaultSkillInput(roleGroup));
  };
  const handleRoleGroupChange = (e) => {
    handleRoleGroupSelect(e.target.value);
  };

  const handleSubRoleChange = (e) => {
    const subRole = e.target.value;
    const detail = getRoleDetail(userInfo.roleGroup, subRole);
    setUserInfo((prev) => ({
      ...prev,
      subRole,
      role: detail.matchRole,
    }));
  };

  const handleAddSkill = () => {
    if (!userInfo.skills.find((s) => s.name === skillInput.name)) {
      setUserInfo((prev) => ({ ...prev, skills: [...prev.skills, { ...skillInput, roleGroup: prev.roleGroup }] }));
    }
  };
  const handleQuickAddSkill = (skillName) => {
    setSkillInput((prev) => ({ ...prev, name: skillName }));
    if (!userInfo.skills.find((s) => s.name === skillName)) {
      setUserInfo((prev) => ({
        ...prev,
        skills: [...prev.skills, { category: skillInput.category, name: skillName, level: skillInput.level, roleGroup: prev.roleGroup }],
      }));
    }
  };

  const handleRemoveSkill = (skillName) => {
    setUserInfo((prev) => ({ ...prev, skills: prev.skills.filter((s) => s.name !== skillName) }));
  };

  const buildLocalGitHubPortfolioAnalysis = (githubPortfolio) => {
    if (!githubPortfolio?.repoUrl) return null;
    const stack = githubPortfolio.stack?.length ? githubPortfolio.stack : githubPortfolio.languages || [];
    const projectHighlights = Array.isArray(githubPortfolio.projectHighlights) && githubPortfolio.projectHighlights.length > 0
      ? githubPortfolio.projectHighlights
      : [
        `${githubPortfolio.fullName} 저장소는 ${stack.slice(0, 4).join(', ') || githubPortfolio.language || '확인 필요'} 중심 프로젝트로 보입니다.`,
      ];
    const architecture = Array.isArray(githubPortfolio.architecture) && githubPortfolio.architecture.length > 0
      ? githubPortfolio.architecture
      : (githubPortfolio.rootFiles || [])
        .slice(0, 8)
        .map((file) => `${file.type === 'dir' ? '폴더' : '파일'}: ${file.path}`);
    const qualitySignals = Array.isArray(githubPortfolio.qualitySignals) && githubPortfolio.qualitySignals.length > 0
      ? githubPortfolio.qualitySignals
      : [
        githubPortfolio.readme
          ? 'README 기반 실행/설명 문서가 있어 프로젝트 소개 근거를 확보할 수 있습니다.'
          : 'README가 약하면 저장소 첫인상과 실행 안내 품질이 떨어질 수 있습니다.',
      ];
    const shippingSignals = Array.isArray(githubPortfolio.shippingSignals) && githubPortfolio.shippingSignals.length > 0
      ? githubPortfolio.shippingSignals
      : [
        githubPortfolio.workflowFiles?.length
          ? '자동화 워크플로 흔적이 있어 검증 또는 배포 경험을 설명할 수 있습니다.'
          : '자동화 워크플로가 보이지 않으면 수동 검증/배포 과정을 직접 설명해야 합니다.',
      ];
    const refactorSuggestions = Array.isArray(githubPortfolio.refactorSuggestions) && githubPortfolio.refactorSuggestions.length > 0
      ? githubPortfolio.refactorSuggestions
      : [
        '핵심 모듈 2~3개를 별도 설명 문서로 정리하면 면접 대응력이 더 좋아집니다.',
      ];
    const risks = Array.isArray(githubPortfolio.risks) && githubPortfolio.risks.length > 0
      ? githubPortfolio.risks
      : [
        githubPortfolio.readme
          ? 'README에 실행 방법, 담당 역할, 핵심 구현 근거가 충분한지 확인이 필요합니다.'
          : 'README가 없거나 읽히지 않아 프로젝트 설명력이 약해질 수 있습니다.',
        '무료 분석 모드는 public repo의 핵심 구조와 대표 설정 파일 위주로 확인하므로, 핵심 구현 파일은 면접용 설명으로 별도 보강하는 편이 좋습니다.',
      ];
    const interviewTalkingPoints = Array.isArray(githubPortfolio.interviewTalkingPoints) && githubPortfolio.interviewTalkingPoints.length > 0
      ? githubPortfolio.interviewTalkingPoints
      : [
        '이 프로젝트를 만든 문제 상황과 목표를 30초 안에 설명하세요.',
        '핵심 기능 1~2개를 골라 본인의 설계 판단, 예외 처리, 검증 방법을 말하세요.',
        '지금 다시 만든다면 바꿀 구조나 테스트/배포 개선점을 준비하세요.',
      ];
    return {
      repoUrl: githubPortfolio.repoUrl,
      fullName: githubPortfolio.fullName,
      defaultBranch: githubPortfolio.defaultBranch,
      topLanguages: githubPortfolio.topLanguages || githubPortfolio.languages || [],
      stars: githubPortfolio.stars,
      forks: githubPortfolio.forks,
      updatedAt: githubPortfolio.updatedAt,
      summary: githubPortfolio.summary || `${githubPortfolio.fullName} 저장소는 ${githubPortfolio.language || '확인 필요'} 기반 프로젝트입니다. README, 핵심 디렉터리, 설정 파일, 자동화 신호를 기준으로 기술 설명 자료를 구성했습니다.`,
      techStack: stack,
      projectHighlights,
      architecture,
      qualitySignals,
      shippingSignals,
      refactorSuggestions,
      documentation: githubPortfolio.documentation || githubPortfolio.techDocument,
      risks,
      interviewTalkingPoints,
    };
  };

  const mergeGitHubPortfolioAnalysis = (localAnalysis, remoteAnalysis) => {
    if (!localAnalysis) return remoteAnalysis;
    if (!remoteAnalysis) return localAnalysis;

    const merged = { ...localAnalysis, ...remoteAnalysis };
    const listFields = [
      'techStack',
      'architecture',
      'projectHighlights',
      'qualitySignals',
      'shippingSignals',
      'refactorSuggestions',
      'risks',
      'interviewTalkingPoints',
    ];

    listFields.forEach((field) => {
      if (!Array.isArray(remoteAnalysis[field]) || remoteAnalysis[field].length === 0) {
        merged[field] = Array.isArray(localAnalysis[field]) ? localAnalysis[field] : [];
      }
    });

    if (!String(remoteAnalysis.summary || '').trim()) {
      merged.summary = localAnalysis.summary;
    }

    if (!String(remoteAnalysis.documentation || '').trim()) {
      merged.documentation = localAnalysis.documentation;
    }

    return merged;
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

  const runRecommendedJobMatch = async () => {
    const analysisProfile = normalizeUserProfile(userInfo);
    if (!analysisProfile.skills?.length) {
      setJobMatchState({
        running: false,
        attempted: false,
        summary: '',
        error: '추천 공고 매칭 전에 최소 1개 이상의 보유 기술을 입력해 주세요.',
        matchedAt: '',
      });
      return;
    }

    const candidateJobs = recommendedJobs.length > 0 ? recommendedJobs : computeJobsWithScores();
    if (!candidateJobs.length) {
      setJobMatchState({
        running: false,
        attempted: false,
        summary: '',
        error: '현재 기준으로 비교할 공고가 없습니다.',
        matchedAt: '',
      });
      return;
    }

    setJobMatchState({
      running: true,
      attempted: true,
      summary: '',
      error: '',
      matchedAt: '',
    });
    if (recommendedJobs.length === 0) {
      setRecommendedJobs(candidateJobs);
    }

    try {
      const response = await matchJobsViaProxy({
        modelId: selectedModelId,
        profile: analysisProfile,
        candidates: candidateJobs,
      });

      const rankedMap = new Map(
        (response.matches || []).map((match, index) => [
          String(match.id),
          {
            ...match,
            score: Math.max(0, Math.min(100, Math.round(Number(match.score) || 0))),
            rank: index + 1,
          },
        ]),
      );

      const merged = candidateJobs
        .filter((job) => rankedMap.has(String(job.id)))
        .map((job) => {
          const match = rankedMap.get(String(job.id));
          return {
            ...job,
            score: match.score,
            aiMatchReason: match.reason,
            aiStrengths: Array.isArray(match.strengths) ? match.strengths : [],
            aiCautions: Array.isArray(match.cautions) ? match.cautions : [],
            aiRank: match.rank,
          };
        })
        .sort((left, right) => {
          if ((left.aiRank || 999) !== (right.aiRank || 999)) {
            return (left.aiRank || 999) - (right.aiRank || 999);
          }
          return (right.score || 0) - (left.score || 0);
        });

      setMatchedJobs(merged);
      setVisibleJobs(10);
      setJobMatchState({
        running: false,
        attempted: true,
        summary: response.summary || '지원 우선순위 기준으로 공고를 정렬했습니다.',
        error: '',
        matchedAt: new Date().toISOString(),
      });
    } catch (error) {
      setMatchedJobs([]);
      setJobMatchState({
        running: false,
        attempted: true,
        summary: '',
        error: error.message || '추천 공고 AI 매칭에 실패했습니다.',
        matchedAt: '',
      });
    }
  };

  // ── Fallback 적용 ─────────────────────────────────────────────────────
  const applyLocalFallback = (jobsWithScores, message) => {
    const profileRoleLabel = getProfileDisplayRole(userInfo);
    setRecommendedJobs(jobsWithScores);
    setVisibleJobs(10);
    const top3 = jobsWithScores.slice(0, 3);
    const localQs = generateInterviewQuestionsLocal(top3, userInfo);
    const localResults = {
      resumeImprovements: [
        `**성과 중심 재배치**: ${userInfo.experience}년차 ${profileRoleLabel} 경험을 상단에 두괄식으로 배치하세요.`,
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
    };
    setResults(localResults);
    setInfoMessage(message);
    setActiveTab('feedback');
    setActiveInterviewTab(0);
    // 자동 저장
    try {
      persistWorkspaceSnapshot({
        userInfo,
        results: localResults,
        recommendedJobs: jobsWithScores,
        instructorFeedback,
      }, { showConfirmation: true, trackHistory: true });
    } catch {}
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
    setRestoreNotice(null);
    setMatchedJobs([]);
    setJobMatchState({
      running: false,
      attempted: false,
      summary: '',
      error: '',
      matchedAt: '',
    });

    try {
      const analysisProfile = normalizeUserProfile(userInfo);
      const jobsWithScores = computeJobsWithScores();
      setRecommendedJobs(jobsWithScores);
      setVisibleJobs(10);
      const top3 = jobsWithScores.slice(0, 3);
      let githubPortfolio = null;
      if (analysisProfile.roleGroup === '프로그래밍' && analysisProfile.githubUrl?.trim()) {
        setInfoMessage('GitHub 저장소를 분석하는 중입니다. README, 핵심 디렉터리, 설정 파일, 자동화 신호를 확인합니다. public repo 기준으로만 동작합니다.');
        try {
          githubPortfolio = await analyzeGitHubPortfolio(analysisProfile.githubUrl.trim());
        } catch (githubErr) {
          setInfoMessage(`GitHub 분석은 건너뛰고 AI 분석을 계속합니다. (${githubErr.message})`);
        }
      }

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
        profile: analysisProfile,
        hasFiles: fileParts.length > 0,
        hasPortfolioFile: portfolioFiles.length > 0,
        fileParts: fileParts.length > 0 ? fileParts : undefined,
        portfolioFileNames: portfolioFiles.map(f => f.name),
        githubPortfolio,
      });
      // 결과 데이터 안전 정규화
      const localGitHubAnalysis = buildLocalGitHubPortfolioAnalysis(githubPortfolio);
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
        githubPortfolioAnalysis: mergeGitHubPortfolioAnalysis(localGitHubAnalysis, data.githubPortfolioAnalysis),
      };
      setResults(safeData);
      setActiveTab('feedback');
      setActiveInterviewTab(0);
      // AI 강사피드백 초안은 백그라운드로 생성해 결과 탭 전환을 막지 않음
      void generateInstructorDraft(safeData, analysisProfile)
        .then((draft) => {
          if (!draft) return;
          persistWorkspaceSnapshot({
            userInfo: analysisProfile,
            results: safeData,
            recommendedJobs: jobsWithScores,
            instructorFeedback: draft,
          });
        })
        .catch(() => {});
      persistWorkspaceSnapshot({
        userInfo: analysisProfile,
        results: safeData,
        recommendedJobs: jobsWithScores,
        instructorFeedback,
      }, { showConfirmation: true, trackHistory: true });
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
      const normalizedProfile = normalizeUserProfile(profile);
      const prompt = `당신은 게임 업계 취업 컨설팅 강사입니다. 아래 AI 분석 결과를 바탕으로 강사 피드백 초고를 작성하세요.

지원자: ${normalizedProfile.name} | 직군: ${getProfileDisplayRole(normalizedProfile)} | 경력: ${normalizedProfile.experience}년
스킬: ${(normalizedProfile.skills || []).map(s => `${s.name}(${s.level})`).join(', ')}

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

  // ── 저장 액션 ───────────────────────────────────────────────────────
  const saveProfile = async () => {
    try {
      let feedback = instructorFeedback;
      const isEmpty = !feedback.general && !feedback.resume;
      if (isEmpty && results) {
        setSaveStatus('generating');
        const draft = await generateInstructorDraft(results, userInfo);
        if (draft) feedback = draft;
      }
      persistWorkspaceSnapshot({ userInfo, results, recommendedJobs, instructorFeedback: feedback }, { showConfirmation: true });
    } catch {
      persistWorkspaceSnapshot({ userInfo, results, recommendedJobs, instructorFeedback }, { showConfirmation: true });
    }
  };

  // ── 네비게이션 ────────────────────────────────────────────────────────
  const navItems = [
    { id: 'input',           label: '정보 입력',       icon: User },
    { id: 'feedback',        label: '서류 피드백',      icon: FileText },
    { id: 'portfolio',       label: '포트폴리오',       icon: ImageIcon },
    { id: 'jobs',            label: '추천 공고',        icon: Target },
    { id: 'interview',       label: '면접 대비',        icon: MessageSquare },
    { id: 'interview-basic', label: '면접 기본 준비',   icon: Smile },
    { id: 'tech-assessment', label: '직무 과제 평가',   icon: Code2 },
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

  const activeNavIndex = navItems.findIndex((item) => item.id === activeTab);
  const activeNavItem = navItems[activeNavIndex >= 0 ? activeNavIndex : 0];
  const ActiveNavIcon = activeNavItem.icon;
  const featureKey = activeTab.replace(/[^a-z0-9-]/gi, '-');
  const featureGuides = {
    input: {
      title: '분석 재료를 한곳에 모아요',
      description: '직무, 경력, 보유 역량과 PDF를 넣어주세요. 처음에는 이 화면만 천천히 채우면 됩니다.',
      hint: '이름, 직무, 경력, 역량을 기준으로 이후 기능의 분석 품질이 달라집니다.',
    },
    feedback: {
      title: '서류 문장을 채용자 관점으로 봅니다',
      description: '이력서와 자기소개서 피드백을 결론부터 확인하고, 근거가 약한 문장을 먼저 보완하세요.',
      hint: '이력서와 자기소개서를 분리해서 읽고, 문장별 보완 근거를 확인합니다.',
    },
    portfolio: {
      title: '포트폴리오를 실무 언어로 번역합니다',
      description: '프로젝트 역할, 문제 해결 과정, 결과가 채용자가 읽기 쉽게 연결되는지 확인합니다.',
      hint: '플밍 직무는 GitHub 저장소 분석 결과도 함께 볼 수 있습니다.',
    },
    jobs: {
      title: '추천 공고와 데이터 운영을 함께 봅니다',
      description: '입력한 직무와 역량 기준 추천 결과를 확인하고, 같은 화면에서 GameJob 데이터 최신화도 실행할 수 있습니다.',
      hint: '추천 결과가 없어도 이 탭에서 공고 데이터 현황과 크롤링 상태를 먼저 확인할 수 있습니다.',
    },
    interview: {
      title: '공고별 면접 대응을 만듭니다',
      description: '추천 공고와 내 자료를 바탕으로 예상 질문, 피해야 할 답변, 권장 답변을 정리합니다.',
      hint: '답변은 결론부터 말하고, 바로 근거 사례로 이어가면 좋습니다.',
    },
    'interview-basic': {
      title: '면접 기본 태도를 정리합니다',
      description: `${normalizedUserInfo.roleGroup} 직군 면접에서 먼저 검증되는 준비 요소와 말하기 기준을 정리합니다.`,
      hint: readinessPlaybook.reviewerNoteBody,
    },
    'tech-assessment': {
      title: '직군별 과제 사고방식을 연습합니다',
      description: '기획, 플밍, 아트 직군별로 다른 과제 유형을 풀어보고 답변 방향을 점검합니다.',
      hint: '정답보다 판단 과정과 근거가 보이도록 작성하는 것이 중요합니다.',
    },
    'personality-test': {
      title: '인성검사 응답 경향을 확인합니다',
      description: '연습 문항과 본 문항을 통해 일관성 있는 선택 흐름을 미리 경험합니다.',
      hint: '너무 고민하기보다 본인과 가장 가까운 선택지를 빠르게 고르세요.',
    },
    'pdf-export': {
      title: '필요한 결과만 문서로 묶습니다',
      description: '분석 결과와 강사 피드백을 저장하거나 공유할 수 있는 문서로 출력합니다.',
      hint: '공유가 필요한 항목만 골라 제출용 검토 자료로 정리합니다.',
    },
  };
  const activeFeatureGuide = featureGuides[activeTab] || {
    title: activeNavItem.label,
    description: '이 기능에서 필요한 내용을 확인하세요.',
    hint: '입력값과 분석 결과는 탭을 이동해도 유지됩니다.',
  };
  const statusCards = [
    restoreNotice && {
      id: 'restore',
      tone: 'info',
      icon: Database,
      label: 'Recovered',
      title: '마지막 작업을 복구했습니다.',
      body: `${formatSavedAt(restoreNotice.savedAt) || '최근 저장 시점'} 기준으로 ${restoreNotice.hasResults ? '분석 결과와 프로필' : '프로필'}을 불러왔습니다.`,
      actionLabel: restoreNotice.hasResults ? '결과 열기' : '입력 확인',
      onAction: () => {
        setActiveTab(restoreNotice.hasResults ? 'feedback' : 'input');
        setRestoreNotice(null);
      },
      dismissible: true,
    },
    saveStatus === 'generating' && {
      id: 'saving',
      tone: 'warning',
      icon: Loader2,
      label: 'Saving',
      title: '강사 피드백 초안을 정리하고 있습니다.',
      body: '분석 결과는 이미 보존되어 있습니다. 저장 문구가 사라질 때까지 새로고침하지 않는 편이 안전합니다.',
      spin: true,
    },
    saveStatus === 'saved' && lastSavedAt && {
      id: 'saved',
      tone: 'success',
      icon: CheckCircle,
      label: 'Saved',
      title: '현재 결과를 로컬에 저장했습니다.',
      body: `${formatSavedAt(lastSavedAt)} 기준 스냅샷입니다. 다시 열어도 복구할 수 있습니다.`,
    },
  ].filter(Boolean);
  const inputWorkspaceProps = {
    analyzeApplication,
    clearPinnedSlot,
    coverLetterFile,
    currentProvider,
    handleAddSkill,
    handleInputChange,
    handlePinnedGiNoChange,
    handlePortfolioChange,
    handleQuickAddSkill,
    handleRemoveSkill,
    handleRoleGroupSelect,
    handleSubRoleChange,
    instructorFeedback,
    loading,
    normalizedUserInfo,
    pinnedSlots,
    portfolioFiles,
    resolvePinnedJob,
    resumeFile,
    rolePlaybook,
    selectedRoleDetail,
    selectedRoleGroupInfo,
    selectedSkillSuggestions,
    setCoverLetterFile,
    setInstructorFeedback,
    setPortfolioFiles,
    setResumeFile,
    setSkillInput,
    skillCategories,
    skillInput,
    userInfo,
  };
  const feedbackWorkspaceProps = {
    analysisHistory,
    formatSavedAt,
    highlightedMatchedSkills,
    historyComparison,
    lastSavedAt,
    loadHistorySnapshot,
    normalizedUserInfo,
    parseFeedbackItem,
    pinnedSlots,
    recommendedJobs,
    resultPlaybook,
    results,
    selectedHistoryEntry,
    selectedHistoryId,
    selectedRoleDetail,
    setSelectedHistoryId,
    topRecommendedJobs,
    userInfo,
  };
  const jobsWorkspaceProps = {
    candidateJobs: recommendedJobs,
    fetchCompanyInfoAI,
    highlightedGapSkills,
    highlightedMatchedSkills,
    jobs,
    jobsMetadata,
    matchedJobs,
    jobMatchState,
    onRunJobMatch: runRecommendedJobMatch,
    resultPlaybook,
    scoreFilter,
    setScoreFilter,
    setSelectedCompanyModal,
    setVisibleJobs,
    userInfo,
    visibleJobs,
  };

  // ── 렌더링 ────────────────────────────────────────────────────────────
  return (
    <div data-feature={featureKey} className="apple-shell coach-shell coach-studio-shell apple-app-shell flex h-screen flex-col bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 relative">

      <header className="coach-commandbar">
        <button type="button" onClick={() => setActiveTab('input')} className="coach-brandlockup">
          <span className="apple-brandmark coach-brandmark bg-indigo-500 p-2 rounded-lg">
            <Gamepad2 size={24} className="text-white" />
          </span>
          <span className="coach-brandcopy">
            <span className="coach-brand-title">Portfolio Coach</span>
            <strong>Game Career Workbench</strong>
          </span>
        </button>

        <div className="coach-command-status" aria-live="polite">
          <span>{loading ? 'AI 분석' : '기능 선택'}</span>
          <strong>{activeNavItem.label}</strong>
          {loading && <Loader2 size={16} className="animate-spin" />}
        </div>

        <div className="coach-command-tools">
          <button type="button" onClick={() => setShowUserGuide(true)}>
            <BookOpen size={17} />
            <span>사용 설명서</span>
          </button>
          <button type="button" onClick={() => setShowSettings(true)}>
            <Settings size={17} />
            <span>설정</span>
          </button>
          <button type="button" onClick={() => setShowModelSettings(true)} className="coach-model-command">
            <Sparkles size={17} />
            <span>AI 모델</span>
            <small>{currentProvider?.label || '모델 선택'} {selectedModelId ? `· ${selectedModelId}` : ''}</small>
          </button>
        </div>
      </header>

      <div className="coach-mobile-tools">
        <button type="button" onClick={() => setShowUserGuide(true)}>
          <BookOpen size={16} /> 사용 설명서
        </button>
        <button type="button" onClick={() => setShowSettings(true)}>
          <Settings size={16} /> 설정
        </button>
        <button type="button" onClick={() => setShowModelSettings(true)}>
          <Sparkles size={16} /> AI 모델
        </button>
      </div>

      <div className="coach-body-shell">
      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="apple-main coach-workspace apple-workspace flex-1 overflow-auto bg-slate-50 p-8 custom-scrollbar">
        <div className="apple-stage coach-stage max-w-5xl mx-auto pb-20">

          <section className="coach-dossier-header">
            <div className="coach-dossier-tab">
              <span className="coach-workbench-icon"><ActiveNavIcon size={20} /></span>
              <div>
                <p className="coach-overline">기능 화면</p>
                <h2>{activeNavItem.label}</h2>
              </div>
            </div>
          </section>

          <section className="coach-content-brief">
            <div>
              <span>기능 설명</span>
              <strong>{activeNavItem.label}</strong>
            </div>
            <p>{activeFeatureGuide.hint}</p>
          </section>

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
          {statusCards.length > 0 && (
            <div className="mb-6 space-y-3">
              {statusCards.map((card) => {
                const Icon = card.icon;
                const toneClasses = card.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50'
                  : card.tone === 'warning'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-slate-200 bg-white';
                const iconClasses = card.tone === 'success'
                  ? 'text-emerald-600'
                  : card.tone === 'warning'
                    ? 'text-amber-600'
                    : 'text-slate-700';

                return (
                  <section
                    key={card.id}
                    className={`rounded-[28px] border px-5 py-4 shadow-sm animate-in fade-in slide-in-from-top-2 ${toneClasses}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ${iconClasses}`}>
                        <Icon size={18} className={card.spin ? 'animate-spin' : ''} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{card.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{card.body}</p>
                        {card.actionLabel && (
                          <button
                            type="button"
                            onClick={card.onAction}
                            className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                          >
                            {card.actionLabel}
                          </button>
                        )}
                      </div>
                      {card.dismissible && (
                        <button
                          type="button"
                          onClick={() => setRestoreNotice(null)}
                          className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                          aria-label="상태 메시지 닫기"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* ── TAB 1: 정보 입력 ───────────────────────────────────── */}
          {activeTab === 'input' && (
            <InputWorkspace {...inputWorkspaceProps} />
          )}

          {/* ── TAB 2: 서류 피드백 ─────────────────────────────────── */}
          {activeTab === 'feedback' && (
            results ? (
              <FeedbackWorkspace {...feedbackWorkspaceProps} />
            ) : renderEmptyState(<FileText size={48} />, '서류 피드백 결과가 없습니다', '정보를 입력하고 AI 분석을 진행해주세요.')
          )}

          {/* ── TAB 3: 포트폴리오 ─────────────────────────────────── */}
          {activeTab === 'portfolio' && (
            results ? (
              <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="apple-intro">
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">{resultPlaybook.portfolioTitle}</h2>
                  <p className="text-slate-500">{resultPlaybook.portfolioDescription}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {resultPlaybook.portfolioCards.map((card) => (
                    <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
                      <h3 className="mt-2 text-base font-bold leading-snug text-slate-900">{card.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
                    </article>
                  ))}
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

                {results.githubPortfolioAnalysis?.repoUrl && (
                  <div className="bg-slate-950 rounded-2xl p-8 shadow-sm border border-slate-800 text-white">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300">GitHub Technical Doc</p>
                        <h3 className="mt-1 text-2xl font-black tracking-tight">플밍 포트폴리오 기술문서 초안</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">
                          public GitHub 저장소의 README, 핵심 디렉터리, 설정 파일, 자동화 신호를 기준으로 기술 설명용 초안을 정리했습니다.
                        </p>
                      </div>
                      <a
                        href={results.githubPortfolioAnalysis.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-900 transition hover:bg-sky-100"
                      >
                        저장소 열기
                      </a>
                    </div>

                    {results.githubPortfolioAnalysis.summary && (
                      <div className="mb-5 rounded-2xl bg-white/8 p-4 text-sm leading-relaxed text-slate-200">
                        {results.githubPortfolioAnalysis.summary}
                      </div>
                    )}

                    <div className="mb-5 flex flex-wrap gap-2">
                      {[
                        results.githubPortfolioAnalysis.topLanguages?.length
                          ? `언어 ${results.githubPortfolioAnalysis.topLanguages.join(', ')}`
                          : null,
                        results.githubPortfolioAnalysis.defaultBranch
                          ? `기본 브랜치 ${results.githubPortfolioAnalysis.defaultBranch}`
                          : null,
                        results.githubPortfolioAnalysis.updatedAt
                          ? `최근 업데이트 ${results.githubPortfolioAnalysis.updatedAt}`
                          : null,
                        Number.isFinite(results.githubPortfolioAnalysis.stars)
                          ? `Stars ${results.githubPortfolioAnalysis.stars}`
                          : null,
                        Number.isFinite(results.githubPortfolioAnalysis.forks)
                          ? `Forks ${results.githubPortfolioAnalysis.forks}`
                          : null,
                      ].filter(Boolean).map((item) => (
                        <span key={item} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-slate-200">
                          {item}
                        </span>
                      ))}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        { title: '기술 스택', items: results.githubPortfolioAnalysis.techStack, tone: 'text-sky-200' },
                        { title: '구조 해석', items: results.githubPortfolioAnalysis.architecture, tone: 'text-cyan-200' },
                        { title: '프로젝트 하이라이트', items: results.githubPortfolioAnalysis.projectHighlights, tone: 'text-emerald-200' },
                        { title: '면접 포인트', items: results.githubPortfolioAnalysis.interviewTalkingPoints, tone: 'text-indigo-200' },
                      ].map(({ title, items, tone }) => (
                        <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <h4 className={`mb-3 text-sm font-bold ${tone}`}>{title}</h4>
                          <ul className="space-y-2 text-sm text-slate-300">
                            {(Array.isArray(items) && items.length > 0 ? items : ['분석된 항목이 없습니다.']).map((item) => (
                              <li key={item} className="leading-relaxed">- {item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        { title: '품질 신호', items: results.githubPortfolioAnalysis.qualitySignals, tone: 'text-lime-200' },
                        { title: '출시/협업 신호', items: results.githubPortfolioAnalysis.shippingSignals, tone: 'text-violet-200' },
                        { title: '보완 제안', items: results.githubPortfolioAnalysis.refactorSuggestions, tone: 'text-amber-200' },
                        { title: '리스크', items: results.githubPortfolioAnalysis.risks, tone: 'text-rose-200' },
                      ].map(({ title, items, tone }) => (
                        <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <h4 className={`mb-3 text-sm font-bold ${tone}`}>{title}</h4>
                          <ul className="space-y-2 text-sm text-slate-300">
                            {(Array.isArray(items) && items.length > 0 ? items : ['분석된 항목이 없습니다.']).map((item) => (
                              <li key={item} className="leading-relaxed">- {item}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {results.githubPortfolioAnalysis.documentation && (
                      <pre className="mt-5 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-2xl bg-black/40 p-5 text-xs leading-6 text-slate-200 custom-scrollbar">
                        {results.githubPortfolioAnalysis.documentation}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ) : renderEmptyState(<ImageIcon size={48} />, '포트폴리오 가이드가 없습니다', '정보를 입력하고 AI 분석을 진행해주세요.')
          )}

          {/* ── TAB 4: 추천 공고 ───────────────────────────────────── */}
          {activeTab === 'jobs' && (
            <JobsWorkspace {...jobsWorkspaceProps} />
          )}

          {/* ── TAB 5: 면접 대비 ───────────────────────────────────── */}
          {activeTab === 'interview' && (
            results?.interviewPreps?.length > 0 ? (
              <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="apple-intro">
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">{interviewPlaybook.title}</h2>
                  <p className="text-slate-500">{interviewPlaybook.description}</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-4 md:grid-cols-3">
                    {interviewPlaybook.cards.map((card) => (
                      <article key={card.label} className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-sky-600">{card.label}</p>
                        <h3 className="mb-2 text-base font-black text-slate-900">{card.title}</h3>
                        <p className="text-sm leading-relaxed text-slate-600">{card.body}</p>
                      </article>
                    ))}
                  </div>
                  <aside className="rounded-[28px] bg-slate-950 px-6 py-6 text-white shadow-xl">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">Answer Lens</p>
                    <h3 className="mb-2 text-lg font-black">{interviewPlaybook.strategyTitle}</h3>
                    <p className="text-sm leading-relaxed text-slate-300">{interviewPlaybook.strategyBody}</p>
                    <div className="mt-5 border-t border-white/10 pt-5">
                      <p className="mb-2 text-sm font-bold text-white">{interviewPlaybook.assignmentTitle}</p>
                      <p className="text-sm leading-relaxed text-slate-300">{interviewPlaybook.assignmentBody}</p>
                    </div>
                  </aside>
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
                      <div className="rounded-[28px] border border-slate-200 bg-slate-100 px-5 py-5 text-sm leading-relaxed text-slate-600">
                        <strong>※ 면접 답변 기법 안내</strong><br />
                        <span className="text-slate-700">{interviewPlaybook.answerTip}</span><br /><br />
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
                  <h2>{readinessPlaybook.heroTitle}</h2>
                  <p>{readinessPlaybook.heroDescription}</p>
                </div>
                <div className="studio-readiness-summary">
                  {readinessPlaybook.summaryStats.map((stat) => (
                    <div key={stat.label} className="studio-readiness-stat">
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </div>
                  ))}
                  <p>
                    면접관은 정답 암기보다 근거 있는 판단, 협업 가능한 말투, 모르는 것을
                    다루는 태도를 봅니다. 짧은 답변 안에 역할과 결과가 보이도록 준비하세요.
                  </p>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                {readinessPlaybook.prepCards.map((card) => (
                  <article key={card.label} className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
                    <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-sky-600">{card.label}</p>
                    <h3 className="mb-2 text-base font-black text-slate-900">{card.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{card.body}</p>
                  </article>
                ))}
              </section>

              <section className="studio-readiness-layout">
                <aside className="studio-readiness-aside">
                  <div className="studio-readiness-note">
                    <p className="studio-eyebrow">Quick Reset</p>
                    <h3>면접 직전 5분 체크</h3>
                    <ul>
                      {readinessPlaybook.quickChecks.map((item) => (
                        <li key={item}>
                          <CheckCircle size={16} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="studio-readiness-note studio-readiness-note-muted">
                    <p className="studio-eyebrow">{readinessPlaybook.answerFrameTitle}</p>
                    <p>{readinessPlaybook.answerFrameBody}</p>
                  </div>

                  <div className="studio-readiness-note studio-readiness-note-muted">
                    <p className="studio-eyebrow">{readinessPlaybook.reviewerNoteTitle}</p>
                    <p>{readinessPlaybook.reviewerNoteBody}</p>
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

          {/* ── TAB 7: 직무 과제 평가 ─────────────────────────────── */}
          {activeTab === 'tech-assessment' && <TechAssessment userInfo={normalizedUserInfo} />}

          {/* ── TAB 8: 인성검사 (탭 전환 시 상태 유지를 위해 항상 마운트, display로 토글) ── */}
          <div style={{ display: activeTab === 'personality-test' ? 'block' : 'none' }}>
            <PersonalityTest
              selectedProvider={selectedProvider}
              selectedModelId={selectedModelId}
              userInfo={normalizedUserInfo}
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

      <WorkspaceSidebar
        activeFeatureGuide={activeFeatureGuide}
        activeTab={activeTab}
        navItems={navItems}
        results={results}
        onOpenGuide={() => setShowUserGuide(true)}
        onSelectTab={setActiveTab}
      />
      </div>

      <CompanyInfoModal
        company={selectedCompanyModal}
        onClose={() => setSelectedCompanyModal(null)}
      />

      <UserGuideModal
        open={showUserGuide}
        onClose={() => setShowUserGuide(false)}
        roleGroup={normalizedUserInfo.roleGroup}
        guidePlaybook={guidePlaybook}
      />

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

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={18} className="text-indigo-500" />
                  <h3 className="font-semibold text-slate-700">자동 크롤링 상태</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  매일 00:00 기준으로 게임잡 공고를 자동 수집합니다. 사용자 페이지에서는 수동 크롤링을 제공하지 않으며, 아래 메타 정보만 공개됩니다.
                </p>
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                  <p>최근 반영일: <strong className="text-slate-900">{jobsMetadata.latestAppliedDate || '정보 없음'}</strong></p>
                  <p className="mt-1">참고 공고 수: <strong className="text-slate-900">{jobsMetadata.referenceJobCount || jobs.length}건</strong></p>
                  <p className="mt-1">마지막 성공 시각: <strong className="text-slate-900">{jobsMetadata.lastSuccessfulCrawlAt ? new Date(jobsMetadata.lastSuccessfulCrawlAt).toLocaleString('ko-KR') : '정보 없음'}</strong></p>
                  <p className="mt-1">상태: <strong className={jobsMetadata.lastCrawlStatus === 'failed' ? 'text-rose-600' : jobsMetadata.lastCrawlStatus === 'partial-success' ? 'text-amber-600' : 'text-emerald-600'}>{CRAWL_STATUS_LABELS[jobsMetadata.lastCrawlStatus] || CRAWL_STATUS_LABELS.idle}</strong></p>
                </div>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setActiveTab('jobs');
                  }}
                  className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  추천 공고 탭 열기
                </button>
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
