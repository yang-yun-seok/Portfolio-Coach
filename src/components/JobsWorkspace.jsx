import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Database,
  ExternalLink,
  Loader2,
  Pin,
  RefreshCw,
  Search,
  Star,
  Target,
} from 'lucide-react';

function formatUpdatedAt(jobs) {
  const values = jobs
    .map((job) => job.updatedAt)
    .filter(Boolean)
    .sort()
    .reverse();
  return values[0] || '정보 없음';
}

export default function JobsWorkspace({
  CRAWL_CAREER_TAGS,
  CRAWL_JOB_TAGS,
  crawlCareerTags,
  crawlJobTags,
  crawlStatus,
  fetchCompanyInfoAI,
  highlightedGapSkills,
  highlightedMatchedSkills,
  jobs,
  onToggleCareerTag,
  onToggleJobTag,
  recommendedJobs,
  resultPlaybook,
  scoreFilter,
  setScoreFilter,
  setSelectedCompanyModal,
  setVisibleJobs,
  startCrawl,
  stopCrawl,
  userInfo,
  visibleJobs,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const latestUpdatedAt = formatUpdatedAt(jobs);
  const selectedTags = [...crawlJobTags, ...crawlCareerTags];
  const topRecommendedJobs = recommendedJobs.slice(0, 3);
  const strongSkillCandidates = highlightedMatchedSkills.length > 0
    ? highlightedMatchedSkills
    : userInfo.skills.map((skill) => skill.name).slice(0, 6);

  const scoreCounts = {
    all: recommendedJobs.length,
    '90+': recommendedJobs.filter((job) => job.score >= 90).length,
    '80+': recommendedJobs.filter((job) => job.score >= 80).length,
    '70+': recommendedJobs.filter((job) => job.score >= 70).length,
    '60+': recommendedJobs.filter((job) => job.score >= 60).length,
    '60-': recommendedJobs.filter((job) => job.score < 60).length,
  };

  const filteredRecommendedJobs = recommendedJobs.filter((job) => {
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

  const visibleRecommendedJobs = filteredRecommendedJobs.slice(0, visibleJobs);

  return (
    <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="apple-intro">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{resultPlaybook.jobsTitle}</h2>
        <p className="text-slate-500">{resultPlaybook.jobsDescription}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">추천 공고</p>
          <strong className="mt-3 block text-3xl font-black tracking-tight text-slate-900">{recommendedJobs.length}</strong>
          <p className="mt-2 text-sm text-slate-500">현재 분석 결과에서 추린 지원 후보 수입니다.</p>
        </article>
        <article className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">80점 이상</p>
          <strong className="mt-3 block text-3xl font-black tracking-tight text-slate-900">{scoreCounts['80+']}</strong>
          <p className="mt-2 text-sm text-slate-500">바로 지원 검토 가능한 우선 후보입니다.</p>
        </article>
        <article className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">캐시 공고</p>
          <strong className="mt-3 block text-3xl font-black tracking-tight text-slate-900">{jobs.length}</strong>
          <p className="mt-2 text-sm text-slate-500">현재 서비스가 참고하는 GameJob 데이터 수입니다.</p>
        </article>
        <article className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">최근 반영</p>
          <strong className="mt-3 block text-xl font-black tracking-tight text-slate-900">{latestUpdatedAt}</strong>
          <p className="mt-2 text-sm text-slate-500">정적 데이터 기준 마지막 업데이트 일자입니다.</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Crawler Console</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">GameJob 데이터 운영</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                외부 크롤러 페이지의 핵심 흐름을 현재 서비스 안으로 옮겼습니다. 태그를 고르고 최신 공고를 수집한 뒤 바로 추천 결과에 반영할 수 있습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">선택 조건</p>
              <p className="mt-1">{selectedTags.length > 0 ? selectedTags.join(', ') : '태그를 선택하세요.'}</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">직종 태그</p>
              <div className="flex flex-wrap gap-2">
                {CRAWL_JOB_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleJobTag(tag)}
                    disabled={crawlStatus.running}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      crawlJobTags.includes(tag)
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-400 hover:bg-white'
                    } ${crawlStatus.running ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">경력 태그</p>
              <div className="flex flex-wrap gap-2">
                {CRAWL_CAREER_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleCareerTag(tag)}
                    disabled={crawlStatus.running}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      crawlCareerTags.includes(tag)
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:bg-white'
                    } ${crawlStatus.running ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-slate-500" />
                <p className="text-sm font-semibold text-slate-900">서버 실행형 크롤링</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                브라우저에서 직접 크롤링하지 않고 서버에서 실행합니다. 페이지를 닫지 말아야 하는 것은 아니지만, 진행 상태를 보려면 이 화면을 유지하는 편이 좋습니다.
              </p>

              {crawlStatus.running && (
                <div className="mt-4 space-y-3">
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${crawlStatus.percent}%` }} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Loader2 size={14} className="animate-spin" />
                    <span>{crawlStatus.message}</span>
                  </div>
                </div>
              )}

              {!crawlStatus.running && crawlStatus.message && crawlStatus.percent === 100 && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{crawlStatus.message}</span>
                </div>
              )}

              {!crawlStatus.running && crawlStatus.isError && crawlStatus.message && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{crawlStatus.message}</span>
                </div>
              )}

              {crawlStatus.log.length > 0 && (
                <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-4 text-xs text-slate-300">
                  <p className="mb-2 font-semibold uppercase tracking-[0.18em] text-slate-500">Live Log</p>
                  <div className="max-h-36 space-y-1 overflow-y-auto custom-scrollbar">
                    {crawlStatus.log.map((line, index) => (
                      <div key={`${index}-${line}`}>{line}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                {!crawlStatus.running ? (
                  <button
                    type="button"
                    onClick={startCrawl}
                    disabled={selectedTags.length === 0}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                      selectedTags.length === 0
                        ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                        : 'bg-slate-900 text-white hover:bg-slate-700'
                    }`}
                  >
                    <RefreshCw size={16} />
                    최신 공고 수집
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCrawl}
                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    중단
                  </button>
                )}
                <div className="rounded-full border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
                  크롤링 후 `api/jobs.json`을 다시 읽어 목록을 갱신합니다.
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-[32px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-300">Match Snapshot</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight">상위 공고 기준 현재 포지션</h3>
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-200">추천 상위 기업</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {topRecommendedJobs.length > 0 ? topRecommendedJobs.map((job, index) => (
                  <span key={`${job.id}-${index}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200">
                    {index + 1}. {job.company}
                  </span>
                )) : (
                  <span className="text-xs text-slate-400">분석 결과가 아직 없습니다.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">매칭이 강한 역량</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {strongSkillCandidates.length > 0 ? strongSkillCandidates.map((skill) => (
                  <span key={skill} className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs text-emerald-100">
                    {skill}
                  </span>
                )) : (
                  <span className="text-xs text-slate-400">직무 역량을 입력하면 강점 축을 여기서 요약합니다.</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">상위 공고 기준 보완 후보</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {highlightedGapSkills.length > 0 ? highlightedGapSkills.map((skill) => (
                  <span key={skill} className="rounded-full bg-amber-400/15 px-3 py-1.5 text-xs text-amber-100">
                    {skill}
                  </span>
                )) : (
                  <span className="text-xs text-slate-400">현재 상위 공고 기준으로 큰 공백은 보이지 않습니다.</span>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Recommended Jobs</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900">지원 후보 공고 목록</h3>
            <p className="mt-2 text-sm text-slate-600">검색어와 점수 구간으로 후보를 줄여서 볼 수 있습니다.</p>
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
              />
            </div>
          </div>
        </div>

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

        <div className="mt-6 grid gap-4">
          {visibleRecommendedJobs.length > 0 ? visibleRecommendedJobs.map((job, index) => (
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
                  <p className="mt-1 text-sm text-slate-500">{job.role} · 경력 {job.reqExp === 0 ? '신입' : `${job.reqExp}년 이상`}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Array.isArray(job.reqSkills) ? job.reqSkills : []).map((skill) => (
                      <span key={skill} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600"># {skill}</span>
                    ))}
                  </div>

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

                      {job.matchDetail.matchedSkills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {job.matchDetail.matchedSkills.map((skill, skillIndex) => (
                            <span key={`${skill.name}-${skillIndex}`} className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              {skill.name} ({skill.level})
                            </span>
                          ))}
                          {job.matchDetail.unmatchedSkills.map((skill, skillIndex) => (
                            <span key={`${skill}-gap-${skillIndex}`} className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-400 line-through">
                              {skill}
                            </span>
                          ))}
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
          )) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <p className="text-lg font-bold text-slate-700">조건에 맞는 추천 공고가 없습니다.</p>
              <p className="mt-2 text-sm text-slate-500">검색어 또는 점수 필터를 조정해 다시 확인하세요.</p>
            </div>
          )}
        </div>

        {visibleJobs < filteredRecommendedJobs.length && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleJobs((prev) => prev + 10)}
              className="rounded-full border border-slate-200 bg-slate-50 px-8 py-3 text-sm font-bold text-slate-600 transition hover:bg-white"
            >
              더보기 ({Math.min(visibleJobs, filteredRecommendedJobs.length)} / {filteredRecommendedJobs.length})
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
