import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle,
  ExternalLink,
  Loader2,
  Pin,
  Search,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';

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
  const displayMatchedJobs = matchedJobs;
  const strongMatchCount = displayMatchedJobs.filter((job) => job.score >= 80).length;

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
          <p className="mt-1 text-sm text-slate-500">현재 공고 기준일</p>
        </article>
        <article className="coach-jobs-kpi-card rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">참고 공고</p>
          <strong className="mt-2 block text-2xl font-black tracking-tight text-slate-900">{jobsMetadata.referenceJobCount || jobs.length}건</strong>
          <p className="mt-1 text-sm text-slate-500">추천에 참고하는 공고</p>
        </article>
        <article className="coach-jobs-kpi-card rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">높은 추천</p>
          <strong className="mt-2 block text-2xl font-black tracking-tight text-slate-900">{strongMatchCount}건</strong>
          <p className="mt-1 text-sm text-slate-500">우선 검토할 추천 공고</p>
        </article>
        <article className="coach-jobs-kpi-card rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">매칭 결과</p>
          <strong className="mt-2 block text-2xl font-black tracking-tight text-slate-900">{displayMatchedJobs.length}건</strong>
          <p className="mt-1 text-sm text-slate-500">사용자 실행 후 생성</p>
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
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              기준일 {jobsMetadata.latestAppliedDate || '정보 없음'}
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
              <p className="text-xs font-semibold text-slate-500">결과에서 확인할 것</p>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
                <p>추천 이유, 강점 포인트, 주의 포인트를 먼저 확인하세요.</p>
                <p>점수는 후보를 좁히기 위한 참고값입니다. 실제 지원 여부는 공고 내용과 포트폴리오 준비도를 함께 보고 결정하세요.</p>
              </div>
            </article>
          </div>

          <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-slate-500" />
              <p className="text-sm font-semibold text-slate-900">추천 만들기</p>
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
                클릭 시점의 프로필을 바탕으로 추천 공고를 정렬합니다.
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
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">매칭 전에 확인할 내용</h3>
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-800">우선 확인할 공고</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {topCandidateJobs.length > 0 ? topCandidateJobs.map((job, index) => (
                  <span key={`${job.id}-${index}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
                    {index + 1}. {job.company}
                  </span>
                )) : (
                  <span className="text-xs text-slate-500">먼저 분석을 실행하면 후보 공고가 정리됩니다.</span>
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
                  <span className="text-xs text-slate-500">아직 크게 보완할 항목이 집계되지 않았습니다.</span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section className="coach-jobs-results-shell rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Matched Jobs</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">AI 추천 공고 목록</h3>
            <p className="mt-2 text-sm text-slate-600">
              매칭 실행 후 생성된 결과입니다. 검색어와 추천 강도로 후보를 좁혀 보세요.
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
            {[
              { key: 'all', label: '전체', color: 'bg-slate-100 text-slate-700' },
              { key: '90+', label: '매우 높음', color: 'bg-emerald-100 text-emerald-700' },
              { key: '80+', label: '높음', color: 'bg-green-100 text-green-700' },
              { key: '70+', label: '검토', color: 'bg-blue-100 text-blue-700' },
              { key: '60+', label: '보완 후 검토', color: 'bg-amber-100 text-amber-700' },
              { key: '60-', label: '낮음', color: 'bg-red-100 text-red-700' },
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
              <p className="mt-2 text-sm text-slate-500">매칭하기를 누르면 현재 프로필에 맞춰 추천 공고가 정리됩니다.</p>
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
