import React, { useEffect, useState } from 'react';
import {
  Brain,
  Briefcase,
  Building2,
  Clock3,
  Loader2,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { callGeminiProxy } from '../lib/gemini-client';
import { staticAssetUrl } from '../lib/runtime-config';

function formatDateLabel(value) {
  if (!value) return '정보 없음';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('ko-KR');
  } catch {
    return value;
  }
}

function formatDateTime(value) {
  if (!value) return '정보 없음';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('ko-KR');
  } catch {
    return value;
  }
}

function normalizeToken(value = '') {
  return String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[·ㆍ]/g, '·');
}

function splitTokens(value) {
  return String(value || '')
    .split(/[,/|·\n]/)
    .map((token) => normalizeToken(token))
    .filter((token) => token.length >= 2);
}

function normalizeCareerFilterLabel(value) {
  return value === '1~3년' ? '1~3년차' : value;
}

function classifyCareer(job) {
  const raw = String(job?.experience || '').replace(/\s+/g, '');
  const reqExp = Number(job?.reqExp);

  if (raw.includes('무관')) return '경력무관';
  if (raw.includes('신입')) return '신입';
  if (raw.includes('1~3') || raw.includes('1-3') || /1년이상|2년이상|3년이하|1년차|2년차|3년차/.test(raw)) {
    return '1~3년차';
  }
  if (!Number.isNaN(reqExp) && reqExp >= 1 && reqExp <= 3) return '1~3년차';
  if (!Number.isNaN(reqExp) && reqExp === 0) return '경력무관';
  return '기타';
}

function classifyRole(job) {
  const haystack = normalizeToken([
    job?.role,
    ...(Array.isArray(job?.roles) ? job.roles : []),
    job?.title,
    job?.keywords,
    ...(Array.isArray(job?.reqSkills) ? job.reqSkills : []),
  ].filter(Boolean).join(' ')).toLowerCase();

  if (/게임ai|ai개발|인공지능|머신러닝|딥러닝|llm|강화학습|데이터사이언스/.test(haystack)) {
    return '게임AI 개발';
  }
  if (/인터페이스디자인|ui|ux|uiux|hud|gui|사용자경험|사용자인터페이스/.test(haystack)) {
    return '인터페이스 디자인';
  }
  if (/원화|컨셉아트|컨셉아티스트|일러스트|캐릭터원화|배경원화/.test(haystack)) {
    return '원화';
  }
  if (/모델링|3d모델|3d아티스트|캐릭터모델러|배경모델러|rigging/.test(haystack)) {
    return '모델링';
  }
  if (/애니메이션|모션|애니메이터|리깅|컷신/.test(haystack)) {
    return '애니메이션';
  }
  if (/이펙트|fx|vfx|effect|파티클|쉐이더/.test(haystack)) {
    return '이펙트·FX';
  }
  if (/기획|밸런스|레벨|시스템|컨텐츠|콘텐츠|시나리오|퀘스트|전투기획|ui\/ux기획/.test(haystack)) {
    return '게임기획';
  }
  if (/모바일|ios|android/.test(haystack)) {
    return '게임개발(모바일)';
  }
  if (/클라이언트|unity|unreal|언리얼|c\+\+|c#|엔진/.test(haystack)) {
    return '게임개발(클라이언트)';
  }
  if (/게임운영|운영|gm|라이브서비스|커뮤니티|모니터링|cs|고객지원/.test(haystack)) {
    return '게임운영';
  }
  if (/qa|테스터|테스트|품질보증|디버깅|버그리포트/.test(haystack)) {
    return 'QA·테스터';
  }
  return normalizeToken(job?.role || '기타');
}

function sortEntries(entries, limit = 10) {
  return [...entries]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit);
}

