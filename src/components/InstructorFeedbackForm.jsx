import React, { useState } from 'react';
import { BookOpen, UploadCloud, Download, X, CheckCircle, Eye, EyeOff } from 'lucide-react';

// ══════════════════════════════════════════════════════════════════════
// 마크다운 → HTML 변환 (## 레벨부터 지원, inline style 기반)
// ══════════════════════════════════════════════════════════════════════
export function mdToHtml(text) {
  if (!text) return '';
  const lines = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .split('\n');

  const html = [];
  let inList = false;

  for (const line of lines) {
    const h3 = line.match(/^### (.+)$/);
    const h2 = line.match(/^## (.+)$/);
    const li = line.match(/^- (.+)$/);

    if (h3) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 4px;">${h3[1]}</div>`);
    } else if (h2) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<div style="font-size:14px;font-weight:700;color:#1e293b;margin:16px 0 6px;padding-bottom:5px;border-bottom:1px solid #e2e8f0;">${h2[1]}</div>`);
    } else if (li) {
      if (!inList) { html.push('<ul style="padding-left:18px;margin:6px 0 4px;">'); inList = true; }
      html.push(`<li style="margin-bottom:4px;color:#475569;font-size:13px;line-height:1.65;">${li[1]}</li>`);
    } else {
      if (inList) { html.push('</ul>'); inList = false; }
      if (line.trim() === '') {
        html.push('<div style="height:5px;"></div>');
      } else {
        html.push(`<div style="color:#475569;font-size:13px;line-height:1.75;margin-bottom:3px;">${line}</div>`);
      }
    }
  }
  if (inList) html.push('</ul>');
  return html.join('');
}

// ══════════════════════════════════════════════════════════════════════
// MD 템플릿
// ══════════════════════════════════════════════════════════════════════
export const TEMPLATE_MD = `# 강사명
강사 이름

# 피드백 일자
2026-03-13

# 통합 피드백

## 전체 평가
전반적인 평가를 입력하세요.

## 주요 개선사항
- 개선 항목 1
- 개선 항목 2

# 이력서 피드백

## 강점
- 강점 항목

## 개선 포인트
- 개선 항목

# 자기소개서 피드백

## 강점
- 강점 항목

## 개선 포인트
- 개선 항목

# 포트폴리오 피드백

## 강점
- 강점 항목

## 개선 포인트
- 개선 항목

# 면접 대비

## 예상 질문
- 예상 질문 1
- 예상 질문 2

## 준비 방향
- 준비 방향 항목
`;

// ══════════════════════════════════════════════════════════════════════
// MD 파서: # 섹션 단위로 분리
// ══════════════════════════════════════════════════════════════════════
const SECTION_KEY_MAP = {
  '강사명':       'name',
  '피드백 일자':  'date',
  '통합 피드백':  'general',
  '이력서 피드백': 'resume',
  '자기소개서 피드백': 'coverLetter',
  '포트폴리오 피드백': 'portfolio',
  '면접 대비':    'interview',
};

export function parseInstructorMd(text) {
  const result = { name: '', date: '', general: '', resume: '', coverLetter: '', portfolio: '', interview: '' };
  const lines = text.split('\n');
  let currentKey = null;
  let buf = [];

  const flush = () => {
    if (currentKey === null) return;
    const content = buf.join('\n').trim();
    if (currentKey === 'name' || currentKey === 'date') {
      // 첫 번째 비어있지 않은 줄만 사용
      const val = content.split('\n').find(l => l.trim());
      result[currentKey] = val?.trim() || '';
    } else {
      result[currentKey] = content;
    }
    buf = [];
  };

  for (const line of lines) {
    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      flush();
      currentKey = SECTION_KEY_MAP[h1[1].trim()] ?? null;
    } else if (currentKey !== null) {
      buf.push(line);
    }
  }
  flush();
  return result;
}

// ══════════════════════════════════════════════════════════════════════
// 기본 빈 값
// ══════════════════════════════════════════════════════════════════════
export const EMPTY_INSTRUCTOR = {
  name: '', date: '', general: '', resume: '', coverLetter: '', portfolio: '', interview: '',
};

// ── 필드 정의 ────────────────────────────────────────────────────────
const FIELDS = [
  {
    key: 'general',
    label: '통합 피드백',
    placeholder: '전반적인 평가를 입력하세요.\n\n## 소제목\n내용\n\n- 목록 항목',
    rows: 7,
    color: 'slate',
    borderColor: 'border-slate-200',
    labelColor: 'text-slate-700',
    headerBg: 'bg-slate-50',
  },
  {
    key: 'resume',
    label: '이력서 피드백',
    placeholder: '## 강점\n- 항목\n\n## 개선 포인트\n- 항목',
    rows: 5,
    color: 'blue',
    borderColor: 'border-blue-100',
    labelColor: 'text-blue-700',
    headerBg: 'bg-blue-50',
  },
  {
    key: 'coverLetter',
    label: '자기소개서 피드백',
    placeholder: '## 강점\n- 항목\n\n## 개선 포인트\n- 항목',
    rows: 5,
    color: 'purple',
    borderColor: 'border-purple-100',
    labelColor: 'text-purple-700',
    headerBg: 'bg-purple-50',
  },
  {
    key: 'portfolio',
    label: '포트폴리오 피드백',
    placeholder: '## 강점\n- 항목\n\n## 개선 포인트\n- 항목',
    rows: 5,
    color: 'pink',
    borderColor: 'border-pink-100',
    labelColor: 'text-pink-700',
    headerBg: 'bg-pink-50',
  },
  {
    key: 'interview',
    label: '면접 대비',
    placeholder: '## 예상 질문\n- 질문 1\n- 질문 2\n\n## 준비 방향\n- 항목',
    rows: 5,
    color: 'amber',
    borderColor: 'border-amber-100',
    labelColor: 'text-amber-700',
    headerBg: 'bg-amber-50',
  },
];

// ── 마크다운 미리보기 ─────────────────────────────────────────────────
function MarkdownPreview({ content }) {
  if (!content.trim()) {
    return <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>내용 없음</p>;
  }
  return (
    <div
      style={{ lineHeight: 1.7 }}
      dangerouslySetInnerHTML={{ __html: mdToHtml(content) }}
    />
  );
}

// ══════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ══════════════════════════════════════════════════════════════════════
export default function InstructorFeedbackForm({ value, onChange }) {
  const [previewKeys, setPreviewKeys] = useState({ general: true, resume: true, coverLetter: true, portfolio: true, interview: true });
  const [uploadedFileName, setUploadedFileName] = useState('');

  const togglePreview = (key) =>
    setPreviewKeys((p) => ({ ...p, [key]: !p[key] }));

  const set = (key, val) => onChange({ ...value, [key]: val });

  const handleReset = () => {
    onChange({ ...EMPTY_INSTRUCTOR });
    setUploadedFileName('');
  };

  // ── 양식 다운로드 ────────────────────────────────────────────────
  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_MD], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '강사_피드백_양식.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── MD 파일 업로드 ───────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => onChange(parseInstructorMd(ev.target.result));
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const hasContent = Object.values(value).some((v) => v.trim());

  return (
    <div className="apple-instructor-form bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">

      {/* ── 헤더 ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BookOpen size={20} className="text-teal-500" />
          강사 피드백 <span className="text-slate-400 text-sm font-normal">(선택)</span>
        </h3>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={downloadTemplate}
            title="MD 양식 다운로드"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
          >
            <Download size={13} /> 양식 다운로드
          </button>
          <label className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg border border-teal-200 cursor-pointer transition-colors">
            <UploadCloud size={13} />
            .md 업로드
            <input type="file" accept=".md,.txt" className="hidden" onChange={handleFileUpload} />
          </label>
          {hasContent && (
            <button
              onClick={handleReset}
              title="전체 초기화"
              className="flex items-center gap-1 px-2 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 text-xs rounded-lg transition-colors"
            >
              <X size={13} /> 초기화
            </button>
          )}
        </div>
      </div>

      {/* ── 업로드 상태 표시 ──────────────────────────────────────── */}
      {uploadedFileName && (
        <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
          <CheckCircle size={13} className="text-teal-500 shrink-0" />
          <span className="flex-1 truncate"><strong>{uploadedFileName}</strong> 업로드됨 — 아래 항목에 자동으로 채워졌습니다.</span>
          <button onClick={handleReset}><X size={13} className="text-red-400 hover:text-red-600" /></button>
        </div>
      )}

      <p className="text-xs text-slate-400">
        마크다운을 지원합니다.&nbsp;
        <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">## 소제목</code>&nbsp;
        <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">- 목록</code>&nbsp;
        <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">**굵게**</code>&nbsp;
        각 항목은 # 단위 섹션으로 구분됩니다.
      </p>

      {/* ── 강사명 + 피드백 일자 ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            강사명 <span className="text-slate-400 font-normal">(PDF 파일명에 사용)</span>
          </label>
          <input
            type="text"
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="예: 양윤석"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">피드백 일자</label>
          <input
            type="date"
            value={value.date}
            onChange={(e) => set('date', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
      </div>

      {/* ── 콘텐츠 필드들 ────────────────────────────────────────── */}
      {FIELDS.map(({ key, label, placeholder, rows, borderColor, labelColor, headerBg }) => (
        <div key={key} className={`border ${borderColor} rounded-xl overflow-hidden`}>
          {/* 필드 헤더 */}
          <div className={`flex items-center justify-between ${headerBg} px-4 py-2.5 border-b ${borderColor}`}>
            <span className={`text-sm font-bold ${labelColor}`}># {label}</span>
            <button
              onClick={() => togglePreview(key)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              {previewKeys[key]
                ? <><EyeOff size={13} /> 편집</>
                : <><Eye size={13} /> 미리보기</>}
            </button>
          </div>

          {/* 편집 or 미리보기 */}
          {previewKeys[key] ? (
            <div className="px-4 py-4 min-h-[80px] bg-white">
              <MarkdownPreview content={value[key]} />
            </div>
          ) : (
            <textarea
              value={value[key]}
              onChange={(e) => set(key, e.target.value)}
              placeholder={placeholder}
              rows={rows}
              className="w-full border-0 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none resize-none font-mono leading-relaxed"
            />
          )}

          {/* 입력된 경우 하단에 글자 수 */}
          {value[key] && (
            <div className={`px-4 py-1.5 ${headerBg} border-t ${borderColor} text-right`}>
              <span className="text-xs text-slate-400">{value[key].length}자</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
