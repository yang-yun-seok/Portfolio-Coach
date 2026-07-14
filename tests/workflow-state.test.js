import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPrimaryWorkflowAction,
  getStepMeta,
  getStepState,
  getWorkflowState,
  WORKFLOW_STEPS,
} from '../src/lib/workflow-state.js';

function buildState(overrides = {}) {
  return getWorkflowState({
    coverLetterFile: null,
    loading: false,
    normalizedUserInfo: {
      name: '홍길동',
      subRole: '시스템 기획',
      skills: [{ name: '콘텐츠 기획' }],
    },
    portfolioFiles: [],
    results: null,
    resumeFile: { name: 'resume.pdf' },
    submissionSaving: false,
    submissions: [],
    ...overrides,
  });
}

test('workflow orders submission before instructor review', () => {
  assert.deepEqual(
    WORKFLOW_STEPS.map((step) => step.id),
    ['profile', 'files', 'analysis', 'submit', 'review'],
  );
});

test('AI results do not complete instructor review', () => {
  const state = buildState({ results: { profileAnalysis: {} } });

  assert.equal(getStepState('analysis', state), 'done');
  assert.equal(getStepState('submit', state), 'active');
  assert.equal(getStepState('review', state), 'pending');
  assert.deepEqual(getPrimaryWorkflowAction(state), { label: '제출 화면 열기', tab: 'portfolio' });
});

test('missing documents are described as required before review submission', () => {
  const state = buildState({ resumeFile: null });
  assert.equal(getStepMeta('files', state), '검토 요청 전 필요');
});

test('unavailable submissions keep the workflow actionable without exposing an upload failure', () => {
  const state = buildState({
    results: { profileAnalysis: {} },
    submissionAvailable: false,
  });

  assert.equal(getStepState('submit', state), 'pending');
  assert.equal(getStepMeta('submit', state), '담당자 준비 중');
  assert.deepEqual(getPrimaryWorkflowAction(state), { label: '분석 결과 보완', tab: 'feedback' });
});

test('submitted portfolio waits for review and keeps status as the primary action', () => {
  const state = buildState({
    results: { profileAnalysis: {} },
    submissions: [{ id: 'submission-1', status: 'reviewing' }],
  });

  assert.equal(getStepState('submit', state), 'done');
  assert.equal(getStepState('review', state), 'active');
  assert.deepEqual(getPrimaryWorkflowAction(state), { label: '제출 상태 확인', tab: 'portfolio' });
});

test('reviewed and rejected submissions expose the review outcome', () => {
  const reviewedState = buildState({
    results: { profileAnalysis: {} },
    submissions: [{ id: 'submission-1', status: 'reviewed', studentFeedback: '좋습니다.' }],
  });
  const rejectedState = buildState({
    results: { profileAnalysis: {} },
    submissions: [{ id: 'submission-2', status: 'rejected', studentFeedback: '보완해 주세요.' }],
  });

  assert.equal(getStepState('review', reviewedState), 'done');
  assert.deepEqual(getPrimaryWorkflowAction(reviewedState), { label: '검토 결과 확인', tab: 'portfolio' });
  assert.equal(getStepState('review', rejectedState), 'done');
  assert.deepEqual(getPrimaryWorkflowAction(rejectedState), { label: '보완 내용 확인', tab: 'portfolio' });
});
