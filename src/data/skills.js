export const ROLE_GROUPS = [
  {
    id: 'planning',
    label: '기획',
    description: '시스템/컨텐츠, QA, PM, 라이브 운영 설계 역량을 중심으로 평가합니다.',
  },
  {
    id: 'programming',
    label: '프로그래밍',
    description: '클라이언트, 서버, 엔진, 데이터/AI 구현 역량을 중심으로 평가합니다.',
  },
  {
    id: 'art',
    label: '아트',
    description: '원화, UI, 3D, 애니메이션, VFX, TA 제작 역량을 중심으로 평가합니다.',
  },
];

export const ROLE_INPUT_PLAYBOOK = {
  기획: {
    recruiterLens: '문제를 어떻게 구조화했고, 어떤 지표와 문서로 판단을 증명하는지 먼저 봅니다.',
    evidenceChecklist: [
      '담당 시스템이나 컨텐츠를 한 문장으로 정의하고, 목표 지표 또는 플레이 경험 목표를 같이 적습니다.',
      '기획서, 밸런스 시트, 와이어프레임, QA 리포트처럼 판단 근거가 남는 산출물을 우선 배치합니다.',
      '협업 경험은 “누구와 무엇을 조율했는지”까지 적어야 PM/QA 역량으로 읽힙니다.',
    ],
    skillGuide: '툴 이름보다 산출물과 연결되는 역량을 넣는 편이 좋습니다. 예: Excel 단독보다 “밸런스 시트 설계”.',
    portfolioGuide: '대표 문서 2~3개만 뽑아 문제 정의 → 설계 판단 → 검증 결과 흐름이 보이게 구성하세요.',
    fileChecklist: [
      '이력서: 담당 기능, 지표, 협업 구조가 한눈에 보이도록 정리',
      '자소서: 문제 정의와 판단 근거, 개선 결과를 사례형으로 작성',
      '포트폴리오: 기획서, UI 플로우, QA 리포트, 라이브 개선안 중 핵심만 선별',
    ],
  },
  프로그래밍: {
    recruiterLens: '기술 선택 이유, 코드 구조, 검증 방식, 배포나 협업 흔적이 남아 있는지를 먼저 봅니다.',
    evidenceChecklist: [
      '핵심 프로젝트는 README, 실행 방법, 담당 기능, 트러블슈팅 포인트가 바로 보이도록 정리합니다.',
      '언어/엔진만 적지 말고 네트워크, 최적화, 테스트, 툴링 같은 구현 범위를 같이 적습니다.',
      'GitHub 저장소는 public 기준으로 대표 프로젝트 1개에 집중하는 편이 분석 품질이 좋습니다.',
    ],
    skillGuide: '문법 지식보다 구현 범위가 읽히는 조합이 좋습니다. 예: Unity + UI 구현 + 최적화 + 프로파일링.',
    portfolioGuide: '코드, README, 실행 결과, 구조 설명을 한 세트로 묶으세요. 면접 설명용 기술 문서가 함께 있으면 좋습니다.',
    fileChecklist: [
      '이력서: 기술 스택, 담당 시스템, 검증 방식, 성능 개선 수치를 앞쪽에 배치',
      '자소서: 문제 상황과 기술 선택 이유, 장애 대응 경험을 사례형으로 작성',
      '포트폴리오: GitHub, 기술 문서, 주요 코드 설명, 테스트/배포 흔적을 같이 제시',
    ],
    githubGuide: [
      'public 저장소만 분석 가능합니다.',
      'README, 루트 구조, 설정 파일을 우선 읽기 때문에 실행 방법과 역할 설명을 꼭 적는 편이 좋습니다.',
      '여러 저장소보다 대표 저장소 1개를 먼저 넣는 편이 결과 품질이 안정적입니다.',
    ],
  },
  아트: {
    recruiterLens: '결과물의 완성도뿐 아니라 제작 역할, 엔진 적용 이해, 파이프라인 협업 감각이 보이는지 먼저 봅니다.',
    evidenceChecklist: [
      '한 장의 비주얼보다 제작 범위와 역할 분리가 보이는 시트를 우선 배치합니다.',
      '컨셉, 모델링, 리깅, UI, VFX 중 어디까지 담당했는지 단계별로 구분해 적습니다.',
      '엔진 적용 컷, 최적화 고려, 아웃풋 비교 전후가 있으면 실무형 포트폴리오로 읽힙니다.',
    ],
    skillGuide: '툴 숙련도만 적지 말고 어떤 산출물에 썼는지 연결하는 편이 좋습니다. 예: Blender + 3D 배경 제작 + 최적화.',
    portfolioGuide: '대표 결과물, 제작 과정, 역할 분리, 엔진 적용 컷을 묶어서 보여주세요. 장수보다 설명 구조가 중요합니다.',
    fileChecklist: [
      '이력서: 제작 파트, 사용 툴, 장르/스타일 경험을 명확히 구분',
      '자소서: 작업 의도, 피드백 반영 과정, 협업 경험을 사례형으로 작성',
      '포트폴리오: 결과물, 제작 과정, 역할 범위, 엔진 적용 화면을 한 흐름으로 구성',
    ],
  },
};

