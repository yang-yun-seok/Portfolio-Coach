import React, { lazy, Suspense, useRef } from 'react';
import { FileText, Image as ImageIcon, Loader2, MessageSquare } from 'lucide-react';
import LazyLoadBoundary from './LazyLoadBoundary';
import StudentHomeWorkspace from './StudentHomeWorkspace';

const workspaceLoaders = {
  admin: () => import('./AdminWorkspace'),
  feedback: () => import('./FeedbackWorkspace'),
  input: () => import('./InputWorkspace'),
  'interview-basic': () => import('./InterviewReadinessWorkspace'),
  interview: () => import('./InterviewWorkspace'),
  'job-analysis': () => import('./JobAnalysisWorkspace'),
  jobs: () => import('./JobsWorkspace'),
  'personality-test': () => import('./PersonalityTest'),
  'pdf-export': () => import('./PdfExport'),
  portfolio: () => import('./PortfolioWorkspace'),
};

const AdminWorkspace = lazy(workspaceLoaders.admin);
const FeedbackWorkspace = lazy(workspaceLoaders.feedback);
const InputWorkspace = lazy(workspaceLoaders.input);
const InterviewReadinessWorkspace = lazy(workspaceLoaders['interview-basic']);
const InterviewWorkspace = lazy(workspaceLoaders.interview);
const JobAnalysisWorkspace = lazy(workspaceLoaders['job-analysis']);
const JobsWorkspace = lazy(workspaceLoaders.jobs);
const PersonalityTest = lazy(workspaceLoaders['personality-test']);
const PdfExport = lazy(workspaceLoaders['pdf-export']);
const PortfolioWorkspace = lazy(workspaceLoaders.portfolio);

export function prefetchWorkspace(tabId) {
  const loader = workspaceLoaders[tabId];
  if (!loader) return;
  void loader().catch(() => {});
}

function WorkspaceLoadingFallback() {
  return (
    <div className="coach-workspace-loading" role="status" aria-live="polite">
      <Loader2 size={20} className="animate-spin" />
      <span>화면을 준비하고 있습니다.</span>
    </div>
  );
}

function renderEmptyState(icon, title, desc, onGoToInput) {
  return (
    <div className="apple-empty-state flex flex-col items-center justify-center py-24 text-center animate-in fade-in">
      <div className="bg-slate-200/50 p-6 rounded-full text-slate-400 mb-6">{icon}</div>
      <h3 className="text-2xl font-bold text-slate-700 mb-2">{title}</h3>
      <p className="text-slate-500 mb-8">{desc}</p>
      <button
        type="button"
        onClick={onGoToInput}
        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-indigo-700 transition-all"
      >
        정보 입력하러 가기
      </button>
    </div>
  );
}

export default function WorkspaceContent({
  activeTab,
  adminWorkspaceProps,
  feedbackWorkspaceProps,
  inputWorkspaceProps,
  interviewReadinessWorkspaceProps,
  interviewWorkspaceProps,
  jobAnalysisWorkspaceProps,
  jobsWorkspaceProps,
  onGoToInput,
  pdfExportProps,
  personalityTestProps,
  portfolioWorkspaceProps,
  results,
  studentHomeProps,
}) {
  const mountedTabsRef = useRef(new Set());
  if (activeTab === 'personality-test') mountedTabsRef.current.add('personality-test');

  return (
    <LazyLoadBoundary resetKey={activeTab}>
    <Suspense fallback={<WorkspaceLoadingFallback />}>
      {activeTab === 'home' && (
        <StudentHomeWorkspace {...studentHomeProps} />
      )}

      {activeTab === 'input' && (
        <InputWorkspace {...inputWorkspaceProps} />
      )}

      {activeTab === 'admin' && (
        <AdminWorkspace {...adminWorkspaceProps} />
      )}

      {activeTab === 'feedback' && (
        results ? (
          <FeedbackWorkspace {...feedbackWorkspaceProps} />
        ) : renderEmptyState(<FileText size={48} />, '서류 피드백 결과가 없습니다', '정보를 입력하고 AI 분석을 진행해주세요.', onGoToInput)
      )}

      {activeTab === 'portfolio' && (
        results ? (
          <PortfolioWorkspace {...portfolioWorkspaceProps} />
        ) : renderEmptyState(<ImageIcon size={48} />, '포트폴리오 가이드가 없습니다', '정보를 입력하고 AI 분석을 진행해주세요.', onGoToInput)
      )}

      {activeTab === 'job-analysis' && (
        <JobAnalysisWorkspace {...jobAnalysisWorkspaceProps} />
      )}

      {activeTab === 'jobs' && (
        <JobsWorkspace {...jobsWorkspaceProps} />
      )}

      {activeTab === 'interview' && (
        results?.interviewPreps?.length > 0 ? (
          <InterviewWorkspace {...interviewWorkspaceProps} />
        ) : renderEmptyState(<MessageSquare size={48} />, '면접 예상 질문이 없습니다', '정보를 입력하고 AI 분석을 진행해주세요.', onGoToInput)
      )}

      {activeTab === 'interview-basic' && (
        <InterviewReadinessWorkspace {...interviewReadinessWorkspaceProps} />
      )}

      {mountedTabsRef.current.has('personality-test') ? (
        <div style={{ display: activeTab === 'personality-test' ? 'block' : 'none' }}>
          <PersonalityTest {...personalityTestProps} />
        </div>
      ) : null}

      {activeTab === 'pdf-export' && (
        <PdfExport {...pdfExportProps} />
      )}
    </Suspense>
    </LazyLoadBoundary>
  );
}
