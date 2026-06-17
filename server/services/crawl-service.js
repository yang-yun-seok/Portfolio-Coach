import { join } from 'path';
import { runCrawler } from '../../lib/crawler.js';
import { buildPublicJobs, loadJobRecords } from '../../lib/job-catalog.js';
import { normalizeJob } from '../../lib/job-normalizer.js';
import {
  DAILY_GAMEJOB_CAREER_TAGS,
  DAILY_GAMEJOB_JOB_TAGS,
  DAILY_GAMEJOB_TARGETS,
  appendDailyHistorySnapshot,
  assertManagedCrawlHasResults,
  crawlGameJobPostings,
  persistResolvedJobPosting,
  updateCrawlingMetadata,
  upsertJobPostings,
} from './gamejob-daily-crawling.js';

function getJobsDir(dataDir) {
  return join(dataDir, 'jobs');
}

function normalizeTargets(targets) {
  if (!Array.isArray(targets)) return [];
  return [...new Set(targets.map((target) => String(target || '').trim()).filter(Boolean))];
}

function hasSameTargets(left, right) {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return right.every((target) => leftSet.has(target));
}

function getCatalogFiltersForTargets(targets) {
  const targetSet = new Set(targets);
  return {
    jobTags: DAILY_GAMEJOB_JOB_TAGS.filter((tag) => targetSet.has(tag)),
    careerTags: DAILY_GAMEJOB_CAREER_TAGS.filter((tag) => targetSet.has(tag)),
  };
}

function isManagedCatalogSync(targets) {
  return targets.length === 0 || hasSameTargets(targets, DAILY_GAMEJOB_TARGETS);
}

function getManagedCatalogFilters() {
  return {
    jobTags: DAILY_GAMEJOB_JOB_TAGS,
    careerTags: DAILY_GAMEJOB_CAREER_TAGS,
  };
}

function buildExistingJobsForTargets(dataDir, targets) {
  const filters = getCatalogFiltersForTargets(targets);
  return buildPublicJobs(loadJobRecords(getJobsDir(dataDir)), filters);
}

function buildStartMessage(targets) {
  return `크롤링 시작: [${targets.join(', ')}]`;
}

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
      return { status: 400, body: { error: 'giNo(공고 번호)가 필요합니다.' } };
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
            error: crawlResult.error || `공고 ${cleanGiNo}를 찾을 수 없습니다.`,
          },
        };
      }

      const normalizedJob = crawlResult.normalizedJob || normalizeJob(crawlResult.refinedData);
      const persistedJob = persistResolvedJobPosting({ dataDir, job: normalizedJob });
      dataLoader.refresh();
      return { status: 200, body: { found: true, source: 'crawled', job: persistedJob } };
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

    const requestedTargets = normalizeTargets(targets);
    const managedSync = isManagedCatalogSync(requestedTargets);
    const crawlTargets = managedSync ? DAILY_GAMEJOB_TARGETS : requestedTargets;

    state.running = true;
    state.abortController = new AbortController();
    state.log = [];
    state.lastEvent = null;

    void (async () => {
      try {
        pushEvent({ stage: 'init', message: buildStartMessage(crawlTargets), percent: 0 });

        const result = managedSync
          ? await crawlGameJobPostings({
              dataDir,
              signal: state.abortController.signal,
              onProgress: pushEvent,
            })
          : await runCrawler({
              targets: crawlTargets,
              dataDir,
              signal: state.abortController.signal,
              onProgress: pushEvent,
              existingJobs: buildExistingJobsForTargets(dataDir, crawlTargets),
            });

        const wasCancelled = result.success === false;

        if (!wasCancelled) {
          if (managedSync) {
            assertManagedCrawlHasResults(result);
          }

          pushEvent({ stage: 'normalize', message: '공개 공고 데이터를 반영하는 중입니다.', percent: 96 });

          const finishedAt = result.finishedAt || new Date().toISOString();
          const filters = result.filters || (managedSync ? getManagedCatalogFilters() : getCatalogFiltersForTargets(crawlTargets));
          const upsertResult = upsertJobPostings({
            dataDir,
            crawledJobs: result.jobs || [],
            crawlFinishedAt: finishedAt,
            listedJobIds: result.listedJobIds || [],
            removeMissingManagedJobs: managedSync,
            filters,
          });

          if (managedSync) {
            const metadata = updateCrawlingMetadata({
              dataDir,
              crawlResult: {
                ...result,
                finishedAt,
                errors: result.errors || [],
                filters,
              },
              upsertResult,
            });
            appendDailyHistorySnapshot({
              dataDir,
              crawlFinishedAt: finishedAt,
              publicJobs: upsertResult.publicJobs,
              metadata,
            });
          }

          pushEvent({
            stage: 'normalize',
            message: managedSync
              ? `데이터 반영 완료: 기존 ${upsertResult.previousReferenceJobCount}건, 현재 ${upsertResult.referenceJobCount}건, 신규 ${upsertResult.newJobsCount}건, 삭제 ${upsertResult.deletedJobsCount}건`
              : `부분 반영 완료: 신규 ${upsertResult.newJobsCount}건, 유지 ${upsertResult.jobs.length}건`,
            percent: 98,
          });

          dataLoader.refresh();
          pushEvent({ stage: 'refresh', message: '데이터 캐시를 새로고침했습니다.', percent: 99 });
        }

        pushEvent({
          stage: wasCancelled ? 'cancelled' : 'complete',
          message: wasCancelled
            ? `크롤링이 중단되었습니다. ${result.count}건까지 확보했습니다.`
            : `크롤링 완료: 목록 ${result.listedJobIds?.length || result.count}건, 저장 ${result.count}건, 오류 ${(result.errors || []).length}건`,
          percent: 100,
          result,
        });
      } catch (err) {
        if (managedSync) {
          try {
            updateCrawlingMetadata({
              dataDir,
              error: err,
              crawlResult: {
                finishedAt: new Date().toISOString(),
                filters: getManagedCatalogFilters(),
              },
            });
            dataLoader.refresh();
          } catch (metadataError) {
            console.error('[crawl-service] failed to persist crawl error metadata:', metadataError.message);
          }
        }
        pushEvent({ stage: 'error', message: err.message, percent: 0 });
      } finally {
        state.running = false;
        state.abortController = null;
      }
    })();

    return {
      status: 200,
      body: { success: true, message: buildStartMessage(crawlTargets) },
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
      return { success: true, message: '크롤링 중단을 요청했습니다.' };
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
