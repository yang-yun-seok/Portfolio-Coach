export const ROLE_GROUPS = [
  {
    id: 'planning',
    label: '기획',
    description: '시스템, 콘텐츠, 밸런스, 라이브 운영 설계 역량을 중심으로 평가합니다.',
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

export const ROLE_DETAILS = {
  기획: [
    { label: '시스템 기획', matchRole: '기획', focus: '규칙, 성장, 전투, 경제 구조를 설계하는 역량' },
    { label: '콘텐츠/컨텐츠 기획', matchRole: '기획', focus: '던전, 퀘스트, 이벤트, 반복 플레이 구조를 설계하는 역량' },
    { label: '레벨 디자인', matchRole: '기획', focus: '동선, 난이도 곡선, 전투 배치, 플레이 템포를 설계하는 역량' },
    { label: '전투/액션 기획', matchRole: '기획', focus: '캐릭터 조작감, 스킬 구조, 판정, 밸런스를 설계하는 역량' },
    { label: '시나리오/퀘스트', matchRole: '기획', focus: '세계관, 캐릭터 서사, 퀘스트 플로우를 구조화하는 역량' },
    { label: '경제/BM 설계', matchRole: '기획', focus: '재화 흐름, 상점, 보상, 과금 구조를 지표 기반으로 설계하는 역량' },
    { label: 'UI/UX 기획', matchRole: '기획', focus: '정보 구조, 화면 플로우, 사용성 개선을 설계하는 역량' },
    { label: '라이브/이벤트 기획', matchRole: 'PM/운영', focus: '라이브 지표, 이벤트 캘린더, 운영 개선안을 설계하는 역량' },
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
      '시스템 기획', '콘텐츠/컨텐츠 기획', '레벨 디자인', '전투/액션 기획',
      '시나리오/퀘스트', '밸런싱', '경제/BM 설계', 'UI/UX 기획', '라이브/이벤트 기획',
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
