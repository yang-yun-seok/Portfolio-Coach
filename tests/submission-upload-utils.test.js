import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getReadableSubmissionError,
  rollbackUploadedObjects,
} from '../src/lib/submission-upload-utils.js';

test('rollbackUploadedObjects attempts every uploaded object', async () => {
  const deleted = [];
  const storageClient = {
    deleteObject: async (objectRef) => {
      deleted.push(objectRef.fullPath);
      if (objectRef.fullPath === 'failed.pdf') throw new Error('delete failed');
    },
  };
  const results = await rollbackUploadedObjects(storageClient, [
    { fullPath: 'resume.pdf' },
    { fullPath: 'failed.pdf' },
    { fullPath: 'portfolio-1.pdf' },
  ]);

  assert.deepEqual(deleted, ['resume.pdf', 'failed.pdf', 'portfolio-1.pdf']);
  assert.deepEqual(results.map((result) => result.status), ['fulfilled', 'rejected', 'fulfilled']);
});

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
