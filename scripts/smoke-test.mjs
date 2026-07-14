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
const captureScreenshots = process.env.SMOKE_SCREENSHOTS === 'true';
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

function createSmokeAdminOverview() {
  const submittedAtIso = new Date().toISOString();
  const users = [
    {
      uid: 'student-1',
      studentName: '김지우',
      displayName: '김지우',
      email: 'jiwoo@example.com',
      role: 'user',
      active: true,
      lastLoginAt: submittedAtIso,
    },
    {
      uid: 'student-2',
      studentName: '',
      displayName: '민서',
      email: 'minseo@example.com',
      role: 'user',
      active: false,
      lastLoginAt: submittedAtIso,
    },
  ];
  const submissions = [
    {
      id: 'submission-1',
      userId: 'student-1',
      accountStudentName: '김지우',
      applicantName: '김지우',
      userEmail: 'jiwoo@example.com',
      status: 'submitted',
      track: '프로그래밍',
      subRole: '클라이언트 개발자',
      submittedAtIso,
      fileCounts: { resume: 1, coverLetter: 0, portfolio: 1 },
      files: {
        resume: { fileName: 'resume.pdf', size: 124000, url: 'https://example.com/resume.pdf' },
        portfolio: [{ fileName: 'portfolio.pdf', size: 4120000, url: 'https://example.com/portfolio.pdf' }],
      },
      latestAnalysisSummary: 'Unity 프로젝트의 역할과 성과를 수치 중심으로 보완하면 좋습니다.',
      latestRecommendedJobsSnapshot: [{ id: 'job-1', company: 'Studio A', title: '클라이언트 개발자', score: 88 }],
      adminMemo: '',
      studentFeedback: '',
    },
    {
      id: 'submission-2',
      userId: 'student-2',
      applicantName: '민서',
      userEmail: 'minseo@example.com',
      status: 'rejected',
      track: '기획',
      subRole: '시스템 기획자',
      submittedAtIso: '2026-07-13T04:30:00.000Z',
      fileCounts: { resume: 0, coverLetter: 0, portfolio: 0 },
      files: {},
      latestAnalysisSummary: '',
      latestRecommendedJobsSnapshot: [],
      adminMemo: '보완본 제출 여부 확인',
      studentFeedback: '역할과 결과가 드러나는 프로젝트 설명을 추가해 주세요.',
    },
  ];

  return { summary: {}, submissions, users };
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

async function closeOpenMenu(page) {
  await page.click('.coach-workspace');
  await page.waitForFunction(
    () => !document.querySelector('.coach-top-nav-menu.is-open'),
    { timeout: 5000 },
  );
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
    const scriptRequests = [];
    let adminAccessPatchCount = 0;
    const { currentSnapshot, previousSnapshot } = createSmokeSeed();
    const adminOverview = createSmokeAdminOverview();

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.resourceType() === 'script') scriptRequests.push(request.url());
      if (request.url().includes('/api/capabilities')) {
        void request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            portfolioSubmissions: { enabled: false, status: 'not_configured' },
          }),
        });
        return;
      }
      if (request.method() === 'PATCH' && request.url().includes('/api/admin/users/')) {
        adminAccessPatchCount += 1;
        const uid = decodeURIComponent(request.url().split('/').pop() || '');
        const payload = JSON.parse(request.postData() || '{}');
        const currentUser = adminOverview.users.find((user) => user.uid === uid) || {};
        void request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: { ...currentUser, uid, active: payload.active } }),
        });
        return;
      }
      if (request.url().includes('/api/admin/overview')) {
        void request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(adminOverview),
        });
        return;
      }
      void request.continue();
    });

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
      const groupLabels = [...document.querySelectorAll('.coach-top-nav-trigger span')].map((node) => node.textContent.trim());
      return {
        title: document.title,
        hasRootShell: !!document.querySelector('.coach-shell'),
        hasTopNav: !!document.querySelector('.coach-top-nav'),
        hasGuideButton: [...document.querySelectorAll('button')].some((button) => button.innerText.includes('사용 설명서')),
        hasLegacyStepUi: !!document.querySelector('.coach-side-step, .coach-side-steps, .is-complete, .coach-progress-track, .personality-progress-track'),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        groupLabels,
      };
    });

    if (!initialState.hasRootShell) throw new Error('Root shell not found.');
    if (!initialState.hasTopNav) throw new Error('Top navigation not found.');
    if (!initialState.hasGuideButton) throw new Error('User guide button not found.');
    if (initialState.hasLegacyStepUi) throw new Error('Legacy step/progress UI is still present.');
    if (initialState.overflowX) throw new Error('Horizontal overflow detected on initial screen.');
    if (initialState.title !== 'Portfolio Coach') throw new Error(`Unexpected page title: ${initialState.title}`);

    const initialScriptCount = scriptRequests.filter((url) => url.includes('/assets/') && url.endsWith('.js')).length;
    if (initialScriptCount !== 1) {
      throw new Error(`Expected one initial JavaScript entry, received ${initialScriptCount}.`);
    }

    const homeLayoutState = await page.evaluate(() => ({
      hasWorkspace: !!document.querySelector('.coach-home-workspace'),
      hasFocusMode: !!document.querySelector('.coach-body-shell.is-focus-mode'),
      hasDuplicateProgress: !!document.querySelector('.coach-progress-panel'),
      hasDuplicateFeatureHeader: !!document.querySelector('.coach-dossier-header'),
    }));
    if (!homeLayoutState.hasWorkspace) throw new Error('Student home workspace not found.');
    if (!homeLayoutState.hasFocusMode) throw new Error('Student home focus layout not applied.');
    if (homeLayoutState.hasDuplicateProgress) throw new Error('Duplicate progress panel is visible on student home.');
    if (homeLayoutState.hasDuplicateFeatureHeader) throw new Error('Duplicate feature header is visible on student home.');
    if (captureScreenshots) await page.screenshot({ path: 'prod-home-desktop.png', fullPage: true });

    for (const groupLabel of ['홈', '내 준비', '시장·공고', '면접·마감']) {
      if (!initialState.groupLabels.includes(groupLabel)) {
        throw new Error(`Missing top navigation group: ${groupLabel}`);
      }
    }

    const discoveredToolLabels = [];
    const triggerCount = await page.$$eval('.coach-top-nav-trigger', (triggers) => triggers.length);
    if (triggerCount !== 4) throw new Error(`Unexpected top navigation group count: ${triggerCount}`);

    for (let index = 0; index < triggerCount; index += 1) {
      await page.evaluate((triggerIndex) => {
        document.querySelectorAll('.coach-top-nav-trigger')[triggerIndex]?.click();
      }, index);
      await page.waitForFunction(
        (triggerIndex) => {
          const menus = [...document.querySelectorAll('.coach-top-nav-menu')];
          return menus.filter((menu) => menu.classList.contains('is-open')).length === 1
            && menus[triggerIndex]?.classList.contains('is-open')
            && menus[triggerIndex]?.querySelectorAll('.coach-top-nav-item').length > 0;
        },
        { timeout: 5000 },
        index,
      );

      const openState = await page.evaluate((triggerIndex) => {
        const menus = [...document.querySelectorAll('.coach-top-nav-menu')];
        const openMenus = menus
          .map((menu, menuIndex) => ({ menuIndex, isOpen: menu.classList.contains('is-open') }))
          .filter((menu) => menu.isOpen);
        const labels = [...(menus[triggerIndex]?.querySelectorAll('.coach-top-nav-item span') || [])]
          .map((node) => node.textContent.trim());
        return { openMenus, labels };
      }, index);

      if (openState.openMenus.length !== 1 || openState.openMenus[0].menuIndex !== index) {
        throw new Error(`Top navigation dropdown exclusivity failed at index ${index}.`);
      }

      discoveredToolLabels.push(...openState.labels);
    }

    for (const tool of expectedTools) {
      if (!discoveredToolLabels.includes(tool.label)) {
        throw new Error(`Missing top navigation tool: ${tool.label}`);
      }
    }

    await closeOpenMenu(page);

    console.log('[smoke] checking portfolio submission view');
    await clickTool(page, { id: 'portfolio', label: 'Portfolio' });
    await page.waitForFunction(
      () => !!document.querySelector('.coach-submission-console'),
      { timeout: 5000 },
    );
    const portfolioLayoutState = await page.evaluate(() => ({
      hasFocusMode: !!document.querySelector('.coach-body-shell.is-focus-mode'),
      hasDuplicateProgress: !!document.querySelector('.coach-progress-panel'),
      hasPendingNotice: document.querySelector('.coach-submission-notice.is-pending')?.innerText.includes('자료 제출은 현재 준비 중입니다.'),
      submitDisabled: document.querySelector('.coach-submission-primary')?.disabled === true,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    if (!portfolioLayoutState.hasFocusMode) throw new Error('Portfolio focus layout not applied.');
    if (portfolioLayoutState.hasDuplicateProgress) throw new Error('Duplicate progress panel is visible on portfolio view.');
    if (!portfolioLayoutState.hasPendingNotice) throw new Error('Submission availability notice not found.');
    if (!portfolioLayoutState.submitDisabled) throw new Error('Submission action remained enabled without storage readiness.');
    if (portfolioLayoutState.overflowX) throw new Error('Horizontal overflow detected on portfolio view.');
    if (scriptRequests.length <= initialScriptCount) throw new Error('Portfolio workspace was not loaded from a separate chunk.');
    if (captureScreenshots) await page.screenshot({ path: 'prod-portfolio-desktop.png', fullPage: true });

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

    console.log('[smoke] checking mobile focus layouts');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await clickTool(page, { id: 'home', label: 'Home' });
    await page.waitForFunction(
      () => !!document.querySelector('.coach-home-workspace'),
      { timeout: 5000 },
    );
    await sleep(400);
    const mobileHomeState = await page.evaluate(() => ({
      headingFontSize: Number.parseFloat(getComputedStyle(document.querySelector('.coach-home-heading h2')).fontSize),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    if (mobileHomeState.overflowX) throw new Error('Horizontal overflow detected on mobile student home.');
    if (mobileHomeState.headingFontSize > 24) throw new Error(`Student home heading is too large on mobile: ${mobileHomeState.headingFontSize}px.`);
    if (captureScreenshots) await page.screenshot({ path: 'prod-home-mobile.png', fullPage: true });

    await clickTool(page, { id: 'portfolio', label: 'Portfolio' });
    await page.waitForFunction(
      () => !!document.querySelector('.coach-submission-console'),
      { timeout: 5000 },
    );
    await sleep(400);
    const mobilePortfolioState = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    if (mobilePortfolioState.overflowX) throw new Error('Horizontal overflow detected on mobile portfolio view.');
    if (captureScreenshots) await page.screenshot({ path: 'prod-portfolio-mobile.png', fullPage: true });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

    console.log('[smoke] checking admin workspace');
    await page.evaluate(() => window.__portfolioCoachSmoke?.setAdminMode?.(true));
    await page.waitForFunction(
      () => document.querySelectorAll('.coach-top-nav-trigger').length === 5,
      { timeout: 5000 },
    );
    await clickTool(page, { id: 'admin', label: 'Admin' });
    await page.waitForFunction(
      () => document.querySelectorAll('.coach-admin-submission-row').length === 2,
      { timeout: 5000 },
    );
    await sleep(400);
    const adminDesktopState = await page.evaluate(() => ({
      hasFocusMode: !!document.querySelector('.coach-body-shell.is-focus-mode'),
      hasStorageReadinessNotice: document.querySelector('.coach-admin-notice.is-warning')?.innerText.includes('파일 제출 준비 필요'),
      hasAccessControls: [...document.querySelectorAll('.coach-admin-access-button')]
        .some((button) => button.innerText.includes('이용 중지')),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    if (!adminDesktopState.hasFocusMode) throw new Error('Admin focus layout not applied.');
    if (!adminDesktopState.hasStorageReadinessNotice) throw new Error('Admin storage readiness notice not found.');
    if (!adminDesktopState.hasAccessControls) throw new Error('Admin account access controls not found.');
    if (adminDesktopState.overflowX) throw new Error('Horizontal overflow detected on admin workspace.');
    if (captureScreenshots) await page.screenshot({ path: 'prod-admin-desktop.png', fullPage: true });

    const accessButton = await page.$('.coach-admin-access-button.is-disable');
    if (!accessButton) throw new Error('Student account disable button not found.');
    await accessButton.click();
    await page.waitForSelector('.coach-admin-access-button.is-confirm');
    if (adminAccessPatchCount !== 0) throw new Error('Account access changed before confirmation.');
    await page.click('.coach-admin-access-button.is-confirm');
    await page.waitForFunction(
      () => [...document.querySelectorAll('.coach-admin-access-button')]
        .some((button) => button.innerText.includes('다시 이용')),
      { timeout: 5000 },
    );
    if (adminAccessPatchCount !== 1) throw new Error(`Unexpected account access request count: ${adminAccessPatchCount}.`);

    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await sleep(200);
    const adminMobileState = await page.evaluate(() => ({
      headingFontSize: Number.parseFloat(getComputedStyle(document.querySelector('.coach-admin-header h2')).fontSize),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      userTableOverflow: (() => {
        const wrapper = document.querySelector('.coach-admin-users > .overflow-x-auto');
        return wrapper ? wrapper.scrollWidth > wrapper.clientWidth : true;
      })(),
      userCellDisplay: getComputedStyle(document.querySelector('.coach-admin-users tbody td')).display,
      hasVisibleAccessAction: [...document.querySelectorAll('.coach-admin-access-button')]
        .some((button) => button.innerText.includes('다시 이용')),
    }));
    if (adminMobileState.overflowX) throw new Error('Horizontal overflow detected on mobile admin workspace.');
    if (adminMobileState.headingFontSize > 24) throw new Error(`Admin heading is too large on mobile: ${adminMobileState.headingFontSize}px.`);
    if (adminMobileState.userTableOverflow) throw new Error('Horizontal overflow detected in the mobile user list.');
    if (adminMobileState.userCellDisplay !== 'grid') throw new Error('Mobile user list did not switch to record layout.');
    if (!adminMobileState.hasVisibleAccessAction) throw new Error('Mobile account access action not found.');
    if (captureScreenshots) await page.screenshot({ path: 'prod-admin-mobile.png', fullPage: false });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

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
