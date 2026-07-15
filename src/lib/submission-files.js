export const MAX_PORTFOLIO_FILES = 5;
export const MAX_SUBMISSION_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function getClientFileFingerprint(file) {
  if (!file) return '';
  return [
    String(file.name || '').trim().toLowerCase(),
    Number(file.size) || 0,
    Number(file.lastModified) || 0,
  ].join(':');
}

export function findDuplicateSubmissionFiles({ resumeFile, coverLetterFile, portfolioFiles = [] } = {}) {
  const rows = [resumeFile, coverLetterFile, ...(Array.isArray(portfolioFiles) ? portfolioFiles : [])]
    .filter(Boolean);
  const fingerprints = new Set();
  return rows.filter((file) => {
    const fingerprint = getClientFileFingerprint(file);
    if (!fingerprint || !fingerprints.has(fingerprint)) {
      if (fingerprint) fingerprints.add(fingerprint);
      return false;
    }
    return true;
  });
}

function getSubmissionFileNames(submission) {
  const files = submission?.files || {};
  return [
    files.resume?.fileName,
    files.coverLetter?.fileName,
    ...(Array.isArray(files.portfolio) ? files.portfolio.map((file) => file?.fileName) : []),
  ].filter(Boolean);
}

export function buildSubmissionChangeSummary(latestSubmission, previousSubmission) {
  if (!latestSubmission || !previousSubmission) return [];

  const changes = [];
  const latestFiles = getSubmissionFileNames(latestSubmission);
  const previousFiles = getSubmissionFileNames(previousSubmission);
  const addedFiles = latestFiles.filter((fileName) => !previousFiles.includes(fileName));
  const removedFiles = previousFiles.filter((fileName) => !latestFiles.includes(fileName));
  const latestSkills = Array.isArray(latestSubmission.skills) ? latestSubmission.skills : [];
  const previousSkills = Array.isArray(previousSubmission.skills) ? previousSubmission.skills : [];
  const addedSkills = latestSkills.filter((skill) => !previousSkills.includes(skill));

  if (addedFiles.length) changes.push(`새 파일 ${addedFiles.length}개`);
  if (removedFiles.length) changes.push(`교체·제외 파일 ${removedFiles.length}개`);
  if (addedSkills.length) changes.push(`추가 역량 ${addedSkills.slice(0, 3).join(', ')}`);
  if (latestSubmission.subRole !== previousSubmission.subRole) changes.push('세부 직무 변경');
  if (!changes.length) changes.push('파일 구성과 지원 정보가 이전 제출과 같습니다');
  return changes;
}

export function getSubmissionFileError(file, label = '파일') {
  if (!file) return '';
  if (file.size > MAX_SUBMISSION_FILE_SIZE_BYTES) {
    return `${label} 파일은 10MB 이하만 첨부할 수 있습니다.`;
  }
  const isPdf = String(file.type || '').includes('pdf')
    || String(file.name || '').toLowerCase().endsWith('.pdf');
  return isPdf ? '' : `${label} 파일은 PDF만 첨부할 수 있습니다.`;
}

export function appendPortfolioFiles(currentFiles = [], selectedFiles = []) {
  const current = Array.isArray(currentFiles) ? currentFiles : [];
  const selected = Array.from(selectedFiles || []);
  if (current.length + selected.length > MAX_PORTFOLIO_FILES) {
    return {
      error: `포트폴리오는 최대 ${MAX_PORTFOLIO_FILES}개까지만 첨부할 수 있습니다.`,
      files: current,
    };
  }
  const invalidFile = selected.find((file) => getSubmissionFileError(file, '포트폴리오'));
  if (invalidFile) {
    return {
      error: getSubmissionFileError(invalidFile, '포트폴리오'),
      files: current,
    };
  }
  const existingFingerprints = new Set(current.map(getClientFileFingerprint).filter(Boolean));
  const selectedFingerprints = new Set();
  const duplicateFile = selected.find((file) => {
    const fingerprint = getClientFileFingerprint(file);
    if (!fingerprint) return false;
    if (existingFingerprints.has(fingerprint) || selectedFingerprints.has(fingerprint)) return true;
    selectedFingerprints.add(fingerprint);
    return false;
  });
  if (duplicateFile) {
    return {
      error: `${duplicateFile.name || '같은 파일'}은 이미 첨부되어 있습니다.`,
      files: current,
    };
  }
  return { error: '', files: [...current, ...selected] };
}
