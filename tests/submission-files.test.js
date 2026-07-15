import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendPortfolioFiles,
  buildSubmissionChangeSummary,
  findDuplicateSubmissionFiles,
  getSubmissionFileError,
  MAX_PORTFOLIO_FILES,
  MAX_SUBMISSION_FILE_SIZE_BYTES,
} from '../src/lib/submission-files.js';

function pdf(name, size = 1024, lastModified = 1) {
  return { name, size, type: 'application/pdf', lastModified };
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

test('submission file selection rejects duplicate files', () => {
  const original = pdf('portfolio.pdf', 2048, 10);
  const rejected = appendPortfolioFiles([original], [pdf('portfolio.pdf', 2048, 10)]);
  assert.match(rejected.error, /이미 첨부/);
  assert.deepEqual(rejected.files, [original]);

  assert.equal(findDuplicateSubmissionFiles({
    resumeFile: original,
    coverLetterFile: pdf('portfolio.pdf', 2048, 10),
  }).length, 1);
});

test('submission comparison summarizes student-visible changes', () => {
  assert.deepEqual(buildSubmissionChangeSummary({
    subRole: '클라이언트',
    skills: ['Unity', 'C#'],
    files: { resume: { fileName: 'resume-v2.pdf' }, portfolio: [{ fileName: 'game.pdf' }] },
  }, {
    subRole: '클라이언트',
    skills: ['Unity'],
    files: { resume: { fileName: 'resume-v1.pdf' }, portfolio: [{ fileName: 'game.pdf' }] },
  }), ['새 파일 1개', '교체·제외 파일 1개', '추가 역량 C#']);
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
