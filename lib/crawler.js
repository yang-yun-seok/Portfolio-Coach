/**
 * crawler.js — GameJob 크롤러 (ESM 모듈, puppeteer-core + 시스템 브라우저)
 *
 * ★ 별도 브라우저 설치 불필요 ★
 *   npm install 후 바로 실행 가능.
 *   시스템에 설치된 Chrome / Edge / Naver Whale을 자동으로 찾아서 사용.
 *   배포 서버에 시스템 브라우저가 없으면 Puppeteer 번들 Chrome을 사용.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BROWSER_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-zygote',
];

function browserLabelFromPath(executablePath) {
  return executablePath.split(/[\\/]/).pop() || executablePath;
}

// ─── 시스템 브라우저 자동 감지 ────────────────────────────────────────────
function findSystemBrowser() {
  const platform = process.platform;
  const candidates = [];
  if (process.env.PUPPETEER_EXECUTABLE_PATH) candidates.push(process.env.PUPPETEER_EXECUTABLE_PATH);
  if (process.env.BROWSER_PATH) candidates.push(process.env.BROWSER_PATH);

  if (platform === 'win32') {
    const local   = process.env.LOCALAPPDATA          || '';
    const pf      = process.env.PROGRAMFILES          || 'C:\\Program Files';
    const pf86    = process.env['PROGRAMFILES(X86)']  || 'C:\\Program Files (x86)';

    candidates.push(
      // Edge — Windows 10/11 기본 탑재
      join(pf86,   'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      join(pf,     'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      join(local,  'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      // Chrome
      join(pf,     'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(pf86,   'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(local,  'Google', 'Chrome', 'Application', 'chrome.exe'),
      // Naver Whale — Chromium 기반 브라우저
      join(pf,     'Naver', 'Naver Whale', 'Application', 'whale.exe'),
      join(pf86,   'Naver', 'Naver Whale', 'Application', 'whale.exe'),
      join(local,  'Naver', 'Naver Whale', 'Application', 'whale.exe'),
      join(pf,     'Naver', 'Whale', 'Application', 'whale.exe'),
      join(pf86,   'Naver', 'Whale', 'Application', 'whale.exe'),
      join(local,  'Naver', 'Whale', 'Application', 'whale.exe'),
    );

  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Whale.app/Contents/MacOS/Whale',
      '/Applications/Naver Whale.app/Contents/MacOS/Naver Whale',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    );

  } else {
    // Linux
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium',
      '/usr/bin/microsoft-edge',
      '/usr/bin/microsoft-edge-stable',
      '/opt/google/chrome/google-chrome',
      '/opt/microsoft/msedge/msedge',
      '/usr/bin/naver-whale',
      '/usr/bin/naver-whale-stable',
      '/opt/naver/whale/whale',
    );
  }

  return candidates.find(p => existsSync(p)) || null;
}

async function resolveBundledBrowserRuntime(onBrowserProgress = () => {}) {
  const mod = await import('puppeteer');
  const puppeteer = mod.default ?? mod;

  const configuredPath = puppeteer.executablePath();
  if (configuredPath && existsSync(configuredPath)) {
    return {
      puppeteer,
      executablePath: configuredPath,
      label: 'Puppeteer Chrome',
      source: 'bundled',
    };
  }

  try {
    const {
      Browser,
      computeExecutablePath,
      detectBrowserPlatform,
      install,
    } = await import('@puppeteer/browsers');

    const platform = detectBrowserPlatform();
    const buildId = puppeteer.defaultBrowserRevision;
    const cacheDir = puppeteer.configuration?.cacheDirectory;

    if (!platform || !buildId || !cacheDir) {
      throw new Error('Puppeteer Chrome 설치 정보를 확인할 수 없습니다.');
    }

    const executablePath = computeExecutablePath({
      browser: Browser.CHROME,
      buildId,
      cacheDir,
      platform,
    });

    if (!existsSync(executablePath)) {
      onBrowserProgress('서버에 실행 가능한 브라우저가 없어 Puppeteer Chrome을 준비합니다. 첫 실행은 1분 이상 걸릴 수 있습니다.', 1);
      const installed = await install({
        browser: Browser.CHROME,
        buildId,
        cacheDir,
        platform,
        unpack: true,
      });
      const installedPath = installed.executablePath || executablePath;
      if (existsSync(installedPath)) {
        return {
          puppeteer,
          executablePath: installedPath,
          label: 'Puppeteer Chrome',
          source: 'bundled',
        };
      }
    }

    if (existsSync(executablePath)) {
      return {
        puppeteer,
        executablePath,
        label: 'Puppeteer Chrome',
        source: 'bundled',
      };
    }
  } catch (err) {
    throw new Error(`Puppeteer Chrome 자동 준비 실패: ${err.message}`);
  }

  throw new Error('Puppeteer Chrome 실행 파일을 준비하지 못했습니다.');
}

async function resolveBrowserRuntime(onBrowserProgress = () => {}) {
  const systemExecutablePath = findSystemBrowser();
  if (systemExecutablePath) {
    const mod = await import('puppeteer-core');
    return {
      puppeteer: mod.default ?? mod,
      executablePath: systemExecutablePath,
      label: browserLabelFromPath(systemExecutablePath),
      source: 'system',
    };
  }

  try {
    return await resolveBundledBrowserRuntime(onBrowserProgress);
  } catch (err) {
    throw new Error(
      '크롤링에 사용할 Chromium 기반 브라우저를 준비하지 못했습니다. ' +
      'Render 서버에서 Puppeteer Chrome 자동 설치가 실패했을 수 있습니다. ' +
      `${err.message}`
    );
  }
}

function createLaunchOptions(executablePath) {
  return {
    headless: true,
    executablePath,
    args: BROWSER_LAUNCH_ARGS,
  };
}

async function launchCrawlerBrowser(runtime, onBrowserProgress = () => {}) {
  try {
    return {
      browser: await runtime.puppeteer.launch(createLaunchOptions(runtime.executablePath)),
      runtime,
    };
  } catch (err) {
    if (runtime.source !== 'system') throw err;

    onBrowserProgress(`${runtime.label} 실행에 실패해 Puppeteer Chrome으로 재시도합니다. (${err.message})`, 2);
    const bundledRuntime = await resolveBundledBrowserRuntime(onBrowserProgress);
    return {
      browser: await bundledRuntime.puppeteer.launch(createLaunchOptions(bundledRuntime.executablePath)),
      runtime: bundledRuntime,
    };
  }
}

// ─── 뉴스/노이즈 제거용 셀렉터 ───
const NOISE_SELECTORS = [
  '.job-news-wrap', '.news-area', '.news-list', '.news-wrap',
  '.articl-list', '.article-list', '.corp-news', '.company-news',
  '[class*="news"]', '[id*="news"]',
  'footer', '.banner-area', '.job-sub-section', '.aside-banner',
  '.recruit-banner', '.ad-area', '[class*="banner"]',
  '.job-sub-content', '.sub-recruit-list', '.other-recruit',
  '#dev-gi-news', '.gi-news', '.news-section',
].join(', ');

// ─── 기본 정보 11개 항목 키 매칭 ───
function mapKey(rawKey) {
  const key = rawKey.trim();
  if (key.includes('모집분야') || key.includes('직종') || key.includes('담당업무')) return 'jobField';
  if (key.includes('키워드')) return 'keywords';
  if (key.includes('대표게임') || key.includes('게임명')) return 'mainGame';
  if (key.includes('게임분야') || key.includes('게임장르')) return 'gameCategory';
  if (key.includes('경력')) return 'experience';
  if (key.includes('고용형태') || key.includes('근무형태')) return 'employmentType';
  if (key.includes('학력')) return 'education';
  if (key.includes('직급') || key.includes('직책')) return 'position';
  if (key.includes('모집인원') || key.includes('인원')) return 'recruitCount';
  if (key.includes('급여') || key.includes('연봉') || key.includes('임금')) return 'salary';
  if (key.includes('마감') || key.includes('접수기간') || key.includes('지원기간')) return 'deadline';
  return null;
}

/**
 * GameJob 크롤러 실행
 * @param {Object} options
 * @param {string[]} options.targets   - 검색 태그 ['게임기획', '신입']
 * @param {string}   options.dataDir   - 데이터 저장 루트 (예: ./data)
 * @param {function} options.onProgress - 진행 콜백: ({ stage, message, current, total, percent })
 * @param {AbortSignal} options.signal  - 중단 시그널 (선택)
 * @returns {Promise<{ success: boolean, count: number, errors: string[] }>}
 */
