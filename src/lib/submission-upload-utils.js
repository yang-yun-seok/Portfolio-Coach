const STORAGE_NOT_READY_CODES = new Set([
  'admin_not_configured',
  'bucket_missing',
  'bucket_public',
  'not_configured',
  'storage_not_configured',
  'storage_unavailable',
  'storage/bucket-not-found',
  'storage/no-default-bucket',
  'storage/project-not-found',
  'storage/unknown',
]);

export function getReadableSubmissionError(error) {
  const code = String(error?.code || '').trim();
  if (STORAGE_NOT_READY_CODES.has(code)) {
    return '자료 제출은 현재 준비 중입니다. 담당자에게 문의해 주세요.';
  }
  if (code === 'storage/unauthorized' || code === 'permission-denied') {
    return '로그인 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  if (code === 'storage/retry-limit-exceeded' || code === 'storage/canceled') {
    return '파일 업로드가 완료되지 않았습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  if (code === 'invalid_file_size' || Number(error?.statusCode) === 413) {
    return 'PDF 파일은 각각 10MB 이하로 첨부해 주세요.';
  }
  if (code === 'invalid_file_type') {
    return 'PDF 형식의 파일만 제출할 수 있습니다.';
  }
  if (code === 'submission_file_required') {
    return '이력서, 자기소개서, 포트폴리오 중 하나 이상의 PDF를 첨부해 주세요.';
  }
  if (code === 'submission_in_progress') {
    return '이미 제출을 처리하고 있습니다. 완료된 뒤 다시 시도해 주세요.';
  }
  if (code === 'storage_conflict') {
    return '같은 제출이 이미 처리되었습니다. 제출 이력을 새로 확인해 주세요.';
  }
  if (code === 'storage_upload_failed') {
    return '파일 전송을 완료하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.';
  }
  if (!code && error?.message) return error.message;
  return '제출을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