export const ROLE_DETAILS = {
  기획: [
    { label: '시스템/컨텐츠 기획', matchRole: '기획', focus: '규칙, 성장, 전투, 컨텐츠 루프를 통합 설계하는 역량' },
    { label: '레벨 디자인', matchRole: '기획', focus: '동선, 난이도 곡선, 전투 배치, 플레이 템포를 설계하는 역량' },
    { label: '전투/액션 기획', matchRole: '기획', focus: '캐릭터 조작감, 스킬 구조, 판정, 밸런스를 설계하는 역량' },
    { label: '시나리오/퀘스트', matchRole: '기획', focus: '세계관, 캐릭터 서사, 퀘스트 플로우를 구조화하는 역량' },
    { label: '경제/BM 설계', matchRole: '기획', focus: '재화 흐름, 상점, 보상, 과금 구조를 지표 기반으로 설계하는 역량' },
    { label: 'UI/UX 기획', matchRole: '기획', focus: '정보 구조, 화면 플로우, 사용성 개선을 설계하는 역량' },
    { label: '라이브/이벤트 기획', matchRole: 'PM/운영', focus: '라이브 지표, 이벤트 캘린더, 운영 개선안을 설계하는 역량' },
    { label: 'QA', matchRole: 'QA/테스트', focus: '테스트 케이스, 결함 재현, 품질 기준과 리스크를 관리하는 역량' },
    { label: '개발PM', matchRole: 'PM/운영', focus: '개발 일정, 이슈, 리스크, 협업 프로세스를 조율하는 역량' },
    { label: '사업PM', matchRole: 'PM/운영', focus: '시장, 매출, 운영 지표를 바탕으로 사업성과 실행 계획을 관리하는 역량' },
  ],
  프로그래밍: [
    { label: '클라이언트 프로그래머', matchRole: '클라이언트', focus: '게임플레이, UI, 렌더링, 엔진 연동 구현 역량' },
    { label: '서버 프로그래머', matchRole: '서버', focus: '동시 접속, DB, 네트워크, 안정성 중심의 서버 구현 역량' },
    { label: '게임플레이 프로그래머', matchRole: '클라이언트', focus: '캐릭터, 전투, 상호작용, 상태머신 구현 역량' },
    { label: '엔진/그래픽스 프로그래머', matchRole: '클라이언트', focus: '렌더링, 셰이더, 엔진 구조, 최적화 역량' },
    { label: '모바일 프로그래머', matchRole: '클라이언트', focus: '모바일 빌드, 성능, 플랫폼 대응 구현 역량' },
    { label: '툴/빌드 프로그래머', matchRole: '클라이언트', focus: '개발 파이프라인, 에디터 툴, 자동화 구축 역량' },
    { label: 'AI/데이터 엔지니어', matchRole: 'AI/데이터', focus: '게임 데이터 분석, 추천/매칭, ML/LLM 활용 구현 역량' },
  ],
  아트: [
    { label: '원화/컨셉 아트', matchRole: '아트/UI', focus: '캐릭터, 배경, 키비주얼 콘셉트 설계와 표현 역량' },
    { label: '도트아티스트', matchRole: '아트/UI', focus: '픽셀 단위 실루엣, 제한 팔레트, 프레임 애니메이션을 제작하는 역량' },
    { label: '2D 그래픽 디자이너', matchRole: '아트/UI', focus: '2D 리소스, 아이콘, 배너, UI 그래픽을 게임 톤에 맞게 제작하는 역량' },
    { label: 'UI 아트', matchRole: '아트/UI', focus: '게임 UI 비주얼, 아이콘, 레이아웃, 사용성 표현 역량' },
    { label: '3D 캐릭터', matchRole: '아트/UI', focus: '모델링, 스컬프팅, 텍스처링, 최적화 제작 역량' },
    { label: '3D 배경', matchRole: '아트/UI', focus: '환경 모델링, 월드 구성, 머티리얼, 최적화 제작 역량' },
    { label: '애니메이션', matchRole: '아트/UI', focus: '캐릭터 모션, 타이밍, 리깅 이해, 인게임 적용 역량' },
    { label: 'VFX/이펙트', matchRole: '아트/UI', focus: '전투 이펙트, 파티클, 셰이더 기반 연출 제작 역량' },
    { label: 'TA', matchRole: '아트/TA', focus: '아트 파이프라인, 셰이더, 툴 제작, 최적화 브리지 역량' },
  ],
};