export async function runCrawler({
  targets = ['게임기획', '신입'],
  dataDir,
  onProgress = () => {},
  signal = null,
} = {}) {

  const onBrowserProgress = (message, percent = 1) => {
    onProgress({ stage: 'browser', message, percent });
  };
  let runtime = await resolveBrowserRuntime(onBrowserProgress);

  const rawDir = join(dataDir, 'raw');
  const refinedDir = join(dataDir, 'refined');
  [dataDir, rawDir, refinedDir].forEach(d => {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  });

  const errors = [];
  let browser;

  try {
    // ═══ 1단계: 브라우저 시작 & 필터 적용 ═══
    onProgress({ stage: 'init', message: `브라우저 시작 중... (${runtime.label})`, percent: 0 });

    const launched = await launchCrawlerBrowser(runtime, onBrowserProgress);
    browser = launched.browser;
    runtime = launched.runtime;
    onProgress({ stage: 'init', message: `브라우저 준비 완료 (${runtime.label})`, percent: 3 });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    if (signal?.aborted) throw new Error('중단됨');

    onProgress({ stage: 'filter', message: `필터 적용 중: [${targets.join(', ')}]`, percent: 5 });

    await page.goto('https://www.gamejob.co.kr/Recruit/joblist?menucode=searchdetail', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.keyboard.press('Escape');

    // [Bug Fix] 필터 체크박스 클릭
    // ★ 문제 1: 사이트가 Backbone.js 이벤트 위임을 사용 → page.click() 필수
    // ★ 문제 2: 상세검색 탭이 접혀있으면 체크박스가 height:0 → page.click() 실패
    //   해결: 체크박스가 속한 탭(dt)을 먼저 클릭하여 열고, 그 다음 체크박스를 클릭
    // 체크박스 정보 수집 → 탭별로 그룹화
    // ★ 탭 버튼은 토글이므로, 같은 탭을 두 번 열면 닫힘.
    //   따라서 탭별로 한 번만 열고, 해당 탭의 모든 체크박스를 순차 클릭해야 함.
    const checkboxInfoList = await page.evaluate((tgts) => {
      const results = [];
      const labels = Array.from(document.querySelectorAll('label'));
      const allTabs = Array.from(document.querySelectorAll('.detailSearch .dev-tab'));

      tgts.forEach(t => {
        const l = labels.find(label => label.innerText.replace(/\s/g, '').includes(t));
        if (!l) return;
        const forAttr = l.getAttribute('for');
        if (!forAttr) return;
        const cb = document.getElementById(forAttr);
        if (!cb) return;

        const parentTab = cb.closest('.dev-tab');
        const tabIdx = parentTab ? allTabs.indexOf(parentTab) : -1;
        const tabBtnText = parentTab
          ? (parentTab.querySelector('dt button.btnTit span') || parentTab.querySelector('dt button.btnTit'))?.innerText?.trim() || ''
          : '';

        results.push({ cbId: forAttr, tabIdx, tabBtnText });
      });
      return results;
    }, targets);

    // 탭별 그룹화: { tabIdx → [cbId, cbId, ...] }
    const tabGroups = new Map();
    for (const info of checkboxInfoList) {
      const key = info.tabIdx;
      if (!tabGroups.has(key)) {
        tabGroups.set(key, { tabIdx: info.tabIdx, tabBtnText: info.tabBtnText, cbIds: [] });
      }
      tabGroups.get(key).cbIds.push(info.cbId);
    }

    // 탭별로: ① 탭 열기(필요 시) → ② 해당 탭의 모든 체크박스 순차 클릭
    for (const [, group] of tabGroups) {
      // ① 탭이 닫혀있으면 열기 (현재 실시간 상태로 확인)
      const needOpen = await page.evaluate((tabIdx) => {
        const tabs = document.querySelectorAll('.detailSearch .dev-tab');
        return tabs[tabIdx] ? !tabs[tabIdx].classList.contains('on') : false;
      }, group.tabIdx);

      if (needOpen && group.tabIdx >= 0) {
        await page.evaluate((tabText, tabIdx) => {
          const allBtns = document.querySelectorAll('.detailSearch .dev-tab dt button.btnTit');
          const matched = Array.from(allBtns).find(b => b.innerText.trim().includes(tabText));
          if (matched) { matched.click(); return; }
          const tabs = document.querySelectorAll('.detailSearch .dev-tab');
          if (tabs[tabIdx]) {
            const btn = tabs[tabIdx].querySelector('dt button.btnTit');
            if (btn) btn.click();
          }
        }, group.tabBtnText, group.tabIdx);
        await new Promise(r => setTimeout(r, 800));
      }

      // ② 이 탭의 모든 체크박스를 순차 클릭 (탭을 다시 건드리지 않음)
      for (const cbId of group.cbIds) {
        const sel = `#${cbId}`;
        try {
          await page.waitForSelector(sel, { visible: true, timeout: 3000 });
          await page.click(sel);
        } catch {
          try {
            await page.waitForSelector(`label[for="${cbId}"]`, { visible: true, timeout: 2000 });
            await page.click(`label[for="${cbId}"]`);
          } catch {
            // 최종 폴백: 탭이 닫혔을 수 있으므로 강제 오픈 후 클릭
            await page.evaluate((id) => {
              const el = document.getElementById(id);
              if (!el) return;
              const tab = el.closest('.dev-tab');
              if (tab && !tab.classList.contains('on')) {
                const btn = tab.querySelector('dt button.btnTit');
                if (btn) btn.click();
              }
            }, cbId);
            await new Promise(r => setTimeout(r, 500));
            try {
              await page.waitForSelector(sel, { visible: true, timeout: 2000 });
              await page.click(sel);
            } catch {
              // 최최종 폴백: evaluate + jQuery
              await page.evaluate((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (!el.checked) el.checked = true;
                if (typeof jQuery !== 'undefined') jQuery(el).trigger('change');
              }, cbId);
            }
          }
        }
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // [Bug Fix] 검색 버튼 대기 — 카운트 갱신까지 대기
    try {
      await page.waitForSelector('#dev-btn-cnt', { timeout: 10000 });
    } catch {
      await page.waitForSelector('button[class*="search"], button[class*="btn-search"], .btn-search', { timeout: 5000 }).catch(() => {});
    }

    // ★ 카운트가 "0건"에서 벗어날 때까지 최대 5초 대기 (Backbone 비동기 이벤트 처리 대응)
    await page.waitForFunction(
      () => {
        const btn = document.querySelector('#dev-btn-cnt');
        if (!btn) return true; // 버튼 없으면 진행
        const text = btn.innerText || '';
        const match = text.match(/(\d+)/);
        return match && parseInt(match[1]) > 0;
      },
      { timeout: 5000 }
    ).catch(() => {});

    const searchCountText = await page.$eval('#dev-btn-cnt', el => el.innerText).catch(() => '');
    onProgress({ stage: 'filter', message: `검색 결과: ${searchCountText.trim()}`, percent: 10 });

    // 검색 전 기존 목록의 첫 번째 공고 ID와 공고 수를 기록 (검색 결과 갱신 감지용)
    const beforeSearch = await page.evaluate(() => {
      const links = document.querySelectorAll('#dev-gi-list a[href*="GI_No="], #dev-gi-list a[href*="GiNo="]');
      const firstLink = links[0];
      let firstId = '';
      if (firstLink) {
        try {
          const url = new URL(firstLink.href, window.location.origin);
          firstId = url.searchParams.get('GI_No') || url.searchParams.get('GiNo') || '';
        } catch {}
      }
      return { firstId, count: links.length };
    });

    // [Bug Fix] 검색 버튼도 뷰포트 밖일 수 있으므로 스크롤 후 클릭
    await page.evaluate(() => {
      const btn = document.querySelector('#dev-btn-cnt');
      if (btn) btn.scrollIntoView({ block: 'center' });
    });
    await new Promise(r => setTimeout(r, 300));

    try {
      await page.click('#dev-btn-cnt');
    } catch {
      try {
        await page.click('button[class*="search"], button[class*="btn-search"], .btn-search');
      } catch {
        await page.$eval('#dev-btn-cnt', el => el.click()).catch(() => {});
      }
    }

    // [Bug Fix] 검색 결과 목록이 실제로 갱신될 때까지 대기
    //   기존 목록의 firstId/count가 변하면 갱신 완료로 판단
    try {
      await page.waitForFunction(
        (prevFirstId, prevCount) => {
          const links = document.querySelectorAll('#dev-gi-list a[href*="GI_No="], #dev-gi-list a[href*="GiNo="]');
          if (links.length === 0) return false; // 아직 로딩 중
          if (links.length !== prevCount) return true; // 공고 수 변경 → 갱신됨
          // 첫 번째 ID 변경 확인
          try {
            const url = new URL(links[0].href, window.location.origin);
            const newId = url.searchParams.get('GI_No') || url.searchParams.get('GiNo') || '';
            return newId !== prevFirstId;
          } catch { return false; }
        },
        { timeout: 15000 },
        beforeSearch.firstId,
        beforeSearch.count
      );
    } catch {
      // 폴백: 최소 대기 (검색 결과가 동일한 경우에도 대비)
      await new Promise(r => setTimeout(r, 5000));
    }
    await new Promise(r => setTimeout(r, 1000));

    // ═══ 2단계: 목록 수집 (페이지네이션) ═══
    let allJobs = [];
    let currentPage = 1;
    let lastFirstJobId = '';

    while (true) {
      if (signal?.aborted) throw new Error('중단됨');

      // [Bug Fix] 다중 URL 패턴 + 다중 DOM 구조 지원
      const currentFirstJobId = await page.evaluate(() => {
        // 1순위: GI_No / GiNo 쿼리 파라미터가 있는 링크
        let firstLink = document.querySelector('#dev-gi-list a[href*="GI_No="], #dev-gi-list a[href*="GiNo="]');
        if (firstLink) {
          try {
            const url = new URL(firstLink.href);
            return url.searchParams.get('GI_No') || url.searchParams.get('GiNo') || '';
          } catch { return ''; }
        }
        // 2순위: /Recruit/ 경로 기반 URL
        firstLink = document.querySelector('#dev-gi-list a[href*="/Recruit/"]');
        if (firstLink) {
          const match = firstLink.href.match(/\/Recruit\/(\d+)/);
          return match ? match[1] : '';
        }
        // 3순위: data-* 속성에서 ID 추출
        const anyItem = document.querySelector('#dev-gi-list [data-gi-no], #dev-gi-list [data-gino], #dev-gi-list [data-id]');
        if (anyItem) {
          return anyItem.dataset.giNo || anyItem.dataset.gino || anyItem.dataset.id || '';
        }
        return '';
      });

      if (currentPage > 1 && (!currentFirstJobId || currentFirstJobId === lastFirstJobId)) break;
      lastFirstJobId = currentFirstJobId;

      // [Bug Fix] table(tr) + div 구조 + 다중 URL 패턴 지원
      const jobsOnPage = await page.evaluate(() => {
        const results = [];

        // ID 추출 헬퍼
        function extractJobId(href) {
          try {
            const url = new URL(href, window.location.origin);
            const fromParam = url.searchParams.get('GI_No') || url.searchParams.get('GiNo');
            if (fromParam) return fromParam;
            const pathMatch = url.pathname.match(/\/Recruit\/(?:GI_Read\/View\/)?(\d+)/i);
            if (pathMatch) return pathMatch[1];
            const numMatch = href.match(/(\d{5,})/);
            if (numMatch) return numMatch[1];
          } catch {}
          return null;
        }

        // 수집 전략 A: 기존 table 구조 (#dev-gi-list tr)
        const tableRows = document.querySelectorAll('#dev-gi-list tr');
        tableRows.forEach(item => {
          if (item.classList.contains('sword') || item.classList.contains('gold') || (item.id && item.id.includes('premium'))) return;
          const linkEl = item.querySelector('a[href*="GI_No="], a[href*="GiNo="], a[href*="/Recruit/"]');
          if (linkEl) {
            const title   = linkEl.innerText.trim();
            const href    = linkEl.href;
            const company = (item.querySelector('.name, .corp, .company, td.tplCo, [class*="company"], [class*="corp"]') || {}).innerText?.trim() || 'Unknown';
            const id      = extractJobId(href);
            const careerEl = item.querySelector('.career, .experience, td.tplCareer, [class*="career"]');
            const career   = careerEl ? careerEl.innerText.trim() : '';
            if (id && title) results.push({ id, title, company, link: href, careerFromList: career });
          }
        });

        // 수집 전략 B: div 기반 리스트 구조 (리뉴얼 대응)
        if (results.length === 0) {
          const divItems = document.querySelectorAll(
            '#dev-gi-list li, #dev-gi-list .recruit-list-item, #dev-gi-list [class*="list-item"], #dev-gi-list > div > div, #dev-gi-list .list-item'
          );
          divItems.forEach(item => {
            if (item.classList.contains('sword') || item.classList.contains('gold') || (item.id && item.id.includes('premium'))) return;
            if (item.querySelector('[class*="ad-"], [class*="premium"], [class*="sponsor"]')) return;
            const linkEl = item.querySelector('a[href*="GI_No="], a[href*="GiNo="], a[href*="/Recruit/"]');
            if (linkEl) {
              const title   = linkEl.innerText.trim();
              const href    = linkEl.href;
              const company = (item.querySelector('.name, .corp, .company, [class*="company"], [class*="corp"]') || {}).innerText?.trim() || 'Unknown';
              const id      = extractJobId(href);
              const careerEl = item.querySelector('.career, .experience, [class*="career"]');
              const career   = careerEl ? careerEl.innerText.trim() : '';
              if (id && title) results.push({ id, title, company, link: href, careerFromList: career });
            }
          });
        }

        // 수집 전략 C: 최후의 수단 — 모든 채용 링크 수집
        if (results.length === 0) {
          const allLinks = document.querySelectorAll('#dev-gi-list a[href*="GI_No="], #dev-gi-list a[href*="GiNo="], #dev-gi-list a[href*="/Recruit/"]');
          allLinks.forEach(linkEl => {
            const href = linkEl.href;
            const id = extractJobId(href);
            const title = linkEl.innerText.trim();
            if (id && title && title.length > 2) {
              if (!results.some(r => r.id === id)) {
                results.push({ id, title, company: 'Unknown', link: href, careerFromList: '' });
              }
            }
          });
        }

        return results;
      });

      allJobs = allJobs.concat(jobsOnPage.filter(nj => !allJobs.some(oj => oj.id === nj.id)));
      onProgress({
        stage: 'list',
        message: `${currentPage}페이지 수집 완료 (누적: ${allJobs.length}개)`,
        percent: Math.min(30, 10 + currentPage * 3),
      });

      // 다음 페이지
      // ★ 사이트 Backbone 이벤트: 'click .pagination a' → 'onGIListPageSelect'
      //   page.click() 필수이나, 페이지네이션이 뷰포트 밖(top:4000+)이므로
      //   scrollIntoView로 노출 후 클릭해야 함
      const hasNextPage = await page.evaluate((targetPage) => {
        const pagEl = document.querySelector('.pagination');
        if (!pagEl) return false;
        // 해당 페이지 번호 또는 '다음' 버튼이 있는지
        const byDataPage = pagEl.querySelector(`a[data-page="${targetPage}"]`);
        if (byDataPage) return true;
        const byText = Array.from(pagEl.querySelectorAll('a.btn'))
          .find(a => a.innerText.trim() === String(targetPage));
        if (byText) return true;
        // 다음 그룹(11, 21 등) 버튼
        const nextBtn = pagEl.querySelector('a.btnNext');
        return !!nextBtn;
      }, currentPage + 1);

      if (!hasNextPage) break;
      currentPage++;

      // 페이지네이션을 뷰포트로 스크롤 → page.click()
      await page.evaluate((targetPage) => {
        const pagEl = document.querySelector('.pagination');
        if (pagEl) pagEl.scrollIntoView({ block: 'center' });
      }, currentPage);
      await new Promise(r => setTimeout(r, 300));

      // 클릭 대상 결정: data-page 매칭 → 텍스트 매칭 → btnNext
      const clicked = await page.evaluate((targetPage) => {
        const pagEl = document.querySelector('.pagination');
        if (!pagEl) return false;
        // 1순위: data-page로 직접 매칭
        const byData = pagEl.querySelector(`a[data-page="${targetPage}"]`);
        if (byData) { byData.scrollIntoView({ block: 'center' }); return 'data'; }
        // 2순위: 텍스트로 매칭
        const byText = Array.from(pagEl.querySelectorAll('a.btn'))
          .find(a => a.innerText.trim() === String(targetPage));
        if (byText) { byText.scrollIntoView({ block: 'center' }); return 'text'; }
        // 3순위: btnNext (다음 10페이지 그룹)
        const nextBtn = pagEl.querySelector('a.btnNext');
        if (nextBtn) { nextBtn.scrollIntoView({ block: 'center' }); return 'next'; }
        return false;
      }, currentPage);

      if (!clicked) break;
      await new Promise(r => setTimeout(r, 200));

      // page.click()으로 실제 클릭 (Backbone 이벤트 전파)
      try {
        if (clicked === 'data') {
          await page.click(`.pagination a[data-page="${currentPage}"]`);
        } else if (clicked === 'next') {
          await page.click('.pagination a.btnNext');
        } else {
          // 텍스트 매칭 — data-page가 없는 경우 evaluate로 클릭
          await page.evaluate((targetPage) => {
            const pagEl = document.querySelector('.pagination');
            const link = Array.from(pagEl.querySelectorAll('a.btn'))
              .find(a => a.innerText.trim() === String(targetPage));
            if (link) link.click();
          }, currentPage);
        }
      } catch {
        // 최종 폴백: evaluate 직접 클릭
        await page.evaluate((targetPage) => {
          const pagEl = document.querySelector('.pagination');
          if (!pagEl) return;
          const link = pagEl.querySelector(`a[data-page="${targetPage}"]`)
            || pagEl.querySelector('a.btnNext');
          if (link) link.click();
        }, currentPage);
      }

      // AJAX 목록 로딩 대기 — 첫 번째 공고 ID가 변경될 때까지
      try {
        await page.waitForFunction(
          (prevFirstId) => {
            const link = document.querySelector('#dev-gi-list a[href*="GI_No="], #dev-gi-list a[href*="GiNo="]');
            if (!link) return false;
            try {
              const url = new URL(link.href, window.location.origin);
              const id = url.searchParams.get('GI_No') || url.searchParams.get('GiNo') || '';
              return id && id !== prevFirstId;
            } catch { return false; }
          },
          { timeout: 10000 },
          lastFirstJobId
        );
      } catch {
        await new Promise(r => setTimeout(r, 3000));
      }
      await new Promise(r => setTimeout(r, 1000));

      // 이동 후 실제로 새 공고가 있는지 확인 (무한루프 방지)
      const newFirstId = await page.evaluate(() => {
        const link = document.querySelector('#dev-gi-list a[href*="GI_No="], #dev-gi-list a[href*="GiNo="], #dev-gi-list a[href*="/Recruit/"]');
        if (!link) return '';
        try {
          const url = new URL(link.href, window.location.origin);
          const fromParam = url.searchParams.get('GI_No') || url.searchParams.get('GiNo');
          if (fromParam) return fromParam;
          const pathMatch = link.href.match(/\/Recruit\/(\d+)/);
          return pathMatch ? pathMatch[1] : '';
        } catch { return ''; }
      });
      if (!newFirstId || newFirstId === lastFirstJobId) break;
    }

    onProgress({ stage: 'detail', message: `총 ${allJobs.length}개 공고 확보. 상세 수집 시작`, total: allJobs.length, current: 0, percent: 30 });

    // ═══ 3단계: 상세 페이지 수집 ═══
    for (let i = 0; i < allJobs.length; i++) {
      if (signal?.aborted) throw new Error('중단됨');

      const job = allJobs[i];
      const pct = 30 + Math.round((i / allJobs.length) * 65);
      onProgress({
        stage: 'detail',
        message: `${i + 1}/${allJobs.length}: ${job.company} - ${job.title.slice(0, 30)}`,
        current: i + 1,
        total: allJobs.length,
        percent: pct,
      });

      try {
        await page.goto(job.link, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 2000));

        // 기본 정보 11개 항목
        // [Bug Fix] new Function() CSP 차단 해결: 인라인 매핑 로직으로 전환
        const basicInfo = await page.evaluate(() => {
          function mapKey(rawKey) {
            const key = rawKey.trim();
            if (key.includes('모집분야') || key.includes('직종') || key.includes('담당업무')) return 'jobField';
            if (key.includes('키워드')) return 'keywords';
            if (key.includes('대표게임') || key.includes('게임명')) return 'mainGame';
            if (key.includes('게임분야') || key.includes('게임장르')) return 'gameCategory';
            if (key.includes('경력')) return 'experience';
            if (key.includes('고용형태') || key.includes('근무형태')) return 'employmentType';
            if (key.includes('학력')) return 'education';
            if (key.includes('직급') || key.includes('직책')) return 'position';
            if (key.includes('모집인원') || key.includes('인원')) return 'recruitCount';
            if (key.includes('급여') || key.includes('연봉') || key.includes('임금')) return 'salary';
            if (key.includes('마감') || key.includes('접수기간') || key.includes('지원기간')) return 'deadline';
            return null;
          }

          const info = {};

          // 1순위: 리뉴얼 후 실제 DOM 구조
          const newStyleItems = document.querySelectorAll('.recruit-data-item, .recruit-data-item.flex');
          newStyleItems.forEach(item => {
            const dt = item.querySelector('dt');
            const dd = item.querySelector('dd');
            if (dt && dd) {
              const fieldKey = mapKey(dt.innerText);
              if (fieldKey) info[fieldKey] = dd.innerText.trim();
            }
          });

          // 2순위: 구버전 호환
          if (Object.keys(info).length < 3) {
            const items = document.querySelectorAll(
              '.view-info-area dl > div, .view-info-area tr, .tplViewInfo tr, .info-wrap tr, .recruit-info tr, .tb-list tr, .tplTable tr'
            );
            items.forEach(item => {
              const th = item.querySelector('dt, th');
              const td = item.querySelector('dd, td');
              if (th && td) {
                const fieldKey = mapKey(th.innerText);
                if (fieldKey) info[fieldKey] = td.innerText.trim();
              }
            });
          }

          // 3순위: dl 전체 순회
          if (Object.keys(info).length < 3) {
            const dls = document.querySelectorAll('.recruit-data dl, .view-info-area dl, .info-wrap dl, .recruit-info dl');
            dls.forEach(dl => {
              const dts = dl.querySelectorAll('dt');
              const dds = dl.querySelectorAll('dd');
              dts.forEach((dt, idx) => {
                const fieldKey = mapKey(dt.innerText);
                if (fieldKey && dds[idx]) info[fieldKey] = dds[idx].innerText.trim();
              });
            });
          }

          // 4순위: 임의의 key-value 구조 탐색
          if (Object.keys(info).length < 3) {
            const allDts = document.querySelectorAll('dt, th, .info-label, .data-label, [class*="label"], [class*="title"]');
            allDts.forEach(dt => {
              const fieldKey = mapKey(dt.innerText);
              if (fieldKey && !info[fieldKey]) {
                const dd = dt.nextElementSibling;
                if (dd) {
                  const text = dd.innerText?.trim();
                  if (text && text.length < 500) info[fieldKey] = text;
                }
              }
            });
          }

          return info;
        });

        // 모집요강 (description)
        let realDescription = '';
        const tab01 = await page.$('#gj-tab01')
          || await page.$('[id*="tab01"], .recruit-detail-content, .detail-content, #recruit-detail');
        if (tab01) {
          const iframes = await tab01.$$('iframe');
          let combinedText = '';
          for (const iframe of iframes) {
            const frameObj = await iframe.contentFrame();
            if (frameObj) {
              const text = await frameObj.$eval('body', el => el.innerText).catch(() => '');
              combinedText += text.trim() + '\n\n';
            }
          }
          combinedText = combinedText.trim();

          if (combinedText.length >= 50) {
            realDescription = combinedText;
          } else {
            const directText = await tab01.evaluate(el => el.innerText).catch(() => '');
            if (directText.trim().length >= 50) {
              realDescription = directText.trim();
            } else {
              const imgElement = await tab01.$('img');
              if (imgElement) realDescription = '이미지 본문 (상세 텍스트 기재 없음)';
            }
          }
        }

        // 폴백: tab01을 못 찾았을 때 페이지 전체에서 상세 내용 추출 시도
        if (!realDescription || realDescription.length < 50) {
          const fallbackDesc = await page.evaluate(() => {
            const candidates = document.querySelectorAll(
              '.recruit-detail, .detail-content, .view-content, [class*="detail-body"], [class*="recruit-content"]'
            );
            for (const el of candidates) {
              const text = el.innerText.trim();
              if (text.length >= 50) return text;
            }
            return '';
          });
          if (fallbackDesc.length >= 50) {
            realDescription = fallbackDesc;
          }
        }

        if (!realDescription || realDescription.length < 50) {
          realDescription = '상세 내용을 가져올 수 없습니다.';
        }

        // 데이터 저장
        const refinedData = {
          id:             `crawled-${job.id}`,
          title:          job.title,
          company:        job.company,
          jobField:       basicInfo.jobField       || '',
          keywords:       basicInfo.keywords       || '',
          mainGame:       basicInfo.mainGame       || '',
          gameCategory:   basicInfo.gameCategory   || '',
          experience:     basicInfo.experience     || job.careerFromList || '',
          employmentType: basicInfo.employmentType || '',
          education:      basicInfo.education      || '',
          position:       basicInfo.position       || '',
          recruitCount:   basicInfo.recruitCount   || '',
          salary:         basicInfo.salary         || '',
          deadline:       basicInfo.deadline       || '',
          description:    realDescription,
          updatedAt:      new Date().toISOString().split('T')[0],
          link:           job.link,
          source:         'GameJob',
        };

        const rawData = { ...job, ...basicInfo, realDescription };
        writeFileSync(join(rawDir, `raw-${job.id}.json`), JSON.stringify(rawData, null, 2), 'utf-8');
        writeFileSync(join(refinedDir, `job-${job.id}.json`), JSON.stringify(refinedData, null, 2), 'utf-8');

        // 랜덤 딜레이
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1500) + 1000));
      } catch (e) {
        errors.push(`${job.title}: ${e.message}`);
      }
    }

    onProgress({ stage: 'done', message: `크롤링 완료! ${allJobs.length}건 수집`, percent: 100 });
    return { success: true, count: allJobs.length, errors };

  } catch (err) {
    if (err.message === '중단됨') {
      onProgress({ stage: 'cancelled', message: '크롤링이 중단되었습니다.', percent: 0 });
      return { success: false, count: 0, errors: ['사용자에 의해 중단됨'] };
    }
    throw err;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * 단건 크롤링 — GI_No 하나로 GameJob 상세 페이지를 직접 크롤링
 * @param {Object} options
 * @param {string} options.giNo     - GameJob 공고 번호 (예: '258667')
 * @param {string} options.dataDir  - 데이터 저장 루트 (예: ./data)
 * @returns {Promise<{ success: boolean, refinedData: object|null, error: string|null }>}
 */
export async function crawlSingleJob({ giNo, dataDir }) {
  let runtime = await resolveBrowserRuntime();

  const rawDir = join(dataDir, 'raw');
  const refinedDir = join(dataDir, 'refined');
  [dataDir, rawDir, refinedDir].forEach(d => {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  });

  let browser;
  try {
    const launched = await launchCrawlerBrowser(runtime);
    browser = launched.browser;
    runtime = launched.runtime;

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );

    const jobUrl = `https://www.gamejob.co.kr/Recruit/GI_Read/View?GI_No=${giNo}`;
    await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 2000));

    // 공고 제목 추출
    const title = await page.evaluate(() => {
      const el = document.querySelector('.recruit-view-tit h2, .tplViewTitle h2, .view-title h2, h2.title');
      return el ? el.innerText.trim() : '';
    });

    // 회사명 추출
    const company = await page.evaluate(() => {
      const el = document.querySelector('.recruit-view-tit .corp-name, .tplViewTitle .corp-name, .corp-name a, .company-name');
      return el ? el.innerText.trim() : '';
    });

    if (!title && !company) {
      return { success: false, refinedData: null, error: `GI_No ${giNo}에 해당하는 공고를 찾을 수 없습니다. (페이지 로드 실패 또는 삭제된 공고)` };
    }

    // 기본 정보 11개 항목
    // [Bug Fix] new Function() CSP 차단 해결: 인라인 매핑 로직으로 전환
    const basicInfo = await page.evaluate(() => {
      // ── 인라인 mapKey (new Function() 제거 — CSP 안전) ──
      function mapKey(rawKey) {
        const key = rawKey.trim();
        if (key.includes('모집분야') || key.includes('직종') || key.includes('담당업무')) return 'jobField';
        if (key.includes('키워드')) return 'keywords';
        if (key.includes('대표게임') || key.includes('게임명')) return 'mainGame';
        if (key.includes('게임분야') || key.includes('게임장르')) return 'gameCategory';
        if (key.includes('경력')) return 'experience';
        if (key.includes('고용형태') || key.includes('근무형태')) return 'employmentType';
        if (key.includes('학력')) return 'education';
        if (key.includes('직급') || key.includes('직책')) return 'position';
        if (key.includes('모집인원') || key.includes('인원')) return 'recruitCount';
        if (key.includes('급여') || key.includes('연봉') || key.includes('임금')) return 'salary';
        if (key.includes('마감') || key.includes('접수기간') || key.includes('지원기간')) return 'deadline';
        return null;
      }

      const info = {};

      // ── 1순위: 리뉴얼 후 실제 DOM 구조 (recruit-data-item)
      const newStyleItems = document.querySelectorAll('.recruit-data-item, .recruit-data-item.flex');
      newStyleItems.forEach(item => {
        const dt = item.querySelector('dt');
        const dd = item.querySelector('dd');
        if (dt && dd) {
          const fieldKey = mapKey(dt.innerText);
          if (fieldKey) info[fieldKey] = dd.innerText.trim();
        }
      });

      // ── 2순위: 구버전 호환 (view-info-area, tplViewInfo, tb-list 등)
      if (Object.keys(info).length < 3) {
        const items = document.querySelectorAll(
          '.view-info-area dl > div, .view-info-area tr, .tplViewInfo tr, .info-wrap tr, .recruit-info tr, .tb-list tr, .tplTable tr'
        );
        items.forEach(item => {
          const th = item.querySelector('dt, th');
          const td = item.querySelector('dd, td');
          if (th && td) {
            const fieldKey = mapKey(th.innerText);
            if (fieldKey) info[fieldKey] = td.innerText.trim();
          }
        });
      }

      // ── 3순위: dl 전체 순회 (dt/dd가 형제로 나열된 경우)
      if (Object.keys(info).length < 3) {
        const dls = document.querySelectorAll('.recruit-data dl, .view-info-area dl, .info-wrap dl, .recruit-info dl');
        dls.forEach(dl => {
          const dts = dl.querySelectorAll('dt');
          const dds = dl.querySelectorAll('dd');
          dts.forEach((dt, idx) => {
            const fieldKey = mapKey(dt.innerText);
            if (fieldKey && dds[idx]) info[fieldKey] = dds[idx].innerText.trim();
          });
        });
      }

      // ── 4순위: 임의의 key-value 구조 탐색 ──
      if (Object.keys(info).length < 3) {
        const allDts = document.querySelectorAll('dt, th, .info-label, .data-label, [class*="label"], [class*="title"]');
        allDts.forEach(dt => {
          const fieldKey = mapKey(dt.innerText);
          if (fieldKey && !info[fieldKey]) {
            const dd = dt.nextElementSibling;
            if (dd) {
              const text = dd.innerText?.trim();
              if (text && text.length < 500) info[fieldKey] = text;
            }
          }
        });
      }

      return info;
    });

    // 모집요강 (description)
    // [Bug Fix] 탭 셀렉터 다변화 + 폴백 강화
    let realDescription = '';
    const tab01 = await page.$('#gj-tab01')
      || await page.$('[id*="tab01"], .recruit-detail-content, .detail-content, #recruit-detail');
    if (tab01) {
      const iframes = await tab01.$$('iframe');
      let combinedText = '';
      for (const iframe of iframes) {
        const frameObj = await iframe.contentFrame();
        if (frameObj) {
          const text = await frameObj.$eval('body', el => el.innerText).catch(() => '');
          combinedText += text.trim() + '\n\n';
        }
      }
      combinedText = combinedText.trim();

      if (combinedText.length >= 50) {
        realDescription = combinedText;
      } else {
        const directText = await tab01.evaluate(el => el.innerText).catch(() => '');
        if (directText.trim().length >= 50) {
          realDescription = directText.trim();
        } else {
          const imgElement = await tab01.$('img');
          if (imgElement) realDescription = '이미지 본문 (상세 텍스트 기재 없음)';
        }
      }
    }

    // 폴백: tab01을 못 찾았을 때 페이지 전체에서 상세 내용 추출 시도
    if (!realDescription || realDescription.length < 50) {
      const fallbackDesc = await page.evaluate(() => {
        const candidates = document.querySelectorAll(
          '.recruit-detail, .detail-content, .view-content, [class*="detail-body"], [class*="recruit-content"]'
        );
        for (const el of candidates) {
          const text = el.innerText.trim();
          if (text.length >= 50) return text;
        }
        return '';
      });
      if (fallbackDesc.length >= 50) {
        realDescription = fallbackDesc;
      }
    }

    if (!realDescription || realDescription.length < 50) {
      realDescription = '상세 내용을 가져올 수 없습니다.';
    }

    // refined 데이터 구성
    const refinedData = {
      id:             `crawled-${giNo}`,
      title, company,
      jobField:       basicInfo.jobField       || '',
      keywords:       basicInfo.keywords       || '',
      mainGame:       basicInfo.mainGame       || '',
      gameCategory:   basicInfo.gameCategory   || '',
      experience:     basicInfo.experience     || '',
      employmentType: basicInfo.employmentType || '',
      education:      basicInfo.education      || '',
      position:       basicInfo.position       || '',
      recruitCount:   basicInfo.recruitCount   || '',
      salary:         basicInfo.salary         || '',
      deadline:       basicInfo.deadline       || '',
      description:    realDescription,
      updatedAt:      new Date().toISOString().split('T')[0],
      link:           jobUrl,
      source:         'GameJob',
    };

    // raw / refined 파일 저장
    const rawData = { id: giNo, title, company, link: jobUrl, ...basicInfo, realDescription };
    writeFileSync(join(rawDir, `raw-${giNo}.json`), JSON.stringify(rawData, null, 2), 'utf-8');
    writeFileSync(join(refinedDir, `job-${giNo}.json`), JSON.stringify(refinedData, null, 2), 'utf-8');

    return { success: true, refinedData, error: null };

  } catch (err) {
    return { success: false, refinedData: null, error: err.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
