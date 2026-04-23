import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock, Play, ArrowLeft, ArrowRight,
  ClipboardCheck, AlertCircle, RotateCcw, ChevronLeft, ChevronRight,
  Loader2, Brain, Sparkles, Shield, Target, TrendingUp, Download, FileText,
} from 'lucide-react';
import {
  LIKERT_OPTIONS,
  PRACTICE_QUESTIONS,
  MAIN_QUESTIONS,
  BINARY_QUESTIONS,
} from '../data/personalityTestData';
import { apiUrl } from '../lib/runtime-config';

// ── 타이머 포맷 ─────────────────────────────────────────────────────────
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ── 상수 ─────────────────────────────────────────────────────────────────
const TOTAL_TIME = 40 * 60;
const QUESTIONS_PER_PAGE = 1;
const QUESTION_TIME_LIMIT = 10; // 문항당 10초

// ── 로컬 Fallback 분석 로직 ─────────────────────────────────────────────
function analyzeLocally(likertAnswers, binaryAnswers) {
  const vals = Object.values(likertAnswers);
  const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 3;

  // 문항 그룹별 평균으로 Big5 유사 특성 추론
  const honesty = [1, 10, 16, 39, 77, 91].map(id => likertAnswers[id]).filter(v => v !== undefined);
  const diligence = [18, 28, 31, 34, 64, 84, 89].map(id => likertAnswers[id]).filter(v => v !== undefined);
  const emotion = [11, 14, 41, 43, 47, 59, 60, 82, 83].map(id => likertAnswers[id]).filter(v => v !== undefined);
  const social = [4, 26, 29, 52, 54, 86].map(id => likertAnswers[id]).filter(v => v !== undefined);
  const openness = [5, 9, 37, 62, 71, 76].map(id => likertAnswers[id]).filter(v => v !== undefined);
  const selfEfficacy = [22, 32, 66, 67].map(id => likertAnswers[id]).filter(v => v !== undefined);
  const empathy = [19, 57, 69, 70, 85, 92].map(id => likertAnswers[id]).filter(v => v !== undefined);

  const calcScore = (arr, invert = false) => {
    if (arr.length === 0) return 50;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const score = Math.round((mean / 5) * 100);
    return invert ? 100 - score : score;
  };

  // 감정 관련은 높을수록 불안정이므로 일부 반전
  const emotionScore = calcScore(emotion, true);

  const traits = [
    { name: '성실성', score: calcScore(diligence), description: '목표를 세우고 꾸준히 달성하려는 의지, 계획성과 책임감의 수준을 나타냅니다.' },
    { name: '정서 안정성', score: emotionScore, description: '스트레스나 부정적 감정을 다루는 능력, 감정 조절의 안정성을 나타냅니다.' },
    { name: '외향성', score: calcScore(social), description: '타인과의 교류를 선호하는 정도, 사교성과 에너지 수준을 나타냅니다.' },
    { name: '친화성', score: calcScore(empathy), description: '타인에 대한 공감 능력, 협조적 태도와 배려심의 수준을 나타냅니다.' },
    { name: '개방성', score: calcScore(openness), description: '새로운 경험에 대한 수용성, 유연한 사고와 창의적 접근의 정도를 나타냅니다.' },
    { name: '자기 효능감', score: calcScore(selfEfficacy), description: '자신의 능력에 대한 믿음과 자율적으로 문제를 해결할 수 있다는 자신감을 나타냅니다.' },
  ];

  // 이항 선택 기반 업무 스타일 축 분석
  const bv = binaryAnswers;
  const axisVal = (aIds, bIds) => {
    let score = 0, count = 0;
    for (const id of aIds) { if (bv[id] === 'A') { score -= 30; count++; } else if (bv[id] === 'B') { score += 30; count++; } }
    for (const id of bIds) { if (bv[id] === 'A') { score += 30; count++; } else if (bv[id] === 'B') { score -= 30; count++; } }
    return count > 0 ? Math.round(score / count) : 0;
  };

  const workStyle = {
    axes: [
      { leftLabel: '협업 지향', rightLabel: '독립 지향', value: axisVal([20, 28], [10]), description: '업무 수행 시 팀 협업과 개인 독립 작업 간의 선호도입니다.' },
      { leftLabel: '신중함', rightLabel: '도전적', value: axisVal([25, 3], [21]), description: '새로운 시도와 안정적 선택 사이에서의 성향입니다.' },
      { leftLabel: '규칙 준수', rightLabel: '자율 선호', value: axisVal([31, 28], [19]), description: '체계적 매뉴얼 준수와 자율적 판단 사이의 선호도입니다.' },
      { leftLabel: '안정 추구', rightLabel: '성장 추구', value: axisVal([31], [13, 19]), description: '현재의 안정성과 미래 성장 가능성 간의 우선순위입니다.' },
      { leftLabel: '외적 동기', rightLabel: '내적 동기', value: axisVal([], [8, 18]), description: '타인의 인정과 자기 만족 중 더 큰 동기 부여 요인입니다.' },
    ],
  };

  // Lie Scale 분석 (사회적 바람직성 문항)
  const lieItems = [10, 16, 39, 77, 91].map(id => likertAnswers[id]).filter(v => v !== undefined);
  const lieAvg = lieItems.length > 0 ? lieItems.reduce((a, b) => a + b, 0) / lieItems.length : 2.5;
  const consistencyScore = lieAvg > 4 ? Math.round(40 + Math.random() * 20) : Math.round(70 + Math.random() * 20);

  return {
    traits,
    workStyle,
    strengths: [
      traits.sort((a, b) => b.score - a.score).slice(0, 2).map(t => ({
        title: `높은 ${t.name}`,
        description: `${t.name} 점수가 ${t.score}점으로 강점으로 나타났습니다. ${t.description}`,
      })),
    ].flat(),
    cautions: [
      traits.sort((a, b) => a.score - b.score).slice(0, 1).map(t => ({
        title: `${t.name} 보완 필요`,
        description: `${t.name} 점수가 ${t.score}점으로 상대적으로 낮게 나왔습니다. 이 영역을 보완하면 더 균형 잡힌 인상을 줄 수 있습니다.`,
      })),
    ].flat(),
    consistency: {
      score: consistencyScore,
      comment: lieAvg > 4
        ? '사회적 바람직성 문항에서 높은 응답 경향이 관찰됩니다. 실제 검사에서는 이런 패턴이 신뢰도 저하로 이어질 수 있으니 조금 더 솔직한 응답을 권장합니다.'
        : '전반적으로 솔직한 응답 패턴이 관찰됩니다. 사회적 바람직성 문항에서 자연스러운 응답을 유지하고 있어 검사 신뢰도가 양호합니다.',
    },
    gameIndustryFit: `게임 업계에서 중시하는 팀워크, 창의성, 스트레스 내성 관점에서 분석했을 때, 외향성(${traits.find(t => t.name === '외향성')?.score || 50}점)과 개방성(${traits.find(t => t.name === '개방성')?.score || 50}점)이 특히 중요한 지표입니다. 게임 개발은 밀도 높은 협업이 필수적이므로 타인과의 소통 역량을 어필하는 것이 좋겠습니다.`,
    testStrategy: [
      '비슷한 성격을 묻는 문항 간에 일관성을 유지하세요. 특히 성실성·정서 안정성 관련 문항의 방향을 맞추는 것이 핵심입니다.',
      `Lie Scale 문항(완벽하게 긍정적인 진술)에서 "매우 그렇다"를 남발하지 마세요. 현재 사회적 바람직성 응답 평균이 ${lieAvg.toFixed(1)}점입니다.`,
      '극단적 응답(1점/6점)의 비율을 전체의 15~25% 이내로 유지하면 자연스러운 응답 패턴으로 인식됩니다.',
    ],
  };
}

