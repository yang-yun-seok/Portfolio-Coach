import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import {
  assertPdfBuffer,
  buildSubmissionUploadPlan,
  createSubmissionRouter,
  parseSubmissionPayload,
} from '../server/routes/submission-routes.js';

function postRouteMiddleware(router, path) {
  const routeLayer = router.stack.find((layer) => (
    layer.route?.path === path && layer.route?.methods?.post
  ));
  return routeLayer?.route?.stack?.map((layer) => layer.handle) || [];
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

async function withSubmissionServer(services, callback) {
  const app = express();
  app.use(createSubmissionRouter({
    ...services,
    authMiddleware: {
      requireAuth(req, res, next) {
        req.authUser = {
          uid: 'student-1',
          email: 'student@example.com',
          role: 'user',
        };
        next();
      },
    },
    areUploadsRequested: () => true,
  }));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const address = server.address();
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function createSubmissionForm() {
  const form = new FormData();
  form.append('payload', JSON.stringify({
    applicantName: '학생 이름',
    track: '개발',
    subRole: '클라이언트',
    skills: ['Unity'],
  }));
  form.append(
    'resume',
    new Blob([Buffer.from('%PDF-1.7 integration')], { type: 'application/pdf' }),
    'resume.pdf',
  );
  return form;
}

test('submission payload is bounded and strips unknown fields', () => {
  assert.deepEqual(parseSubmissionPayload(JSON.stringify({
    applicantName: '학생 이름',
    track: '개발',
    subRole: '클라이언트',
    experience: 3,
    skills: ['Unity', 'C#'],
    githubUrl: 'https://github.com/student',
    latestAnalysisSummary: '분석 요약',
    latestRecommendedJobsSnapshot: [{
      id: 'job-1',
      company: '게임사',
      title: '클라이언트 개발자',
      score: 91,
      internal: 'ignored',
    }],
    adminMemo: 'must be ignored',
  })), {
    applicantName: '학생 이름',
    track: '개발',
    subRole: '클라이언트',
    experience: 3,
    skills: ['Unity', 'C#'],
    githubUrl: 'https://github.com/student',
    latestAnalysisSummary: '분석 요약',
    latestRecommendedJobsSnapshot: [{
      id: 'job-1',
      company: '게임사',
      title: '클라이언트 개발자',
      score: 91,
    }],
  });

  assert.throws(
    () => parseSubmissionPayload('{}'),
    (error) => error.statusCode === 400 && error.code === 'invalid_submission_payload',
  );
});

test('submission upload plan binds fixed paths to the authenticated user', () => {
  const resume = { originalname: 'resume.pdf', size: 100, path: '/tmp/resume' };
  const portfolio = { originalname: 'portfolio.pdf', size: 200, path: '/tmp/portfolio' };
  const plan = buildSubmissionUploadPlan({
    files: { resume: [resume], portfolio: [portfolio] },
    uid: 'student-1',
    submissionId: 'submission-1',
  });

  assert.deepEqual(plan.map(({ fileKey, storagePath }) => ({ fileKey, storagePath })), [
    {
      fileKey: 'resume',
      storagePath: 'portfolio-submissions/student-1/submission-1/resume.pdf',
    },
    {
      fileKey: 'portfolio-1',
      storagePath: 'portfolio-submissions/student-1/submission-1/portfolio-1.pdf',
    },
  ]);
  assert.throws(
    () => buildSubmissionUploadPlan({ files: {}, uid: 'student-1', submissionId: 'submission-1' }),
    (error) => error.code === 'submission_file_required',
  );
});

test('server-side file validation checks PDF content, not only the extension', () => {
  assert.doesNotThrow(() => assertPdfBuffer(Buffer.from('%PDF-1.7 test')));
  assert.throws(
    () => assertPdfBuffer(Buffer.from('not a PDF')),
    (error) => error.code === 'invalid_file_type',
  );
});

test('submission creation authenticates and checks readiness before parsing files', async () => {
  const requireAuth = () => {};
  let readinessCalls = 0;
  const router = createSubmissionRouter({
    firebaseAdminService: {},
    submissionStorageService: {
      async getReadiness() {
        readinessCalls += 1;
        return { ready: true, status: 'ready' };
      },
    },
    authMiddleware: { requireAuth },
    areUploadsRequested: () => false,
  });
  const middleware = postRouteMiddleware(router, '/api/me/submissions');

  assert.equal(middleware[0], requireAuth);
  const response = createResponse();
  let nextCalled = false;
  await middleware[1]({}, response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, 'not_configured');
  assert.equal(nextCalled, false);
  assert.equal(readinessCalls, 0);
});

test('submission endpoint uploads a validated PDF and persists its descriptor', async () => {
  const uploaded = [];
  const persisted = [];
  await withSubmissionServer({
    submissionStorageService: {
      getReadiness: async () => ({ ready: true, status: 'ready' }),
      async uploadPdf(file) { uploaded.push(file); },
      async deleteFiles() { throw new Error('rollback should not run'); },
    },
    firebaseAdminService: {
      createSubmissionId: () => 'submission-1',
      async createPortfolioSubmission(submission) {
        persisted.push(submission);
        return { id: submission.submissionId, status: 'submitted' };
      },
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/me/submissions`, {
      method: 'POST',
      body: createSubmissionForm(),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      submission: { id: 'submission-1', status: 'submitted' },
    });
  });

  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0].path, 'portfolio-submissions/student-1/submission-1/resume.pdf');
  assert.equal(uploaded[0].buffer.subarray(0, 5).toString(), '%PDF-');
  assert.equal(persisted[0].files.resume.storagePath, uploaded[0].path);
  assert.equal(persisted[0].files.resume.type, 'application/pdf');
  assert.match(persisted[0].files.resume.sha256, /^[a-f0-9]{64}$/);
});

test('submission endpoint rejects duplicate PDF content before upload', async () => {
  let uploadCalls = 0;
  await withSubmissionServer({
    submissionStorageService: {
      getReadiness: async () => ({ ready: true, status: 'ready' }),
      async uploadPdf() { uploadCalls += 1; },
      async deleteFiles() {},
    },
    firebaseAdminService: {
      createSubmissionId: () => 'submission-duplicate',
      async createPortfolioSubmission() { throw new Error('must not persist'); },
    },
  }, async (baseUrl) => {
    const form = createSubmissionForm();
    form.append(
      'portfolio',
      new Blob([Buffer.from('%PDF-1.7 integration')], { type: 'application/pdf' }),
      'same-content.pdf',
    );
    const response = await fetch(`${baseUrl}/api/me/submissions`, { method: 'POST', body: form });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'duplicate_file');
  });
  assert.equal(uploadCalls, 0);
});

test('submission endpoint removes uploaded objects when Firestore persistence fails', async () => {
  const deletedPaths = [];
  await withSubmissionServer({
    submissionStorageService: {
      getReadiness: async () => ({ ready: true, status: 'ready' }),
      async uploadPdf() {},
      async deleteFiles(paths) { deletedPaths.push(...paths); },
    },
    firebaseAdminService: {
      createSubmissionId: () => 'submission-2',
      async createPortfolioSubmission() { throw new Error('Firestore unavailable'); },
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/me/submissions`, {
      method: 'POST',
      body: createSubmissionForm(),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: '자료를 제출하지 못했습니다.',
      code: 'submission_failed',
    });
  });

  assert.deepEqual(deletedPaths, [
    'portfolio-submissions/student-1/submission-2/resume.pdf',
  ]);
});
