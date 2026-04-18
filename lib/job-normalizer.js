/**
 * job-normalizer.js
 * 크롤링 데이터(data/refined/*.json) → 봇 내부 스키마(data/jobs/*.json) 정규화
 *
 * 사용법:
 *   node lib/job-normalizer.js              → data/refined/ 전체 정규화 → data/jobs/
 *   node lib/job-normalizer.js --dry-run    → 파일 저장 없이 검증 리포트만 출력
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ────────────────────────────────────────────────────────────────────────────
// 1. jobField → role 매핑 테이블
// ────────────────────────────────────────────────────────────────────────────
const JOBFIELD_TO_ROLE = {
  // 기획 계열
  '게임기획':       '기획',
  '전략기획':       '기획',
  '사업기획(국내)': '기획',
  '사업기획(해외)': '기획',
  '플랫폼 기획':    '기획',
  '게임운영':       'PM/운영',
  // 프로그래밍 계열
  '게임개발(클라이언트)': '클라이언트',
  '게임개발(모바일)':     '클라이언트',
  '엔진':                 '클라이언트',
  '서버':                 '서버',
  '네트워크':             '서버',
  '시스템·DB':            '서버',
  '보안':                 '서버',
  '플랫폼 개발':          '서버',
  '게임AI 개발':          'AI/데이터',
  '정보·빅데이터 분석':   'AI/데이터',
  '리서치':               'AI/데이터',
  // 아트 계열
  '원화':              '아트/UI',
  '모델링':            '아트/UI',
  '애니메이션':        '아트/UI',
  '이펙트·FX':        '아트/UI',
  '인터페이스 디자인': '아트/UI',
  '플랫폼 디자인':    '아트/UI',
  '사운드 제작':       '아트/UI',
  // QA
  'QA·테스터': 'QA/테스트',
  // 기타 (매핑 불가 → null)
  '강사':       null,
  '교수':       null,
  '교육':       null,
  '마케팅':     null,
  '사업관리':   null,
  '게임기자':   null,
};

/**
 * jobField 문자열 → role 배열 (복수 직군 지원)
 * 우선순위: 기획 외 직군 > 기획 (복수 직군일 때 기획은 후순위)
 */
export function parseRoles(jobField) {
  if (!jobField) return [];
  const fields = jobField.split(',').map(s => s.trim());
  const roles = [];
  for (const field of fields) {
    const role = JOBFIELD_TO_ROLE[field];
    if (role && !roles.includes(role)) roles.push(role);
  }
  return roles;
}

/**
 * 복수 role 중 대표 role 1개 선택
 * - 기획 외 직군이 있으면 그것 우선 (기획은 거의 모든 공고에 붙어있으므로)
 * - 기획만 있으면 기획
 */
export function pickPrimaryRole(roles) {
  if (roles.length === 0) return '기획'; // 기본값
  const nonPlanning = roles.filter(r => r !== '기획');
  return nonPlanning.length > 0 ? nonPlanning[0] : roles[0];
}

// ────────────────────────────────────────────────────────────────────────────
// 2. keywords → reqSkills 필터링
// ────────────────────────────────────────────────────────────────────────────

