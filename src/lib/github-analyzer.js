const GITHUB_REPO_RE = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:[/?#].*)?$/i;
const MAX_README_CHARS = 2400;
const MAX_TEXT_FILE_CHARS = 2200;
const MAX_ROOT_ITEMS = 40;
const MAX_KEY_FILES = 8;
const MAX_DIR_INSPECTIONS = 5;
const MAX_DIR_ENTRIES = 16;

const IMPORTANT_FILES = [
  'README.md',
  'package.json',
  'vite.config.js',
  'vite.config.ts',
  'next.config.js',
  'next.config.mjs',
  'tsconfig.json',
  'requirements.txt',
  'pyproject.toml',
  'Cargo.toml',
  'pom.xml',
  'build.gradle',
  'Dockerfile',
  'docker-compose.yml',
  '.env.example',
  '.eslintrc',
  '.eslintrc.js',
  '.prettierrc',
];

const SOURCE_DIR_PRIORITY = [
  'src',
  'app',
  'pages',
  'components',
  'lib',
  'hooks',
  'server',
  'backend',
  'frontend',
  'api',
  'services',
  'store',
  'scripts',
  'tests',
  'test',
  '__tests__',
  'docs',
];

const STACK_HINTS = [
  { tokens: ['react'], label: 'React' },
  { tokens: ['next'], label: 'Next.js' },
  { tokens: ['vite'], label: 'Vite' },
  { tokens: ['vue'], label: 'Vue' },
  { tokens: ['nuxt'], label: 'Nuxt' },
  { tokens: ['svelte'], label: 'Svelte' },
  { tokens: ['express'], label: 'Express' },
  { tokens: ['fastify'], label: 'Fastify' },
  { tokens: ['nestjs', '@nestjs'], label: 'NestJS' },
  { tokens: ['tailwindcss'], label: 'Tailwind CSS' },
  { tokens: ['supabase'], label: 'Supabase' },
  { tokens: ['prisma'], label: 'Prisma' },
  { tokens: ['puppeteer'], label: 'Puppeteer' },
  { tokens: ['playwright'], label: 'Playwright' },
  { tokens: ['jest'], label: 'Jest' },
  { tokens: ['vitest'], label: 'Vitest' },
  { tokens: ['cypress'], label: 'Cypress' },
  { tokens: ['typescript'], label: 'TypeScript' },
  { tokens: ['flask'], label: 'Flask' },
  { tokens: ['django'], label: 'Django' },
  { tokens: ['fastapi'], label: 'FastAPI' },
  { tokens: ['streamlit'], label: 'Streamlit' },
];

function parseGitHubRepoUrl(url) {
  const match = String(url || '').trim().match(GITHUB_REPO_RE);
  if (!match) return null;
  const repo = match[2].replace(/\.git$/i, '');
  return { owner: match[1], repo };
}

function encodeContentPath(path = '') {
  return String(path)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('공개 저장소를 찾을 수 없습니다. private repo는 현재 지원하지 않습니다.');
    if (res.status === 403) throw new Error('GitHub API 요청 한도에 도달했습니다. 잠시 뒤 다시 시도해 주세요.');
    throw new Error(`GitHub API 오류 (${res.status})`);
  }
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { Accept: 'application/vnd.github.raw' } });
  if (!res.ok) return '';
  return res.text();
}

async function fetchRepoContents(base, path = '') {
  const encoded = encodeContentPath(path);
  return fetchJson(`${base}/contents${encoded ? `/${encoded}` : ''}`);
}

