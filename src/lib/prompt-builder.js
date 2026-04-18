/**
 * 프론트엔드용 프롬프트 빌더
 * GitHub Pages 모드에서 server.js 없이 프롬프트를 조립한다.
 */

const ROLE_FOCUS_MAP = {
  '클라이언트': `### 직군 특화 평가 지시 (클라이언트 프로그래머)
- 렌더링 파이프라인(포워드/디퍼드), 셰이더 작성, GPU 최적화 경험을 중점 평가하세요.
- Unreal Engine 또는 Unity 실 프로젝트 경험과 엔진 내부 구조 이해도를 확인하세요.
- CPU/메모리 프로파일링 및 병목 해결 사례가 있다면 적극 부각하도록 안내하세요.`,
  '서버': `### 직군 특화 평가 지시 (서버 프로그래머)
- 대규모 동시 접속 처리 경험 (TPS, CCU 수치)을 수치화하여 드러내도록 안내하세요.
- DB 설계·인덱싱 전략, 캐시 레이어(Redis 등) 활용 경험을 평가하세요.
- MSA, 분산 락, 이벤트 기반 아키텍처 이해도가 있다면 강조하세요.`,
  '기획': `### 직군 특화 평가 지시 (게임 기획자)
- 지표 기반 의사결정 경험(DAU, 잔존율, ARPU 등)을 반드시 수치로 표현하도록 안내하세요.
- BM 설계 이해(인앱 결제, 시즌패스, 뽑기 확률 등) 경험을 부각하세요.
- 유저 피드백·데이터 분석을 통해 기능을 개선한 사례를 STAR 기법으로 정리하도록 하세요.`,
  'QA': `### 직군 특화 평가 지시 (QA 엔지니어)
- 자동화 테스트 구축 경험(Selenium, Appium, 자체 프레임워크 등)과 커버리지를 확인하세요.
- 버그 재현율 향상, 회귀 테스트 사이클 단축 사례를 수치로 표현하도록 안내하세요.
- 출시 타이틀 경험이 있다면 QA 단계별 게이팅 기준과 역할을 강조하세요.`,
  '아트': `### 직군 특화 평가 지시 (아트 / TA)
- 포트폴리오 퀄리티와 스타일 다양성을 최우선으로 평가하세요.
- 엔진 내 에셋 파이프라인 작업 경험(LOD, 아틀라스, 최적화)이 있다면 반드시 부각하세요.
- TA라면 셰이더/툴 개발 경험, 아티스트-프로그래머 간 브리지 역할 경험을 강조하세요.`,
};

const DEFAULT_ROLE_FOCUS = `### 직군 특화 평가 지시 (공통)
- 지원 직군에서 요구하는 핵심 기술 스택과 보유 스킬의 매칭도를 중점 평가하세요.
- 실제 프로젝트에서의 기여도와 성과를 수치·사례 중심으로 표현하도록 안내하세요.`;

export function buildUserPromptClient({ top3, profile, hasFiles, hasPortfolioFile, portfolioFileNames }) {
  const top3JD = top3.map((job, idx) => `
[${idx + 1}순위 추천 공고]
- 회사명: ${job.companyInfo?.name || job.company}
- 모집 직무: ${job.title} (${job.role})
- 인재상: ${job.companyInfo?.idealCandidate || '정보 없음'}
- 기업 최신 이슈: ${job.companyInfo?.news?.join(' / ') || '정보 없음'}
- 과제 유무: ${job.hasAssignment ? job.assignmentType : '없음'}`).join('\n---');

  const profileText = `
- 지원자 이름: ${profile.name}
- 희망 직무: ${profile.role}
- 총 경력: ${profile.experience}년 ${Number(profile.experience) === 0 ? '(신입)' : '(경력)'}
- 보유 기술 및 숙련도: ${(Array.isArray(profile.skills) ? profile.skills : []).map((s) => `${s.name}(${s.level})`).join(', ') || '없음'}`;

  const fileContext = hasFiles
    ? '### 첨부 파일\n첨부된 파일(이력서·자기소개서·포트폴리오)을 직접 분석하여 피드백에 반영하세요.'
    : '### 첨부 파일\n첨부 파일이 없습니다. 프로필 정보만으로 피드백을 제공하세요.';

  const pfNames = Array.isArray(portfolioFileNames) && portfolioFileNames.length > 0 ? portfolioFileNames : [];
  const portfolioInstruction = hasPortfolioFile
    ? `첨부된 포트폴리오를 직접 분석하여 각 문서별 구체적인 개선점을 제시하세요.\n첨부된 포트폴리오 목록:\n${pfNames.map((n, i) => `  ${i+1}. ${n}`).join('\n') || '  (파일명 정보 없음)'}\n\n**중요: portfolioImprovements 배열의 각 항목 앞에 반드시 해당 포트폴리오 파일명을 "포트폴리오 N (파일명):" 형식으로 명시하세요.**`
    : '포트폴리오 파일이 없으므로 프로필과 직군 기준으로 포트폴리오 구성 방향을 제안하세요.';

  const roleFocus = ROLE_FOCUS_MAP[profile.role] || DEFAULT_ROLE_FOCUS;

  return `## 분석 요청

다음 정보를 바탕으로 지원자의 서류·포트폴리오를 종합 분석하고, 합격 가능성을 높이기 위한 피드백을 제공해줘.

---

### 추천 공고 Top 3 (매칭 점수 순)

${top3JD}

---

### 지원자 프로필

${profileText}

---

${fileContext}

---

### 분석 지시사항

1. **프로필 강약점 분석** (\`profileAnalysis\`)
2. **이력서 개선** (\`resumeImprovements\`, 3~5개 항목)
3. **자기소개서 개선** (\`coverLetterImprovements\`)
4. **포트폴리오 개선** (\`portfolioImprovements\`, 3~5개 항목)
   - ${portfolioInstruction}
5. **면접 준비** (\`interviewPreps\`)

${roleFocus}

---

모든 항목은 **두괄식(결론 먼저) + 개조식(- 항목)** 형식으로 작성하세요.`.trim();
}
