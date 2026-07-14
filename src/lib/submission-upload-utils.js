const STORAGE_NOT_READY_CODES = new Set([
  'storage/bucket-not-found',
  'storage/no-default-bucket',
  'storage/project-not-found',
  'storage/unknown',
]);

export async function rollbackUploadedObjects(storageClient, objectRefs = []) {
  if (!storageClient?.deleteObject || objectRefs.length === 0) return [];
  return Promise.allSettled(objectRefs.map((objectRef) => storageClient.deleteObject(objectRef)));
}

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
  if (!code && error?.message) return error.message;
  return '제출을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