function truncate(text, max) {
  const clean = String(text || '').trim();
  return clean.length > max ? `${clean.slice(0, max)}\n...` : clean;
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function hasAnyToken(haystack, tokens) {
  return tokens.some((token) => haystack.includes(token));
}

function inferStack({ language, rootFiles, packageJson, keyFileTexts }) {
  const fileNames = rootFiles.map((file) => file.path.toLowerCase());
  const dependencyNames = [
    ...Object.keys(packageJson?.dependencies || {}),
    ...Object.keys(packageJson?.devDependencies || {}),
  ].map((name) => name.toLowerCase());
  const textBlob = [...dependencyNames, ...keyFileTexts.map((text) => String(text || '').toLowerCase())].join('\n');
  const stack = new Set();

  if (language) stack.add(language);
  if (fileNames.includes('package.json')) stack.add('Node.js / JavaScript');
  if (fileNames.includes('vite.config.js') || fileNames.includes('vite.config.ts')) stack.add('Vite');
  if (fileNames.includes('next.config.js') || fileNames.includes('next.config.mjs')) stack.add('Next.js');
  if (fileNames.includes('tsconfig.json')) stack.add('TypeScript');
  if (fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml')) stack.add('Python');
  if (fileNames.includes('cargo.toml')) stack.add('Rust');
  if (fileNames.includes('pom.xml') || fileNames.includes('build.gradle')) stack.add('Java / JVM');
  if (fileNames.includes('dockerfile') || fileNames.includes('docker-compose.yml')) stack.add('Docker');
  if (fileNames.some((name) => name.includes('.github'))) stack.add('GitHub Actions');

  for (const hint of STACK_HINTS) {
    if (hasAnyToken(textBlob, hint.tokens)) stack.add(hint.label);
  }

  return Array.from(stack);
}

function rankDirectories(rootFiles) {
  return rootFiles
    .filter((item) => item.type === 'dir')
    .sort((a, b) => {
      const aIndex = SOURCE_DIR_PRIORITY.indexOf(a.path.toLowerCase());
      const bIndex = SOURCE_DIR_PRIORITY.indexOf(b.path.toLowerCase());
      const safeA = aIndex === -1 ? SOURCE_DIR_PRIORITY.length + 50 : aIndex;
      const safeB = bIndex === -1 ? SOURCE_DIR_PRIORITY.length + 50 : bIndex;
      return safeA - safeB;
    })
    .slice(0, MAX_DIR_INSPECTIONS);
}

function summarizePackageScripts(packageJson) {
  if (!packageJson?.scripts) return [];
  const preferred = ['dev', 'build', 'start', 'preview', 'test', 'verify', 'lint'];
  return preferred
    .filter((name) => packageJson.scripts[name])
    .map((name) => `${name}: ${packageJson.scripts[name]}`);
}

function listWorkflowNames(workflowFiles) {
  return workflowFiles.map((file) => file.path.replace('.github/workflows/', ''));
}

function buildArchitecture({
  rootFiles,
  inspectedDirs,
  workflowFiles,
  packageScripts,
}) {
  const rootDirNames = rootFiles.filter((file) => file.type === 'dir').map((file) => file.path.toLowerCase());
  const architecture = [];

  if (rootDirNames.includes('src') && inspectedDirs.some((dir) => dir.path === 'src')) {
    const srcEntries = inspectedDirs.find((dir) => dir.path === 'src')?.entries || [];
    const srcNames = srcEntries.map((entry) => entry.name.toLowerCase());
    if (srcNames.includes('components') || srcNames.includes('hooks') || srcNames.includes('lib')) {
      architecture.push('`src` 내부에 `components / hooks / lib` 계열 분리가 보여 UI, 상태, 런타임 유틸을 분리한 프론트엔드 구조로 해석됩니다.');
    } else {
      architecture.push('`src` 중심 구조를 사용하고 있어 화면 코드와 실행 로직이 애플리케이션 루트 아래에 모여 있는 전형적인 웹앱 구조입니다.');
    }
  }

  if (rootFiles.some((file) => file.path === 'server.js') || rootDirNames.includes('server') || rootDirNames.includes('api')) {
    architecture.push('정적 프론트엔드와 별도 서버 또는 API 계층이 함께 보여, 화면과 백엔드 책임을 분리한 풀스택 구조로 설명할 수 있습니다.');
  }

  if (workflowFiles.length > 0) {
    architecture.push(`GitHub Actions 워크플로(${listWorkflowNames(workflowFiles).join(', ')})가 있어 빌드/배포 자동화 흐름을 포트폴리오 설명에 포함할 수 있습니다.`);
  }

  if (packageScripts.length > 0) {
    architecture.push(`패키지 스크립트에 ${packageScripts.slice(0, 4).join(' / ')} 흐름이 정의돼 있어 개발·빌드·검증 동선을 설명하기 좋습니다.`);
  }

  const rootPreview = rootFiles.slice(0, 10).map((file) => `${file.type === 'dir' ? '[dir]' : '[file]'} ${file.path}`);
  architecture.push(`루트 기준으로는 ${rootPreview.join(', ')} 구성이 먼저 보입니다.`);

  return architecture;
}

function buildProjectHighlights({
  repo,
  stack,
  packageScripts,
  workflowFiles,
  inspectedDirs,
  topLanguages,
}) {
  const highlights = [];
  highlights.push(`${repo.full_name} 저장소는 ${stack.slice(0, 4).join(', ') || repo.language || '확인 필요'} 중심 프로젝트로 보입니다.`);

  if (topLanguages.length > 0) {
    highlights.push(`언어 구성은 ${topLanguages.join(', ')} 순으로 확인되며, 대표 언어 대비 보조 스택까지 설명할 근거가 있습니다.`);
  }

  if (inspectedDirs.length > 0) {
    highlights.push(`핵심 디렉터리는 ${inspectedDirs.map((dir) => dir.path).join(', ')} 순으로 확인됐고, 포트폴리오에서는 이 디렉터리별 책임을 중심으로 설명하는 편이 좋습니다.`);
  }

  if (packageScripts.length > 0) {
    highlights.push(`개발 스크립트는 ${packageScripts.slice(0, 4).join(' / ')} 흐름이 정리돼 있어 실행 방법을 README와 면접에서 설명하기 쉽습니다.`);
  }

  if (workflowFiles.length > 0) {
    highlights.push(`배포/검증 자동화 파일이 존재하므로 협업과 운영 관점의 신뢰도를 보강할 수 있습니다.`);
  }

  return highlights;
}

function buildQualitySignals({
  readme,
  packageScripts,
  workflowFiles,
  rootFiles,
  inspectedDirs,
  packageJson,
}) {
  const allPaths = [
    ...rootFiles.map((file) => file.path.toLowerCase()),
    ...inspectedDirs.flatMap((dir) => dir.entries.map((entry) => entry.path.toLowerCase())),
  ];
  const signals = [];

  signals.push(readme ? 'README가 존재해 프로젝트 목적과 실행 방법을 문서화할 기반이 있습니다.' : 'README가 약하거나 비어 있어 첫인상 설명력이 약해질 수 있습니다.');
  signals.push(packageScripts.some((script) => script.startsWith('test:')) || packageScripts.some((script) => script.startsWith('verify:')) || allPaths.some((path) => path.includes('test')) ? '테스트 또는 검증 스크립트 흔적이 있어 품질 관리 경험을 설명할 수 있습니다.' : '테스트 자동화 흔적이 약하면 면접에서 검증 방식 설명을 별도로 준비해야 합니다.');
  signals.push(workflowFiles.length > 0 ? 'GitHub Actions가 있어 빌드/배포 자동화 또는 품질 게이트 경험을 포트폴리오에 연결할 수 있습니다.' : 'CI/CD 워크플로가 없으면 수동 배포/검증 과정 설명을 더 구체적으로 준비하는 편이 좋습니다.');
  signals.push(rootFiles.some((file) => file.path.toLowerCase() === 'tsconfig.json') || packageJson?.devDependencies?.typescript ? '정적 타입 설정이 확인돼 타입 안정성 관점의 설명이 가능합니다.' : '타입 체계가 약하면 런타임 오류 예방 방식을 README나 면접에서 따로 보강하는 편이 좋습니다.');
  signals.push(rootFiles.some((file) => file.path.toLowerCase() === '.env.example') ? '환경 변수 예시 파일이 있어 설정 관리 성숙도가 상대적으로 좋아 보입니다.' : '환경 변수 예시 파일이 없으면 실행 준비 과정이 불투명하게 보일 수 있습니다.');

  return signals;
}

function buildShippingSignals({ packageScripts, workflowFiles, repo, rootFiles }) {
  const signals = [];

  if (packageScripts.length > 0) {
    signals.push(`실행/빌드 스크립트: ${packageScripts.slice(0, 5).join(' / ')}`);
  }

  if (workflowFiles.length > 0) {
    signals.push(`자동화 워크플로: ${listWorkflowNames(workflowFiles).join(', ')}`);
  }

  if (rootFiles.some((file) => file.path.toLowerCase() === 'dockerfile')) {
    signals.push('Dockerfile이 존재해 로컬 실행과 배포 환경을 통일하려는 흔적을 설명할 수 있습니다.');
  }

  signals.push(`저장소 최근 업데이트는 ${repo.updated_at ? repo.updated_at.slice(0, 10) : '확인 필요'} 기준이며, public 협업 신호로 stars ${repo.stargazers_count || 0}, forks ${repo.forks_count || 0} 를 확인했습니다.`);

  return signals;
}

function buildRefactorSuggestions({
  readme,
  workflowFiles,
  packageScripts,
  rootFiles,
  inspectedDirs,
}) {
  const suggestions = [];
  const rootDirs = rootFiles.filter((file) => file.type === 'dir').map((file) => file.path);
  const rootCount = rootFiles.length;
  const hasTests = packageScripts.some((script) => script.startsWith('test:')) || inspectedDirs.some((dir) => dir.path.toLowerCase().includes('test')) || rootDirs.some((dir) => dir.toLowerCase().includes('test'));

  if (!readme) {
    suggestions.push('README 첫 화면에 프로젝트 목적, 담당 역할, 실행 방법, 핵심 기능 스크린샷을 추가하면 저장소 설명력이 크게 좋아집니다.');
  } else {
    suggestions.push('README에 본인 담당 범위, 트러블슈팅 사례, 전후 비교 수치를 더하면 기술문서화 품질이 올라갑니다.');
  }

  if (!hasTests) {
    suggestions.push('테스트 또는 스모크 검증 스크립트를 추가하면 구현 신뢰도와 면접 설명 포인트가 동시에 강화됩니다.');
  }

  if (workflowFiles.length === 0) {
    suggestions.push('GitHub Actions 기반 빌드/검증 워크플로를 추가하면 협업과 배포 경험을 더 설득력 있게 보여줄 수 있습니다.');
  }

  if (rootCount > 24) {
    suggestions.push('루트 파일 수가 많으면 구조가 산만해 보일 수 있으므로 실행 파일, 문서, 설정 파일을 역할별로 묶는 편이 좋습니다.');
  }

  suggestions.push('면접용으로는 핵심 모듈 2~3개를 골라 책임, 예외 처리, 검증 방법을 따로 문서화해 두는 편이 안전합니다.');
  return suggestions.slice(0, 5);
}

function buildRisks({ readme, workflowFiles, packageScripts, inspectedDirs, rootFiles }) {
  const hasTests = packageScripts.some((script) => script.startsWith('test:')) || inspectedDirs.some((dir) => dir.path.toLowerCase().includes('test'));
  const risks = [];

  if (!readme) risks.push('README가 약하면 채용자가 프로젝트 목적과 실행 방법을 빠르게 파악하기 어렵습니다.');
  if (!hasTests) risks.push('테스트 또는 검증 흐름이 보이지 않으면 구현 신뢰도를 말로 보강해야 합니다.');
  if (workflowFiles.length === 0) risks.push('자동화 배포/검증 흔적이 약하면 협업 프로젝트 경험이 단발성으로 보일 수 있습니다.');
  if (!rootFiles.some((file) => file.path.toLowerCase() === '.env.example')) risks.push('환경 설정 문서가 없으면 실행 진입장벽이 높아 보일 수 있습니다.');

  risks.push('무료 분석은 핵심 구조와 대표 설정 파일 중심이므로, 실제 핵심 알고리즘이나 트러블슈팅은 면접에서 별도 설명 준비가 필요합니다.');
  return risks.slice(0, 5);
}

function buildInterviewTalkingPoints({
  repo,
  stack,
  packageScripts,
  workflowFiles,
  inspectedDirs,
  refactorSuggestions,
}) {
  const points = [
    `이 저장소를 만들게 된 문제 상황과 목표를 ${stack[0] || repo.language || '주요 스택'} 기준으로 30초 안에 설명하세요.`,
    '핵심 모듈 1~2개를 골라 데이터 흐름, 책임 분리, 예외 처리 방식을 말할 수 있게 준비하세요.',
  ];

  if (packageScripts.length > 0) {
    points.push(`실행/빌드 흐름은 ${packageScripts.slice(0, 3).join(' / ')} 기준으로 설명하면 로컬 개발 동선이 선명해집니다.`);
  }

  if (workflowFiles.length > 0) {
    points.push(`GitHub Actions(${listWorkflowNames(workflowFiles).join(', ')})가 있다면 자동 검증 또는 배포에서 본인이 담당한 부분을 같이 설명하세요.`);
  }

  if (inspectedDirs.length > 0) {
    points.push(`${inspectedDirs[0].path} 기준으로 파일을 어떻게 나눴고, 어떤 이유로 구조를 유지했는지를 설명할 수 있어야 합니다.`);
  }

  points.push(`지금 다시 만든다면 무엇을 바꿀 것인지에 대한 답변은 "${refactorSuggestions[0] || 'README/테스트/배포 개선안'}" 수준으로 준비해 두는 편이 좋습니다.`);
  return unique(points).slice(0, 6);
}

function makeTechnicalDocument(summary) {
  const tree = summary.rootFiles
    .slice(0, 18)
    .map((file) => `- ${file.type === 'dir' ? '📁' : '📄'} ${file.path}`)
    .join('\n') || '- 루트 파일 정보를 확인하지 못했습니다.';

  const inspected = summary.inspectedDirs
    .map((dir) => `- ${dir.path}: ${dir.entries.map((entry) => `${entry.type === 'dir' ? '[dir]' : '[file]'} ${entry.name}`).join(', ') || '비어 있음'}`)
    .join('\n') || '- 추가 디렉터리 구조를 확인하지 못했습니다.';

  const configFiles = summary.keyFiles
    .map((file) => `- ${file.path}`)
    .join('\n') || '- 주요 설정 파일이 확인되지 않았습니다.';

  const stacks = summary.stack.length ? summary.stack.join(', ') : '저장소 메타데이터 기준으로 명확히 식별되지 않음';
  const workflowNames = summary.workflowFiles.length ? listWorkflowNames(summary.workflowFiles).join(', ') : '확인되지 않음';
  const packageScripts = summary.packageScripts.length ? summary.packageScripts.join(' / ') : '확인되지 않음';

  return `# GitHub 프로젝트 기술문서 초안

## 1. 프로젝트 개요
- 저장소: ${summary.fullName}
- 설명: ${summary.description || 'README와 구조 설명 보강이 필요합니다.'}
- 대표 언어: ${summary.language || '확인 필요'}
- 언어 분포: ${summary.topLanguages.join(', ') || '확인 필요'}
- 최근 업데이트: ${summary.updatedAt || '확인 필요'}

## 2. 기술 스택 후보
- ${stacks}

## 3. 루트 구조
${tree}

## 4. 핵심 디렉터리 구조
${inspected}

## 5. 주요 설정/문서 파일
${configFiles}

## 6. 실행/배포 신호
- 패키지 스크립트: ${packageScripts}
- 워크플로: ${workflowNames}
- 규모 신호: stars ${summary.stars}, forks ${summary.forks}

## 7. 포트폴리오에서 강조할 설명 포인트
${summary.projectHighlights.map((item) => `- ${item}`).join('\n') || '- 하이라이트 분석이 없습니다.'}

## 8. 품질/리스크 체크
${summary.qualitySignals.map((item) => `- ${item}`).join('\n') || '- 품질 신호 분석이 없습니다.'}

## 9. 면접 대비 설명 프레임
${summary.interviewTalkingPoints.map((item) => `- ${item}`).join('\n') || '- 면접 포인트가 없습니다.'}

## 10. 우선 보완 제안
${summary.refactorSuggestions.map((item) => `- ${item}`).join('\n') || '- 보완 제안이 없습니다.'}`;
}

export async function analyzeGitHubPortfolio(repoUrl) {
  const parsed = parseGitHubRepoUrl(repoUrl);
  if (!parsed) {
    throw new Error('GitHub 저장소 URL 형식이 올바르지 않습니다. 예: https://github.com/user/repo');
  }

  const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
  const repo = await fetchJson(base);
  const [contents, languages] = await Promise.all([
    fetchRepoContents(base).catch(() => []),
    fetchJson(`${base}/languages`).catch(() => ({})),
  ]);

  const rootFiles = Array.isArray(contents)
    ? contents.slice(0, MAX_ROOT_ITEMS).map((item) => ({
      path: item.path,
      name: item.name,
      type: item.type,
      size: item.size || 0,
      downloadUrl: item.download_url || '',
    }))
    : [];

  const readmeFile = rootFiles.find((file) => file.path.toLowerCase() === 'readme.md');
  const readme = readmeFile?.downloadUrl
    ? truncate(await fetchText(readmeFile.downloadUrl), MAX_README_CHARS)
    : '';

  const rankedDirs = rankDirectories(rootFiles);
  const inspectedDirs = (await Promise.all(
    rankedDirs.map(async (dir) => {
      const items = await fetchRepoContents(base, dir.path).catch(() => []);
      return {
        path: dir.path,
        entries: Array.isArray(items)
          ? items.slice(0, MAX_DIR_ENTRIES).map((item) => ({
            path: item.path,
            name: item.name,
            type: item.type,
            size: item.size || 0,
            downloadUrl: item.download_url || '',
          }))
          : [],
      };
    }),
  )).filter((dir) => dir.entries.length > 0);

  const workflowFilesRaw = await fetchRepoContents(base, '.github/workflows').catch(() => []);
  const workflowFiles = Array.isArray(workflowFilesRaw)
    ? workflowFilesRaw.map((item) => ({
      path: item.path,
      name: item.name,
      type: item.type,
      size: item.size || 0,
      downloadUrl: item.download_url || '',
    }))
    : [];

  const keyFileCandidates = [
    ...rootFiles,
    ...workflowFiles,
    ...inspectedDirs.flatMap((dir) => dir.entries.filter((entry) => {
      const lower = entry.path.toLowerCase();
      return /(?:^|\/)(package\.json|pyproject\.toml|requirements\.txt|main\.[jt]sx?|app\.[jt]sx?|index\.[jt]sx?|server\.[jt]s|routes?\.[jt]s|README\.md)$/i.test(lower);
    })),
  ];

  const keyFiles = [];
  for (const file of keyFileCandidates) {
    const lower = file.path.toLowerCase();
    const isImportant = IMPORTANT_FILES.some((name) => lower === name.toLowerCase())
      || lower.endsWith('/package.json')
      || lower.endsWith('/main.js')
      || lower.endsWith('/main.ts')
      || lower.endsWith('/main.tsx')
      || lower.endsWith('/app.jsx')
      || lower.endsWith('/app.tsx')
      || lower.endsWith('/server.js')
      || lower.endsWith('/server.ts');
    if (!isImportant || file.type !== 'file' || !file.downloadUrl || file.size > 150000) continue;
    if (keyFiles.some((existing) => existing.path === file.path)) continue;
    const content = lower === 'readme.md'
      ? readme
      : truncate(await fetchText(file.downloadUrl), MAX_TEXT_FILE_CHARS);
    keyFiles.push({ path: file.path, content });
    if (keyFiles.length >= MAX_KEY_FILES) break;
  }

  const packageJson = parseJsonSafe(keyFiles.find((file) => file.path.toLowerCase() === 'package.json')?.content || '');
  const topLanguages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
  const stack = inferStack({
    language: repo.language || '',
    rootFiles,
    packageJson,
    keyFileTexts: keyFiles.map((file) => file.content),
  });
  const packageScripts = summarizePackageScripts(packageJson);

  const summary = {
    repoUrl: repo.html_url,
    fullName: repo.full_name,
    description: repo.description || '',
    language: repo.language || '',
    languages: Object.keys(languages).slice(0, 8),
    topLanguages,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    updatedAt: repo.updated_at ? repo.updated_at.slice(0, 10) : '',
    defaultBranch: repo.default_branch || 'main',
    rootFiles: rootFiles.map(({ path, type, size }) => ({ path, type, size })),
    inspectedDirs,
    keyFiles,
    readme,
    workflowFiles,
    packageScripts,
  };

  summary.stack = stack;
  summary.architecture = buildArchitecture({
    rootFiles: summary.rootFiles,
    inspectedDirs,
    workflowFiles,
    packageScripts,
    repo,
  });
  summary.projectHighlights = buildProjectHighlights({
    repo,
    stack,
    packageScripts,
    workflowFiles,
    inspectedDirs,
    topLanguages,
  });
  summary.qualitySignals = buildQualitySignals({
    readme,
    packageScripts,
    workflowFiles,
    rootFiles: summary.rootFiles,
    inspectedDirs,
    packageJson,
  });
  summary.shippingSignals = buildShippingSignals({
    packageScripts,
    workflowFiles,
    repo,
    rootFiles: summary.rootFiles,
  });
  summary.refactorSuggestions = buildRefactorSuggestions({
    readme,
    workflowFiles,
    packageScripts,
    rootFiles: summary.rootFiles,
    inspectedDirs,
  });
  summary.risks = buildRisks({
    readme,
    workflowFiles,
    packageScripts,
    inspectedDirs,
    rootFiles: summary.rootFiles,
  });
  summary.interviewTalkingPoints = buildInterviewTalkingPoints({
    repo,
    stack,
    packageScripts,
    workflowFiles,
    inspectedDirs,
    refactorSuggestions: summary.refactorSuggestions,
  });
  summary.summary = `${summary.fullName} 저장소는 ${stack.slice(0, 4).join(', ') || summary.language || '확인 필요'} 기반으로 보이며, ${inspectedDirs.map((dir) => dir.path).join(', ') || '루트'} 구조와 ${workflowFiles.length > 0 ? '자동화 워크플로' : '수동 실행 흐름'}를 기준으로 기술 설명 포인트를 정리했습니다.`;
  summary.documentation = makeTechnicalDocument(summary);
  summary.techDocument = summary.documentation;

  return summary;
}
