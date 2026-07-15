import { useCallback, useEffect, useState } from 'react';
import {
  createPortfolioSubmission,
  listMyPortfolioSubmissions,
} from '../lib/submission-api';
import { getReadableSubmissionError } from '../lib/submission-upload-utils';
import { findDuplicateSubmissionFiles } from '../lib/submission-files';

export function usePortfolioSubmissions({
  authEnabled,
  authUser,
  getAccessToken,
  userInfo,
  resumeFile,
  coverLetterFile,
  portfolioFiles,
  results,
  recommendedJobs,
  submissionCapability,
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
      const rows = await listMyPortfolioSubmissions(getAccessToken);
      setSubmissions(rows);
    } catch (error) {
      setSubmissionError(error.message || '제출 내역을 불러오지 못했습니다.');
    } finally {
      setSubmissionsLoading(false);
    }
  }, [authEnabled, authUser?.uid, getAccessToken]);

  useEffect(() => {
    void reloadSubmissions();
  }, [reloadSubmissions]);

  const submitPortfolio = useCallback(async () => {
    if (!authEnabled) {
      throw new Error('로그인 기능이 아직 활성화되지 않았습니다.');
    }
    if (submissionCapability?.enabled !== true) {
      const unavailableError = new Error('자료 제출은 현재 준비 중입니다. 담당자에게 문의해 주세요.');
      setSubmissionError(unavailableError.message);
      throw unavailableError;
    }
    const duplicateFiles = findDuplicateSubmissionFiles({ resumeFile, coverLetterFile, portfolioFiles });
    if (duplicateFiles.length > 0) {
      const duplicateError = new Error('같은 PDF가 두 번 첨부되어 있습니다. 중복 파일을 제거해 주세요.');
      setSubmissionError(duplicateError.message);
      throw duplicateError;
    }

    setSubmissionSaving(true);
    setSubmissionError('');
    setSubmissionSuccess('');
    try {
      const result = await createPortfolioSubmission(getAccessToken, {
        userInfo,
        resumeFile,
        coverLetterFile,
        portfolioFiles,
        results,
        recommendedJobs,
      });
      setSubmissionSuccess('포트폴리오 제출이 완료되었습니다. 제출 내역에서 상태를 확인할 수 있습니다.');
      await reloadSubmissions();
      return result;
    } catch (error) {
      const message = getReadableSubmissionError(error);
      setSubmissionError(message);
      if (message === error.message) throw error;
      throw new Error(message, { cause: error });
    } finally {
      setSubmissionSaving(false);
    }
  }, [
    authEnabled,
    coverLetterFile,
    getAccessToken,
    portfolioFiles,
    recommendedJobs,
    reloadSubmissions,
    results,
    resumeFile,
    submissionCapability,
    userInfo,
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
