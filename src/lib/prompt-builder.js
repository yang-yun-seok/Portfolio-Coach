/**
 * 프론트엔드용 프롬프트 빌더
 * GitHub Pages 모드에서 server.js 없이 프롬프트를 조립한다.
 */

import { getProfileDisplayRole, normalizeUserProfile } from '../data/skills.js';

const ROLE_FOCUS_MAP = {
  '프로그래밍': `### 직군 특화 평가 지시 (프로그래밍 직군)
- 코드 기여도, 구조 설계, 성능/메모리/네트워크 최적화 경험을 구체적으로 평가하세요.
- 사용 엔진·언어·프레임워크를 나열하는 데서 끝내지 말고, 본인이 직접 해결한 병목과 의사결정을 확인하세요.
- GitHub, 코드 샘플, 트러블슈팅 문서, 테스트/빌드 자동화 경험이 있으면 포트폴리오 핵심 근거로 보강하세요.`,
  '기획': `### 직군 특화 평가 지시 (게임 기획자)
- 시스템/컨텐츠/밸런스/QA/개발PM/사업PM 등 세부 직무에 맞는 산출물과 사고 과정을 평가하세요.
- 지표 기반 의사결정 경험(DAU, 잔존율, ARPU 등)을 가능한 수치로 표현하도록 안내하세요.
- QA라면 테스트 케이스·결함 재현·리스크 관리, PM이라면 일정·이슈·이해관계자 조율 경험을 확인하세요.`,
  '아트': `### 직군 특화 평가 지시 (아트 / TA)
- 포트폴리오 퀄리티와 스타일 다양성을 최우선으로 평가하세요.
- 도트아티스트와 2D 그래픽 디자이너는 실루엣, 팔레트, 리소스 활용성, 게임 톤앤매너 적합성을 함께 평가하세요.
- 결과 이미지만 보지 말고 제작 의도, 레퍼런스, 러프→완성 과정, 엔진 적용, 최적화 기준을 확인하세요.
- TA라면 셰이더/툴 개발 경험, 아티스트-프로그래머 간 브리지 역할 경험을 강조하세요.`,
};

const DEFAULT_ROLE_FOCUS = `### 직군 특화 평가 지시 (공통)
- 지원 직군에서 요구하는 핵심 기술 스택과 보유 스킬의 매칭도를 중점 평가하세요.
- 실제 프로젝트에서의 기여도와 성과를 수치·사례 중심으로 표현하도록 안내하세요.`;

export function buildUserPromptClient({ top3, profile, hasFiles, hasPortfolioFile, portfolioFileNames }) {
  const normalizedProfile = normalizeUserProfile(profile);
  const top3JD = top3.map((job, idx) => `
[${idx + 1}순위 추천 공고]
- 회사명: ${job.companyInfo?.name || job.company}
- 모집 직무: ${job.title} (${job.role})
- 인재상: ${job.companyInfo?.idealCandidate || '정보 없음'}
- 기업 최신 이슈: ${job.companyInfo?.news?.join(' / ') || '정보 없음'}
- 과제 유무: ${job.hasAssignment ? job.assignmentType : '없음'}`).join('\n---');

  const profileText = `
- 지원자 이름: ${normalizedProfile.name}
- 직무 대분류: ${normalizedProfile.roleGroup}
- 세부 직무: ${normalizedProfile.subRole}
- 매칭 기준 직군: ${normalizedProfile.role}
- 세부 평가 초점: ${normalizedProfile.roleFocus}
- 총 경력: ${normalizedProfile.experience}년 ${Number(normalizedProfile.experience) === 0 ? '(신입)' : '(경력)'}
- 보유 역량 및 숙련도: ${(Array.isArray(normalizedProfile.skills) ? normalizedProfile.skills : []).map((s) => `${s.name}(${s.level})`).join(', ') || '없음'}`;

  const fileContext = hasFiles
    ? '### 첨부 파일\n첨부된 파일(이력서·자기소개서·포트폴리오)을 직접 분석하여 피드백에 반영하세요.'
    : '### 첨부 파일\n첨부 파일이 없습니다. 프로필 정보만으로 피드백을 제공하세요.';

  const pfNames = Array.isArray(portfolioFileNames) && portfolioFileNames.length > 0 ? portfolioFileNames : [];
  const portfolioInstruction = hasPortfolioFile
    ? `첨부된 포트폴리오를 직접 분석하여 각 문서별 구체적인 개선점을 제시하세요.\n첨부된 포트폴리오 목록:\n${pfNames.map((n, i) => `  ${i+1}. ${n}`).join('\n') || '  (파일명 정보 없음)'}\n\n**중요: portfolioImprovements 배열의 각 항목 앞에 반드시 해당 포트폴리오 파일명을 "포트폴리오 N (파일명):" 형식으로 명시하세요.**`
    : '포트폴리오 파일이 없으므로 프로필과 직군 기준으로 포트폴리오 구성 방향을 제안하세요.';

  const roleFocus = `${ROLE_FOCUS_MAP[normalizedProfile.roleGroup] || DEFAULT_ROLE_FOCUS}

### 세부 직무 맞춤 지시 (${getProfileDisplayRole(normalizedProfile)})
- 모든 피드백은 "${normalizedProfile.subRole}" 지원자 관점에서 작성하세요.
- 이력서, 자기소개서, 포트폴리오 피드백은 해당 세부 직무에서 실제로 검증하는 산출물과 역량 기준을 반영하세요.`;

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