// 기술 키워드로 인정할 패턴 (정규화 이름 → 크롤링 키워드 매칭)
const SKILL_ALIASES = {
  // 프로그래밍 언어
  'C++':        ['C++', 'VisualC++', 'VisualC'],
  'C#':         ['C#'],
  'C':          ['C'],
  'Java':       ['Java'],
  'Python':     ['Python'],
  'JavaScript': ['JavaScript', 'JS'],
  'TypeScript': ['TypeScript', 'TS'],
  'Go':         ['Go', 'Golang'],
  'Rust':       ['Rust'],
  // 엔진·툴
  'Unity':          ['Unity', '유니티', '유니티3D'],
  'Unreal Engine':  ['Unreal', '언리얼', '언리얼엔진', 'UnrealEngine', 'Unreal엔진'],
  'Photoshop':      ['포토샵', 'Photoshop', 'Adobe_Photoshop', 'Adobe Photoshop'],
  'Illustrator':    ['일러스트', 'Illustrator'],
  '3ds Max':        ['3DSmax', '3DMax', '3ds Max'],
  'Maya':           ['Maya', '마야'],
  'ZBrush':         ['ZBrush'],
  'Spine':          ['Spine'],
  'Figma':          ['Figma', '피그마'],
  // 기획 관련
  '시스템 기획':     ['시스템기획', '시스템'],
  '콘텐츠 기획':     ['컨텐츠', '컨텐츠기획', '콘텐츠', '콘텐츠기획'],
  '레벨 디자인':     ['레벨기획', '레벨디자인', '레벨', '맵기획'],
  '전투/액션 기획':  ['전투', '전투기획', '전투밸런스'],
  '시나리오/퀘스트': ['시나리오', '퀘스트', '내러티브', '스토리'],
  '밸런싱':          ['밸런스기획', '밸런스', '경제밸런스'],
  '경제/BM 설계':    ['유료화', 'BM'],
  'UI/UX 기획':      ['UX·UI', 'UI·UX', '인터페이스', '모바일UI', '웹UI'],
  // 그 외
  'PM':              ['PM', 'PD', '개발PM', '게임PM', '사업PM', '프로젝트관리', '프로젝트'],
  '데이터 분석':     ['데이터분석', '데이터'],
  'Excel':           ['엑셀', 'Excel', 'PPT', 'MicrosoftOffice', 'MS-Office'],
  'JIRA/Confluence': ['JIRA', 'Confluence'],
  'Git/SVN':         ['Git', 'SVN'],
  'QA/테스트':       ['QA', '게임테스터'],
  'Machine Learning':['AI', 'ML'],
  // 기술 키워드 추가
  'SQL':             ['MS-SQL', 'SQL', 'DB'],
  'TCP/IP':          ['TCP·IP', '네트워크', 'IOCP'],
  'Redis':           ['Redis'],
  'iOS':             ['iOS'],
  'Android':         ['Android'],
  '3D':              ['3D'],
  'Dedicated Server':['DedicatedServer'],
  'TA':              ['TA'],
  'Scripting':       ['Script'],
  'Lua':             ['LUA스크립트', 'Lua', 'LUA'],
  'CI/CD':           ['CI', 'CD', 'Teamcity', 'Jenkins', 'GitHub Actions'],
  'C':               ['c언어', 'C언어'],
};

// 직군명·회사명으로 판단되어 제외할 키워드
const EXCLUDE_KEYWORDS = new Set([
  '게임기획', '클라이언트', '서버', '게임프로그래밍', '게임프로그래머',
  '기획', '기획자', '디자이너', '원화', '캐릭터원화', '배경원화', '배경',
  '캐릭터', '몬스터', '모델링', '애니메이션', '이펙트', 'FX', '오브젝트',
  '모바일', 'PC', '콘솔', 'RPG', 'FPS', 'TPS', 'SNG', 'MORPG', 'mmorpg',
  '멀티플랫폼', '캐주얼', '서브컬처', '서브컬쳐', '턴제', 'SF',
  '게임운영', 'GM', '게임', '개발', '신작', '엔진',
  '게임디자인', '게임테스터', '이벤트기획', '이벤트', '모니터링', '해외서비스', '마케팅', '설정',
  // 게임 타이틀 / 회사명 (상위 출현)
  '엔엑스쓰리게임즈', 'NX3GAMES', '시프트업', 'OUTANT', '아웃턴트',
  'CINDERCITY', '던전앤파이터', '네오플', '데브시스터즈', '쿠키런', '던파',
  '마비노기모바일', 'NC', 'EVE', 'NIKKE', '승리의여신니케', '데브캣',
  '킹덤', '트리플A오픈월드', '신더시티', '컨셉', '도트',
  '서드파티툴', '사운드',
]);

/**
 * keywords 문자열 → reqSkills 배열 (정규화된 스킬명)
 */
export function parseReqSkills(keywords) {
  if (!keywords) return [];
  const rawKws = keywords.split(',').map(s => s.trim());
  const matched = new Set();

  for (const kw of rawKws) {
    if (EXCLUDE_KEYWORDS.has(kw)) continue;
    for (const [skillName, aliases] of Object.entries(SKILL_ALIASES)) {
      if (aliases.some(a => a.toLowerCase() === kw.toLowerCase())) {
        matched.add(skillName);
        break;
      }
    }
  }
  return [...matched];
}

// ────────────────────────────────────────────────────────────────────────────
// description 기반 reqSkills 보충 레이어
// ────────────────────────────────────────────────────────────────────────────

