import { createServer } from 'node:http';
import { existsSync, createReadStream } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer';

const host = process.env.SMOKE_HOST || '127.0.0.1';
const port = Number(process.env.SMOKE_PORT || '4173');
const pathPrefix = normalizePathPrefix(process.env.SMOKE_PATH_PREFIX || '/');
const distDir = join(process.cwd(), 'dist');
const baseUrl = `http://${host}:${port}${pathPrefix}`;
const TRACK_ENTRY_STORAGE_KEY = 'portfolio-coach-track-entry-v1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createSmokeSeed() {
  const baseUserInfo = {
    name: '양윤석',
    roleGroup: '프로그래밍',
    subRole: '클라이언트',
    role: '게임개발(클라이언트)',
    experience: 2,
    githubUrl: 'https://github.com/example/repo',
    skills: [
      { category: '개발 언어', name: 'TypeScript', level: '상', roleGroup: '프로그래밍' },
      { category: '엔진', name: 'Unity', level: '중', roleGroup: '프로그래밍' },
    ],
  };
  const baseResults = {
    resumeImprovements: ['**핵심 기술 배치**: TypeScript와 Unity 경험을 첫 문단에 배치하세요.'],
    coverLetterImprovements: {
      common: ['**문제 해결 서술 강화**: 장애 대응 사례를 결과 중심으로 다시 정리하세요.'],
      rank1: [],
      rank2: [],
      rank3: [],
    },
    portfolioImprovements: ['**포트폴리오 구조 정리**: 프로젝트별 역할과 결과를 먼저 보여주세요.'],
    interviewPreps: [],
    profileAnalysis: {
      strengths: ['게임 클라이언트 개발 경험을 요약할 수 있습니다.'],
      weaknesses: ['테스트 자동화 설명이 부족합니다.'],
      fitScore: '로컬 시드 결과입니다.',
    },
    githubPortfolioAnalysis: {
      repoUrl: 'https://github.com/example/repo',
      summary: 'README와 핵심 디렉터리를 기반으로 구조를 요약한 시드 데이터입니다.',
      techStack: ['TypeScript', 'Unity'],
      architecture: ['src 중심 구조'],
      projectHighlights: ['GitHub 구조 분석 예시'],
      qualitySignals: ['README 존재'],
      shippingSignals: ['워크플로 신호 확인'],
      refactorSuggestions: ['테스트 스크립트 보강'],
      documentation: '# Seed Document',
      risks: ['시드 데이터'],
      interviewTalkingPoints: ['문제 상황과 해결을 30초로 설명하세요.'],
    },
  };
  const previousSnapshot = {
    savedAt: '2026-05-08T12:00:00.000Z',
    userInfo: {
      ...baseUserInfo,
      skills: [{ category: '개발 언어', name: 'C#', level: '중', roleGroup: '프로그래밍' }],
    },
    results: {
      ...baseResults,
      resumeImprovements: ['**핵심 기술 배치**: C# 경험을 먼저 배치하세요.'],
      githubPortfolioAnalysis: {
        ...baseResults.githubPortfolioAnalysis,
        techStack: ['C#'],
        projectHighlights: ['이전 분석 시드'],
      },
    },
    recommendedJobs: [{ id: 'prev-1', company: 'Prev Studio', title: '클라이언트 개발자', role: '게임개발(클라이언트)', score: 74 }],
    instructorFeedback: { name: '', date: '', general: '', resume: '', coverLetter: '', portfolio: '', interview: '' },
  };
  const currentSnapshot = {
    savedAt: '2026-05-09T12:00:00.000Z',
    userInfo: baseUserInfo,
    results: baseResults,
    recommendedJobs: [{ id: 'curr-1', company: 'Current Studio', title: '클라이언트 개발자', role: '게임개발(클라이언트)', score: 82 }],
    instructorFeedback: { name: '', date: '', general: '', resume: '', coverLetter: '', portfolio: '', interview: '' },
  };
  return { currentSnapshot, previousSnapshot };
}

