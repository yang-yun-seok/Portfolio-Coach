const GITHUB_REPO_RE = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)(?:[/?#].*)?$/i;
const MAX_README_CHARS = 2400;
const MAX_TEXT_FILE_CHARS = 1800;

const IMPORTANT_FILES = [
  'README.md',
  'package.json',
  'vite.config.js',
  'vite.config.ts',
  'tsconfig.json',
  'requirements.txt',
  'pyproject.toml',
  'Cargo.toml',
  'pom.xml',
  'build.gradle',
  'Dockerfile',
  '.github/workflows',
];

function parseGitHubRepoUrl(url) {
  const match = String(url || '').trim().match(GITHUB_REPO_RE);
  if (!match) return null;
  const repo = match[2].replace(/\.git$/i, '');
  return { owner: match[1], repo };
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

function truncate(text, max) {
  const clean = String(text || '').trim();
  return clean.length > max ? `${clean.slice(0, max)}\n...` : clean;
}

function inferStack({ language, rootFiles }) {
  const fileNames = rootFiles.map((file) => file.path.toLowerCase());
  const stack = new Set();
  if (language) stack.add(language);
  if (fileNames.includes('package.json')) stack.add('Node.js / JavaScript');
  if (fileNames.includes('vite.config.js') || fileNames.includes('vite.config.ts')) stack.add('Vite');
  if (fileNames.includes('tsconfig.json')) stack.add('TypeScript');
  if (fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml')) stack.add('Python');
  if (fileNames.includes('dockerfile')) stack.add('Docker');
  if (fileNames.some((name) => name.includes('.github/workflows'))) stack.add('GitHub Actions');
  return Array.from(stack);
}

function makeTechnicalDocument(summary) {
  const tree = summary.rootFiles
    .slice(0, 16)
    .map((file) => `- ${file.type === 'dir' ? '📁' : '📄'} ${file.path}`)
    .join('\n') || '- 루트 파일 정보를 확인하지 못했습니다.';

  const configFiles = summary.keyFiles
    .map((file) => `- ${file.path}`)
    .join('\n') || '- 주요 설정 파일이 확인되지 않았습니다.';

  const stacks = summary.stack.length ? summary.stack.join(', ') : '저장소 메타데이터 기준으로 명확히 식별되지 않음';

  return `# GitHub 프로젝트 기술문서 초안

## 1. 프로젝트 개요
- 저장소: ${summary.fullName}
- 설명: ${summary.description || 'README와 코드 구조를 바탕으로 보완 설명이 필요합니다.'}
- 주 언어: ${summary.language || '확인 필요'}
- 규모 신호: stars ${summary.stars}, forks ${summary.forks}, 최근 업데이트 ${summary.updatedAt || '확인 필요'}

## 2. 기술 스택 후보
- ${stacks}

## 3. 루트 구조
${tree}

## 4. 주요 설정/문서 파일
${configFiles}

## 5. 포트폴리오에서 강조할 구현 포인트
- README 첫 화면에 프로젝트 목적, 담당 역할, 핵심 기능, 실행 방법을 1분 안에 읽히게 정리하세요.
- 주요 폴더별 책임을 설명하고, 본인이 직접 설계하거나 문제를 해결한 파일/모듈을 명시하세요.
- 성능 개선, 버그 해결, 배포 자동화, 테스트 코드가 있다면 수치와 전후 비교를 함께 적으세요.

## 6. 면접 대비 설명 프레임
- 문제: 왜 이 프로젝트를 만들었는가?
- 구조: 어떤 기술 스택과 아키텍처를 선택했는가?
- 기여: 본인이 직접 구현한 핵심 기능은 무엇인가?
- 검증: 테스트, 배포, 성능, 예외 처리는 어떻게 확인했는가?
- 개선: 지금 다시 만든다면 무엇을 바꿀 것인가?`;
}

export async function analyzeGitHubPortfolio(repoUrl) {
  const parsed = parseGitHubRepoUrl(repoUrl);
  if (!parsed) {
    throw new Error('GitHub 저장소 URL 형식이 올바르지 않습니다. 예: https://github.com/user/repo');
  }

  const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;
  const repo = await fetchJson(base);
  const [contents, languages] = await Promise.all([
    fetchJson(`${base}/contents`).catch(() => []),
    fetchJson(`${base}/languages`).catch(() => ({})),
  ]);

  const rootFiles = Array.isArray(contents)
    ? contents.slice(0, 40).map((item) => ({
      path: item.path,
      type: item.type,
      size: item.size || 0,
      downloadUrl: item.download_url || '',
    }))
    : [];

  const readmeFile = rootFiles.find((file) => file.path.toLowerCase() === 'readme.md');
  const readme = readmeFile?.downloadUrl
    ? truncate(await fetchText(readmeFile.downloadUrl), MAX_README_CHARS)
    : '';

  const keyFiles = [];
  for (const file of rootFiles) {
    const lower = file.path.toLowerCase();
    const isImportant = IMPORTANT_FILES.some((name) => lower === name.toLowerCase());
    if (!isImportant || file.type !== 'file' || !file.downloadUrl || file.size > 120000) continue;
    const content = lower === 'readme.md'
      ? readme
      : truncate(await fetchText(file.downloadUrl), MAX_TEXT_FILE_CHARS);
    keyFiles.push({ path: file.path, content });
    if (keyFiles.length >= 6) break;
  }

  const summary = {
    repoUrl: repo.html_url,
    fullName: repo.full_name,
    description: repo.description || '',
    language: repo.language || '',
    languages: Object.keys(languages).slice(0, 8),
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    updatedAt: repo.updated_at ? repo.updated_at.slice(0, 10) : '',
    rootFiles: rootFiles.map(({ path, type, size }) => ({ path, type, size })),
    keyFiles,
    readme,
  };

  summary.stack = inferStack({ language: summary.language, rootFiles: summary.rootFiles });
  summary.techDocument = makeTechnicalDocument(summary);
  return summary;
}
