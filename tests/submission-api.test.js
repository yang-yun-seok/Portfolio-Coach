import assert from 'node:assert/strict';
import test from 'node:test';
import { createPortfolioSubmission } from '../src/lib/submission-api.js';

test('submission client sends Firebase auth and multipart files to the server API', async () => {
  const originalFetch = global.fetch;
  const resume = Object.assign(
    new Blob([Buffer.from('%PDF-test')], { type: 'application/pdf' }),
    { name: 'resume.pdf' },
  );
  let request;

  global.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({
      submission: { id: 'submission-1', status: 'submitted' },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const submission = await createPortfolioSubmission(
      async () => 'firebase-token',
      {
        userInfo: {
          name: '학생 이름',
          roleGroup: '개발',
          subRole: '클라이언트',
          skills: [{ name: 'Unity', level: '중' }],
        },
        resumeFile: resume,
        coverLetterFile: null,
        portfolioFiles: [],
        results: { profileAnalysis: { summary: '분석 요약' } },
        recommendedJobs: [],
      },
    );

    assert.deepEqual(submission, { id: 'submission-1', status: 'submitted' });
    assert.equal(request.url, '/api/me/submissions');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers.Authorization, 'Bearer firebase-token');
    assert.equal(request.options.headers['Content-Type'], undefined);
    assert.equal(request.options.body.get('resume').name, 'resume.pdf');
    assert.deepEqual(JSON.parse(request.options.body.get('payload')), {
      applicantName: '학생 이름',
      track: '개발',
      subRole: '클라이언트',
      experience: 0,
      skills: ['Unity'],
      githubUrl: '',
      latestAnalysisSummary: '분석 요약',
      latestRecommendedJobsSnapshot: [],
    });
  } finally {
    global.fetch = originalFetch;
  }
});