// ── MD 내보내기 유틸 ─────────────────────────────────────────────────────
function buildMarkdown(result, meta) {
  const lines = [];
  const dt = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  lines.push(`# 인성검사 분석 결과`);
  lines.push(`> 분석일: ${dt} | 소요 시간: ${meta.elapsedTime} | 분석 소스: ${meta.source}`);
  lines.push('');

  // 성격 특성
  lines.push(`## 성격 특성 분석`);
  result.traits?.forEach(t => {
    const bar = '█'.repeat(Math.round(t.score / 10)) + '░'.repeat(10 - Math.round(t.score / 10));
    lines.push(`- **${t.name}** [${bar}] ${t.score}점 — ${t.description}`);
  });
  lines.push('');

  // 업무 스타일
  lines.push(`## 업무 스타일`);
  result.workStyle?.axes?.forEach(a => {
    const pos = a.value > 0 ? `→ ${a.rightLabel} (+${a.value})` : a.value < 0 ? `← ${a.leftLabel} (${a.value})` : '중립 (0)';
    lines.push(`- **${a.leftLabel} ↔ ${a.rightLabel}**: ${pos} — ${a.description}`);
  });
  lines.push('');

  // 강점
  lines.push(`## 강점`);
  result.strengths?.forEach(s => lines.push(`- **${s.title}**: ${s.description}`));
  lines.push('');

  // 주의점
  lines.push(`## 주의점`);
  result.cautions?.forEach(c => lines.push(`- **${c.title}**: ${c.description}`));
  lines.push('');

  // 일관성
  lines.push(`## 응답 일관성 / Lie Scale`);
  lines.push(`- 점수: **${result.consistency?.score || 0}** / 100`);
  lines.push(`- ${result.consistency?.comment}`);
  lines.push('');

  // 게임 업계 적합도
  lines.push(`## 게임 업계 적합도`);
  lines.push(result.gameIndustryFit || '');
  lines.push('');

  // 대비 전략
  lines.push(`## 맞춤 인성검사 대비 전략`);
  result.testStrategy?.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push('');
  lines.push('---');
  lines.push('*Game Dev Career Assistant — 인성검사 시뮬레이션 분석 결과*');

  return lines.join('\n');
}

