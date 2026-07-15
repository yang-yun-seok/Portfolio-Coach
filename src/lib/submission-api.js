import { buildAuthorizedHeaders } from './auth-fetch.js';
import { apiUrl } from './runtime-config.js';

async function readSubmissionResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || fallbackMessage);
    error.code = data.code || '';
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

export async function listMyPortfolioSubmissions(getAccessToken) {
  const headers = await buildAuthorizedHeaders(getAccessToken);
  const response = await fetch(apiUrl('api/me/submissions'), { headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || '제출 이력을 불러오지 못했습니다.');
  }

  return Array.isArray(data.submissions) ? data.submissions : [];
}

export async function createPortfolioSubmission(getAccessToken, {
  userInfo,
  resumeFile,
  coverLetterFile,
  portfolioFiles,
  results,
  recommendedJobs,
}) {
  const headers = await buildAuthorizedHeaders(getAccessToken);
  const formData = new FormData();
  formData.append('payload', JSON.stringify({
    applicantName: userInfo?.name || '',
    track: userInfo?.roleGroup || '',
    subRole: userInfo?.subRole || '',
    experience: Number(userInfo?.experience) || 0,
    skills: Array.isArray(userInfo?.skills) ? userInfo.skills : [],
    githubUrl: userInfo?.githubUrl || '',
    latestAnalysisSummary: results?.profileAnalysis?.summary || '',
    latestRecommendedJobsSnapshot: Array.isArray(recommendedJobs)
      ? recommendedJobs.slice(0, 3).map((job) => ({
        id: job.id,
        company: job.company,
        title: job.title,
        score: job.score || 0,
      }))
      : [],
  }));
  if (resumeFile) formData.append('resume', resumeFile, resumeFile.name);
  if (coverLetterFile) formData.append('coverLetter', coverLetterFile, coverLetterFile.name);
  (Array.isArray(portfolioFiles) ? portfolioFiles : []).slice(0, 5).forEach((file) => {
    formData.append('portfolio', file, file.name);
  });

  const response = await fetch(apiUrl('api/me/submissions'), {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await readSubmissionResponse(response, '자료를 제출하지 못했습니다.');
  return data.submission || null;
}
