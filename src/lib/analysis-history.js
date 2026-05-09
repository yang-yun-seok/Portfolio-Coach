import { getProfileDisplayRole, normalizeUserProfile } from '../data/skills';

export const WORKSPACE_SAVE_KEY = 'portfolio_bot_save';
export const ANALYSIS_HISTORY_KEY = 'portfolio_bot_history';
export const MAX_ANALYSIS_HISTORY = 6;

export function getCoverLetterCommonItems(results) {
  const items = results?.coverLetterImprovements?.common
    ?? (Array.isArray(results?.coverLetterImprovements) ? results.coverLetterImprovements : []);
  return Array.isArray(items) ? items : [];
}

export function getSnapshotMeta(snapshot) {
  const normalized = normalizeUserProfile(snapshot?.userInfo || {});
  const jobs = Array.isArray(snapshot?.recommendedJobs) ? snapshot.recommendedJobs : [];
  const topJobs = jobs.slice(0, 3);

  return {
    roleLabel: snapshot?.userInfo ? getProfileDisplayRole(normalized) : '미정',
    roleGroup: normalized.roleGroup || '',
    subRole: normalized.subRole || '',
    skillNames: Array.isArray(normalized.skills) ? normalized.skills.map((skill) => skill.name).filter(Boolean) : [],
    topCompanies: topJobs.map((job) => job.company).filter(Boolean),
    topScore: typeof topJobs[0]?.score === 'number' ? Math.round(topJobs[0].score) : null,
    hasGithub: Boolean(snapshot?.results?.githubPortfolioAnalysis?.repoUrl),
    resumeCount: Array.isArray(snapshot?.results?.resumeImprovements) ? snapshot.results.resumeImprovements.length : 0,
    coverCount: getCoverLetterCommonItems(snapshot?.results).length,
    portfolioCount: Array.isArray(snapshot?.results?.portfolioImprovements) ? snapshot.results.portfolioImprovements.length : 0,
    hasResults: Boolean(snapshot?.results),
  };
}

export function buildHistoryEntry(snapshot) {
  const savedAt = snapshot?.savedAt || new Date().toISOString();
  return {
    id: snapshot?.id || `${savedAt}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt,
    userInfo: snapshot?.userInfo || null,
    results: snapshot?.results || null,
    recommendedJobs: Array.isArray(snapshot?.recommendedJobs) ? snapshot.recommendedJobs : [],
    instructorFeedback: snapshot?.instructorFeedback || null,
    meta: getSnapshotMeta(snapshot),
  };
}

function diffSkillNames(current = [], previous = []) {
  const prevSet = new Set(previous);
  const currentSet = new Set(current);

  return {
    added: current.filter((name) => !prevSet.has(name)),
    removed: previous.filter((name) => !currentSet.has(name)),
  };
}

export function buildSnapshotComparison(currentSnapshot, compareSnapshot) {
  if (!currentSnapshot || !compareSnapshot) return null;

  const currentMeta = getSnapshotMeta(currentSnapshot);
  const compareMeta = compareSnapshot.meta || getSnapshotMeta(compareSnapshot);
  const skillDiff = diffSkillNames(currentMeta.skillNames, compareMeta.skillNames);
  const currentTopCompany = currentMeta.topCompanies[0] || '';
  const compareTopCompany = compareMeta.topCompanies[0] || '';
  const topScoreDelta =
    typeof currentMeta.topScore === 'number' && typeof compareMeta.topScore === 'number'
      ? currentMeta.topScore - compareMeta.topScore
      : null;
  const githubStatus =
    currentMeta.hasGithub && compareMeta.hasGithub
      ? '유지'
      : currentMeta.hasGithub && !compareMeta.hasGithub
        ? '추가됨'
        : !currentMeta.hasGithub && compareMeta.hasGithub
          ? '제거됨'
          : '없음';
  const highlights = [
    currentTopCompany || compareTopCompany
      ? `1순위 공고 ${compareTopCompany && currentTopCompany && compareTopCompany !== currentTopCompany ? `${compareTopCompany} → ${currentTopCompany}로 변경` : `${currentTopCompany || compareTopCompany} 유지`}`
      : '1순위 공고 비교 정보가 없습니다.',
    topScoreDelta === null
      ? '매칭 점수 비교 정보가 부족합니다.'
      : `1순위 매칭 점수 ${compareMeta.topScore} → ${currentMeta.topScore} (${topScoreDelta > 0 ? `+${topScoreDelta}` : topScoreDelta})`,
    skillDiff.added.length > 0
      ? `추가된 역량: ${skillDiff.added.slice(0, 4).join(', ')}`
      : '추가된 역량은 없습니다.',
    skillDiff.removed.length > 0
      ? `제외된 역량: ${skillDiff.removed.slice(0, 4).join(', ')}`
      : '제외된 역량은 없습니다.',
    `GitHub 기술문서화 상태: ${githubStatus}`,
    `피드백 볼륨: 이력서 ${compareMeta.resumeCount} → ${currentMeta.resumeCount}, 포트폴리오 ${compareMeta.portfolioCount} → ${currentMeta.portfolioCount}`,
  ];

  return {
    currentMeta,
    compareMeta,
    compareSavedAt: compareSnapshot.savedAt,
    topScoreDelta,
    skillDiff,
    githubStatus,
    highlights,
  };
}