function summarizeCounts(items, classifier, limit = 10) {
  const counts = new Map();
  for (const item of items) {
    const label = normalizeToken(classifier(item));
    if (!label) continue;
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return sortEntries([...counts.entries()], limit);
}

function summarizeTokenCounts(items, getter, limit = 10) {
  const counts = new Map();
  for (const item of items) {
    const raw = typeof getter === 'function' ? getter(item) : item?.[getter];
    const tokens = Array.isArray(raw) ? raw : splitTokens(raw);
    for (const token of tokens) {
      counts.set(token, (counts.get(token) || 0) + 1);
    }
  }
  return sortEntries([...counts.entries()], limit);
}

function buildRoleSkillMatrix(jobs, roles, limit = 6) {
  const roleMatrix = roles.map((role) => ({
    role,
    skills: summarizeTokenCounts(
      jobs.filter((job) => classifyRole(job) === role),
      'reqSkills',
      limit,
    ),
  }));

  const union = new Set();
  roleMatrix.forEach((entry) => entry.skills.forEach(([skill]) => union.add(skill)));
  const labels = [...union].slice(0, limit);

  return labels.map((skill) => {
    const counts = {};
    roleMatrix.forEach((entry) => {
      counts[entry.role] = entry.skills.find(([label]) => label === skill)?.[1] || 0;
    });
    return { skill, counts };
  });
}

function buildLocalMarketNarrative({ totalJobs, dominantRole, dominantCareer, topCompanies, topKeywords, topSkills }) {
  const companyLine = topCompanies.slice(0, 3).map(([name, count]) => `${name}(${count})`).join(', ') || '상위 기업 데이터 없음';
  const keywordLine = topKeywords.slice(0, 6).map(([label]) => label).join(', ') || '핵심 키워드 데이터 없음';
  const skillLine = topSkills.slice(0, 6).map(([label]) => label).join(', ') || '요구 기술 데이터 없음';

  return [
    '1. 시장 개요',
    `현재 기준 공개 공고는 총 ${totalJobs}건이며, 가장 큰 축은 ${dominantRole} 직군입니다. 경력 조건은 ${dominantCareer} 비중이 가장 높아 초기 경력자와 직무 전환 준비자에게 유리한 구성이 확인됩니다.`,
    '',
    '2. 채용 시그널',
    `상위 채용 기업은 ${companyLine} 순으로 나타납니다. 최근 시장은 동일 역할이라도 프로젝트별 기대 산출물이 달라서, 포지션별 강조 포인트를 분리해 준비하는 편이 안전합니다.`,
    '',
    '3. 실무 키워드',
    `공고 본문과 태그에서 반복적으로 확인되는 키워드는 ${keywordLine} 입니다. 요구 기술 기준으로는 ${skillLine} 항목이 많이 보이며, 포트폴리오와 면접 답변에서도 이 단어들이 실제 산출물과 연결되어야 합니다.`,
    '',
    '4. 준비 방향',
    '공고 분석 탭은 시장 흐름과 채용 언어를 읽는 용도이고, 추천 공고 탭은 개인 프로필 기준 AI 매칭을 보는 용도입니다. 먼저 여기서 시장 패턴을 확인한 뒤 추천 공고에서 개인 매칭을 실행하는 순서가 효율적입니다.',
  ].join('\n');
}

function buildAiPrompt({ totalJobs, dominantRole, dominantCareer, topCompanies, topKeywords, topSkills, historyIndex }) {
  const trendSummary = historyIndex
    .slice(0, 7)
    .reverse()
    .map((entry) => `${entry.date}: 전체 ${entry.referenceJobCount}건 / 신규 ${entry.newJobsCount}건`)
    .join('\n');

  return [
    '당신은 게임 업계 채용시장 분석가입니다.',
    '다음 데이터만 근거로 한국어 보고서를 작성하세요.',
    '- 제목 없이 바로 1. 시장 개요, 2. 채용 신호, 3. 직무별 포인트, 4. 지원 전략, 5. 한 줄 결론 형식으로 작성',
    '- 각 항목은 2~4문장',
    '- 과장 금지, 실제 데이터 기반으로만 정리',
    '',
    `[요약 데이터]`,
    `총 공고 수: ${totalJobs}`,
    `최다 직군: ${dominantRole}`,
    `최다 경력 조건: ${dominantCareer}`,
    `상위 기업: ${topCompanies.slice(0, 8).map(([name, count]) => `${name}(${count})`).join(', ')}`,
    `상위 키워드: ${topKeywords.slice(0, 12).map(([label, count]) => `${label}(${count})`).join(', ')}`,
    `상위 요구 기술: ${topSkills.slice(0, 10).map(([label, count]) => `${label}(${count})`).join(', ')}`,
    '',
    '[최근 추이]',
    trendSummary || '추이 데이터 없음',
  ].join('\n');
}

function TrendChart({ data }) {
  if (!data.length) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-5 py-8 text-sm text-slate-400">추이 데이터가 없습니다.</div>;
  }

  const values = data.map((item) => item.referenceJobCount || 0);
  const maxValue = Math.max(...values, 1);
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 92 - ((item.referenceJobCount || 0) / maxValue) * 72;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">공고 추이</p>
          <h4 className="mt-1 text-lg font-bold text-white">최근 수집 이력</h4>
        </div>
        <span className="text-xs text-slate-400">{data.length}개 포인트</span>
      </div>
      <svg viewBox="0 0 100 100" className="h-56 w-full overflow-visible">
        <line x1="0" y1="92" x2="100" y2="92" stroke="#1e293b" strokeWidth="0.7" />
        <polyline
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
        {data.map((item, index) => {
          const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
          const y = 92 - ((item.referenceJobCount || 0) / maxValue) * 72;
          return (
            <g key={item.date}>
              <circle cx={x} cy={y} r="2.2" fill="#22d3ee" />
              <text x={x} y="98" fill="#64748b" fontSize="3.2" textAnchor="middle">
                {item.date.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DistributionBars({ title, subtitle, entries, accentClass = 'bg-sky-400' }) {
  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{subtitle}</p>
      <h4 className="mt-1 text-lg font-bold text-white">{title}</h4>
      <div className="mt-5 space-y-3">
        {entries.length > 0 ? entries.map(([label, count]) => {
          const maxCount = Math.max(...entries.map((item) => item[1]), 1);
          return (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-200">{label}</span>
                <span className="shrink-0 text-slate-400">{count}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className={`h-2 rounded-full ${accentClass}`} style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
            </div>
          );
        }) : (
          <p className="text-sm text-slate-400">표시할 분포가 없습니다.</p>
        )}
      </div>
    </div>
  );
}

function CareerDonut({ entries }) {
  if (!entries.length) {
    return (
      <div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-5">
        <h4 className="text-lg font-bold text-white">경력 분포</h4>
        <p className="mt-4 text-sm text-slate-400">경력 데이터가 없습니다.</p>
      </div>
    );
  }

  const colors = ['#60a5fa', '#34d399', '#f59e0b', '#f472b6', '#a78bfa'];
  const total = entries.reduce((sum, [, count]) => sum + count, 0) || 1;
  let cumulative = 0;
  const segments = entries.map(([_label, count], index) => {
    const start = (cumulative / total) * 100;
    cumulative += count;
    const end = (cumulative / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  });

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Career Split</p>
      <h4 className="mt-1 text-lg font-bold text-white">경력 분포</h4>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-center">
        <div
          className="mx-auto h-44 w-44 rounded-full"
          style={{ background: `conic-gradient(${segments.join(', ')})` }}
        >
          <div className="m-8 flex h-28 w-28 items-center justify-center rounded-full bg-slate-950 text-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">합계</p>
              <p className="text-2xl font-black text-white">{total}</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {entries.map(([label, count], index) => (
            <div key={label} className="flex items-center gap-3 text-sm text-slate-200">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="min-w-[92px]">{label}</span>
              <strong className="text-white">{count}건</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KeywordCloud({ entries }) {
  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Keywords</p>
      <h4 className="mt-1 text-lg font-bold text-white">키워드 인기 순위</h4>
      <div className="mt-5 flex flex-wrap gap-2">
        {entries.length > 0 ? entries.map(([label, count], index) => (
          <span
            key={label}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              index < 5
                ? 'border-sky-400/30 bg-sky-400/10 text-sky-100'
                : 'border-slate-700 bg-slate-900 text-slate-300'
            }`}
          >
            {label} <span className="text-xs opacity-70">{count}</span>
          </span>
        )) : (
          <p className="text-sm text-slate-400">키워드 데이터가 없습니다.</p>
        )}
      </div>
    </div>
  );
}

function SkillMatrix({ roles, rows }) {
  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Skill Matrix</p>
      <h4 className="mt-1 text-lg font-bold text-white">직군별 요구 기술 Top</h4>
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm text-slate-300">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-[0.18em] text-slate-300">
              <th className="pb-3 pr-6 font-semibold">기술</th>
              {roles.map((role) => (
                <th key={role} className="pb-3 pr-6 font-semibold">{role}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((row) => (
              <tr key={row.skill} className="border-b border-slate-900/80">
                <td className="py-3 pr-6 font-semibold text-white">{row.skill}</td>
                {roles.map((role) => (
                  <td key={`${row.skill}-${role}`} className="py-3 pr-6 text-slate-300">{row.counts[role] || 0}</td>
                ))}
              </tr>
            )) : (
              <tr>
                <td className="py-4 text-slate-400" colSpan={roles.length + 1}>기술 매트릭스 데이터가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobListCard({ job }) {
  const roleLabel = classifyRole(job);
  const careerLabel = classifyCareer(job);

  return (
    <article className="rounded-[24px] border border-slate-800 bg-slate-950/60 p-5 transition hover:border-sky-500/40 hover:bg-slate-950">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="text-lg font-bold text-white">{job.title}</h4>
          <p className="mt-1 text-sm text-sky-300">{job.company}</p>
        </div>
        <span className="shrink-0 rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          {formatDateLabel(job.updatedAt)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-md border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-100">
          {roleLabel}
        </span>
        <span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
          {careerLabel}
        </span>
        {job.employmentType && (
          <span className="rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-100">
            {job.employmentType}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Array.isArray(job.reqSkills) ? job.reqSkills : []).slice(0, 6).map((skill) => (
          <span key={skill} className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-800 pt-4 text-sm text-slate-400">
        <span>{job.deadline || '마감 정보 없음'}</span>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400"
        >
          공고 보기
        </a>
      </div>
    </article>
  );
}

export default function JobAnalysisWorkspace({ jobs = [], jobsMetadata = {} }) {
  const [view, setView] = useState('overview');
  const [historyIndex, setHistoryIndex] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('전체 직군');
  const [careerFilter, setCareerFilter] = useState('전체 경력');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(staticAssetUrl('api/jobs-history-index.json'));
        if (!response.ok) throw new Error('history index');
        const payload = await response.json();
        if (active) setHistoryIndex(Array.isArray(payload) ? payload : []);
      } catch {
        if (active) setHistoryError('최근 수집 이력을 불러오지 못했습니다.');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const roleCounts = summarizeCounts(jobs, classifyRole, 8);
  const careerCounts = summarizeCounts(jobs, classifyCareer, 5);
  const genreCounts = summarizeTokenCounts(jobs, 'gameCategory', 8);
  const companyCounts = summarizeCounts(jobs, (job) => job.company || '회사 정보 없음', 15);
  const keywordCounts = summarizeTokenCounts(jobs, 'keywords', 30);
  const skillCounts = summarizeTokenCounts(jobs, 'reqSkills', 12);
  const dominantRole = roleCounts[0]?.[0] || '데이터 없음';
  const dominantCareer = careerCounts[0]?.[0] || '데이터 없음';
  const trackedRoles = jobsMetadata?.filters?.jobTags || ['게임개발(클라이언트)', '게임개발(모바일)', '게임기획'];
  const trackedCareers = jobsMetadata?.filters?.careerTags || ['신입', '1~3년', '경력무관'];
  const roleSkillRoles = roleCounts.slice(0, 3).map(([label]) => label);
  const roleSkillMatrix = buildRoleSkillMatrix(jobs, roleSkillRoles, 6);
  const companyCount = new Set(jobs.map((job) => job.company).filter(Boolean)).size;
  const latestAppliedDate = jobsMetadata?.latestAppliedDate || historyIndex[0]?.date || null;
  const overviewNarrative = buildLocalMarketNarrative({
    totalJobs: jobs.length,
    dominantRole,
    dominantCareer,
    topCompanies: companyCounts,
    topKeywords: keywordCounts,
    topSkills: skillCounts,
  });
  const displayedAnalysis = analysisText || overviewNarrative;
  const trendData = historyIndex.slice(0, 12).reverse();
  const roleOptions = ['전체 직군', ...trackedRoles];
  const trackedCareerLabels = trackedCareers.map((item) => normalizeCareerFilterLabel(item));
  const careerOptions = ['전체 경력', ...trackedCareerLabels];

  const filteredJobs = jobs.filter((job) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const roleMatched = roleFilter === '전체 직군' || classifyRole(job) === roleFilter;
    const careerMatched = careerFilter === '전체 경력' || classifyCareer(job) === careerFilter;
    if (!roleMatched || !careerMatched) return false;
    if (!normalizedQuery) return true;

    const haystack = [
      job.company,
      job.title,
      classifyRole(job),
      classifyCareer(job),
      ...(Array.isArray(job.reqSkills) ? job.reqSkills : []),
      job.keywords,
    ].join(' ').toLowerCase();

    return haystack.includes(normalizedQuery);
  });

  async function handleAnalyze() {
    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      const response = await callGeminiProxy({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: buildAiPrompt({
          totalJobs: jobs.length,
          dominantRole,
          dominantCareer,
          topCompanies: companyCounts,
          topKeywords: keywordCounts,
          topSkills: skillCounts,
          historyIndex,
        }) }] }],
        generationConfig: {
          temperature: 0.5,
        },
      });

      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) throw new Error('AI 응답이 비어 있습니다.');
      setAnalysisText(text);
    } catch (error) {
      setAnalysisError(error.message || 'AI 분석에 실패했습니다. 아래 기본 요약을 먼저 참고해 주세요.');
    } finally {
      setAnalysisLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <section className="overflow-hidden rounded-[36px] border border-slate-800 bg-slate-950 text-white shadow-2xl shadow-slate-950/20">
        <div className="bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.24),_transparent_28%),radial-gradient(circle_at_top_left,_rgba(34,197,94,0.16),_transparent_22%)] px-8 py-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">GameJob Insights</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-white">게임잡 공고 현황</h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                매일 00시 자동 수집된 게임제작 파트 공고만 집계합니다.
                수동 크롤링은 제공하지 않으며, 이 화면은 시장 흐름과 채용 언어를 읽는 용도입니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">최근 반영일</p>
                <strong className="mt-2 block text-xl font-black text-white">{latestAppliedDate || '정보 없음'}</strong>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-300">마지막 성공</p>
                <strong className="mt-2 block text-sm font-bold text-white">{formatDateTime(jobsMetadata?.lastSuccessfulCrawlAt)}</strong>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: '총 공고 수', value: jobsMetadata?.referenceJobCount || jobs.length, icon: Briefcase, helper: '현재 분석 기준 유효 공고' },
              { label: '기업 수', value: companyCount, icon: Building2, helper: '중복 제거 기준' },
              { label: '최다 직군', value: dominantRole, icon: Users, helper: '현재 시장 비중 1위' },
              { label: '최다 경력', value: dominantCareer, icon: Clock3, helper: '현재 경력 비중 1위' },
            ].map((item) => (
              <article key={item.label} className="rounded-[24px] border border-slate-800 bg-slate-900/70 px-5 py-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-300">{item.label}</p>
                  <item.icon size={16} className="text-sky-300" />
                </div>
                <strong className="mt-4 block text-3xl font-black tracking-tight text-white">{item.value}</strong>
                <p className="mt-2 text-xs text-slate-400">{item.helper}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'overview', label: '게임잡 공고 현황', icon: TrendingUp },
          { id: 'list', label: '공고 목록', icon: Search },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
              view === tab.id
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'overview' && (
        <div className="space-y-6">
          <section className="rounded-[32px] border border-slate-800 bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-violet-300">AI 시장 분석</p>
                <h3 className="mt-2 text-2xl font-black text-white">채용 흐름 요약</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  현재 누적 공고와 최근 이력 기준으로 시장 해석을 제공합니다. 버튼을 눌렀을 때만 AI 분석을 1회 실행합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analysisLoading}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                  analysisLoading
                    ? 'cursor-not-allowed bg-slate-700 text-slate-300'
                    : 'bg-violet-400 text-slate-950 hover:bg-violet-300'
                }`}
              >
                {analysisLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                AI 분석
              </button>
            </div>

            <div className="mt-5 rounded-[28px] border border-violet-400/30 bg-slate-950/70 p-5">
              <div className="mb-4 flex items-center gap-2 text-violet-200">
                <Brain size={16} />
                <p className="text-sm font-semibold">{analysisText ? 'AI 분석 결과' : '기본 요약'}</p>
              </div>
              <div className="space-y-2 text-sm leading-7 text-slate-200">
                {displayedAnalysis.split('\n').map((line, index) => (
                  <p key={`${line}-${index}`}>{line}</p>
                ))}
              </div>
            </div>

            {analysisError && (
              <div className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {analysisError}
              </div>
            )}
          </section>

          <TrendChart data={trendData} />

          <div className="grid gap-6 xl:grid-cols-2">
            <DistributionBars
              title="직군별 공고 분포"
              subtitle="Role Distribution"
              entries={roleCounts}
              accentClass="bg-sky-400"
            />
            <CareerDonut entries={careerCounts} />
            <DistributionBars
              title="게임 장르 분포"
              subtitle="Genre Snapshot"
              entries={genreCounts}
              accentClass="bg-fuchsia-400"
            />
            <DistributionBars
              title="채용 기업 Top 15"
              subtitle="Top Companies"
              entries={companyCounts}
              accentClass="bg-emerald-400"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SkillMatrix roles={roleSkillRoles} rows={roleSkillMatrix} />
            <KeywordCloud entries={keywordCounts} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">추적 직군</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {trackedRoles.map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{item}</span>
                ))}
              </div>
            </article>
            <article className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">추적 경력</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {trackedCareers.map((item) => (
                  <span key={item} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{normalizeCareerFilterLabel(item)}</span>
                ))}
              </div>
            </article>
            <article className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">마지막 크롤링 성공</p>
              <strong className="mt-3 block text-base font-black text-slate-900">{formatDateTime(jobsMetadata?.lastSuccessfulCrawlAt)}</strong>
              <p className="mt-2 text-sm text-slate-500">운영 배치는 매일 00시 기준입니다.</p>
            </article>
            <article className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">이력 포인트</p>
              <strong className="mt-3 block text-3xl font-black text-slate-900">{historyIndex.length}</strong>
              <p className="mt-2 text-sm text-slate-500">{historyError || '최근 수집 이력 기준으로 시장 추이를 유지합니다.'}</p>
            </article>
          </div>
        </div>
      )}

      {view === 'list' && (
        <section className="rounded-[32px] border border-slate-800 bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Public Job List</p>
              <h3 className="mt-2 text-2xl font-black text-white">공고 목록</h3>
              <p className="mt-2 text-sm text-slate-300">
                자동 수집된 공개 공고만 표시합니다. 개인화 우선순위는 추천 공고 탭에서 `매칭하기`를 눌렀을 때 계산됩니다.
              </p>
            </div>
            <div className="rounded-full bg-sky-400 px-4 py-2 text-sm font-black text-slate-950">
              {filteredJobs.length}건
            </div>
          </div>

          <div className="mt-6 grid gap-3 xl:grid-cols-[1.2fr_0.32fr_0.32fr]">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
              <Search size={16} className="text-slate-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="공고 제목, 회사명, 키워드 검색"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-300"
              />
            </label>
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              value={careerFilter}
              onChange={(event) => setCareerFilter(event.target.value)}
              className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
            >
              {careerOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {filteredJobs.length > 0 ? filteredJobs.map((job) => (
              <JobListCard key={job.id} job={job} />
            )) : (
              <div className="col-span-full rounded-[28px] border border-dashed border-slate-700 bg-slate-950/60 px-6 py-16 text-center text-sm text-slate-400">
                조건에 맞는 공고가 없습니다. 검색어나 필터를 조정해 주세요.
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
