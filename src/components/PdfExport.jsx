import React from 'react';
import { Download, FileText, Briefcase, Target, BookOpen, AlertCircle } from 'lucide-react';
import { getProfileDisplayRole } from '../data/skills';

function parseFeedbackItem(text) {
  if (!text) return { title: '', body: '' };
  const cleaned = text.replace(/^-\s*/, '').trim();
  const boldMatch = cleaned.match(/^\*\*(.+?)\*\*[:\s]+([\s\S]+)/);
  if (boldMatch) {
    return { title: boldMatch[1].trim(), body: boldMatch[2].trim() };
  }
  return { title: '', body: cleaned };
}

function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function mdToHtml(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const out = [];
  let inList = false;

  const bold = (value) => value.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  for (const rawLine of lines) {
    const line = escapeHtml(rawLine.trim());
    const h3 = line.match(/^###\s+(.+)$/);
    const h2 = line.match(/^##\s+(.+)$/);
    const h1 = line.match(/^#\s+(.+)$/);
    const bullet = line.match(/^-\s+(.+)$/);

    if (inList && !bullet) {
      out.push('</ul>');
      inList = false;
    }

    if (h3) {
      out.push(`<div style="margin:12px 0 4px;color:#475569;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">${bold(h3[1])}</div>`);
      continue;
    }

    if (h2) {
      out.push(`<div style="margin:14px 0 6px;color:#0f172a;font-size:14px;font-weight:800;padding-bottom:6px;border-bottom:1px solid #e2e8f0;">${bold(h2[1])}</div>`);
      continue;
    }

    if (h1) {
      out.push(`<div style="margin:16px 0 8px;color:#0f172a;font-size:16px;font-weight:900;">${bold(h1[1])}</div>`);
      continue;
    }

    if (bullet) {
      if (!inList) {
        out.push('<ul style="margin:6px 0;padding-left:18px;">');
        inList = true;
      }
      out.push(`<li style="margin-bottom:6px;font-size:13px;line-height:1.75;color:#334155;">${bold(bullet[1])}</li>`);
      continue;
    }

    if (!line) {
      out.push('<div style="height:6px;"></div>');
      continue;
    }

    out.push(`<p style="margin:0 0 8px;color:#334155;font-size:13px;line-height:1.75;">${bold(line)}</p>`);
  }

  if (inList) {
    out.push('</ul>');
  }

  return out.join('\n');
}

function buildFileName(userInfo, instructorFeedback) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const applicantName = userInfo?.name || '지원자';
  const instructorName = instructorFeedback?.name?.trim();
  return [ `${yy}${mm}${dd}`, applicantName, '서류분석리포트', instructorName ].filter(Boolean).join('_');
}

function renderFeedbackList(items = [], accent = '#2563eb') {
  if (!Array.isArray(items) || !items.length) {
    return '<p style="margin:0;color:#64748b;font-size:13px;">정리된 내용이 없습니다.</p>';
  }

  return items
    .map((item) => {
      const { title, body } = parseFeedbackItem(item);
      return `
        <div style="display:flex;gap:10px;margin-bottom:10px;">
          <span style="margin-top:2px;color:${accent};font-size:15px;font-weight:900;">•</span>
          <div style="font-size:13px;line-height:1.72;color:#334155;">
            ${title ? `<strong style="color:#0f172a;">${escapeHtml(title)}</strong><br>` : ''}
            <span>${escapeHtml(body)}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function sectionCard(title, bodyHtml) {
  return `
    <section style="margin-bottom:28px;break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e2e8f0;">
        <strong style="color:#0f172a;font-size:17px;">${title}</strong>
      </div>
      <div style="border:1px solid #e2e8f0;border-radius:18px;background:#ffffff;padding:18px 18px 16px;box-shadow:0 10px 30px rgba(15,23,42,.05);">
        ${bodyHtml}
      </div>
    </section>
  `;
}

function generatePdfHtml({ results, userInfo, recommendedJobs, instructorFeedback }) {
  const createdAt = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const roleLabel = userInfo ? getProfileDisplayRole(userInfo) : '-';
  const top3Jobs = (recommendedJobs || []).slice(0, 3);
  const fileName = buildFileName(userInfo, instructorFeedback);
  const coverCommon =
    results?.coverLetterImprovements?.common ||
    (Array.isArray(results?.coverLetterImprovements) ? results.coverLetterImprovements : []);
  const companySpecificCover = ['rank1', 'rank2', 'rank3']
    .map((key, index) => ({
      rank: index + 1,
      company: top3Jobs[index]?.company || `${index + 1}순위 공고`,
      items: results?.coverLetterImprovements?.[key] || [],
    }))
    .filter((entry) => entry.items.length);
  const hasInstructorFeedback = Boolean(
    instructorFeedback && Object.values(instructorFeedback).some((value) => value && value.trim())
  );
  const showInstructorSection = instructorFeedback !== null;
  const github = results?.githubPortfolioAnalysis;

  const profileSummary = `
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:14px;">
      <div style="padding:12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
        <div style="color:#64748b;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">지원자</div>
        <strong style="display:block;margin-top:6px;color:#0f172a;font-size:15px;">${escapeHtml(userInfo?.name || '-')}</strong>
      </div>
      <div style="padding:12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
        <div style="color:#64748b;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">지원 직무</div>
        <strong style="display:block;margin-top:6px;color:#0f172a;font-size:15px;">${escapeHtml(roleLabel)}</strong>
      </div>
      <div style="padding:12px;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;">
        <div style="color:#64748b;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">경력</div>
        <strong style="display:block;margin-top:6px;color:#0f172a;font-size:15px;">${escapeHtml(String(userInfo?.experience ?? 0))}년</strong>
      </div>
    </div>
    ${
      userInfo?.skills?.length
        ? `
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${userInfo.skills
              .map(
                (skill) => `
                  <span style="display:inline-flex;padding:4px 10px;border-radius:999px;background:#eef2ff;color:#3730a3;font-size:12px;font-weight:700;">
                    ${escapeHtml(skill.name)} (${escapeHtml(skill.level)})
                  </span>
                `
              )
              .join('')}
          </div>
        `
        : '<p style="margin:0;color:#64748b;font-size:13px;">기술 정보가 아직 입력되지 않았습니다.</p>'
    }
  `;

  const recommendedSection = top3Jobs.length
    ? top3Jobs
        .map(
          (job, index) => `
            <div style="display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:${index < top3Jobs.length - 1 ? '1px solid #f1f5f9' : '0'};">
              <span style="display:inline-flex;min-width:44px;justify-content:center;padding:4px 10px;border-radius:999px;background:#0f172a;color:#fff;font-size:11px;font-weight:800;">${index + 1}순위</span>
              <div style="flex:1;min-width:0;">
                <strong style="display:block;color:#0f172a;font-size:14px;">${escapeHtml(job.company || '-')}</strong>
                <div style="margin-top:3px;color:#475569;font-size:13px;">${escapeHtml(job.title || '-')}</div>
              </div>
              ${
                job.score != null
                  ? `<span style="color:#2563eb;font-size:12px;font-weight:800;">매칭 ${Math.round(job.score)}점</span>`
                  : ''
              }
            </div>
          `
        )
        .join('')
    : '<p style="margin:0;color:#64748b;font-size:13px;">추천 공고 정보가 없습니다.</p>';

  const profileAnalysis = results?.profileAnalysis
    ? `
        ${results.profileAnalysis.fitScore ? `<p style="margin:0 0 12px;color:#1d4ed8;font-size:13px;font-weight:700;">${escapeHtml(results.profileAnalysis.fitScore)}</p>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <div style="margin-bottom:8px;color:#166534;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">강하게 연결되는 요소</div>
            ${(results.profileAnalysis.strengths || []).map((item) => `<p style="margin:0 0 8px;color:#334155;font-size:13px;line-height:1.7;">• ${escapeHtml(item)}</p>`).join('') || '<p style="margin:0;color:#64748b;font-size:13px;">없음</p>'}
          </div>
          <div>
            <div style="margin-bottom:8px;color:#b45309;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">보완 후보</div>
            ${(results.profileAnalysis.weaknesses || []).map((item) => `<p style="margin:0 0 8px;color:#334155;font-size:13px;line-height:1.7;">• ${escapeHtml(item)}</p>`).join('') || '<p style="margin:0;color:#64748b;font-size:13px;">없음</p>'}
          </div>
        </div>
      `
    : '<p style="margin:0;color:#64748b;font-size:13px;">프로필 분석 결과가 없습니다.</p>';

  const resumeSection = renderFeedbackList(results?.resumeImprovements || [], '#2563eb');

  const coverSection = `
    ${coverCommon.length ? `<div style="margin-bottom:16px;">${renderFeedbackList(coverCommon, '#7c3aed')}</div>` : ''}
    ${
      companySpecificCover.length
        ? companySpecificCover
            .map(
              ({ rank, company, items }) => `
                <div style="margin-bottom:14px;padding:14px;border-radius:16px;background:#faf5ff;border:1px solid #e9d5ff;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                    <span style="display:inline-flex;padding:3px 9px;border-radius:999px;background:#7c3aed;color:#fff;font-size:11px;font-weight:800;">${rank}순위</span>
                    <strong style="color:#4c1d95;font-size:13px;">${escapeHtml(company)}</strong>
                  </div>
                  ${renderFeedbackList(items, '#7c3aed')}
                </div>
              `
            )
            .join('')
        : '<p style="margin:0;color:#64748b;font-size:13px;">공고 맞춤 자기소개서 피드백이 없습니다.</p>'
    }
  `;

  const portfolioSection = github?.repoUrl
    ? `
        <div style="margin-bottom:14px;padding:14px;border-radius:16px;background:#0f172a;color:#e2e8f0;">
          <div style="color:#7dd3fc;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">Repository</div>
          <strong style="display:block;margin-top:6px;font-size:15px;color:#ffffff;">${escapeHtml(github.fullName || github.repoUrl)}</strong>
          <div style="margin-top:4px;color:#94a3b8;font-size:12px;">${escapeHtml(github.repoUrl)}</div>
          ${github.summary ? `<p style="margin:12px 0 0;color:#cbd5e1;font-size:13px;line-height:1.7;">${escapeHtml(github.summary)}</p>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <div style="margin-bottom:8px;color:#0f172a;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">기술 스택 / 구조</div>
            ${[...(github.techStack || []), ...(github.architecture || [])]
              .slice(0, 8)
              .map((item) => `<p style="margin:0 0 8px;color:#334155;font-size:13px;line-height:1.7;">• ${escapeHtml(item)}</p>`)
              .join('') || '<p style="margin:0;color:#64748b;font-size:13px;">정리된 내용이 없습니다.</p>'}
          </div>
          <div>
            <div style="margin-bottom:8px;color:#0f172a;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">면접 포인트</div>
            ${(github.interviewTalkingPoints || [])
              .map((item) => `<p style="margin:0 0 8px;color:#334155;font-size:13px;line-height:1.7;">• ${escapeHtml(item)}</p>`)
              .join('') || '<p style="margin:0;color:#64748b;font-size:13px;">정리된 내용이 없습니다.</p>'}
          </div>
        </div>
        ${github.documentation ? `<div style="margin-top:14px;">${mdToHtml(github.documentation)}</div>` : ''}
      `
    : '<p style="margin:0;color:#64748b;font-size:13px;">GitHub 분석 결과가 없습니다.</p>';

  const instructorSection = hasInstructorFeedback
    ? [
        { key: 'general', label: '종합 피드백' },
        { key: 'resume', label: '이력서' },
        { key: 'coverLetter', label: '자기소개서' },
        { key: 'portfolio', label: '포트폴리오' },
        { key: 'interview', label: '면접 준비' },
      ]
        .filter(({ key }) => instructorFeedback[key]?.trim())
        .map(
          ({ key, label }) => `
            <div style="margin-bottom:14px;padding:14px;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;">
              <div style="margin-bottom:8px;color:#475569;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">${label}</div>
              <div>${mdToHtml(instructorFeedback[key])}</div>
            </div>
          `
        )
        .join('')
    : '<p style="margin:0;color:#64748b;font-size:13px;">강사 피드백이 없습니다.</p>';

  return `<!DOCTYPE html>
  <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(fileName)}</title>
      <style>
        @page { size: 860px auto; margin: 12mm 10mm; }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif;
          color: #0f172a;
          background: #ffffff;
        }
        .page {
          max-width: 780px;
          margin: 0 auto;
          padding: 28px 30px 40px;
        }
        .cover {
          margin-bottom: 28px;
          padding: 30px 28px;
          border-radius: 26px;
          background: linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%);
          color: #ffffff;
        }
        .cover h1 {
          margin: 0 0 6px;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }
        .cover p {
          margin: 0;
          color: rgba(255,255,255,.78);
          font-size: 14px;
          line-height: 1.6;
        }
        .cover-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }
        .cover-meta-item {
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(255,255,255,.12);
        }
        .cover-meta-item span {
          display: block;
          color: rgba(255,255,255,.72);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }
        .cover-meta-item strong {
          display: block;
          margin-top: 4px;
          font-size: 13px;
          font-weight: 800;
          color: #ffffff;
        }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          section { break-inside: avoid-page; }
        }
      </style>
    </head>
    <body>
      <div class="page">
        <section class="cover">
          <h1>서류 분석 리포트</h1>
          <p>${showInstructorSection
            ? '지원 자료, 추천 공고, 포트폴리오, 강사 피드백을 한 번에 정리한 인쇄용 결과입니다.'
            : '지원 자료, 추천 공고, 포트폴리오 분석을 한 번에 정리한 인쇄용 결과입니다.'}</p>
          <div class="cover-meta">
            <div class="cover-meta-item"><span>지원자</span><strong>${escapeHtml(userInfo?.name || '-')}</strong></div>
            <div class="cover-meta-item"><span>지원 직무</span><strong>${escapeHtml(roleLabel)}</strong></div>
            <div class="cover-meta-item"><span>출력 일자</span><strong>${escapeHtml(createdAt)}</strong></div>
            ${instructorFeedback?.name ? `<div class="cover-meta-item"><span>강사</span><strong>${escapeHtml(instructorFeedback.name)}</strong></div>` : ''}
          </div>
        </section>

        ${sectionCard('지원자 프로필 요약', profileSummary)}
        ${sectionCard('추천 공고 Top 3', recommendedSection)}
        ${sectionCard('프로필 강점·보완 포인트', profileAnalysis)}
        ${sectionCard('이력서 피드백', resumeSection)}
        ${sectionCard('자기소개서 피드백', coverSection)}
        ${sectionCard('포트폴리오 / GitHub 메모', portfolioSection)}
        ${showInstructorSection ? sectionCard('강사 피드백', instructorSection) : ''}
      </div>
    </body>
  </html>`;
}

export default function PdfExport({ results, userInfo, recommendedJobs, instructorFeedback, canManageInstructorFeedback }) {
  const hasResults = !!results;
  const visibleInstructorFeedback = canManageInstructorFeedback ? instructorFeedback : null;
  const fileName = buildFileName(userInfo, visibleInstructorFeedback);
  const hasInstructorFeedback = Boolean(
    visibleInstructorFeedback && Object.values(visibleInstructorFeedback).some((value) => value && value.trim())
  );
  const statusCards = [
    {
      label: 'AI 분석 결과',
      ready: hasResults,
      icon: Target,
      help: hasResults ? '결과 포함' : '분석 필요',
    },
    {
      label: '이력서 피드백',
      ready: Boolean(results?.resumeImprovements?.length),
      icon: FileText,
      help: results?.resumeImprovements?.length ? '결과 포함' : '내용 없음',
    },
    {
      label: '자기소개서 피드백',
      ready: Boolean(results?.coverLetterImprovements),
      icon: Briefcase,
      help: results?.coverLetterImprovements ? '결과 포함' : '내용 없음',
    },
    canManageInstructorFeedback && {
      label: '강사 피드백',
      ready: hasInstructorFeedback,
      icon: BookOpen,
      help: hasInstructorFeedback ? '선택 포함' : '선택 항목',
    },
  ].filter(Boolean);
  const includedSections = [
    '프로필 요약',
    '추천 공고 Top 3',
    '강점·보완 포인트',
    '이력서 피드백',
    '자기소개서 피드백',
    '포트폴리오 / GitHub 메모',
    canManageInstructorFeedback && '강사 피드백',
  ].filter(Boolean);
  const instructorRows = [
    { key: 'name', label: '강사명' },
    { key: 'date', label: '피드백 일자' },
    { key: 'general', label: '종합 피드백' },
    { key: 'resume', label: '이력서' },
    { key: 'coverLetter', label: '자기소개서' },
    { key: 'portfolio', label: '포트폴리오' },
    { key: 'interview', label: '면접 준비' },
  ].filter(({ key }) => visibleInstructorFeedback?.[key]?.trim());

  const handleExport = () => {
    const html = generatePdfHtml({
      results,
      userInfo,
      recommendedJobs: recommendedJobs || [],
      instructorFeedback: visibleInstructorFeedback,
    });
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => setTimeout(() => win.print(), 300);
  };

  return (
    <div className="coach-pdf-page coach-review-page animate-in fade-in slide-in-from-bottom-4">
      <section className="coach-review-shell">
        <header className="coach-review-header">
          <div className="coach-review-header-main">
            <p className="coach-review-eyebrow">PDF 출력</p>
            <h2>분석 결과를 한 번에 묶어 내보냅니다</h2>
            <p>
              {canManageInstructorFeedback
                ? '현재 프로필, 추천 공고, 서류 피드백, 포트폴리오 메모, 강사 피드백을 인쇄용 리포트로 정리합니다.'
                : '현재 프로필, 추천 공고, 서류 피드백과 포트폴리오 메모를 인쇄용 리포트로 정리합니다.'}
            </p>
          </div>
          <div className="coach-review-chip-row">
            <span>브라우저 인쇄 기반</span>
            <span>파일명 자동 생성</span>
            {canManageInstructorFeedback ? <span>강사 피드백 선택 포함</span> : null}
          </div>
        </header>

        <div className="coach-review-meta-grid">
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">저장 파일명</span>
            <strong>{fileName}.pdf</strong>
            <p>{canManageInstructorFeedback ? '출력 시점의 지원자명과 강사명을 기준으로 파일명을 만듭니다.' : '출력 시점의 지원자명을 기준으로 파일명을 만듭니다.'}</p>
          </article>
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">출력 방식</span>
            <strong>브라우저 인쇄창</strong>
            <p>새 창을 연 뒤 인쇄 대화상자에서 PDF 저장을 진행합니다.</p>
          </article>
          <article className="coach-review-meta-card">
            <span className="coach-review-meta-label">포함 범위</span>
            <strong>{canManageInstructorFeedback ? '분석 결과 + 강사 메모' : '분석 결과'}</strong>
            <p>선택한 자료가 있을 때만 해당 섹션이 PDF에 포함됩니다.</p>
          </article>
        </div>
      </section>

      <section className="coach-review-surface">
        <div className="coach-review-section-head">
          <div>
            <span className="coach-review-badge">출력 상태</span>
            <h3>현재 포함 가능한 결과</h3>
          </div>
        </div>
        <div className="coach-pdf-status-grid">
          {statusCards.map(({ label, ready, icon: Icon, help }) => (
            <article key={label} className={`coach-pdf-status-card ${ready ? 'is-ready' : 'is-pending'}`}>
              <span className="coach-pdf-status-icon">
                <Icon size={16} />
              </span>
              <strong>{label}</strong>
              <p>{help}</p>
            </article>
          ))}
        </div>
      </section>

      {canManageInstructorFeedback && hasInstructorFeedback && (
        <section className="coach-review-surface">
          <div className="coach-review-section-head">
            <div>
              <span className="coach-review-badge">강사 피드백</span>
              <h3>PDF에 같이 들어갈 메모</h3>
            </div>
          </div>
          <div className="coach-pdf-instructor-list">
            {instructorRows.map(({ key, label }) => (
              <div key={key} className="coach-pdf-instructor-row">
                <span>{label}</span>
                <p>{visibleInstructorFeedback[key]}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!hasResults && (
        <div className="coach-personality-inline-alert">
          <AlertCircle size={18} />
          <p>
            AI 분석 결과가 아직 없으면 PDF에는 프로필 중심으로만 포함됩니다.
            서류 피드백과 공고 맞춤 분석까지 담으려면 먼저 분석을 실행해야 합니다.
          </p>
        </div>
      )}

      <section className="coach-review-surface">
        <div className="coach-review-section-head">
          <div>
            <span className="coach-review-badge">내보내기</span>
            <h3>PDF 저장 실행</h3>
          </div>
        </div>
        <div className="coach-pdf-export-box">
          <div className="coach-review-chip-row">
            {includedSections.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <p className="coach-review-section-body">
            버튼을 누르면 새 창이 열리고 브라우저 인쇄 대화상자가 실행됩니다. 팝업 차단이
            켜져 있으면 출력이 시작되지 않을 수 있습니다.
          </p>
          <div className="coach-history-actions">
            <button type="button" onClick={handleExport} className="coach-history-action is-primary">
              <Download size={16} />
              PDF 리포트 저장
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
