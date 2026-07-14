export const MAX_PORTFOLIO_FILES = 5;
export const MAX_SUBMISSION_FILE_SIZE_BYTES = 10 * 1024 * 1024;

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
  return { error: '', files: [...current, ...selected] };
}
