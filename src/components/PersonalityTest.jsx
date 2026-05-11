import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BINARY_QUESTIONS,
  MAIN_QUESTIONS,
} from '../data/personalityTestData';
import { normalizeUserProfile, ROLE_PERSONALITY_PLAYBOOK } from '../data/skills';
import { apiUrl } from '../lib/runtime-config';
import PersonalityIntroScreen from './personality/PersonalityIntroScreen';
import PersonalityPracticeScreen from './personality/PersonalityPracticeScreen';
import PersonalityResultScreen from './personality/PersonalityResultScreen';
import PersonalityTestScreen from './personality/PersonalityTestScreen';
import {
  analyzeLocally,
  buildMarkdown,
  downloadMarkdown,
  formatTime,
  openPdfPrint,
  QUESTION_TIME_LIMIT,
  QUESTIONS_PER_PAGE,
  TOTAL_TIME,
} from './personality/personality-utils';

export default function PersonalityTest({ selectedProvider, selectedModelId, userInfo }) {
  const normalizedUser = normalizeUserProfile(userInfo || {});
  const personalityPlaybook = ROLE_PERSONALITY_PLAYBOOK[normalizedUser.roleGroup] || ROLE_PERSONALITY_PLAYBOOK.기획;
  const [step, setStep] = useState('intro');
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [practiceAnswers, setPracticeAnswers] = useState({});
  const [likertAnswers, setLikertAnswers] = useState({});
  const [binaryAnswers, setBinaryAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [analysisSource, setAnalysisSource] = useState('');
  const timerRef = useRef(null);
  const questionTimerRef = useRef(null);
  const scrollRef = useRef(null);

  const getCurrentQuestions = useCallback(() => {
    const questions = step === 'test-binary' ? BINARY_QUESTIONS : MAIN_QUESTIONS;
    const start = currentPage * QUESTIONS_PER_PAGE;
    return questions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [currentPage, step]);

  const getTotalPages = useCallback(() => {
    const questions = step === 'test-binary' ? BINARY_QUESTIONS : MAIN_QUESTIONS;
    return Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  }, [step]);

  const handleGoToBinary = useCallback(() => {
    setCurrentPage(0);
    setStep('test-binary');
  }, []);

  const handleSubmit = useCallback(() => setShowConfirm(true), []);
  const confirmSubmit = useCallback(() => {
    setShowConfirm(false);
    clearInterval(timerRef.current);
    clearInterval(questionTimerRef.current);
    setStep('result');
  }, []);
  const cancelSubmit = useCallback(() => setShowConfirm(false), []);

  const autoAdvance = useCallback(() => {
    const totalPages = getTotalPages();
    if (currentPage < totalPages - 1) {
      setCurrentPage((page) => page + 1);
      return;
    }

    if (step === 'test-likert') {
      handleGoToBinary();
      return;
    }

    clearInterval(timerRef.current);
    clearInterval(questionTimerRef.current);
    setStep('result');
  }, [currentPage, getTotalPages, handleGoToBinary, step]);

  useEffect(() => {
    if (step === 'test-likert' || step === 'test-binary') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            clearInterval(questionTimerRef.current);
            setStep('result');
            return 0;
          }
          if (prev === 300) setShowTimeWarning(true);
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [step]);

  useEffect(() => {
    if (!showTimeWarning) return undefined;
    const timeout = setTimeout(() => setShowTimeWarning(false), 4000);
    return () => clearTimeout(timeout);
  }, [showTimeWarning]);

  useEffect(() => {
    if (step === 'test-likert' || step === 'test-binary') {
      setQuestionTimeLeft(QUESTION_TIME_LIMIT);
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(questionTimerRef.current);
            autoAdvance();
            return QUESTION_TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(questionTimerRef.current);
  }, [autoAdvance, currentPage, step]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, step]);

  useEffect(() => {
    const shouldWarn = aiLoading || step === 'practice' || step === 'test-likert' || step === 'test-binary';
    if (!shouldWarn) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [aiLoading, step]);

  const handleStartPractice = useCallback(() => {
    setPracticeAnswers({});
    setStep('practice');
  }, []);

  const handleStartTest = useCallback(() => {
    setLikertAnswers({});
    setBinaryAnswers({});
    setTimeLeft(TOTAL_TIME);
    setCurrentPage(0);
    setQuestionTimeLeft(QUESTION_TIME_LIMIT);
    setAiResult(null);
    setAiError('');
    setAnalysisSource('');
    setStep('test-likert');
  }, []);

  const handleReset = useCallback(() => {
    setStep('intro');
    setPracticeAnswers({});
    setLikertAnswers({});
    setBinaryAnswers({});
    setTimeLeft(TOTAL_TIME);
    setCurrentPage(0);
    setQuestionTimeLeft(QUESTION_TIME_LIMIT);
    setAiResult(null);
    setAiError('');
    setAnalysisSource('');
  }, []);

  const requestAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiError('');

    const fallbackWithNotice = (message) => {
      setAiError(message);
      setAiResult(analyzeLocally(likertAnswers, binaryAnswers, normalizedUser.roleGroup));
      setAnalysisSource('local');
    };

    try {
      const response = await fetch(apiUrl('api/analyze-personality'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          modelId: selectedModelId,
          likertAnswers,
          binaryAnswers,
          questions: MAIN_QUESTIONS,
          binaryQuestions: BINARY_QUESTIONS,
        }),
      }).catch(() => null);

      if (!response || !response.ok) {
        const failureReason = !response
          ? 'AI 서버에 연결하지 못했습니다.'
          : `AI 서버가 ${response.status} 상태를 반환했습니다.`;
        fallbackWithNotice(`${failureReason} 로컬 분석 결과를 먼저 표시합니다. 잠시 후 AI 분석을 다시 요청할 수 있습니다.`);
        return;
      }

      const data = await response.json();
      setAiResult(data);
      setAnalysisSource('ai');
    } catch (error) {
      console.warn('AI 분석 실패, 로컬 fallback 사용:', error.message);
      fallbackWithNotice(`AI 분석 중 오류가 발생했습니다. (${error.message}) 로컬 분석 결과를 먼저 표시합니다.`);
    } finally {
      setAiLoading(false);
    }
  }, [
    binaryAnswers,
    likertAnswers,
    normalizedUser.roleGroup,
    selectedModelId,
    selectedProvider,
  ]);

  if (step === 'intro') {
    return (
      <PersonalityIntroScreen
        personalityPlaybook={personalityPlaybook}
        onStartPractice={handleStartPractice}
      />
    );
  }

  if (step === 'practice') {
    return (
      <PersonalityPracticeScreen
        onPracticeSelect={(questionId, value) => {
          setPracticeAnswers((prev) => ({ ...prev, [questionId]: value }));
        }}
        onStartTest={handleStartTest}
        practiceAnswers={practiceAnswers}
      />
    );
  }

  if (step === 'test-likert' || step === 'test-binary') {
    return (
      <PersonalityTestScreen
        autoAdvance={autoAdvance}
        binaryAnswers={binaryAnswers}
        cancelSubmit={cancelSubmit}
        confirmSubmit={confirmSubmit}
        currentPage={currentPage}
        formatTime={formatTime}
        getCurrentQuestions={getCurrentQuestions}
        getTotalPages={getTotalPages}
        handleGoToBinary={handleGoToBinary}
        handleSubmit={handleSubmit}
        likertAnswers={likertAnswers}
        questionTimeLeft={questionTimeLeft}
        scrollRef={scrollRef}
        setBinaryAnswers={setBinaryAnswers}
        setCurrentPage={setCurrentPage}
        setLikertAnswers={setLikertAnswers}
        showConfirm={showConfirm}
        showTimeWarning={showTimeWarning}
        step={step}
        timeLeft={timeLeft}
      />
    );
  }

  return (
    <PersonalityResultScreen
      aiError={aiError}
      aiLoading={aiLoading}
      aiResult={aiResult}
      analysisSource={analysisSource}
      buildMarkdown={buildMarkdown}
      downloadMarkdown={downloadMarkdown}
      formatTime={formatTime}
      likertAnswers={likertAnswers}
      normalizedUser={normalizedUser}
      onRequestAiAnalysis={requestAiAnalysis}
      onReset={handleReset}
      openPdfPrint={openPdfPrint}
      personalityPlaybook={personalityPlaybook}
      selectedProvider={selectedProvider}
      timeLeft={timeLeft}
      totalTime={TOTAL_TIME}
    />
  );
}
