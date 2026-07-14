import React from 'react';
import { BookOpen, X } from 'lucide-react';

const FEATURE_GUIDE_ITEMS = [
  ['직무와 역량', '정보 입력에서 직무 대분류, 세부 직무, 경력, 증명 가능한 보유 기술을 정리합니다.'],
  ['서류 자료', '이력서, 자기소개서, 포트폴리오 PDF가 있으면 첨부합니다. 파일이 구체적일수록 피드백도 정밀해집니다.'],
  ['공고 기준', '특정 GameJob 공고를 분석 기준으로 삼고 싶다면 공고 번호를 우선 공고 지정에 입력합니다.'],
  ['AI 분석', 'AI 분석 시작을 누른 뒤 응답이 도착할 때까지 새로고침하지 말고 기다립니다.'],
  ['결과 확인', '서류 피드백, 포트폴리오, 공고 분석, 추천 공고, 면접 대비는 필요한 화면만 바로 열어 확인할 수 있습니다.'],
  ['문서 정리', '필요한 분석 결과는 PDF 출력에서 제출용 또는 복습용으로 묶을 수 있습니다.'],
];

const INPUT_QUALITY_ITEMS = [
  ['직무 선택', '기획, 플밍, 아트 중 현재 지원하려는 방향을 먼저 정하고 세부 직무는 가장 가까운 역할을 선택하세요.'],
  ['역량 입력', '툴 이름만 적기보다 “Unity UI 구현”, “밸런스 테이블 설계”, “캐릭터 원화 시트 제작”처럼 산출물이 보이는 표현이 좋습니다.'],
  ['PDF 첨부', '파일명과 첫 페이지에서 본인 이름, 지원 직무, 핵심 프로젝트가 빠르게 보이면 AI와 사람이 모두 읽기 쉽습니다.'],
  ['공고 지정', '지원 예정 공고가 있다면 번호를 넣어두세요. 추천 공고와 면접 질문이 해당 공고 기준으로 더 날카로워집니다.'],
];

const TAB_ROLE_ITEMS = [
  ['서류 피드백', '이력서와 자기소개서에서 직무 적합성, 성과 표현, 두괄식 구조, 부족한 근거를 확인합니다.'],
  ['포트폴리오', '대표작 순서, 본인 역할, 제작 과정, 문제 해결 근거가 채용자가 읽기 좋게 구성됐는지 점검합니다.'],
  ['공고 분석', '최근 반영된 게임제작 공고를 바탕으로 직군 분포, 경력 분포, 핵심 키워드와 상위 채용 기업을 읽습니다.'],
  ['추천 공고', '보유 역량과 경력 조건을 기준으로 AI가 1회 매칭한 공고를 보고, 어떤 역량이 맞고 부족한지 개인 기준으로 확인합니다.'],
  ['면접 대비', '1~3순위 공고의 인재상과 과제 성향을 반영해 예상 질문, 피해야 할 답변, 권장 답변 구조를 봅니다.'],
  ['면접 기본 준비', '복장, 시간, 장비, 태도, 답변 프레임처럼 모든 직무에 공통으로 필요한 면접 기본기를 정리합니다.'],
  ['인성검사', '리커트/선택형 문항으로 인성검사 흐름을 연습하고 일관성 있게 답하는 감각을 익힙니다.'],
  ['PDF 출력', '분석 결과를 상담, 제출, 개인 복습용 자료로 정리합니다.'],
];

export default function UserGuideModal({ open, onClose, roleGroup, guidePlaybook }) {
  if (!open) return null;

  return (
    <div className="coach-user-guide-modal fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg"><BookOpen size={20} className="text-blue-600" /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Portfolio Coach 사용 설명서</h2>
              <p className="text-sm text-slate-500">{roleGroup} 직군 기준으로 입력, 분석, 결과 확인 순서를 정리했습니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <section className="rounded-2xl bg-slate-950 !text-white p-6 shadow-inner">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase !text-blue-200 mb-2">Quick Start</p>
            <h3 className="text-2xl font-bold leading-tight mb-3 !text-white">{guidePlaybook.quickStartTitle}</h3>
            <p className="text-sm !text-slate-100 leading-relaxed">{guidePlaybook.quickStartBody}</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">이 직군 기준 먼저 할 일</h3>
            <div className="grid gap-3 md:grid-cols-3">
              {guidePlaybook.focusCards.map((card) => (
                <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">{card.label}</p>
                  <p className="mb-2 font-bold text-slate-900">{card.title}</p>
                  <p className="text-sm leading-relaxed text-slate-600">{card.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">추천 사용 순서</h3>
              <div className="space-y-3">
                {guidePlaybook.workflow.map((step, index) => (
                  <div key={step} className="flex gap-3 rounded-xl bg-slate-50 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-black text-sky-700">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-slate-700">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <aside className="rounded-2xl bg-slate-950 p-5 text-white shadow-xl">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">Priority Tabs</p>
              <div className="space-y-4">
                {guidePlaybook.priorityTabs.map((item) => (
                  <div key={item.title} className="border-b border-white/10 pb-4 last:border-b-0 last:pb-0">
                    <p className="mb-1 font-bold text-white">{item.title}</p>
                    <p className="text-sm leading-relaxed text-slate-300">{item.body}</p>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">기능별 이용 가이드</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {FEATURE_GUIDE_ITEMS.map(([title, body]) => (
                <article key={title} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="mb-1 font-bold text-slate-900">{title}</p>
                  <p className="leading-relaxed">{body}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">분석 품질을 높이는 입력 기준</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {INPUT_QUALITY_ITEMS.map(([title, body]) => (
                <div key={title} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
                  <p className="font-bold text-slate-900 mb-1">{title}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3">탭별 역할</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {TAB_ROLE_ITEMS.filter((_, index) => index !== 5).map(([title, body]) => (
                <div key={title} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-bold text-slate-900 mb-1">{title}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-blue-50 border border-blue-100 p-5">
            <h3 className="text-base font-bold text-blue-900 mb-2">알아두면 좋아요</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>AI 분석은 모델 상태, 첨부 파일 크기, 네트워크 상태에 따라 1분 정도 걸릴 수 있습니다.</li>
              <li>로딩 중에는 새로고침하거나 탭을 닫지 마세요. 분석 결과 반영이 중간에 끊길 수 있습니다.</li>
              <li>공고 정보는 정기적으로 갱신되며, 화면에는 현재 사용할 수 있는 공고만 표시됩니다.</li>
              <li>첫 요청이나 분석 요청은 다소 지연될 수 있습니다. 잠시 기다리면 이어서 처리됩니다.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
