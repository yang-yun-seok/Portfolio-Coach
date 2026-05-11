import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Image as ImageIcon, Target, MessageSquare,
  CheckCircle, Loader2,
  User,
  Smile,
  Database, ClipboardList, Download,
} from 'lucide-react';
import {
  ROLE_GROUPS,
  getDefaultRoleDetail,
  getDefaultSkillInput,
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
import { callGeminiProxy, matchJobsViaProxy } from './lib/gemini-client';
import { apiUrl, staticAssetUrl } from './lib/runtime-config';
import { useApplicationAnalysis } from './hooks/useApplicationAnalysis';
import { useModels } from './hooks/useModels';
import { useWorkspacePersistence } from './hooks/useWorkspacePersistence';
import { EMPTY_INSTRUCTOR } from './components/InstructorFeedbackForm';
import WorkspaceSidebar from './components/WorkspaceSidebar';
import WorkspaceCommandBar from './components/WorkspaceCommandBar';
import WorkspaceContent from './components/WorkspaceContent';
import WorkspaceFeatureHeader from './components/WorkspaceFeatureHeader';
import WorkspaceMessages from './components/WorkspaceMessages';
import CompanyInfoModal from './components/CompanyInfoModal';
import ModelSettingsModal from './components/ModelSettingsModal';
import SettingsModal from './components/SettingsModal';
import UserGuideModal from './components/UserGuideModal';

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

const { analyzeApplication } = useApplicationAnalysis({
  computeJobsWithScores,
  currentProvider,
  coverLetterFile,
  generateInterviewQuestionsLocal,
  instructorFeedback,
  persistWorkspaceSnapshot,
  portfolioFiles,
  resumeFile,
  selectedModelId,
  setActiveTab,
    setError,
    setInfoMessage,
    setInstructorFeedback,
    setJobMatchState,
    setLoading,
    setMatchedJobs,
    setRecommendedJobs,
    setRestoreNotice,
    setResults,
    setVisibleJobs,
    userInfo,
  });

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

  // ── 네비게이션 ────────────────────────────────────────────────────────
  const navItems = [
    { id: 'input',           label: '정보 입력',       icon: User },
    { id: 'feedback',        label: '서류 피드백',      icon: FileText },
    { id: 'portfolio',       label: '포트폴리오',       icon: ImageIcon },
    { id: 'jobs',            label: '추천 공고',        icon: Target },
    { id: 'interview',       label: '면접 대비',        icon: MessageSquare },
    { id: 'interview-basic', label: '면접 기본 준비',   icon: Smile },
    { id: 'personality-test', label: '인성검사',         icon: ClipboardList },
    { id: 'pdf-export',     label: 'PDF 출력',          icon: Download },
  ];

  useEffect(() => {
    if (!navItems.some((item) => item.id === activeTab)) {
      setActiveTab('input');
    }
  }, [activeTab]);

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
      onDismiss: () => setRestoreNotice(null),
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
  const portfolioWorkspaceProps = {
    parseFeedbackItem,
    portfolioFiles,
    resultPlaybook,
    results,
  };

  const interviewWorkspaceProps = {
    interviewPlaybook,
    results,
  };

  const interviewReadinessWorkspaceProps = {
    interviewBasicData,
    readinessPlaybook,
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
  const personalityTestProps = {
    selectedProvider,
    selectedModelId,
    userInfo: normalizedUserInfo,
  };
  const pdfExportProps = {
    results,
    userInfo,
    recommendedJobs,
    instructorFeedback,
  };

  // ── 렌더링 ────────────────────────────────────────────────────────────
  return (
    <div data-feature={featureKey} className="apple-shell coach-shell coach-studio-shell apple-app-shell flex h-screen flex-col bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 relative">
      <WorkspaceCommandBar
        activeLabel={activeNavItem.label}
        loading={loading}
        modelSummary={`${currentProvider?.label || '모델 선택'}${selectedModelId ? ` · ${selectedModelId}` : ''}`}
        onOpenGuide={() => setShowUserGuide(true)}
        onOpenModelSettings={() => setShowModelSettings(true)}
        onOpenSettings={() => setShowSettings(true)}
        onSelectInput={() => setActiveTab('input')}
      />

      <div className="coach-body-shell">
      {/* ── Main Content ────────────────────────────────────────────── */}
      <div className="apple-main coach-workspace apple-workspace flex-1 overflow-auto bg-slate-50 p-8 custom-scrollbar">
        <div className="apple-stage coach-stage max-w-5xl mx-auto pb-20">
          <WorkspaceFeatureHeader
            activeFeatureGuide={activeFeatureGuide}
            activeLabel={activeNavItem.label}
            ActiveNavIcon={ActiveNavIcon}
          />

          <WorkspaceMessages
            error={error}
            infoMessage={infoMessage}
            statusCards={statusCards}
          />
          <WorkspaceContent
            activeTab={activeTab}
            feedbackWorkspaceProps={feedbackWorkspaceProps}
            inputWorkspaceProps={inputWorkspaceProps}
            interviewReadinessWorkspaceProps={interviewReadinessWorkspaceProps}
            interviewWorkspaceProps={interviewWorkspaceProps}
            jobsWorkspaceProps={jobsWorkspaceProps}
            onGoToInput={() => setActiveTab('input')}
            pdfExportProps={pdfExportProps}
            personalityTestProps={personalityTestProps}
            portfolioWorkspaceProps={portfolioWorkspaceProps}
            results={results}
          />
        </div>
      </div>

      <WorkspaceSidebar
        activeTab={activeTab}
        navItems={navItems}
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

      {/* ?? ?? ?? ??????????????????????????????????????????????? */}
      <SettingsModal
        jobs={jobs}
        jobsMetadata={jobsMetadata}
        onClose={() => setShowSettings(false)}
        onGoToJobs={() => {
          setShowSettings(false);
          setActiveTab('jobs');
        }}
        open={showSettings}
      />

      <ModelSettingsModal
        currentProvider={currentProvider}
        disabledProviders={disabledProviders}
        enabledProviders={enabledProviders}
        modelsLoading={modelsLoading}
        onClose={() => setShowModelSettings(false)}
        onModelChange={setSelectedModelId}
        onProviderChange={handleProviderChange}
        open={showModelSettings}
        selectedModelId={selectedModelId}
        selectedProvider={selectedProvider}
      />
    </div>
  );
}
