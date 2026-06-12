import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Clock3,
  ExternalLink,
  Loader2,
  Pin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';

function formatDateTime(value) {
  if (!value) return '정보 없음';
  try {
    return new Date(value).toLocaleString('ko-KR');
  } catch {
    return value;
  }
}

function formatCrawlStatus(status) {
  switch (status) {
    case 'success':
      return { label: '성공', tone: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    case 'partial-success':
      return { label: '부분 성공', tone: 'text-amber-600 bg-amber-50 border-amber-200' };
    case 'failed':
      return { label: '실패', tone: 'text-rose-600 bg-rose-50 border-rose-200' };
    default:
      return { label: '대기', tone: 'text-slate-500 bg-slate-50 border-slate-200' };
  }
}

export default function JobsWorkspace({
  candidateJobs,
  fetchCompanyInfoAI,
  highlightedGapSkills,
  highlightedMatchedSkills,
  jobs,
  jobsMetadata,
  jobMatchState,
  matchedJobs,
  onRunJobMatch,
  resultPlaybook,
  scoreFilter,
  setScoreFilter,
  setSelectedCompanyModal,
  setVisibleJobs,
  userInfo,
  visibleJobs,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const topCandidateJobs = candidateJobs.slice(0, 3);
  const strongSkillCandidates = highlightedMatchedSkills.length > 0
    ? highlightedMatchedSkills
    : userInfo.skills.map((skill) => skill.name).slice(0, 6);
  const crawlStatus = formatCrawlStatus(jobsMetadata.lastCrawlStatus);
  const previewMatchedJobs = (candidateJobs.length > 0 ? candidateJobs : jobs).slice(0, 3).map((job, index) => {
    const score = [94, 87, 78][index] || Math.max(60, 92 - (index * 7));
    const reqSkills = Array.isArray(job.reqSkills) && job.reqSkills.length > 0
      ? job.reqSkills
      : ['직무 이해', '협업', '포트폴리오 정리'];
    return {
      ...job,
      id: job.id || `preview-job-${index}`,
      score,
      reqSkills,
      aiMatchReason: 'AI 모델 없이 카드 디자인을 확인하기 위한 임시 추천 카드입니다. 실제 매칭 실행 전에도 카드 간격, 점수 breakdown, CTA 위치를 검수할 수 있습니다.',
      aiStrengths: reqSkills.slice(0, 2),
      aiCautions: ['실제 AI 우선순위 아님', '디자인 확인용'],
      matchDetail: job.matchDetail || {
        roleScore: index === 0 ? 15 : 10,
        expScore: index === 0 ? 15 : 10,
        skillScore: index === 0 ? 27 : 22,
        fitScore: index === 0 ? 24 : 19,
        multiScore: index === 0 ? 13 : 10,
      },
      companyInfo: job.companyInfo || {
        name: job.company || '회사 정보',
        games: job.mainGame || job.gameCategory || '-',
        employees: '확인용',
        revenue: '확인용',
        benefits: '확인용',
        news: ['AI 모델 없이 표시되는 임시 카드입니다.'],
        aiAnalysis: '추천 공고 카드 UI 검수를 위한 임시 회사 정보입니다.',
      },
      url: job.url || 'https://www.gamejob.co.kr/',
      isPreviewMatch: true,
    };
  });
  const isPreviewResults = matchedJobs.length === 0 && !jobMatchState.running && previewMatchedJobs.length > 0;
  const displayMatchedJobs = matchedJobs.length > 0 ? matchedJobs : previewMatchedJobs;

  const scoreCounts = {
    all: displayMatchedJobs.length,
    '90+': displayMatchedJobs.filter((job) => job.score >= 90).length,
    '80+': displayMatchedJobs.filter((job) => job.score >= 80).length,
    '70+': displayMatchedJobs.filter((job) => job.score >= 70).length,
    '60+': displayMatchedJobs.filter((job) => job.score >= 60).length,
    '60-': displayMatchedJobs.filter((job) => job.score < 60).length,
  };

  const filteredMatchedJobs = displayMatchedJobs.filter((job) => {
    const scoreMatched = scoreFilter === 'all'
      ? true
      : scoreFilter === '60-'
        ? job.score < 60
        : job.score >= parseInt(scoreFilter, 10);
    if (!scoreMatched) return false;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const haystack = [
      job.company,
      job.title,
      job.role,
      ...(Array.isArray(job.reqSkills) ? job.reqSkills : []),
    ].join(' ').toLowerCase();

    return haystack.includes(query);
  });

  const visibleMatchedJobs = filteredMatchedJobs.slice(0, visibleJobs);
  const hasMatchResults = !jobMatchState.running && displayMatchedJobs.length > 0;
  const showEmptyResult = jobMatchState.attempted && !jobMatchState.running && !jobMatchState.error && displayMatchedJobs.length === 0;

  return (
    <div className="coach-jobs-workspace apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="coach-jobs-kpi-grid grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="coach-jobs-kpi-card rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">최근 반영일</p>
          <strong className="mt-2 block text-xl font-black tracking-tight text-slate-900">{jobsMetadata.latestAppliedDate || '정보 없음'}</strong>
          <p className="mt-1 text-sm text-slate-500">자동 수집 완료 기준</p>
        </article>
        <article className="coach-jobs-kpi-card rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">참고 공고</p>
          <strong className="mt-2 block text-2xl font-black tracking-tight text-slate-900">{jobsMetadata.referenceJobCount || jobs.length}건</strong>
          <p className="mt-1 text-sm text-slate-500">현재 매칭 기준 전체 공고</p>
        </article>
        <article className="coach-jobs-kpi-card rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">신규 반영</p>
          <strong className="mt-2 block text-2xl font-black tracking-tight text-slate-900">{jobsMetadata.newJobsCount || 0}건</strong>
          <p className="mt-1 text-sm text-slate-500">최근 배치 기준</p>
        </article>
        <article className="coach-jobs-kpi-card rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">매칭 결과</p>
          <strong className="mt-2 block text-2xl font-black tracking-tight text-slate-900">{displayMatchedJobs.length}건</strong>
          <p className="mt-1 text-sm text-slate-500">{isPreviewResults ? '디자인 확인용 임시 표시' : '사용자 실행 후 생성'}</p>
        </article>
      </div>

      <div className="coach-jobs-overview-grid grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="coach-jobs-match-shell rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">개인 매칭</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{resultPlaybook.jobsTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {resultPlaybook.jobsDescription}
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${crawlStatus.tone}`}>
              <ShieldCheck size={13} />
              {crawlStatus.label}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
            <article className="coach-jobs-workflow-card rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
              <p className="text-xs font-semibold text-slate-500">이 화면에서 하는 일</p>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                <p>공고 분석 탭에서 시장 흐름을 읽고, 여기서는 내 프로필 기준으로 후보를 우선순위화합니다.</p>
                <p>자동 매칭은 실행하지 않습니다. <strong className="text-slate-900">매칭하기</strong>를 눌렀을 때만 1회 AI 정렬을 수행합니다.</p>
              </div>
            </article>

            <article className="coach-jobs-filter-scope rounded-[24px] border border-slate-200 bg-white px-5 py-5">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-500">수집 직종</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(jobsMetadata.filters?.jobTags || []).slice(0, 8).map((tag) => (
                      <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-500">수집 경력</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(jobsMetadata.filters?.careerTags || []).map((tag) => (
                      <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
            <div className="flex items-center gap-2">
              <Clock3 size={16} className="text-slate-500" />
              <p className="text-sm font-semibold text-slate-900">최신 배치 메타데이터</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Last Success</p>
                <strong className="mt-1 block text-slate-900">{formatDateTime(jobsMetadata.lastSuccessfulCrawlAt)}</strong>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active Jobs</p>
                <strong className="mt-1 block text-slate-900">{jobsMetadata.activeJobsCount || jobsMetadata.referenceJobCount || jobs.length}건</strong>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRunJobMatch}
                disabled={jobMatchState.running}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                  jobMatchState.running
                    ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                    : 'bg-slate-900 text-white hover:bg-slate-700'
                }`}
              >
                {jobMatchState.running ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {jobMatchState.attempted ? '다시 매칭하기' : '매칭하기'}
              </button>
              <span className="rounded-full border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                공고 분석 탭에서 흐름을 본 뒤, 클릭 시점의 프로필 기준으로 1회 AI 매칭만 수행합니다.
              </span>
            </div>

            {jobMatchState.summary && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                <span>{jobMatchState.summary}</span>
              </div>
            )}

            {jobMatchState.error && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{jobMatchState.error}</span>
              </div>
            )}
          </div>
        </section>

        <aside className="coach-jobs-profile-shell rounded-[32px] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">프로필 스냅샷</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">매칭 전에 볼 기준</h3>
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-800">분석 기준 상위 후보</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {topCandidateJobs.length > 0 ? topCandidateJobs.map((job, index) => (
                  <span key={`${job.id}-${index}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                    {index + 1}. {job.company}
                  </span>
                )) : (
                  <span className="text-xs text-slate-500">먼저 분석을 실행하면 기준 후보가 정리됩니다.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">강하게 연결되는 역량</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {strongSkillCandidates.length > 0 ? strongSkillCandidates.map((skill) => (
                  <span key={skill} className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs text-emerald-700">
                    {skill}
                  </span>
                )) : (
                  <span className="text-xs text-slate-500">보유 기술 입력 후 분석하면 여기에 요약됩니다.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">보완 후보</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {highlightedGapSkills.length > 0 ? highlightedGapSkills.map((skill) => (
                  <span key={skill} className="rounded-full bg-amber-100 px-3 py-1.5 text-xs text-amber-700">
                    {skill}
                  </span>
                )) : (
                  <span className="text-xs text-slate-500">현재 기준에서 큰 공백은 아직 집계되지 않았습니다.</span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="coach-jobs-lens-grid grid gap-4 md:grid-cols-3">
        {resultPlaybook.jobsCards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
            <h3 className="mt-2 text-base font-bold leading-snug text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
          </article>
        ))}
      </div>

      <section className="coach-jobs-results-shell rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Matched Jobs</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">AI 추천 공고 목록</h3>
            <p className="mt-2 text-sm text-slate-600">
              {isPreviewResults
                ? 'AI 모델 없이 카드 UI를 검수할 수 있도록 실제 공고 데이터 일부를 임시 카드로 표시하고 있습니다.'
                : '매칭 실행 후 생성된 결과입니다. 검색어와 점수 구간으로 후보를 좁혀 보세요.'}
            </p>
          </div>
          <div className="w-full max-w-md">
            <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              <Search size={13} />
              Search
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setVisibleJobs(10);
                }}
                placeholder="회사명, 공고명, 스킬 검색"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                disabled={!hasMatchResults}
              />
            </div>
          </div>
        </div>

        {hasMatchResults && (
          <div className="mt-5 flex flex-wrap gap-2">
            {isPreviewResults && (
              <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                확인용 임시 카드
              </span>
            )}
            {[
              { key: 'all', label: '전체', color: 'bg-slate-100 text-slate-700' },
              { key: '90+', label: '90점↑', color: 'bg-emerald-100 text-emerald-700' },
              { key: '80+', label: '80점↑', color: 'bg-green-100 text-green-700' },
              { key: '70+', label: '70점↑', color: 'bg-blue-100 text-blue-700' },
              { key: '60+', label: '60점↑', color: 'bg-amber-100 text-amber-700' },
              { key: '60-', label: '60점↓', color: 'bg-red-100 text-red-700' },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => {
                  setScoreFilter(filter.key);
                  setVisibleJobs(10);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                  scoreFilter === filter.key
                    ? `${filter.color} border-current shadow-sm`
                    : 'border-slate-200 bg-white text-slate-400 hover:border-slate-400'
                }`}
              >
                {filter.label}
                <span className="ml-1 opacity-60">({scoreCounts[filter.key]})</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-4">
          {jobMatchState.running && (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-16 text-center">
              <Loader2 size={28} className="mx-auto mb-4 animate-spin text-slate-500" />
              <p className="text-lg font-bold text-slate-700">AI가 공개 공고와 프로필을 대조하고 있습니다.</p>
              <p className="mt-2 text-sm text-slate-500">탭을 벗어나지 않아도 되지만, 결과가 나올 때까지 이 화면을 유지하는 편이 좋습니다.</p>
            </div>
          )}

          {!jobMatchState.running && !jobMatchState.attempted && !isPreviewResults && (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <Target size={28} className="mx-auto mb-4 text-slate-400" />
              <p className="text-lg font-bold text-slate-700">아직 AI 추천 공고 매칭을 실행하지 않았습니다.</p>
              <p className="mt-2 text-sm text-slate-500">자동 수집된 공개 공고를 기준으로 한 번만 실행되며, 클릭하기 전에는 결과를 생성하지 않습니다.</p>
            </div>
          )}

          {showEmptyResult && (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <AlertCircle size={28} className="mx-auto mb-4 text-slate-400" />
              <p className="text-lg font-bold text-slate-700">현재 프로필 기준으로 추천 우선순위를 만들지 못했습니다.</p>
              <p className="mt-2 text-sm text-slate-500">직군, 세부 직무, 보유 기술을 조금 더 구체적으로 입력한 뒤 다시 매칭해 보세요.</p>
            </div>
          )}

          {visibleMatchedJobs.map((job, index) => (
            <article key={job.id} className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">{job.company}</span>
                    {index === 0 && !job.pinned && (
                      <span className="flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                        <Star size={12} className="fill-current" /> Best Match
                      </span>
                    )}
                    {job.pinned && (
                      <span className="flex items-center gap-1 rounded-md border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                        <Pin size={12} /> {job.pinnedRank}순위 지정
                      </span>
                    )}
                  </div>
                  <h4 className="text-xl font-bold text-slate-900">{job.title}</h4>
                  <p className="mt-1 text-sm text-slate-500">{job.role} · 경력 {job.reqExp === 0 ? '신입/무관' : `${job.reqExp}년 이상`}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Array.isArray(job.reqSkills) ? job.reqSkills : []).map((skill) => (
                      <span key={skill} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600"># {skill}</span>
                    ))}
                  </div>

                  {job.aiMatchReason && (
                    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">AI Match Reason</p>
                      <p className="mt-2 text-sm leading-relaxed text-indigo-900">{job.aiMatchReason}</p>
                      {(job.aiStrengths?.length > 0 || job.aiCautions?.length > 0) && (
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-bold text-slate-700">강점 포인트</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(job.aiStrengths || []).map((item) => (
                                <span key={item} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">{item}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700">주의 포인트</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(job.aiCautions || []).map((item) => (
                                <span key={item} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">{item}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {job.matchDetail && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                        {[
                          { label: '직군', score: job.matchDetail.roleScore, max: 15, color: 'bg-blue-500' },
                          { label: '경력', score: job.matchDetail.expScore, max: 15, color: 'bg-green-500' },
                          { label: '스킬', score: job.matchDetail.skillScore, max: 30, color: 'bg-purple-500' },
                          { label: '정합도', score: job.matchDetail.fitScore, max: 25, color: 'bg-orange-500' },
                          { label: '복수매칭', score: job.matchDetail.multiScore, max: 15, color: 'bg-pink-500' },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="mb-1 text-[10px] text-slate-500">{item.label}</div>
                            <div className="h-1.5 w-full rounded-full bg-slate-200">
                              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.max > 0 ? (item.score / item.max) * 100 : 0}%` }} />
                            </div>
                            <div className="mt-1 text-[10px] font-bold text-slate-600">{item.score}/{item.max}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <span className="shrink-0 text-[11px] font-bold text-slate-500">직접 링크:</span>
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="truncate text-[11px] text-indigo-500 underline underline-offset-2">
                      {job.url}
                    </a>
                  </div>
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 xl:w-44">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center">
                    <div className="text-3xl font-black tracking-tight text-slate-900">
                      {job.score}
                      <span className="text-sm font-medium text-slate-400"> / 100</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${job.score >= 80 ? 'bg-emerald-500' : job.score >= 60 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${job.score}%` }} />
                    </div>
                  </div>

                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white transition hover:bg-indigo-700">
                    공고 바로가기 <ExternalLink size={12} />
                  </a>
                  {job.companyInfo ? (
                    <button
                      type="button"
                      onClick={() => setSelectedCompanyModal(job.companyInfo)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      회사 정보 보기 <Building2 size={12} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fetchCompanyInfoAI(job)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      회사 정보 보기 <Building2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        {hasMatchResults && visibleJobs < filteredMatchedJobs.length && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleJobs((prev) => prev + 10)}
              className="rounded-full border border-slate-200 bg-slate-50 px-8 py-3 text-sm font-bold text-slate-600 transition hover:bg-white"
            >
              더보기 ({Math.min(visibleJobs, filteredMatchedJobs.length)} / {filteredMatchedJobs.length})
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