function downloadMarkdown(md) {
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `인성검사_결과_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openPdfPrint(result, meta) {
  const dt = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  const traitsHtml = (result.traits || []).map(t => {
    const pct = t.score;
    const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#0ea5e9' : '#f59e0b';
    return `
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-weight:700;font-size:13px;color:#1e293b;">${t.name}</span>
          <span style="font-weight:800;font-size:13px;color:${color};">${t.score}점</span>
        </div>
        <div style="width:100%;height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:5px;"></div>
        </div>
        <p style="font-size:11px;color:#64748b;margin-top:3px;line-height:1.5;">${t.description}</p>
      </div>`;
  }).join('');

  const axesHtml = (result.workStyle?.axes || []).map(a => {
    const leftPct = 50 + (a.value < 0 ? a.value / 2 : 0);
    const barWidth = Math.abs(a.value) / 2;
    return `
      <div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:11px;font-weight:700;color:#4f46e5;">${a.leftLabel}</span>
          <span style="font-size:11px;font-weight:700;color:#7c3aed;">${a.rightLabel}</span>
        </div>
        <div style="position:relative;width:100%;height:12px;background:#e2e8f0;border-radius:6px;overflow:hidden;">
          <div style="position:absolute;top:0;left:50%;width:1px;height:100%;background:#94a3b8;z-index:1;"></div>
          <div style="position:absolute;top:0;left:${leftPct}%;width:${barWidth}%;height:100%;background:linear-gradient(to right,#4f46e5,#7c3aed);border-radius:6px;"></div>
        </div>
        <p style="font-size:10px;color:#64748b;margin-top:2px;line-height:1.4;">${a.description}</p>
      </div>`;
  }).join('');

  const strengthsHtml = (result.strengths || []).map(s =>
    `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;margin-bottom:8px;">
      <strong style="color:#166534;font-size:12px;">${s.title}</strong>
      <p style="font-size:11px;color:#15803d;margin-top:4px;line-height:1.5;">${s.description}</p>
    </div>`
  ).join('');

  const cautionsHtml = (result.cautions || []).map(c =>
    `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px;margin-bottom:8px;">
      <strong style="color:#92400e;font-size:12px;">${c.title}</strong>
      <p style="font-size:11px;color:#a16207;margin-top:4px;line-height:1.5;">${c.description}</p>
    </div>`
  ).join('');

  const strategyHtml = (result.testStrategy || []).map((s, i) =>
    `<div style="display:flex;gap:10px;align-items:flex-start;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;">
      <span style="background:#ede9fe;color:#6d28d9;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;">${i + 1}</span>
      <p style="font-size:12px;color:#334155;line-height:1.6;margin:0;">${s}</p>
    </div>`
  ).join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>인성검사 분석 결과</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#1e293b; background:#fff; padding:40px; max-width:800px; margin:0 auto; }
  @media print {
    body { padding:20px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none !important; }
    .page-break { page-break-before:always; }
  }
  h1 { font-size:24px; font-weight:800; color:#0f172a; margin-bottom:4px; }
  h2 { font-size:16px; font-weight:700; color:#1e293b; margin:24px 0 12px; padding-bottom:8px; border-bottom:2px solid #e2e8f0; }
  .meta { font-size:11px; color:#64748b; margin-bottom:24px; }
  .section { margin-bottom:20px; }
  .consistency-box { display:flex; align-items:center; gap:16px; padding:16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; }
  .consistency-score { font-size:28px; font-weight:800; }
  .fit-box { padding:16px; background:linear-gradient(135deg,#f5f3ff,#eef2ff); border:1px solid #c7d2fe; border-radius:12px; }
</style>
</head><body>
<h1>인성검사 분석 결과</h1>
<p class="meta">분석일: ${dt} | 소요 시간: ${meta.elapsedTime} | 분석: ${meta.source}</p>

<h2>성격 특성 분석</h2>
<div class="section">${traitsHtml}</div>

<div class="page-break"></div>
<h2>업무 스타일</h2>
<div class="section">${axesHtml}</div>

<h2>강점</h2>
<div class="section">${strengthsHtml}</div>

<h2>주의점</h2>
<div class="section">${cautionsHtml}</div>

<div class="page-break"></div>
<h2>응답 일관성 / Lie Scale</h2>
<div class="consistency-box">
  <span class="consistency-score" style="color:${(result.consistency?.score || 0) >= 70 ? '#22c55e' : (result.consistency?.score || 0) >= 50 ? '#eab308' : '#ef4444'};">${result.consistency?.score || 0}</span>
  <p style="font-size:12px;color:#475569;line-height:1.6;">${result.consistency?.comment || ''}</p>
</div>

<h2>게임 업계 적합도</h2>
<div class="fit-box">
  <p style="font-size:13px;color:#3730a3;line-height:1.7;">${result.gameIndustryFit || ''}</p>
</div>

<h2>맞춤 인성검사 대비 전략</h2>
<div class="section">${strategyHtml}</div>

<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;">
  <p style="font-size:10px;color:#94a3b8;">Game Dev Career Assistant — 인성검사 시뮬레이션 분석 결과</p>
</div>

<div class="no-print" style="text-align:center;margin-top:24px;">
  <button onclick="window.print()" style="padding:12px 32px;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;">PDF로 저장 (인쇄)</button>
</div>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 300);
}

// ══════════════════════════════════════════════════════════════════════════
// 인성검사 메인 컴포넌트
// ══════════════════════════════════════════════════════════════════════════
export default function PersonalityTest({ selectedProvider, selectedModelId }) {
  const [step, setStep] = useState('intro');
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [practiceAnswers, setPracticeAnswers] = useState({});
  const [likertAnswers, setLikertAnswers] = useState({});
  const [binaryAnswers, setBinaryAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const timerRef = useRef(null);
  const questionTimerRef = useRef(null);
  const scrollRef = useRef(null);

  // AI 분석 관련
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [analysisSource, setAnalysisSource] = useState(''); // 'ai' | 'local'

  // 타이머
  useEffect(() => {
    if (step === 'test-likert' || step === 'test-binary') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
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
    if (showTimeWarning) {
      const t = setTimeout(() => setShowTimeWarning(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showTimeWarning]);

  // 문항별 10초 타이머
  useEffect(() => {
    if (step === 'test-likert' || step === 'test-binary') {
      setQuestionTimeLeft(QUESTION_TIME_LIMIT);
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = setInterval(() => {
        setQuestionTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(questionTimerRef.current);
            // 시간 초과 → 자동으로 다음 문항
            autoAdvance();
            return QUESTION_TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(questionTimerRef.current);
  }, [currentPage, step]);

  const autoAdvance = useCallback(() => {
    const questions = step === 'test-likert' ? MAIN_QUESTIONS : step === 'test-binary' ? BINARY_QUESTIONS : [];
    const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
    if (currentPage < totalPages - 1) {
      setCurrentPage((p) => p + 1);
    } else if (step === 'test-likert') {
      setCurrentPage(0);
      setStep('test-binary');
    } else {
      clearInterval(timerRef.current);
      clearInterval(questionTimerRef.current);
      setStep('result');
    }
  }, [currentPage, step]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, step]);

  // ── 핸들러 ─────────────────────────────────────────────────────────────
  const handleStartPractice = () => { setPracticeAnswers({}); setStep('practice'); };
  const handleStartTest = () => {
    setLikertAnswers({}); setBinaryAnswers({});
    setTimeLeft(TOTAL_TIME); setCurrentPage(0);
    setAiResult(null); setAiError(''); setAnalysisSource('');
    setStep('test-likert');
  };
  const handleGoToBinary = () => { setCurrentPage(0); setStep('test-binary'); };
  const handleSubmit = () => setShowConfirm(true);
  const confirmSubmit = () => { setShowConfirm(false); clearInterval(timerRef.current); setStep('result'); };
  const cancelSubmit = () => setShowConfirm(false);
  const handleReset = () => {
    setStep('intro'); setPracticeAnswers({}); setLikertAnswers({}); setBinaryAnswers({});
    setTimeLeft(TOTAL_TIME); setCurrentPage(0);
    setAiResult(null); setAiError(''); setAnalysisSource('');
  };

  // ── AI 분석 요청 ───────────────────────────────────────────────────────
  const requestAiAnalysis = async () => {
    setAiLoading(true);
    setAiError('');

    try {
      // 서버 → Supabase 프록시 폴백
      let res = await fetch(apiUrl('api/analyze-personality'), {
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

      if (!res || !res.ok) {
        // 서버 없음 → 로컬 분석으로 폴백
        const local = analyzeLocally(likertAnswers, binaryAnswers);
        setAiResult(local);
        setAnalysisSource('local');
        setAiLoading(false);
        return;
      }

      const data = await res.json();
      setAiResult(data);
      setAnalysisSource('ai');
    } catch (err) {
      console.warn('AI 분석 실패 → 로컬 Fallback:', err.message);
      setAiError(`AI 분석 실패: ${err.message}. 로컬 분석으로 대체합니다.`);
      const local = analyzeLocally(likertAnswers, binaryAnswers);
      setAiResult(local);
      setAnalysisSource('local');
    } finally {
      setAiLoading(false);
    }
  };

  // ── 페이지네이션 유틸 ──────────────────────────────────────────────────
  const getCurrentQuestions = useCallback(() => {
    const questions = step === 'test-binary' ? BINARY_QUESTIONS : MAIN_QUESTIONS;
    const start = currentPage * QUESTIONS_PER_PAGE;
    return questions.slice(start, start + QUESTIONS_PER_PAGE);
  }, [step, currentPage]);

  const getTotalPages = useCallback(() => {
    const questions = step === 'test-binary' ? BINARY_QUESTIONS : MAIN_QUESTIONS;
    return Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  }, [step]);

  // ═══════════════════════════════════════════════════════════════════════
  // Intro 화면
  // ═══════════════════════════════════════════════════════════════════════
  if (step === 'intro') {
    return (
      <div className="apple-module personality-intro animate-in fade-in">
        <section className="personality-hero">
          <div className="personality-hero-copy">
            <p className="studio-eyebrow">Personality Simulation</p>
            <h2>인성검사 시뮬레이션</h2>
            <p>
              실제 기업 인적성 검사 흐름을 바탕으로, 연습 문항부터 리커트 본 검사,
              선택형 문항까지 순서대로 진행합니다. 빠르게 답하는 것보다 일관되게 답하는
              편이 더 중요합니다.
            </p>
            <button
              onClick={handleStartPractice}
              className="personality-primary-action"
            >
              <Play size={18} /> 연습 문항 시작
            </button>
          </div>

          <div className="personality-hero-summary">
            <div className="personality-summary-row">
              <span>Flow</span>
              <strong>연습 5문항 → 본 문항 94개 → 선택형 31개</strong>
            </div>
            <div className="personality-summary-row">
              <span>Time Limit</span>
              <strong>본 검사 총 40분</strong>
            </div>
            <p>
              검사 목적은 정답 찾기가 아니라 응답의 일관성과 업무 성향의 흐름을 읽는 데 있습니다.
            </p>
          </div>
        </section>

        <section className="personality-intro-grid">
          <article className="personality-info-card personality-info-card-blue">
            <ClipboardCheck className="w-5 h-5" />
            <div>
              <h3>검사 구성</h3>
              <p><strong>연습 문항</strong>: 응답 방식에 먼저 익숙해지는 짧은 예시</p>
              <p><strong>성향 문항</strong>: 업무 성향을 읽는 6점 리커트 척도</p>
              <p><strong>선택형 문항</strong>: 두 선택지 중 더 가까운 반응 선택</p>
            </div>
          </article>

          <article className="personality-info-card personality-info-card-sky">
            <Clock className="w-5 h-5" />
            <div>
              <h3>제한 시간</h3>
              <p>본 검사 문항은 총 <strong>40분</strong> 안에 응답합니다. 너무 오래 고민하기보다 직관적이되 일관되게 답하는 편이 좋습니다.</p>
            </div>
          </article>

          <article className="personality-info-card personality-info-card-emerald">
            <Brain className="w-5 h-5" />
            <div>
              <h3>AI 분석 제공</h3>
              <p>제출 후 성격 특성, 업무 스타일, 강점과 주의점, 게임 업계 적합도까지 이어서 분석합니다.</p>
            </div>
          </article>

          <article className="personality-info-card personality-info-card-amber">
            <AlertCircle className="w-5 h-5" />
            <div>
              <h3>주의사항</h3>
              <p>사회적 바람직성(Lie Scale) 탐지 문항이 포함되어 있어 지나치게 완벽한 응답은 오히려 부자연스럽게 보일 수 있습니다.</p>
            </div>
          </article>
        </section>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 연습 문항 화면
  // ═══════════════════════════════════════════════════════════════════════
  if (step === 'practice') {
    return (
      <div className="apple-module apple-module-practice personality-practice-shell flex flex-col h-full bg-slate-50">
        <div className="personality-topbar bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="personality-phase-chip px-3 py-1 rounded-full text-xs font-bold">연습 문항</span>
            <span className="text-sm text-slate-500">시간 제한 없음</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
            <div className="personality-guidance rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-center">다음 문장을 읽고 본인과 가장 가깝다고 생각하는 선택지를 클릭해 주세요.</p>
            </div>
            {PRACTICE_QUESTIONS.map((q, idx) => (
              <QuestionCard key={q.id} number={idx + 1} text={q.text} selected={practiceAnswers[q.id]}
                onSelect={(val) => setPracticeAnswers({ ...practiceAnswers, [q.id]: val })} type="likert" />
            ))}
            <div className="pt-4 pb-8">
              <button onClick={handleStartTest}
                className="w-full py-4 font-bold rounded-full transition-all text-lg shadow-lg flex items-center justify-center gap-3 bg-sky-600 hover:bg-sky-700 text-white active:scale-[0.98]">
                <ArrowRight size={20} /> 본 검사 시작하기
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 본 검사 화면 (리커트 + 이항 선택)
  // ═══════════════════════════════════════════════════════════════════════
  if (step === 'test-likert' || step === 'test-binary') {
    const isLikert = step === 'test-likert';
    const pageQuestions = getCurrentQuestions();
    const totalPages = getTotalPages();
    const globalOffset = currentPage * QUESTIONS_PER_PAGE;

    return (
      <div className="apple-module apple-module-practice personality-test-shell flex flex-col h-full bg-slate-50">
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-black text-slate-800 mb-3">최종 제출 확인</h3>
              <p className="text-slate-600 mb-2 text-sm">현재 입력한 응답을 바탕으로 분석 화면을 열까요?</p>
              <p className="text-slate-400 mb-6 text-xs leading-relaxed">제출 후에는 답안을 수정할 수 없습니다.</p>
              <div className="flex gap-3">
                <button onClick={cancelSubmit} className="flex-1 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-bold border border-slate-200">취소</button>
                <button onClick={confirmSubmit} className="flex-1 px-4 py-3 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg">제출하기</button>
              </div>
            </div>
          </div>
        )}

        {showTimeWarning && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] bg-red-500 text-white px-6 py-3 rounded-xl shadow-2xl animate-bounce font-bold text-sm">
            남은 시간 5분! 서둘러 주세요.
          </div>
        )}

        <div className="personality-test-topbar bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 rounded-full p-1">
              <button onClick={() => { setCurrentPage(0); setStep('test-likert'); }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${isLikert ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                리커트 척도
              </button>
              <button onClick={() => { setCurrentPage(0); setStep('test-binary'); }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${!isLikert ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                선택형
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1 text-sm font-mono font-bold ${questionTimeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-sky-600'}`}>
              <span className="text-xs text-slate-400">문항</span> <span className="tabular-nums text-lg">{questionTimeLeft}s</span>
            </div>
            <div className={`flex items-center gap-2 text-lg font-mono font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
              <Clock className="w-4 h-4" /><span className="tabular-nums">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {step === 'test-likert' ? (
              <button onClick={handleGoToBinary} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-full text-xs shadow-md flex items-center gap-1.5">
                선택형으로 <ArrowRight size={14} />
              </button>
            ) : (
              <button onClick={handleSubmit} className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-full text-xs shadow-md">최종 제출</button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="max-w-5xl mx-auto py-6 px-6 space-y-5">
            <div className="personality-guidance rounded-xl p-3">
              <p className="text-sm font-medium text-center">다음 문장을 읽고 본인과 가장 가깝다고 생각하는 선택지를 클릭해 주세요.</p>
            </div>
            {pageQuestions.map((q, idx) => (
              <QuestionCard key={isLikert ? `l-${q.id}` : `b-${q.id}`} number={globalOffset + idx + 1}
                text={q.text} questionData={q}
                selected={isLikert ? likertAnswers[q.id] : binaryAnswers[q.id]}
                onSelect={(val) => {
                  if (isLikert) setLikertAnswers(p => ({ ...p, [q.id]: val }));
                  else setBinaryAnswers(p => ({ ...p, [q.id]: val }));
                  // 선택 시 0.3초 후 자동 다음 문항
                  setTimeout(() => autoAdvance(), 300);
                }}
                type={isLikert ? 'likert' : 'binary'} totalNumber={q.id} />
            ))}
          </div>
        </div>

        <div className="bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center gap-4 shrink-0 shadow-inner">
          <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
            className={`shrink-0 min-w-[72px] whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${currentPage === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 active:scale-95'}`}>
            <ChevronLeft size={16} /> 이전
          </button>
          <div className="personality-page-strip flex-1 min-w-0 flex items-center justify-center px-2">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
              {isLikert ? '리커트 문항' : '선택형 문항'}
            </span>
          </div>
          <button onClick={() => {
            if (currentPage < totalPages - 1) setCurrentPage(p => p + 1);
            else if (isLikert) handleGoToBinary();
            else handleSubmit();
          }} className="shrink-0 min-w-[92px] whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-sky-600 hover:bg-sky-50 transition-all active:scale-95">
            {currentPage < totalPages - 1 ? '다음' : (isLikert ? '선택형으로' : '제출하기')} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 결과 화면
  // ═══════════════════════════════════════════════════════════════════════
  const likertDone = Object.keys(likertAnswers).length;

  return (
    <div className="apple-module apple-module-result p-8 animate-in fade-in">
      <div className="max-w-4xl mx-auto">
        {/* 결과 헤더 */}
        <div className="personality-result-hero bg-white rounded-[32px] shadow-lg border border-slate-200 p-10 mb-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-500 via-blue-500 to-slate-900"></div>
          <Brain className="w-16 h-16 text-sky-500 mx-auto mb-4" />
          <h2 className="text-3xl font-black text-slate-800 mb-2">인성검사 분석 화면</h2>
          <p className="text-slate-500 mb-6">소요 시간: {formatTime(TOTAL_TIME - timeLeft)} · 응답 패턴을 바탕으로 성향 리포트를 구성합니다.</p>

          <div className="flex justify-center gap-3 flex-wrap">
            <button onClick={handleReset} className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm">
              <RotateCcw size={16} /> 다시 도전하기
            </button>
            {!aiResult && (
              <button onClick={requestAiAnalysis} disabled={aiLoading}
                className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full transition-all text-sm shadow-lg disabled:opacity-70">
                {aiLoading ? <><Loader2 size={16} className="animate-spin" /> AI 분석 중...</> : <><Sparkles size={16} /> AI 분석 요청</>}
              </button>
            )}
            {aiResult && analysisSource === 'local' && !aiLoading && (
              <button onClick={requestAiAnalysis}
                className="flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full transition-all text-sm shadow-lg">
                <Sparkles size={16} /> AI로 재분석하기
              </button>
            )}
            {aiResult && analysisSource === 'local' && aiLoading && (
              <button disabled
                className="flex items-center gap-2 px-6 py-3 bg-sky-600 text-white font-bold rounded-full transition-all text-sm shadow-lg opacity-70 cursor-not-allowed">
                <Loader2 size={16} className="animate-spin" /> AI 분석 중...
              </button>
            )}
          </div>
        </div>

        {/* 응답 분포 요약 */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden mb-6">
          <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
            <h3 className="text-lg font-black text-slate-800">응답 분포 요약</h3>
            <p className="text-xs text-slate-400 mt-1">리커트 척도 문항 응답 분포</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-6 gap-2">
              {LIKERT_OPTIONS.map((label, idx) => {
                const count = Object.values(likertAnswers).filter(v => v === idx).length;
                const pct = likertDone > 0 ? Math.round((count / likertDone) * 100) : 0;
                return (
                  <div key={idx} className="text-center">
                    <div className="relative h-28 bg-slate-100 rounded-lg overflow-hidden mb-2">
                      <div className="absolute bottom-0 w-full bg-gradient-to-t from-sky-600 to-blue-400 transition-all duration-700 rounded-b-lg" style={{ height: `${pct}%` }} />
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-700">{count}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI 분석 에러 */}
        {aiError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">{aiError}</p>
          </div>
        )}

        {/* AI 로딩 */}
        {aiLoading && (
          <div className="bg-white rounded-[28px] shadow-lg border border-sky-200 p-12 mb-6 text-center">
            <Loader2 className="w-12 h-12 text-sky-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">AI가 응답 패턴을 분석하고 있습니다...</h3>
            <p className="text-sm text-slate-500">성격 특성, 업무 스타일, 일관성 지표를 종합 분석 중입니다.</p>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-bold text-amber-900">분석 요청은 정상적으로 처리되고 있습니다.</p>
                  <p className="mt-1 text-sm leading-relaxed text-amber-800">
                    서버와 AI 모델이 응답을 정리하는 동안 1분 정도 걸릴 수 있습니다. 새로고침하거나 창을 닫으면 결과가 사라질 수 있으니 잠시만 기다려 주세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ AI 분석 결과 ═══ */}
        {aiResult && !aiLoading && (
          <div className="space-y-6">
            {/* 분석 소스 표시 */}
            {analysisSource === 'ai' ? (
              <div className="rounded-2xl p-3 text-center text-xs font-bold bg-sky-50 border border-sky-200 text-sky-700">
                AI 분석 결과 ({selectedProvider})
              </div>
            ) : (
              <div className="rounded-xl p-4 bg-sky-50 border border-sky-200 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-sky-700">로컬 분석 엔진 결과입니다.</p>
                  <p className="text-xs text-sky-600 mt-0.5">위 버튼 또는 아래 버튼으로 AI 재분석을 요청할 수 있습니다.</p>
                </div>
                <button onClick={requestAiAnalysis} disabled={aiLoading}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition-all text-xs shadow disabled:opacity-70">
                  {aiLoading ? <><Loader2 size={13} className="animate-spin" /> 분석 중...</> : <><Sparkles size={13} /> AI 재분석</>}
                </button>
              </div>
            )}

            {/* ── 성격 특성 ── */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex items-center gap-3">
                <Brain className="w-5 h-5 text-sky-500" />
                <div>
                  <h3 className="text-lg font-black text-slate-800">성격 특성 분석</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Big5 모델 기반 성격 특성 점수</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {aiResult.traits?.map((trait, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-bold text-slate-700">{trait.name}</span>
                      <span className={`text-sm font-black tabular-nums ${trait.score >= 70 ? 'text-emerald-600' : trait.score >= 40 ? 'text-sky-600' : 'text-amber-600'}`}>{trait.score}점</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                      <div className={`h-full rounded-full transition-all duration-1000 ${trait.score >= 70 ? 'bg-emerald-500' : trait.score >= 40 ? 'bg-sky-500' : 'bg-amber-500'}`}
                        style={{ width: `${trait.score}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{trait.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 업무 스타일 축 ── */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex items-center gap-3">
                <Target className="w-5 h-5 text-slate-700" />
                <div>
                  <h3 className="text-lg font-black text-slate-800">업무 스타일</h3>
                  <p className="text-xs text-slate-400 mt-0.5">이항 선택 응답 기반 업무 성향 분석</p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                {aiResult.workStyle?.axes?.map((axis, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-600">{axis.leftLabel}</span>
                      <span className="text-xs font-bold text-sky-600">{axis.rightLabel}</span>
                    </div>
                    <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div className="absolute top-0 left-1/2 w-px h-full bg-slate-300 z-10" />
                      <div className="absolute top-0 h-full bg-gradient-to-r from-slate-900 to-sky-500 rounded-full transition-all duration-1000"
                        style={{
                          left: axis.value < 0 ? `${50 + axis.value / 2}%` : '50%',
                          width: `${Math.abs(axis.value) / 2}%`,
                        }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{axis.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 강점 / 주의점 ── */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
                <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-base font-black text-emerald-800">강점</h3>
                </div>
                <div className="p-5 space-y-3">
                  {aiResult.strengths?.map((s, idx) => (
                    <div key={idx} className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-50">
                      <h4 className="font-bold text-emerald-800 text-sm mb-1">{s.title}</h4>
                      <p className="text-xs text-emerald-700/80 leading-relaxed">{s.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
                <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-black text-amber-800">주의점</h3>
                </div>
                <div className="p-5 space-y-3">
                  {aiResult.cautions?.map((c, idx) => (
                    <div key={idx} className="bg-amber-50/50 rounded-xl p-4 border border-amber-50">
                      <h4 className="font-bold text-amber-800 text-sm mb-1">{c.title}</h4>
                      <p className="text-xs text-amber-700/80 leading-relaxed">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── 일관성 지표 ── */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-200 flex items-center gap-3">
                <Shield className="w-5 h-5 text-sky-500" />
                <div>
                  <h3 className="text-lg font-black text-slate-800">응답 일관성 / Lie Scale</h3>
                  <p className="text-xs text-slate-400 mt-0.5">사회적 바람직성 문항 분석 및 응답 신뢰도</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-6 mb-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                      <circle cx="50" cy="50" r="42" stroke={aiResult.consistency?.score >= 70 ? '#22c55e' : aiResult.consistency?.score >= 50 ? '#eab308' : '#ef4444'}
                        strokeWidth="8" fill="none" strokeDasharray={`${(aiResult.consistency?.score || 0) * 2.64} 264`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black text-slate-800">{aiResult.consistency?.score || 0}</span>
                    </div>
                  </div>
                  <p className="flex-1 text-sm text-slate-600 leading-relaxed">{aiResult.consistency?.comment}</p>
                </div>
              </div>
            </div>

            {/* ── 게임 업계 적합도 ── */}
            <div className="bg-gradient-to-br from-sky-50 via-white to-slate-100 rounded-[28px] shadow-lg border border-sky-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-sky-100 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-sky-500" />
                <h3 className="text-lg font-black text-slate-900">게임 업계 적합도</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-700 leading-relaxed">{aiResult.gameIndustryFit}</p>
              </div>
            </div>

            {/* ── 개인화 대비 전략 ── */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
                <h3 className="text-lg font-black text-slate-800">맞춤 인성검사 대비 전략</h3>
                <p className="text-xs text-slate-400 mt-1">당신의 응답 패턴에 기반한 개인화 전략</p>
              </div>
              <div className="p-6 space-y-3">
                {aiResult.testStrategy?.map((tip, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="bg-sky-100 text-sky-700 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0">{idx + 1}</span>
                    <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 내보내기 버튼 ── */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
                <h3 className="text-lg font-black text-slate-800">결과 내보내기</h3>
                <p className="text-xs text-slate-400 mt-1">분석 결과를 파일로 저장하여 보관하세요</p>
              </div>
              <div className="p-6 flex gap-3">
                <button
                  onClick={() => {
                    const md = buildMarkdown(aiResult, {
                      elapsedTime: formatTime(TOTAL_TIME - timeLeft),
                      source: analysisSource === 'ai' ? `AI (${selectedProvider})` : '로컬 분석',
                    });
                    downloadMarkdown(md);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm border border-slate-200"
                >
                  <FileText size={18} /> Markdown (.md)
                </button>
                <button
                  onClick={() => {
                    openPdfPrint(aiResult, {
                      elapsedTime: formatTime(TOTAL_TIME - timeLeft),
                      source: analysisSource === 'ai' ? `AI (${selectedProvider})` : '로컬 분석',
                    });
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-full transition-all text-sm shadow-lg"
                >
                  <Download size={18} /> PDF 저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 기본 팁 (AI 분석 전) */}
        {!aiResult && !aiLoading && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-800">인성검사 대비 Tip</h3>
            </div>
            <div className="p-8 space-y-4">
              <TipCard emoji="1" title="일관성을 유지하세요" desc="비슷한 성격 특성을 묻는 문항에서 일관된 응답을 하는 것이 중요합니다." />
              <TipCard emoji="2" title="극단적 응답은 피하세요" desc="'매우 그렇다'나 '전혀 그렇지 않다'만 반복하면 성의 없는 응답으로 판단됩니다." />
              <TipCard emoji="3" title="솔직하되 전략적으로" desc="Lie Scale 탐지 문항이 포함되어 있으므로 완벽한 사람처럼 보이려는 응답은 오히려 감점됩니다." />
              <TipCard emoji="4" title="시간 관리가 핵심" desc="직관적으로 떠오르는 첫 번째 생각이 가장 솔직한 답변입니다." />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════
// 문항 카드 컴포넌트
// ══════════════════════════════════════════════════════════════════════════
function QuestionCard({ number, text, questionData, selected, onSelect, type, totalNumber }) {
  if (type === 'likert') {
    return (
      <div className="personality-question-card bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <span className="personality-question-badge w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5">{totalNumber || number}</span>
            <p className="text-base font-bold text-slate-800 leading-relaxed">{text}</p>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="personality-likert-grid grid grid-cols-6 gap-2">
            {LIKERT_OPTIONS.map((label, idx) => (
              <button key={idx} onClick={() => onSelect(idx)}
                className={`py-3 px-1 rounded-xl text-center transition-all duration-200 border-2
                  ${selected === idx ? 'bg-sky-600 text-white border-sky-600 shadow-lg scale-105 font-bold' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700'}`}>
                <span className="text-[11px] leading-tight block font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const q = questionData;
  return (
    <div className="personality-question-card bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md">
      <div className="bg-slate-50 px-6 py-5 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <span className="personality-question-badge w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5">{q.id}</span>
          <div>
            {q.group && <span className="text-[10px] font-bold text-sky-500 uppercase tracking-wider">{q.group}</span>}
            <p className="text-base font-bold text-slate-800 leading-relaxed">{q.text}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 space-y-2">
        <button onClick={() => onSelect('A')}
          className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 border-2 flex items-start gap-3
            ${selected === 'A' ? 'bg-sky-600 text-white border-sky-600 shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50'}`}>
          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${selected === 'A' ? 'border-white text-white' : 'border-slate-300 text-slate-400'}`}>A</span>
          <span className="text-sm font-medium leading-relaxed">{q.optionA}</span>
        </button>
        <button onClick={() => onSelect('B')}
          className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 border-2 flex items-start gap-3
            ${selected === 'B' ? 'bg-sky-600 text-white border-sky-600 shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:bg-sky-50'}`}>
          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black shrink-0 mt-0.5 ${selected === 'B' ? 'border-white text-white' : 'border-slate-300 text-slate-400'}`}>B</span>
          <span className="text-sm font-medium leading-relaxed">{q.optionB}</span>
        </button>
      </div>
    </div>
  );
}

function TipCard({ emoji, title, desc }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
      <span className="personality-tip-badge w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0">{emoji}</span>
      <div>
        <h4 className="font-bold text-slate-800 text-sm mb-1">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