export const ROLE_GROUP_MATCH_ROLES = {
  기획: ['기획', 'PM/운영'],
  프로그래밍: ['클라이언트', '서버', 'AI/데이터'],
  아트: ['아트/UI', '아트/TA'],
};

export const ROLE_SKILL_CATEGORIES = {
  기획: {
    '기획 전문 역량': [
      '시스템/컨텐츠 기획', '레벨 디자인', '전투/액션 기획',
      '시나리오/퀘스트', '밸런싱', '경제/BM 설계', 'UI/UX 기획', '라이브/이벤트 기획',
    ],
    'QA/PM 역량': [
      'QA/테스트', '테스트 케이스 작성', '버그 리포트', '리스크 관리',
      '개발PM', '사업PM', '일정 관리', '요구사항 정리', '이슈 트래킹',
    ],
    '분석 및 문서화': [
      'GDD 작성', '기획서 작성', '밸런스 시트', '지표 설계', '데이터 분석',
      '유저 리서치', 'A/B 테스트', 'Excel', 'PowerPoint', 'Notion',
    ],
    '협업 및 툴': [
      'JIRA/Confluence', 'Figma', 'Miro', 'Git/SVN', '프로젝트 매니징(PM)',
      '커뮤니케이션', '영어(비즈니스)', '일본어', '중국어',
    ],
    'AI 활용': [
      'ChatGPT/Claude 활용', 'AI 데이터 분석', 'AI 프롬프트 엔지니어링', 'AI 문서 초안화',
    ],
  },
  프로그래밍: {
    '프로그래밍 언어': [
      'C++', 'C#', 'C', 'Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Lua',
    ],
    '엔진 및 클라이언트': [
      'Unity', 'Unreal Engine', 'Gameplay Ability System', 'DirectX', 'OpenGL',
      'Shader', 'UI 구현', 'FSM', '최적화', '프로파일링',
    ],
    '서버 및 인프라': [
      'TCP/IP', 'WebSocket', 'Dedicated Server', 'SQL', 'MySQL', 'Redis',
      'Node.js', 'Spring', 'Docker', 'Kubernetes', 'CI/CD',
    ],
    'AI/데이터': [
      'Machine Learning', 'TensorFlow/PyTorch', '데이터 분석', 'Python 데이터 처리',
      'LLM 활용', '로그 분석', '추천 시스템',
    ],
    '협업 및 형상관리': ['Git/SVN', 'JIRA/Confluence', '코드 리뷰', '테스트 자동화'],
  },
  아트: {
    '2D 및 컨셉': [
      'Photoshop', 'Illustrator', '원화', '캐릭터 디자인', '배경 디자인',
      '도트 아트', 'Aseprite', '픽셀 애니메이션', '2D 그래픽 디자인',
      '컬러/라이팅', '아이콘 제작', '드로잉',
    ],
    '3D 및 애니메이션': [
      'Maya', '3ds Max', 'Blender', 'ZBrush', 'Substance Painter',
      '리깅', '애니메이션', '스킨/웨이트', '모션 캡처',
    ],
    'VFX 및 TA': [
      'Unity', 'Unreal Engine', 'Niagara', 'Particle System', 'Shader',
      'Material', 'LOD', '아틀라스', '최적화', '툴 제작',
    ],
    'UI 및 협업': ['Figma', 'UI 아트', 'UX 이해', '디자인 시스템', 'JIRA/Confluence', 'Git/SVN'],
    'AI 활용': ['AI 이미지 생성', 'Stable Diffusion', 'ComfyUI', 'Midjourney', 'AI 레퍼런스 제작'],
  },
};

