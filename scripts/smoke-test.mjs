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

async function clickTool(page, label) {
  await page.evaluate((targetLabel) => {
    const buttons = [...document.querySelectorAll('.coach-side-tools button')];
    const target = buttons.find((button) => button.innerText.trim() === targetLabel);
    target?.click();
  }, label);

  await page.waitForFunction(
    (targetLabel) => document.querySelector('.coach-side-tool.is-active .coach-side-tool-label')?.textContent?.trim() === targetLabel,
    { timeout: 5000 },
    label,
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

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${baseUrl}?smoke=1`, { waitUntil: 'networkidle0', timeout: 45000 });

    const expectedTools = ['정보 입력', '서류 피드백', '포트폴리오', '추천 공고', '면접 대비', '면접 기본 준비', '직무 과제 평가', '인성검사', 'PDF 출력'];

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

    for (const label of expectedTools) {
      if (!initialState.toolLabels.includes(label)) {
        throw new Error(`Missing side tool: ${label}`);
      }
    }

    for (const label of expectedTools) {
      await clickTool(page, label);
      const state = await page.evaluate(() => ({
        hasLegacyStepUi: !!document.querySelector('.coach-side-step, .coach-side-steps, .is-complete, .coach-progress-track, .personality-progress-track'),
        overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      }));

      if (state.hasLegacyStepUi) throw new Error(`Legacy step/progress UI detected after opening "${label}".`);
      if (state.overflowX) throw new Error(`Horizontal overflow detected after opening "${label}".`);
    }

    await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find((node) => node.innerText.includes('사용 설명서'));
      button?.click();
    });
    await page.waitForFunction(
      () => [...document.querySelectorAll('h2')].some((node) => node.textContent?.trim() === 'Portfolio Coach 사용 설명서'),
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
