import { useCallback, useEffect, useState } from 'react';
import { createPortfolioSubmission, listMyPortfolioSubmissions } from '../lib/firebase-submissions';

export function usePortfolioSubmissions({
  authEnabled,
  authUser,
  userProfile,
  userInfo,
  resumeFile,
  coverLetterFile,
  portfolioFiles,
  results,
  recommendedJobs,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState('');
  const [submissionSaving, setSubmissionSaving] = useState(false);

  const reloadSubmissions = useCallback(async () => {
    if (!authEnabled || !authUser?.uid) {
      setSubmissions([]);
      return;
    }

    setSubmissionsLoading(true);
    setSubmissionError('');
    try {
      const rows = await listMyPortfolioSubmissions(authUser.uid);
      setSubmissions(rows);
    } catch (error) {
      setSubmissionError(error.message || '제출 내역을 불러오지 못했습니다.');
    } finally {
      setSubmissionsLoading(false);
    }
  }, [authEnabled, authUser?.uid]);

  useEffect(() => {
    void reloadSubmissions();
  }, [reloadSubmissions]);

  const submitPortfolio = useCallback(async () => {
    if (!authEnabled) {
      throw new Error('로그인 기능이 아직 활성화되지 않았습니다.');
    }

    setSubmissionSaving(true);
    setSubmissionError('');
    setSubmissionSuccess('');
    try {
      const result = await createPortfolioSubmission({
        authUser,
        userProfile,
        userInfo,
        resumeFile,
        coverLetterFile,
        portfolioFiles,
        results,
        recommendedJobs,
      });
      setSubmissionSuccess('포트폴리오 제출이 저장되었습니다. 제출 내역에서 상태를 확인할 수 있습니다.');
      await reloadSubmissions();
      return result;
    } catch (error) {
      setSubmissionError(error.message || '제출 저장에 실패했습니다.');
      throw error;
    } finally {
      setSubmissionSaving(false);
    }
  }, [
    authEnabled,
    authUser,
    coverLetterFile,
    portfolioFiles,
    recommendedJobs,
    reloadSubmissions,
    results,
    resumeFile,
    userInfo,
    userProfile,
  ]);

  return {
    submissions,
    submissionsLoading,
    submissionError,
    submissionSaving,
    submissionSuccess,
    submitPortfolio,
    reloadSubmissions,
    setSubmissionError,
    setSubmissionSuccess,
  };
}
