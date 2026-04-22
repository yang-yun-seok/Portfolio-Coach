import React from 'react';
import { Download, FileText, Briefcase, Target, BookOpen, User, AlertCircle } from 'lucide-react';
import { getProfileDisplayRole } from '../data/skills';

// ── 피드백 아이템 파서 (App.jsx 와 동일) ────────────────────────────────────
function parseFeedbackItem(text) {
  if (!text) return { title: '', body: '' };
  const cleaned = text.replace(/^-\s*/, '').trim();
  const boldMatch = cleaned.match(/^\*\*(.+?)\*\*[:\s]+([\s\S]+)/);
  if (boldMatch) return { title: boldMatch[1].trim(), body: boldMatch[2].trim() };
  return { title: '', body: cleaned };
}

// ── 마크다운 → HTML 변환 (inline-style 기반, 헤더를 div로 처리해 브라우저 기본 h크기 방지)
function mdToHtml(text) {
  if (!text) return '';
  const bold = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const esc  = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = text.split('\n');
  const out = [];
  let inUl = false;
  for (const raw of lines) {
    const line = esc(raw);
    const h3 = line.match(/^### (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const h1 = line.match(/^# (.+)$/);
    const li = line.match(/^- (.+)$/);
    if (inUl && !li) { out.push('</ul>'); inUl = false; }
    if (h3) {
      out.push(`<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 4px;">${bold(h3[1])}</div>`);
    } else if (h2) {
      out.push(`<div style="font-size:14px;font-weight:700;color:#1e293b;margin:16px 0 6px;padding-bottom:5px;border-bottom:1px solid #e2e8f0;">${bold(h2[1])}</div>`);
    } else if (h1) {
      out.push(`<div style="font-size:16px;font-weight:800;color:#0f172a;margin:20px 0 8px;">${bold(h1[1])}</div>`);
    } else if (li) {
      if (!inUl) { out.push('<ul style="padding-left:18px;margin:6px 0;">'); inUl = true; }
      out.push(`<li style="margin-bottom:5px;font-size:13px;line-height:1.75;">${bold(li[1])}</li>`);
    } else if (line.trim() === '') {
      out.push('<div style="height:6px;"></div>');
    } else {
      out.push(`<p style="font-size:13px;line-height:1.75;margin-bottom:6px;">${bold(line)}</p>`);
    }
  }
  if (inUl) out.push('</ul>');
  return out.join('\n');
}

// ── PDF HTML 템플릿 생성 ───────────────────────────────────────────────────
function buildFileName(userInfo, instructorFeedback) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const name  = userInfo?.name  || '지원자';
  const instr = instructorFeedback?.name || '강사';
  return `${yy}${mm}${dd}_${name}_서류분석리포트_${instr}`;
}

