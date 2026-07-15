import assert from 'node:assert/strict';
import test from 'node:test';
import { getReadableSubmissionError } from '../src/lib/submission-upload-utils.js';

test('getReadableSubmissionError hides Firebase storage internals', () => {
  assert.equal(
    getReadableSubmissionError({ code: 'storage/bucket-not-found', message: 'raw storage error' }),
    '자료 제출은 현재 준비 중입니다. 담당자에게 문의해 주세요.',
  );
  assert.equal(
    getReadableSubmissionError({ code: 'storage/unauthorized' }),
    '로그인 상태를 확인한 뒤 다시 시도해 주세요.',
  );
  assert.equal(getReadableSubmissionError(new Error('이력서 파일은 PDF만 허용합니다.')), '이력서 파일은 PDF만 허용합니다.');
});

test('getReadableSubmissionError hides server storage internals', () => {
  assert.equal(
    getReadableSubmissionError({ code: 'bucket_public', message: 'raw bucket error' }),
    '자료 제출은 현재 준비 중입니다. 담당자에게 문의해 주세요.',
  );
});

test('getReadableSubmissionError explains actionable upload failures', () => {
  assert.equal(
    getReadableSubmissionError({ code: 'invalid_file_size' }),
    'PDF 파일은 각각 10MB 이하로 첨부해 주세요.',
  );
  assert.equal(
    getReadableSubmissionError({ code: 'invalid_file_type' }),
    'PDF 형식의 파일만 제출할 수 있습니다.',
  );
  assert.equal(
    getReadableSubmissionError({ code: 'submission_file_required' }),
    '이력서, 자기소개서, 포트폴리오 중 하나 이상의 PDF를 첨부해 주세요.',
  );
  assert.equal(
    getReadableSubmissionError({ code: 'submission_in_progress' }),
    '이미 제출을 처리하고 있습니다. 완료된 뒤 다시 시도해 주세요.',
  );
  assert.equal(
    getReadableSubmissionError({ code: 'storage_upload_failed' }),
    '파일 전송을 완료하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
  );
});
