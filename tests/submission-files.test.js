import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendPortfolioFiles,
  getSubmissionFileError,
  MAX_PORTFOLIO_FILES,
  MAX_SUBMISSION_FILE_SIZE_BYTES,
} from '../src/lib/submission-files.js';

function pdf(name, size = 1024) {
  return { name, size, type: 'application/pdf' };
}

test('submission file validation accepts PDFs up to 10MB', () => {
  assert.equal(getSubmissionFileError(pdf('resume.pdf', MAX_SUBMISSION_FILE_SIZE_BYTES), '이력서'), '');
  assert.match(
    getSubmissionFileError(pdf('resume.pdf', MAX_SUBMISSION_FILE_SIZE_BYTES + 1), '이력서'),
    /10MB 이하/,
  );
  assert.match(
    getSubmissionFileError({ name: 'resume.docx', size: 1024, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, '이력서'),
    /PDF만/,
  );
});

test('portfolio file selection enforces the shared five-file limit', () => {
  assert.equal(MAX_PORTFOLIO_FILES, 5);
  const current = [pdf('portfolio-1.pdf'), pdf('portfolio-2.pdf')];
  const accepted = appendPortfolioFiles(current, [pdf('portfolio-3.pdf')]);
  assert.equal(accepted.error, '');
  assert.equal(accepted.files.length, 3);

  const rejected = appendPortfolioFiles(current, [
    pdf('portfolio-3.pdf'),
    pdf('portfolio-4.pdf'),
    pdf('portfolio-5.pdf'),
    pdf('portfolio-6.pdf'),
  ]);
  assert.match(rejected.error, /최대 5개/);
  assert.deepEqual(rejected.files, current);
});