function generatePdfHtml({ results, userInfo, recommendedJobs, instructorFeedback }) {
  const now = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const top3 = recommendedJobs.slice(0, 3);
  const fileName = buildFileName(userInfo, instructorFeedback);
  const roleLabel = userInfo ? getProfileDisplayRole(userInfo) : '-';

  const renderList = (items = [], color = '#4f46e5') => {
    if (!items.length) return '<p style="color:#94a3b8;font-size:13px;">내용이 없습니다.</p>';
    return items.map((item) => {
      const { title, body } = parseFeedbackItem(item);
      return `<div style="display:flex;gap:8px;margin-bottom:10px;font-size:13px;line-height:1.7;">
        <span style="color:${color};font-size:16px;margin-top:1px;flex-shrink:0;">✓</span>
        <div>${title ? `<strong style="color:#1e293b;">${title}</strong><br>` : ''}<span style="color:#475569;">${body}</span></div>
      </div>`;
    }).join('');
  };

  const coverCommon   = results?.coverLetterImprovements?.common
    ?? (Array.isArray(results?.coverLetterImprovements) ? results.coverLetterImprovements : []);
  const coverRanks = ['rank1','rank2','rank3'].map((k, i) => ({
    items: results?.coverLetterImprovements?.[k] ?? [],
    company: top3[i]?.company ?? `${i+1}순위 공고`,
    rank: i + 1,
    color: ['#0ea5e9','#10b981','#f59e0b'][i],
    bgColor: ['#f0f9ff','#f0fdf4','#fffbeb'][i],
    borderColor: ['#bae6fd','#bbf7d0','#fde68a'][i],
  }));

  const profileSection = userInfo ? `
    <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:4px;">
      <div><span style="color:#64748b;font-size:12px;">지원자</span><br><strong>${userInfo.name || '-'}</strong></div>
      <div><span style="color:#64748b;font-size:12px;">희망직무</span><br><strong>${roleLabel}</strong></div>
      <div><span style="color:#64748b;font-size:12px;">경력</span><br><strong>${userInfo.experience}년 ${Number(userInfo.experience) === 0 ? '(신입)' : ''}</strong></div>
    </div>
    ${userInfo.skills?.length ? `<div style="margin-top:8px;font-size:12px;color:#64748b;">보유 스킬: ${userInfo.skills.map(s => `<span style="background:#e0e7ff;color:#4f46e5;padding:2px 8px;border-radius:99px;margin-right:4px;">${s.name}(${s.level})</span>`).join('')}</div>` : ''}
  ` : '';

  const top3Section = top3.length ? top3.map((job, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
      <span style="background:#4f46e5;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;">${i+1}순위</span>
      <span style="font-weight:600;color:#1e293b;">${job.company}</span>
      <span style="color:#64748b;font-size:12px;">${job.title || ''}</span>
      ${job.score != null ? `<span style="margin-left:auto;font-size:12px;color:#4f46e5;font-weight:700;">매칭 ${Math.round(job.score)}점</span>` : ''}
    </div>
  `).join('') : '<p style="color:#94a3b8;font-size:13px;">추천 공고 정보가 없습니다.</p>';

  const profileAnalysis = results?.profileAnalysis;
  const profileSection2 = profileAnalysis ? `
    ${profileAnalysis.fitScore ? `<div style="background:#eef2ff;border-left:4px solid #4f46e5;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:12px;font-size:13px;color:#3730a3;">${profileAnalysis.fitScore}</div>` : ''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div>
        <p style="font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">강점</p>
        ${(profileAnalysis.strengths||[]).map(s => `<div style="display:flex;gap:6px;margin-bottom:8px;font-size:13px;"><span style="color:#16a34a;">▸</span><span style="color:#374151;">${s}</span></div>`).join('')}
      </div>
      <div>
        <p style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">보완점</p>
        ${(profileAnalysis.weaknesses||[]).map(s => `<div style="display:flex;gap:6px;margin-bottom:8px;font-size:13px;"><span style="color:#dc2626;">▸</span><span style="color:#374151;">${s}</span></div>`).join('')}
      </div>
    </div>
  ` : '<p style="color:#94a3b8;font-size:13px;">프로필 분석 결과가 없습니다.</p>';

  const coverRankHtml = coverRanks.map(({ items, company, rank, color, bgColor, borderColor }) => `
    <div style="background:${bgColor};border:1px solid ${borderColor};border-radius:12px;overflow:hidden;margin-bottom:12px;">
      <div style="padding:10px 16px;border-bottom:1px solid ${borderColor};display:flex;align-items:center;gap:10px;">
        <span style="background:${color};color:#fff;font-size:11px;font-weight:700;padding:2px 10px;border-radius:99px;">${rank}순위</span>
        <span style="font-weight:700;color:#1e293b;font-size:13px;">${company}</span>
      </div>
      <div style="padding:14px 16px;">
        ${renderList(items, color)}
      </div>
    </div>
  `).join('');

  const hasInstructorContent = instructorFeedback && Object.values(instructorFeedback).some(v => v && v.trim());

  const instructorFieldDefs = [
    { key: 'general',     label: '통합 피드백',       color: '#475569', border: '#e2e8f0', bg: '#f8fafc' },
    { key: 'resume',      label: '이력서 피드백',      color: '#1d4ed8', border: '#bfdbfe', bg: '#eff6ff' },
    { key: 'coverLetter', label: '자기소개서 피드백',   color: '#6d28d9', border: '#ddd6fe', bg: '#f5f3ff' },
    { key: 'portfolio',   label: '포트폴리오 피드백',   color: '#be185d', border: '#fbcfe8', bg: '#fdf2f8' },
    { key: 'interview',   label: '면접 대비',           color: '#92400e', border: '#fde68a', bg: '#fffbeb' },
  ];

  const instructorSection = hasInstructorContent ? `
    <div class="section">
      <div class="section-title" style="color:#0f766e;">
        <span style="background:#0d9488;color:#fff;padding:2px 10px;border-radius:6px;font-size:12px;margin-right:8px;">강사 피드백</span>
        Instructor Feedback
      </div>
      ${instructorFeedback.date ? `<p style="font-size:12px;color:#64748b;margin-bottom:14px;">피드백 일자: <strong>${instructorFeedback.date}</strong></p>` : ''}
      ${instructorFieldDefs.map(({ key, label, color, border, bg }) => {
        const content = instructorFeedback[key];
        if (!content || !content.trim()) return '';
        return `<div style="background:${bg};border:1px solid ${border};border-radius:12px;overflow:hidden;margin-bottom:14px;">
          <div style="padding:9px 16px;border-bottom:1px solid ${border};font-size:12px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.06em;">${label}</div>
          <div style="padding:16px;font-size:13px;line-height:1.85;color:#374151;">${mdToHtml(content)}</div>
        </div>`;
      }).join('')}
    </div>
  ` : '';

  const github = results?.githubPortfolioAnalysis;
  const githubSection = github?.repoUrl ? `
  <div class="section">
    <div class="section-title">💻 GitHub 프로젝트 기술문서</div>
    <div class="card" style="background:#0f172a;color:#e2e8f0;border-color:#1e293b;">
      <div style="font-size:12px;color:#7dd3fc;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Repository</div>
      <div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:6px;">${github.fullName || github.repoUrl}</div>
      <div style="font-size:12px;color:#94a3b8;margin-bottom:14px;">${github.repoUrl}</div>
      ${github.summary ? `<p style="font-size:13px;line-height:1.75;color:#cbd5e1;margin-bottom:14px;">${github.summary}</p>` : ''}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;">
        ${[
          ['기술 스택', github.techStack],
          ['구조 해석', github.architecture],
          ['면접 포인트', github.interviewTalkingPoints],
        ].map(([label, items]) => `<div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:12px;">
          <div style="font-size:11px;font-weight:800;color:#bae6fd;margin-bottom:8px;">${label}</div>
          ${(Array.isArray(items) && items.length ? items : ['내용 없음']).map((item) => `<div style="font-size:12px;line-height:1.6;color:#cbd5e1;margin-bottom:5px;">- ${item}</div>`).join('')}
        </div>`).join('')}
      </div>
      ${github.documentation ? `<div style="background:rgba(0,0,0,.28);border-radius:10px;padding:14px;color:#dbeafe;">${mdToHtml(github.documentation)}</div>` : ''}
    </div>
  </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${fileName}</title>
<style>
  /* ── 단일 긴 페이지 모드: A4 높이 제한 없이 내용 전체를 한 페이지로 출력 ── */
  @page {
    size: 860px auto;   /* 너비 고정, 높이 자동 = 내용 길이에 맞춤 */
    margin: 12mm 10mm;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: auto; }
  body { font-family: 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif; color:#1e293b; background:#fff; }
  .page { max-width:780px; margin:0 auto; padding:32px 36px; }
  .cover { background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1d4ed8 100%); color:#fff; padding:48px 40px; border-radius:0 0 24px 24px; margin-bottom:36px; }
  .cover h1 { font-size:28px; font-weight:900; letter-spacing:-0.5px; margin-bottom:4px; }
  .cover p { font-size:14px; opacity:.75; }
  .meta { display:flex; gap:24px; margin-top:20px; font-size:13px; flex-wrap:wrap; }
  .meta-item { background:rgba(255,255,255,.12); border-radius:8px; padding:10px 16px; }
  .meta-label { font-size:11px; opacity:.7; margin-bottom:2px; }
  .section { margin-bottom:36px; break-inside: avoid-page; }
  .section-title { font-size:18px; font-weight:800; color:#1e293b; margin-bottom:16px; display:flex; align-items:center; gap:8px; padding-bottom:10px; border-bottom:2px solid #e2e8f0; }
  .card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,.05); break-inside: avoid; }
  .card-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  strong { color:#1e293b; }
  h1,h2,h3 { font-size:inherit; font-weight:inherit; margin:0; }
  ul { padding-left:20px; margin:6px 0; }
  li { margin-bottom:4px; }
  p { margin-bottom:8px; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none !important; }
    .page { padding:16px 20px; }
    /* 섹션/카드가 페이지 경계에서 잘리지 않도록 */
    .section { break-inside: avoid-page; }
    .card { break-inside: avoid; }
    .two-col { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- 커버 -->
  <div class="cover">
    <h1>서류 분석 피드백 리포트</h1>
    <p>Game Dev Career Assistant · AI 종합 분석 결과</p>
    <div class="meta">
      <div class="meta-item"><div class="meta-label">지원자</div><strong>${userInfo?.name || '-'}</strong></div>
      <div class="meta-item"><div class="meta-label">희망 직무</div><strong>${roleLabel}</strong></div>
      <div class="meta-item"><div class="meta-label">경력</div><strong>${userInfo?.experience ?? 0}년 ${Number(userInfo?.experience) === 0 ? '(신입)' : ''}</strong></div>
      ${instructorFeedback?.name ? `<div class="meta-item"><div class="meta-label">담당 강사</div><strong>${instructorFeedback.name}</strong></div>` : ''}
      <div class="meta-item"><div class="meta-label">출력일</div><strong>${now}</strong></div>
    </div>
  </div>

  <!-- 1. 지원자 프로필 요약 -->
  <div class="section">
    <div class="section-title">👤 지원자 프로필 요약</div>
    <div class="card">
      ${profileSection}
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9;">
        <p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">추천 공고 Top 3</p>
        ${top3Section}
      </div>
    </div>
  </div>

  <!-- 2. 프로필 강약점 분석 -->
  ${profileAnalysis ? `
  <div class="section">
    <div class="section-title">📊 프로필 강약점 분석</div>
    <div class="card">${profileSection2}</div>
  </div>` : ''}

  <!-- 3. 이력서 / 자소서 공통 피드백 -->
  ${results ? `
  <div class="section">
    <div class="section-title">📄 서류 공통 피드백</div>
    <div class="two-col">
      <div class="card">
        <div class="card-label" style="color:#3b82f6;">이력서 피드백</div>
        ${renderList(results.resumeImprovements, '#3b82f6')}
      </div>
      <div class="card">
        <div class="card-label" style="color:#8b5cf6;">자기소개서 피드백 (공통)</div>
        ${renderList(coverCommon, '#8b5cf6')}
      </div>
    </div>
  </div>

  <!-- 4. 공고별 맞춤 분석 -->
  <div class="section">
    <div class="section-title">🎯 공고별 맞춤 분석</div>
    ${coverRankHtml}
  </div>

  <!-- 5. 포트폴리오 피드백 -->
  ${results.portfolioImprovements?.length ? `
  <div class="section">
    <div class="section-title">🖼 포트폴리오 가이드</div>
    <div class="card">${renderList(results.portfolioImprovements, '#ec4899')}</div>
  </div>` : ''}` : ''}

  ${githubSection}

  <!-- 6. 강사 피드백 -->
  ${instructorSection}
</div>
</body>
</html>`;
}

// ══════════════════════════════════════════════════════════════════════
// PdfExport 컴포넌트
// ══════════════════════════════════════════════════════════════════════
export default function PdfExport({ results, userInfo, recommendedJobs, instructorFeedback }) {
  const hasResults = !!results;
  const fileName = buildFileName(userInfo, instructorFeedback);

  const handleExport = () => {
    const html = generatePdfHtml({ results, userInfo, recommendedJobs: recommendedJobs || [], instructorFeedback });
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해주세요.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => setTimeout(() => win.print(), 300);
  };

  return (
    <div className="apple-module apple-module-export p-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="max-w-3xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">PDF 출력</h2>
          <p className="text-slate-500">전체 분석 결과와 강사 피드백을 하나의 PDF 리포트로 저장합니다.</p>
        </div>

        {/* 상태 카드 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: 'AI 분석 결과', ok: hasResults, icon: <Target size={18} /> },
            { label: '이력서 피드백', ok: !!(results?.resumeImprovements?.length), icon: <FileText size={18} /> },
            { label: '자소서 피드백', ok: !!(results?.coverLetterImprovements), icon: <Briefcase size={18} /> },
            { label: '강사 피드백', ok: !!(instructorFeedback && Object.values(instructorFeedback).some(v => v && v.trim())), icon: <BookOpen size={18} />, optional: true },
          ].map(({ label, ok, icon, optional }) => (
            <div key={label} className={`flex items-center gap-3 p-4 rounded-xl border ${ok ? 'bg-emerald-50 border-emerald-200' : optional ? 'bg-slate-50 border-slate-200' : 'bg-amber-50 border-amber-200'}`}>
              <span className={ok ? 'text-emerald-500' : optional ? 'text-slate-400' : 'text-amber-500'}>{icon}</span>
              <div>
                <p className={`text-sm font-semibold ${ok ? 'text-emerald-800' : optional ? 'text-slate-500' : 'text-amber-700'}`}>{label}</p>
                <p className="text-xs" style={{ color: ok ? '#065f46' : optional ? '#94a3b8' : '#92400e' }}>
                  {ok ? '포함됨' : optional ? '미입력 (선택 항목)' : '분석 필요'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 강사 피드백 미리보기 */}
        {instructorFeedback && Object.values(instructorFeedback).some(v => v && v.trim()) && (
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 mb-8">
            <p className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-3 flex items-center gap-2">
              <BookOpen size={14} /> 강사 피드백 요약
            </p>
            <div className="space-y-1.5">
              {[
                { key: 'name',        label: '강사명' },
                { key: 'date',        label: '피드백 일자' },
                { key: 'general',     label: '통합 피드백' },
                { key: 'resume',      label: '이력서 피드백' },
                { key: 'coverLetter', label: '자기소개서' },
                { key: 'portfolio',   label: '포트폴리오' },
                { key: 'interview',   label: '면접 대비' },
              ].filter(({ key }) => instructorFeedback[key]?.trim()).map(({ key, label }) => (
                <div key={key} className="flex items-start gap-2 text-xs">
                  <span className="text-teal-600 font-semibold shrink-0 w-20">{label}</span>
                  <span className="text-teal-900 line-clamp-1 truncate">{instructorFeedback[key]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 안내 & 버튼 */}
        {!hasResults && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">AI 분석을 먼저 실행해야 PDF에 피드백 내용이 포함됩니다. <br/>강사 피드백만 있는 경우에도 출력은 가능합니다.</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">포함 항목: 지원자 프로필 · 추천공고 Top 3 · 프로필 강약점 · 이력서/자소서 피드백 · 공고별 맞춤분석 · 포트폴리오 가이드 · 강사 피드백</p>
          <p className="text-xs text-slate-400 mb-3">버튼 클릭 시 새 창이 열리며, 브라우저의 인쇄 기능(Ctrl+P)으로 PDF 저장하세요.</p>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 mb-5 flex items-center gap-2">
            <span className="text-xs text-slate-400 shrink-0">저장 파일명</span>
            <span className="font-mono text-xs text-indigo-700 font-semibold truncate">{fileName}.pdf</span>
          </div>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold py-4 rounded-xl shadow-lg transition-all text-lg"
          >
            <Download size={22} />
            PDF 리포트 저장
          </button>
        </div>
      </div>
    </div>
  );
}
