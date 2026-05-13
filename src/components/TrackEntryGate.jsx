import React from 'react';
import { ArrowRight, ClipboardList, Code2, Palette } from 'lucide-react';

const TRACK_CONTENT = {
  기획: {
    icon: ClipboardList,
    badge: '기획 · QA · PM',
    title: '게임 기획 트랙',
    description: '시스템, 컨텐츠, 라이브 운영과 함께 QA, 개발PM, 사업PM 관점까지 같은 흐름으로 정리합니다.',
    bullets: [
      '기획 문서와 설계 판단 근거',
      'QA 리포트, 이슈 트래킹, 운영 시나리오',
      '일정 조율, 협업 구조, PM 커뮤니케이션',
    ],
  },
  프로그래밍: {
    icon: Code2,
    badge: '프로그래밍',
    title: '게임 프로그래밍 트랙',
    description: '클라이언트, 모바일, AI 구현과 구조 설명, GitHub 포트폴리오, 기술 문서화 기준으로 읽습니다.',
    bullets: [
      '구현 범위, 코드 구조, 테스트 흔적',
      'GitHub 저장소와 README 중심 설명',
      '성능, 로그, 배포와 협업 신호',
    ],
  },
  아트: {
    icon: Palette,
    badge: '아트',
    title: '게임 아트 트랙',
    description: '원화, UI, 모델링, 애니메이션, 이펙트 작업을 역할 범위와 파이프라인 기준으로 정리합니다.',
    bullets: [
      '완성컷보다 역할 범위와 과정 시트',
      '엔진 적용 컷과 피드백 반영 이력',
      '툴 숙련도보다 제작 결과 연결성',
    ],
  },
};

export default function TrackEntryGate({
  currentRoleGroup,
  roleGroups,
  onConfirm,
}) {
  return (
    <section className="coach-track-gate-board">
      <div className="coach-track-gate-copy">
        <p className="coach-case-kicker">직군 선택</p>
        <h1>먼저 준비할 직군을 선택합니다.</h1>
        <p>
          선택한 트랙을 기준으로 입력 가이드, 포트폴리오 해석, 추천 공고와 면접 문맥이 바뀝니다.
          기능은 그대로 유지되고, 읽는 기준만 달라집니다.
        </p>
      </div>

      <div className="coach-track-grid">
        {roleGroups.map((group, index) => {
          const content = TRACK_CONTENT[group.label] || TRACK_CONTENT.기획;
          const Icon = content.icon;
          const isActive = currentRoleGroup === group.label;

          return (
            <button
              key={group.id}
              type="button"
              className={`coach-track-card ${isActive ? 'is-active' : ''}`}
              onClick={() => onConfirm(group.label)}
            >
              <div className="coach-track-card-head">
                <span className="coach-track-card-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="coach-track-card-badge">{content.badge}</span>
              </div>

              <div className="coach-track-card-title">
                <span className="coach-track-card-icon">
                  <Icon size={18} />
                </span>
                <strong>{content.title}</strong>
              </div>

              <p>{content.description}</p>

              <ul className="coach-track-card-list">
                {content.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>

              <span className="coach-track-card-action">
                이 직군으로 시작
                <ArrowRight size={15} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