function normalizePathPrefix(value) {
  const trimmed = String(value || '/').trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.startsWith('/') ? `${trimmed.replace(/\/+$/, '')}/` : `/${trimmed.replace(/\/+$/, '')}/`;
}

function resolveBrowserExecutable() {
  const candidates = process.platform === 'win32'
    ? [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Naver\\Naver Whale\\Application\\whale.exe',
      ]
    : process.platform === 'darwin'
      ? [
          process.env.PUPPETEER_EXECUTABLE_PATH,
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ]
      : [
          process.env.PUPPETEER_EXECUTABLE_PATH,
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          '/snap/bin/chromium',
        ];

  return candidates.find((candidate) => candidate && existsSync(candidate));
}

function contentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js': return 'text/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.woff': return 'font/woff';
    case '.woff2': return 'font/woff2';
    default: return 'application/octet-stream';
  }
}

function resolveFilePath(urlPath) {
  if (!urlPath.startsWith(pathPrefix)) return null;

  const relativePath = urlPath.slice(pathPrefix.length) || 'index.html';
  const sanitized = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(distDir, sanitized);

  if (existsSync(filePath)) return filePath;
  return join(distDir, 'index.html');
}

function startStaticServer() {
  if (!existsSync(join(distDir, 'index.html'))) {
    throw new Error('dist/index.html not found. Run "npm run build" before "npm run test:smoke".');
  }

  const server = createServer((req, res) => {
    const requestUrl = new URL(req.url || '/', `http://${host}:${port}`);
    const filePath = resolveFilePath(requestUrl.pathname);

    if (!filePath) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType(filePath),
      'Cache-Control': 'no-store',
    });
    createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

async function clickTool(page, target) {
  await page.evaluate(({ id }) => {
    window.__portfolioCoachSmoke?.setActiveTab?.(id);
  }, target);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const activeTab = await page.evaluate(() => window.__portfolioCoachSmoke?.activeTab || null);
    if (activeTab === target.id) return;
    await sleep(250);
  }

  throw new Error(`Failed to activate tab: ${target.id}`);
}

