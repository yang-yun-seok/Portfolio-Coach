import { useEffect, useRef, useState } from 'react';
import {
  ANALYSIS_HISTORY_KEY,
  MAX_ANALYSIS_HISTORY,
  WORKSPACE_SAVE_KEY,
  buildHistoryEntry,
  buildSnapshotComparison,
  getSnapshotMeta,
} from '../lib/analysis-history';

export function useWorkspacePersistence({
  userInfo,
  results,
  recommendedJobs,
  instructorFeedback,
  loading,
  crawlRunning,
  setUserInfo,
  setResults,
  setRecommendedJobs,
  setInstructorFeedback,
  normalizeProfile,
  emptyInstructorFeedback,
  setActiveTab,
  setInfoMessage,
}) {
  const [saveStatus, setSaveStatus] = useState('');
  const [restoreNotice, setRestoreNotice] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState('');
  const saveStatusTimerRef = useRef(null);

  const formatSavedAt = (value) => {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const flashSaveStatus = (status) => {
    setSaveStatus(status);
    if (saveStatusTimerRef.current) {
      clearTimeout(saveStatusTimerRef.current);
    }
    saveStatusTimerRef.current = setTimeout(() => setSaveStatus(''), 3200);
  };

  const writeAnalysisHistory = (entries) => {
    let nextEntries = Array.isArray(entries) ? entries.slice(0, MAX_ANALYSIS_HISTORY) : [];
    while (nextEntries.length > 0) {
      try {
        localStorage.setItem(ANALYSIS_HISTORY_KEY, JSON.stringify(nextEntries));
        return nextEntries;
      } catch {
        nextEntries = nextEntries.slice(0, -1);
      }
    }
    try {
      localStorage.removeItem(ANALYSIS_HISTORY_KEY);
    } catch {}
    return [];
  };

  const persistWorkspaceSnapshot = (saveData, { showConfirmation = false, trackHistory = false } = {}) => {
    const snapshot = {
      ...saveData,
      recommendedJobs: Array.isArray(saveData.recommendedJobs) ? saveData.recommendedJobs : [],
      savedAt: saveData.savedAt || new Date().toISOString(),
    };

    localStorage.setItem(WORKSPACE_SAVE_KEY, JSON.stringify(snapshot));

    if (trackHistory && snapshot.results) {
      const historyEntry = buildHistoryEntry(snapshot);
      const nextHistory = writeAnalysisHistory([
        historyEntry,
        ...analysisHistory.filter((entry) => entry.savedAt !== historyEntry.savedAt),
      ]);
      setAnalysisHistory(nextHistory);
      setSelectedHistoryId(nextHistory[1]?.id || '');
    }

    setLastSavedAt(snapshot.savedAt);
    if (showConfirmation) {
      flashSaveStatus('saved');
    }

    return snapshot;
  };

  const selectedHistoryEntry = analysisHistory.find((entry) => entry.id === selectedHistoryId)
    || analysisHistory[1]
    || null;
  const currentWorkspaceSnapshot = {
    userInfo,
    results,
    recommendedJobs,
    instructorFeedback,
    savedAt: lastSavedAt || new Date().toISOString(),
  };
  const historyComparison = results && selectedHistoryEntry
    ? buildSnapshotComparison(currentWorkspaceSnapshot, selectedHistoryEntry)
    : null;

  const loadHistorySnapshot = (entry) => {
    if (!entry) return;

    if (entry.userInfo) {
      setUserInfo(normalizeProfile({
        ...entry.userInfo,
        skills: Array.isArray(entry.userInfo.skills) ? entry.userInfo.skills : [],
      }));
    }
    setResults(entry.results || null);
    setRecommendedJobs(Array.isArray(entry.recommendedJobs) ? entry.recommendedJobs : []);
    setInstructorFeedback(entry.instructorFeedback || emptyInstructorFeedback);
    setLastSavedAt(entry.savedAt || '');
    setRestoreNotice({
      savedAt: entry.savedAt || '',
      hasResults: Boolean(entry.results),
    });
    persistWorkspaceSnapshot({
      userInfo: entry.userInfo || userInfo,
      results: entry.results || null,
      recommendedJobs: Array.isArray(entry.recommendedJobs) ? entry.recommendedJobs : [],
      instructorFeedback: entry.instructorFeedback || emptyInstructorFeedback,
      savedAt: entry.savedAt || new Date().toISOString(),
    });
    setInfoMessage(`${formatSavedAt(entry.savedAt) || '선택한 시점'} 분석 기록을 현재 화면에 불러왔습니다.`);
    setActiveTab(entry.results ? 'feedback' : 'input');
  };

  useEffect(() => {
    try {
      let restoredHistory = [];
      const historyRaw = localStorage.getItem(ANALYSIS_HISTORY_KEY);
      if (historyRaw) {
        restoredHistory = JSON.parse(historyRaw)
          .map((entry) => ({
            ...entry,
            meta: entry?.meta || getSnapshotMeta(entry),
          }))
          .filter((entry) => entry?.savedAt);
      }

      const saved = localStorage.getItem(WORKSPACE_SAVE_KEY);
      if (saved) {
        const { userInfo: savedUserInfo, results: savedResults, recommendedJobs: savedJobs, instructorFeedback: savedFeedback, savedAt } = JSON.parse(saved);

        if (savedUserInfo) {
          setUserInfo(normalizeProfile({
            ...savedUserInfo,
            skills: Array.isArray(savedUserInfo.skills) ? savedUserInfo.skills : [],
          }));
        }
        if (savedResults) setResults(savedResults);
        if (Array.isArray(savedJobs)) setRecommendedJobs(savedJobs);
        if (savedFeedback) setInstructorFeedback(savedFeedback);
        if (savedAt) setLastSavedAt(savedAt);

        if (savedUserInfo || savedResults || savedFeedback) {
          setRestoreNotice({
            savedAt: savedAt || '',
            hasResults: Boolean(savedResults),
          });
        }

        if (savedResults && savedAt && !restoredHistory.some((entry) => entry.savedAt === savedAt)) {
          restoredHistory = writeAnalysisHistory([
            buildHistoryEntry({
              userInfo: savedUserInfo,
              results: savedResults,
              recommendedJobs: savedJobs,
              instructorFeedback: savedFeedback,
              savedAt,
            }),
            ...restoredHistory,
          ]);
        }
      }

      setAnalysisHistory(restoredHistory);
      setSelectedHistoryId(restoredHistory[1]?.id || '');
    } catch {}
  }, []);

  useEffect(() => () => {
    if (saveStatusTimerRef.current) {
      clearTimeout(saveStatusTimerRef.current);
    }
  }, []);

  useEffect(() => {
    const shouldWarn = loading || crawlRunning || saveStatus === 'generating';
    if (!shouldWarn) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loading, crawlRunning, saveStatus]);

  return {
    saveStatus,
    setSaveStatus,
    restoreNotice,
    setRestoreNotice,
    lastSavedAt,
    analysisHistory,
    selectedHistoryId,
    setSelectedHistoryId,
    selectedHistoryEntry,
    historyComparison,
    formatSavedAt,
    persistWorkspaceSnapshot,
    loadHistorySnapshot,
  };
}
