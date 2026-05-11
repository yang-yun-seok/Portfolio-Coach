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

  const scoreCounts = {
    all: matchedJobs.length,
    '90+': matchedJobs.filter((job) => job.score >= 90).length,
    '80+': matchedJobs.filter((job) => job.score >= 80).length,
    '70+': matchedJobs.filter((job) => job.score >= 70).length,
    '60+': matchedJobs.filter((job) => job.score >= 60).length,
    '60-': matchedJobs.filter((job) => job.score < 60).length,
  };

  const filteredMatchedJobs = matchedJobs.filter((job) => {
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
  const hasMatchResults = jobMatchState.attempted && matchedJobs.length > 0;
  const showEmptyResult = jobMatchState.attempted && !jobMatchState.running && !jobMatchState.error && matchedJobs.length === 0;

  return (
    <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="apple-intro">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{resultPlaybook.jobsTitle}</h2>
        <p className="text-slate-500">{resultPlaybook.jobsDescription}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">최근 반영일</p>
          <strong className="mt-3 block text-xl font-black tracking-tight text-slate-900">{jobsMetadata.latestAppliedDate || '정보 없음'}</strong>
          <p className="mt-2 text-sm text-slate-500">매일 00시 자동 크롤링 완료 기준입니다.</p>
        </article>
        <article className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">참고 공고 수</p>
          <strong className="mt-3 block text-3xl font-black tracking-tight text-slate-900">{jobsMetadata.referenceJobCount || jobs.length}</strong>
          <p className="mt-2 text-sm text-slate-500">현재 공개 추천에 반영되는 유효 공고 수입니다.</p>
        </article>
        <article className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">신규 반영</p>
          <strong className="mt-3 block text-3xl font-black tracking-tight text-slate-900">{jobsMetadata.newJobsCount || 0}</strong>
          <p className="mt-2 text-sm text-slate-500">가장 최근 자동 수집 배치에서 추가된 공고입니다.</p>
        </article>
        <article className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">AI 매칭 결과</p>
          <strong className="mt-3 block text-3xl font-black tracking-tight text-slate-900">{matchedJobs.length}</strong>
          <p className="mt-2 text-sm text-slate-500">`매칭하기` 실행 후 생성된 개인화 추천 수입니다.</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Daily Crawl Policy</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">추천 공고 매칭 기준</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                시장 전체 흐름과 공고 분포는 `공고 분석` 탭에서 확인하고, 이 화면은 개인 프로필 기준 AI 매칭만 다룹니다.
                자동 수집된 공고를 기준으로 아래 `매칭하기` 버튼을 눌렀을 때만 1회 추천을 계산합니다.
              </p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${crawlStatus.tone}`}>
              <ShieldCheck size={13} />
              {crawlStatus.label}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
              <p className="text-xs font-semibold text-slate-500">직종 조건</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(jobsMetadata.filters?.jobTags || []).map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
              <p className="text-xs font-semibold text-slate-500">경력 조건</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(jobsMetadata.filters?.careerTags || []).map((tag) => (
                  <span key={tag} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-5">
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

        <aside className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Profile Snapshot</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight">현재 프로필 기준 참고 포인트</h3>
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-200">분석 기준 상위 후보</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {topCandidateJobs.length > 0 ? topCandidateJobs.map((job, index) => (
                  <span key={`${job.id}-${index}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
                    {index + 1}. {job.company}
                  </span>
                )) : (
                  <span className="text-xs text-slate-400">먼저 분석을 실행하면 기준 후보가 정리됩니다.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">강하게 연결되는 역량</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {strongSkillCandidates.length > 0 ? strongSkillCandidates.map((skill) => (
                  <span key={skill} className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs text-emerald-100">
                    {skill}
                  </span>
                )) : (
                  <span className="text-xs text-slate-400">보유 기술 입력 후 분석하면 여기에 요약됩니다.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">보완 후보</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {highlightedGapSkills.length > 0 ? highlightedGapSkills.map((skill) => (
                  <span key={skill} className="rounded-full bg-amber-400/15 px-3 py-1.5 text-xs text-amber-100">
                    {skill}
                  </span>
                )) : (
                  <span className="text-xs text-slate-400">현재 기준에서 큰 공백은 아직 집계되지 않았습니다.</span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {resultPlaybook.jobsCards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
            <h3 className="mt-2 text-base font-bold leading-snug text-slate-900">{card.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
          </article>
        ))}
      </div>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Matched Jobs</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">AI 추천 공고 목록</h3>
            <p className="mt-2 text-sm text-slate-600">매칭 실행 후에만 결과가 생성됩니다. 검색어와 점수 구간으로 후보를 좁혀 보세요.</p>
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

          {!jobMatchState.running && !jobMatchState.attempted && (
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