export const SKILL_CATEGORIES = ROLE_SKILL_CATEGORIES.기획;

export const ROLES = ROLE_GROUPS.map((group) => group.label);

export function getRoleDetails(roleGroup) {
  return ROLE_DETAILS[roleGroup] || ROLE_DETAILS.기획;
}

export function getDefaultRoleDetail(roleGroup = '기획') {
  return getRoleDetails(roleGroup)[0];
}

export function getRoleDetail(roleGroup, subRole) {
  return getRoleDetails(roleGroup).find((detail) => detail.label === subRole || detail.matchRole === subRole) || getDefaultRoleDetail(roleGroup);
}

export function getSkillCategoriesForRoleGroup(roleGroup = '기획') {
  return ROLE_SKILL_CATEGORIES[roleGroup] || ROLE_SKILL_CATEGORIES.기획;
}

export function getDefaultSkillInput(roleGroup = '기획') {
  const categories = getSkillCategoriesForRoleGroup(roleGroup);
  const category = Object.keys(categories)[0];
  return { category, name: categories[category][0], level: '중' };
}

export function inferRoleGroupFromRole(role) {
  if (ROLE_DETAILS[role]) return role;
  for (const [group, details] of Object.entries(ROLE_DETAILS)) {
    if (details.some((detail) => detail.label === role || detail.matchRole === role)) return group;
  }
  return '기획';
}

export function normalizeUserProfile(profile = {}) {
  const roleGroup = profile.roleGroup || inferRoleGroupFromRole(profile.role);
  const detail = getRoleDetail(roleGroup, profile.subRole || profile.role);
  return {
    ...profile,
    roleGroup,
    subRole: profile.subRole || detail.label,
    role: detail.matchRole,
    roleFocus: detail.focus,
    skills: Array.isArray(profile.skills) ? profile.skills : [],
  };
}

export function getProfileMatchRoles(profile = {}) {
  const normalized = normalizeUserProfile(profile);
  const roles = new Set([normalized.role, ...(ROLE_GROUP_MATCH_ROLES[normalized.roleGroup] || [])]);
  return [...roles].filter(Boolean);
}

export function getProfileDisplayRole(profile = {}) {
  const normalized = normalizeUserProfile(profile);
  return `${normalized.roleGroup} > ${normalized.subRole}`;
}
