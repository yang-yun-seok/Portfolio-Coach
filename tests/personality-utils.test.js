import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeLocally, formatTime } from '../src/components/personality/personality-utils.js';

test('formatTime returns mm:ss output', () => {
  assert.equal(formatTime(125), '02:05');
});

test('analyzeLocally returns a stable report shape', () => {
  const likertAnswers = {};
  for (let id = 1; id <= 94; id += 1) {
    likertAnswers[id] = id % 6;
  }

  const binaryAnswers = {};
  for (let id = 1; id <= 31; id += 1) {
    binaryAnswers[id] = id % 2 === 0 ? 'A' : 'B';
  }

  const report = analyzeLocally(likertAnswers, binaryAnswers, '기획');

  assert.equal(report.traits.length, 6);
  assert.equal(report.workStyle.axes.length, 5);
  assert.equal(report.strengths.length > 0, true);
  assert.equal(report.cautions.length > 0, true);
  assert.equal(report.testStrategy.length > 0, true);
  assert.equal(typeof report.consistency.score, 'number');
});