/**
 * description 자연어 텍스트에서 기술 키워드를 추출하는 regex 패턴 목록
 * (keywords 필드 정규화와 달리, 자연어에 포함된 표현 매핑)
 */
const SKILL_PATTERNS = [
  { skill: 'C++',             pattern: /\bC\+\+\b/ },
  { skill: 'C#',              pattern: /\bC#\b/ },
  { skill: 'Java',            pattern: /\bJava\b(?!Script)/i },
  { skill: 'Python',          pattern: /\bPython\b/i },
  { skill: 'JavaScript',      pattern: /\bJavaScript\b|\bJS\b/i },
  { skill: 'TypeScript',      pattern: /\bTypeScript\b|\bTS\b/ },
  { skill: 'Go',              pattern: /\bGolang\b|\bGo 언어\b/i },
  { skill: 'Unity',           pattern: /\bUnity\b|유니티/i },
  { skill: 'Unreal Engine',   pattern: /\bUnreal\b|언리얼\s*(엔진)?/i },
  { skill: 'Photoshop',       pattern: /\b포토샵\b|\bPhotoshop\b/i },
  { skill: 'Illustrator',     pattern: /\b일러스트레이터\b|\bIllustrator\b/i },
  { skill: '3ds Max',         pattern: /\b3ds\s*Max\b|\b3D\s*Max\b/i },
  { skill: 'Maya',            pattern: /\bMaya\b|마야/i },
  { skill: 'ZBrush',          pattern: /\bZBrush\b/i },
  { skill: 'Figma',           pattern: /\bFigma\b|피그마/i },
  { skill: 'JIRA/Confluence', pattern: /\bJIRA\b|\bConfluence\b/i },
  { skill: 'Git/SVN',         pattern: /\bGit\b|\bSVN\b/i },
  { skill: 'SQL',             pattern: /\bSQL\b|\bMySQL\b|\bPostgres/i },
  { skill: 'Redis',           pattern: /\bRedis\b/i },
  { skill: 'Machine Learning',pattern: /\bMachine\s*Learning\b|\b딥러닝\b|\b머신러닝\b/i },
  { skill: '데이터 분석',     pattern: /데이터\s*(분석|시각화|처리)/i },
  { skill: 'Excel',           pattern: /\bExcel\b|\b엑셀\b|Microsoft\s*Office|MS\s*Office/i },
  { skill: '데이터 분석',     pattern: /데이터\s*(분석|시각화|처리|파싱)/i },
  { skill: 'TCP/IP',          pattern: /\bTCP\/?IP\b/i },
  { skill: 'iOS',             pattern: /\biOS\b/ },
  { skill: 'Android',         pattern: /\bAndroid\b/i },
];

/**
 * description 텍스트 → 추가 reqSkills 배열
 * 이미 keywordsSkills에 있는 스킬은 중복 제외
 * @param {string} description   - 크롤링된 공고 상세 텍스트
 * @param {string[]} existing    - 이미 parseReqSkills로 추출된 스킬 배열
 * @returns {string[]} 추가 스킬 배열 (새로 발견된 것만)
 */
export function parseReqSkillsFromDesc(description, existing = []) {
  if (!description || description.includes('가져올 수 없습니다')) return [];
  const existingSet = new Set(existing);
  const added = [];
  for (const { skill, pattern } of SKILL_PATTERNS) {
    if (!existingSet.has(skill) && pattern.test(description)) {
      added.push(skill);
      existingSet.add(skill); // 중복 방지
    }
  }
  return added;
}

// ────────────────────────────────────────────────────────────────────────────
// 3. experience → reqExp 숫자 파싱
// ────────────────────────────────────────────────────────────────────────────
export function parseExperience(experience) {
  if (!experience) return 0;
  const match = experience.match(/경력\s*(\d+)/);
  if (match) return Number(match[1]);
  // "무관", "신입", "신입·경력" → 0
  return 0;
}

// ────────────────────────────────────────────────────────────────────────────
// 4. company 정규화 매핑 (법인명 → data/companies/ 브랜드명)
// ────────────────────────────────────────────────────────────────────────────
const COMPANY_ALIASES = {
  // 넥슨 그룹
  '넥슨':        '넥슨 (NEXON)',
  '㈜넥슨게임즈':'넥슨 (NEXON)',
  '네오플':      '넥슨 (NEXON)',
  '데브캣':      '넥슨 (NEXON)',
  'NX3GAMES':    '넥슨 (NEXON)',
  // 엔씨소프트
  '엔씨소프트':  '엔씨소프트 (NCSOFT)',
  // 크래프톤
  '크래프톤':    '크래프톤 (KRAFTON)',
  // 넷마블 그룹
  '넷마블':      '넷마블 (Netmarble)',
  '넷마블네오':  '넷마블 (Netmarble)',
  '넷마블에프앤씨': '넷마블 (Netmarble)',
  // 스마일게이트
  '스마일게이트':    '스마일게이트 (Smilegate)',
  '스마일게이트RPG': '스마일게이트 (Smilegate)',
  // 펄어비스
  '펄어비스':    '펄어비스 (Pearl Abyss)',
  '㈜펄어비스':  '펄어비스 (Pearl Abyss)',
  // 시프트업
  '㈜시프트업':  '시프트업 (SHIFT UP)',
  // 데브시스터즈
  '데브시스터즈㈜': '데브시스터즈 (Devsisters)',
  // 컴투스
  '주식회사 컴투스': '컴투스 (Com2uS)',
  // 크래프톤 변형
  '(주)크래프톤': '크래프톤 (KRAFTON)',
  // 넷마블 계열
  '넷마블넥서스':    '넷마블 (Netmarble)',
  '넷마블몬스터':    '넷마블 (Netmarble)',
  // 위메이드 계열
  '(주)위메이드맥스':  '위메이드 (Wemade)',
  '㈜위메이드플레이':  '위메이드 (Wemade)',
  // 라이온하트
  '라이온하트스튜디오': '라이온하트 스튜디오',
  // 슈퍼센트
  '슈퍼센트': '슈퍼센트 (Supercent)',
  // 스마일게이트 슈퍼크리에이티브
  '(주)스마일게이트 슈퍼크리에이티브 지점': '스마일게이트 (Smilegate)',
};

/**
 * 크롤링 회사명 → 대표 브랜드명.
 * 매핑 없으면 원본 반환.
 */
export function normalizeCompany(company) {
  return COMPANY_ALIASES[company] || company;
}

// ────────────────────────────────────────────────────────────────────────────
// 5. 단일 크롤링 JSON → 봇 내부 스키마 변환
// ────────────────────────────────────────────────────────────────────────────
export function normalizeJob(crawled) {
  const roles = parseRoles(crawled.jobField);
  const primaryRole = pickPrimaryRole(roles);
  const skillsFromKeywords = parseReqSkills(crawled.keywords);
  const skillsFromDesc = parseReqSkillsFromDesc(crawled.description, skillsFromKeywords);
  const reqSkills = [...skillsFromKeywords, ...skillsFromDesc];
  const reqExp = parseExperience(crawled.experience);
  const company = normalizeCompany(crawled.company);

  return {
    id: crawled.id,
    company,
    title: crawled.title,
    role: primaryRole,
    roles,                  // 복수 직군 보존
    reqSkills,
    reqExp,
    url: crawled.link,
    hasAssignment: false,   // 크롤링 데이터에 없음 → 기본값
    assignmentType: '',
    // 크롤링 고유 필드 (추가 활용용)
    mainGame: crawled.mainGame || '',
    gameCategory: crawled.gameCategory || '',
    employmentType: crawled.employmentType || '',
    deadline: crawled.deadline || '',
    salary: crawled.salary || '',
    experience: crawled.experience || '',
    keywords: crawled.keywords || '',
    updatedAt: crawled.updatedAt,
    source: crawled.source || 'GameJob',
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 6. 전체 배치 정규화 + 검증 리포트
// ────────────────────────────────────────────────────────────────────────────
export function normalizeAll(refinedDir, outputDir, dryRun = false) {
  const files = readdirSync(refinedDir).filter(f => f.endsWith('.json'));

  const report = {
    total: files.length,
    success: 0,
    noRole: [],       // role 매핑 실패
    noSkills: [],     // reqSkills 0개
    noCompanyMap: new Set(), // 회사명 매핑 없는 회사
    roleDist: {},     // role 분포
    skillDist: {},    // 스킬 출현 분포
    expDist: {},      // reqExp 분포
    unmappedKeywords: {}, // 매핑 안 된 키워드 (기술인지 판별 불가)
  };

  const normalized = [];

  for (const file of files) {
    const crawled = JSON.parse(readFileSync(join(refinedDir, file), 'utf-8'));
    const job = normalizeJob(crawled);
    normalized.push(job);

    // role 분포
    report.roleDist[job.role] = (report.roleDist[job.role] || 0) + 1;

    // role 매핑 실패
    if (job.roles.length === 0) {
      report.noRole.push({ id: job.id, jobField: crawled.jobField });
    }

    // 스킬 분포 및 누락
    if (job.reqSkills.length === 0) {
      report.noSkills.push({ id: job.id, keywords: crawled.keywords });
    }
    for (const sk of job.reqSkills) {
      report.skillDist[sk] = (report.skillDist[sk] || 0) + 1;
    }

    // 회사 매핑 여부
    if (!COMPANY_ALIASES[crawled.company]) {
      report.noCompanyMap.add(crawled.company);
    }

    // 경력 분포
    const expKey = `${job.reqExp}년`;
    report.expDist[expKey] = (report.expDist[expKey] || 0) + 1;

    // 매핑 안 된 키워드 추적
    const rawKws = (crawled.keywords || '').split(',').map(s => s.trim());
    for (const kw of rawKws) {
      if (!kw) continue;
      if (EXCLUDE_KEYWORDS.has(kw)) continue;
      let found = false;
      for (const aliases of Object.values(SKILL_ALIASES)) {
        if (aliases.some(a => a.toLowerCase() === kw.toLowerCase())) { found = true; break; }
      }
      if (!found) {
        report.unmappedKeywords[kw] = (report.unmappedKeywords[kw] || 0) + 1;
      }
    }

    report.success++;
  }

  // 파일 저장
  if (!dryRun) {
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    for (const job of normalized) {
      const filename = `job-${job.id.replace('crawled-', '')}.json`;
      writeFileSync(join(outputDir, filename), JSON.stringify(job, null, 2), 'utf-8');
    }
    // _index.json
    const index = { updatedAt: new Date().toISOString(), count: normalized.length, files: normalized.map(j => `job-${j.id.replace('crawled-', '')}.json`) };
    writeFileSync(join(outputDir, '_index.json'), JSON.stringify(index, null, 2), 'utf-8');
  }

  // 리포트를 Set → Array 변환 후 반환
  report.noCompanyMap = [...report.noCompanyMap];
  return { normalized, report };
}

// ────────────────────────────────────────────────────────────────────────────
// CLI 실행 (직접 실행 시에만)
// ────────────────────────────────────────────────────────────────────────────
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const refinedDir = join(ROOT, 'data', 'refined');
const outputDir = join(ROOT, 'data', 'jobs');

if (existsSync(refinedDir)) {
  console.log(`\n🔄 정규화 시작 (${isDryRun ? 'DRY-RUN' : 'WRITE 모드'})\n`);
  const { report } = normalizeAll(refinedDir, outputDir, isDryRun);

  console.log(`=== 정규화 결과 ===`);
  console.log(`총 파일: ${report.total}`);
  console.log(`성공: ${report.success}`);
  console.log(`\n--- role 분포 ---`);
  Object.entries(report.roleDist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v} (${(v / report.total * 100).toFixed(1)}%)`));
  console.log(`\n--- 경력 분포 ---`);
  Object.entries(report.expDist).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`\n--- role 매핑 실패: ${report.noRole.length}건 ---`);
  report.noRole.slice(0, 10).forEach(r => console.log(`  ${r.id} → jobField: "${r.jobField}"`));
  console.log(`\n--- reqSkills 0개: ${report.noSkills.length}건 (${(report.noSkills.length / report.total * 100).toFixed(1)}%) ---`);
  report.noSkills.slice(0, 10).forEach(r => console.log(`  ${r.id} → keywords: "${r.keywords}"`));
  console.log(`\n--- 회사명 매핑 없음: ${report.noCompanyMap.length}개 회사 ---`);
  report.noCompanyMap.slice(0, 15).forEach(c => console.log(`  "${c}"`));
  console.log(`\n--- 매핑 안 된 키워드 (상위 20) ---`);
  Object.entries(report.unmappedKeywords).sort((a, b) => b[1] - a[1]).slice(0, 20).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
  console.log(`\n--- 스킬 분포 (상위 15) ---`);
  Object.entries(report.skillDist).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
} else {
  console.error(`❌ refined 디렉토리 없음: ${refinedDir}`);
}
} // end isDirectRun
