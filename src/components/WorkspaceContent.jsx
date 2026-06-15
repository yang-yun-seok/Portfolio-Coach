import React from 'react';
import { FileText, Image as ImageIcon, MessageSquare } from 'lucide-react';
import FeedbackWorkspace from './FeedbackWorkspace';
import InputWorkspace from './InputWorkspace';
import InterviewReadinessWorkspace from './InterviewReadinessWorkspace';
import InterviewWorkspace from './InterviewWorkspace';
import JobAnalysisWorkspace from './JobAnalysisWorkspace';
import JobsWorkspace from './JobsWorkspace';
import PersonalityTest from './PersonalityTest';
import PdfExport from './PdfExport';
import PortfolioWorkspace from './PortfolioWorkspace';

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
}) {
  return (
    <>
      {activeTab === 'input' && (
        <InputWorkspace {...inputWorkspaceProps} />
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

      <div style={{ display: activeTab === 'personality-test' ? 'block' : 'none' }}>
        <PersonalityTest {...personalityTestProps} />
      </div>

      {activeTab === 'pdf-export' && (
        <PdfExport {...pdfExportProps} />
      )}
    </>
  );
}
