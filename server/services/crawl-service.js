import { writeFileSync } from 'fs';
import { join } from 'path';
import { normalizeAll, normalizeJob } from '../../lib/job-normalizer.js';

export function createCrawlService({ dataDir, dataLoader }) {
  const state = {
    running: false,
    abortController: null,
    log: [],
    lastEvent: null,
  };

  const pushEvent = (data) => {
    state.lastEvent = data;
    state.log.push(data);
    if (state.log.length > 100) state.log.shift();
  };

  async function resolveJobByGiNo(giNo) {
    if (!giNo) {
      return { status: 400, body: { error: 'giNo (공고 번호)가 필요합니다.' } };
    }

    const cleanGiNo = String(giNo).replace(/\D/g, '');
    if (!cleanGiNo) {
      return { status: 400, body: { error: '유효한 공고 번호가 아닙니다.' } };
    }

    const existing = dataLoader.getJobByGiNo(cleanGiNo);
    if (existing) {
      return { status: 200, body: { found: true, source: 'cache', job: existing } };
    }

    try {
      const { crawlSingleJob } = await import('../../lib/crawler.js');
      const crawlResult = await crawlSingleJob({ giNo: cleanGiNo, dataDir });

      if (!crawlResult.success) {
        return {
          status: 404,
          body: {
            found: false,
            error: crawlResult.error || `공고 ${cleanGiNo}을(를) 크롤링할 수 없습니다.`,
          },
        };
      }

      const normalizedJob = crawlResult.normalizedJob || normalizeJob(crawlResult.refinedData);
      const jobFilePath = join(dataDir, 'jobs', `job-${cleanGiNo}.json`);
      writeFileSync(jobFilePath, JSON.stringify(normalizedJob, null, 2), 'utf-8');

      dataLoader.refresh();
      return { status: 200, body: { found: true, source: 'crawled', job: normalizedJob } };
    } catch (err) {
      console.error(`[/api/jobs/resolve] GI_No ${cleanGiNo} 크롤링 오류:`, err.message);
      return {
        status: 500,
        body: {
          found: false,
          error: `크롤링 중 오류가 발생했습니다: ${err.message}`,
        },
      };
    }
  }

  async function startCrawl(targets) {
    if (state.running) {
      return { status: 409, body: { error: '이미 크롤링이 진행 중입니다.' } };
    }

    const crawlTargets = targets && targets.length > 0 ? targets : ['게임기획', '신입'];

    state.running = true;
    state.abortController = new AbortController();
    state.log = [];
    state.lastEvent = null;

    void (async () => {
      try {
        const { runCrawler } = await import('../../lib/crawler.js');

        pushEvent({ stage: 'init', message: `크롤링 시작: [${crawlTargets.join(', ')}]`, percent: 0 });

        const result = await runCrawler({
          targets: crawlTargets,
          dataDir,
          signal: state.abortController.signal,
          onProgress: pushEvent,
        });

        const wasCancelled = result.errors.includes('사용자에 의해 중단됨');

        if (result.count > 0) {
          pushEvent({ stage: 'normalize', message: '정규화 처리 중...', percent: 96 });
          try {
            const refinedDir = join(dataDir, 'refined');
            const jobsDir = join(dataDir, 'jobs');
            const { report } = normalizeAll(refinedDir, jobsDir, false);
            pushEvent({ stage: 'normalize', message: `정규화 완료: ${report.success}건`, percent: 98 });
          } catch (normErr) {
            pushEvent({ stage: 'normalize', message: `정규화 오류: ${normErr.message}`, percent: 98 });
          }

          dataLoader.refresh();
          pushEvent({ stage: 'refresh', message: '데이터 캐시 갱신 완료', percent: 99 });
        }

        pushEvent({
          stage: wasCancelled ? 'cancelled' : 'complete',
          message: wasCancelled
            ? `중단됨. ${result.count}건까지 저장했습니다. (오류: ${result.errors.length}건)`
            : `완료! ${result.count}건 수집 (오류: ${result.errors.length}건)`,
          percent: 100,
          result,
        });
      } catch (err) {
        pushEvent({ stage: 'error', message: err.message, percent: 0 });
      } finally {
        state.running = false;
        state.abortController = null;
      }
    })();

    return {
      status: 200,
      body: { success: true, message: `크롤링 시작: [${crawlTargets.join(', ')}]` },
    };
  }

  function attachStream(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');
    res.statusCode = 200;
    res.flushHeaders();
    res.write(': connected\n\n');

    const sendEvent = (data) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    let sentIdx = state.log.length;
    state.log.forEach((evt) => sendEvent(evt));

    const interval = setInterval(() => {
      if (sentIdx < state.log.length) {
        for (let i = sentIdx; i < state.log.length; i += 1) {
          sendEvent(state.log[i]);
        }
        sentIdx = state.log.length;
      }

      if (!res.writableEnded) {
        res.write(': heartbeat\n\n');
      }

      if (!state.running && sentIdx >= state.log.length) {
        clearInterval(interval);
        if (!res.writableEnded) res.end();
      }
    }, 200);

    req.on('close', () => {
      clearInterval(interval);
    });
  }

  function stopCrawl() {
    if (state.running && state.abortController) {
      state.abortController.abort();
      return { success: true, message: '크롤링 중단 요청됨' };
    }

    return { success: false, message: '진행 중인 크롤링이 없습니다.' };
  }

  function getStatus() {
    return {
      running: state.running,
      lastEvent: state.lastEvent,
      logCount: state.log.length,
    };
  }

  return {
    resolveJobByGiNo,
    startCrawl,
    attachStream,
    stopCrawl,
    getStatus,
  };
}