async function run() {
  console.log(`[smoke] serving dist from ${baseUrl}`);
  const server = await startStaticServer();
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: resolveBrowserExecutable(),
  });

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const { currentSnapshot, previousSnapshot } = createSmokeSeed();

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.evaluateOnNewDocument((seed, trackStorageKey) => {
      localStorage.setItem('portfolio_bot_save', JSON.stringify(seed.currentSnapshot));
      localStorage.setItem('portfolio_bot_history', JSON.stringify([seed.currentSnapshot, seed.previousSnapshot]));
      localStorage.setItem(trackStorageKey, seed.currentSnapshot.userInfo.roleGroup);
    }, { currentSnapshot, previousSnapshot }, TRACK_ENTRY_STORAGE_KEY);

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${baseUrl}?smoke=1`, { waitUntil: 'networkidle0', timeout: 45000 });
    await page.waitForFunction(
      () => Boolean(window.__portfolioCoachSmoke?.setActiveTab) && typeof window.__portfolioCoachSmoke.activeTab === 'string',
      { timeout: 5000 },
    );

    const expectedTools = [
      { id: 'input', label: '정보 입력' },
      { id: 'feedback', label: '서류 피드백' },
      { id: 'portfolio', label: '포트폴리오' },
      { id: 'job-analysis', label: '공고 분석' },
      { id: 'jobs', label: '추천 공고' },
      { id: 'interview', label: '면접 대비' },
      { id: 'interview-basic', label: '면접 기본 준비' },
      { id: 'personality-test', label: '인성검사' },
      { id: 'pdf-export', label: 'PDF 출력' },
    ];

    const initialState = await page.evaluate(() => {
      const toolLabels = [...document.querySelectorAll('.coach-side-tool-label')].map((node) => node.textContent.trim());
      return {
        title: document.title,
        hasRootShell: !!document.querySelector('.coach-shell'),
        hasSideTools: !!document.querySelector('.coach-side-tools'),
        hasGuideButton: [...document.querySelectorAll('button')].some((button) => button.innerText.includes('사용 설명서')),
        hasLegacyStepUi: !!document.querySelector('.coach-side-step, .coach-side-steps, .is-complete, .coach-progress-track, .personality-progress-track'),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        toolLabels,
      };
    });

    if (!initialState.hasRootShell) throw new Error('Root shell not found.');
    if (!initialState.hasSideTools) throw new Error('Side tools navigation not found.');
    if (!initialState.hasGuideButton) throw new Error('User guide button not found.');
    if (initialState.hasLegacyStepUi) throw new Error('Legacy step/progress UI is still present.');
    if (initialState.overflowX) throw new Error('Horizontal overflow detected on initial screen.');
    if (initialState.title !== 'Portfolio Coach') throw new Error(`Unexpected page title: ${initialState.title}`);

    for (const tool of expectedTools) {
      if (!initialState.toolLabels.includes(tool.label)) {
        throw new Error(`Missing side tool: ${tool.label}`);
      }
    }

    console.log('[smoke] checking job analysis view');
    await clickTool(page, { id: 'job-analysis', label: '공고 분석' });
    await page.waitForFunction(
      () => !!document.querySelector('.coach-job-analysis'),
      { timeout: 5000 },
    );
    const analysisTabState = await page.evaluate(() => ({
      hasManualCrawlButton: [...document.querySelectorAll('button')].some((button) => button.innerText.trim().includes('수동 크롤링')),
    }));
    if (analysisTabState.hasManualCrawlButton) throw new Error('Manual crawl button is still exposed on the job analysis tab.');

    console.log('[smoke] checking jobs view');
    await clickTool(page, { id: 'jobs', label: '추천 공고' });
    await page.waitForFunction(
      () => !!document.querySelector('.coach-jobs-workspace') && document.body.innerText.includes('매칭하기'),
      { timeout: 5000 },
    );
    const jobsTabState = await page.evaluate(() => ({
      hasManualCrawlButton: [...document.querySelectorAll('button')].some((button) => {
        const text = button.innerText.trim();
        return text.includes('최신 공고 수집') || text.includes('크롤링 시작') || text.includes('수동 크롤링');
      }),
      hasCrawlerConsole: document.body.innerText.includes('Crawler Console'),
    }));
    if (jobsTabState.hasManualCrawlButton) throw new Error('Manual crawl button is still exposed on the jobs tab.');
    if (jobsTabState.hasCrawlerConsole) throw new Error('Legacy crawler console copy is still visible on the jobs tab.');

    console.log('[smoke] checking feedback view');
    await clickTool(page, { id: 'feedback', label: '서류 피드백' });
    await page.waitForFunction(
      () => !!document.querySelector('.coach-history-panel'),
      { timeout: 5000 },
    );

    console.log('[smoke] checking personality view');
    await clickTool(page, { id: 'personality-test', label: '?몄꽦寃??' });
    await page.waitForFunction(
      () => !!document.querySelector('.coach-personality-page'),
      { timeout: 5000 },
    );

    console.log('[smoke] checking pdf export view');
    await clickTool(page, { id: 'pdf-export', label: 'PDF 異쒕젰' });
    await page.waitForFunction(
      () => !!document.querySelector('.coach-pdf-page'),
      { timeout: 5000 },
    );

    console.log('[smoke] checking guide modal');
    await page.evaluate(() => {
      if (window.__portfolioCoachSmoke?.openGuide) {
        window.__portfolioCoachSmoke.openGuide();
        return;
      }

      const button = [...document.querySelectorAll('button')].find((node) => node.innerText.includes('사용 설명서'));
      button?.click();
    });
    await page.waitForFunction(
      () => !!document.querySelector('.coach-user-guide-modal'),
      { timeout: 5000 },
    );

    if (consoleErrors.length > 0) {
      throw new Error(`Console errors detected:\n${consoleErrors.join('\n')}`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected:\n${pageErrors.join('\n')}`);
    }

    console.log(`Smoke test passed: ${baseUrl}`);
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
