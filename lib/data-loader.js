import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  JOB_HISTORY_DIR,
  buildPublicJobs,
  isActiveJob,
  isPublicJob,
  listJobHistoryFileNames,
  loadJobHistorySnapshot,
  loadJobMetadata,
  loadJobRecords,
  readJsonFile,
} from './job-catalog.js';

export class DataLoader {
  constructor(basePath) {
    this.basePath = basePath;
    this.configPath = join(basePath, 'config.json');
    this.config = this.loadConfig();
    this.cache = {
      companies: null,
      allJobs: null,
      publicJobs: null,
      jobMetadata: null,
      jobHistoryIndex: null,
      loadedAt: null,
    };
  }

  loadConfig() {
    if (!existsSync(this.configPath)) {
      return { dataSource: 'local', localPath: this.basePath, nasPath: null, refreshInterval: 3600000 };
    }
    return JSON.parse(readFileSync(this.configPath, 'utf-8'));
  }

  isCacheStale() {
    if (!this.cache.loadedAt) return true;
    return Date.now() - this.cache.loadedAt > this.config.refreshInterval;
  }

  loadCompaniesFromDisk() {
    const dir = join(this.basePath, 'companies');
    if (!existsSync(dir)) return [];

    return readdirSync(dir)
      .filter((fileName) => fileName.endsWith('.json') && fileName !== '_index.json')
      .map((fileName) => readJsonFile(join(dir, fileName), null))
      .filter(Boolean);
  }

  loadJobsSnapshot() {
    const jobsDir = join(this.basePath, 'jobs');
    const allJobs = loadJobRecords(jobsDir);
    const publicJobs = buildPublicJobs(allJobs);
    const fallbackLatestDate = publicJobs
      .map((job) => job.updatedAt)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;
    const loadedMetadata = loadJobMetadata(jobsDir);
    const metadata = {
      ...loadedMetadata,
      latestAppliedDate: loadedMetadata.latestAppliedDate || fallbackLatestDate,
      referenceJobCount: publicJobs.length,
      activeJobsCount: allJobs.filter(isActiveJob).length,
      totalManagedJobsCount: allJobs.filter((job) => job.source === 'GameJob' && job.catalogManaged !== false).length,
      lastCrawlStatus: loadedMetadata.lastCrawlStatus === 'idle' && publicJobs.length > 0 ? 'success' : loadedMetadata.lastCrawlStatus,
    };

    return { allJobs, publicJobs, metadata };
  }

  loadJobHistoryIndex() {
    const historyDir = join(this.basePath, JOB_HISTORY_DIR);
    return listJobHistoryFileNames(historyDir).map((fileName) => {
      const date = fileName.replace(/\.json$/, '');
      const snapshot = loadJobHistorySnapshot(historyDir, date);
      return {
        date,
        generatedAt: snapshot?.generatedAt || null,
        referenceJobCount: snapshot?.referenceJobCount || 0,
        newJobsCount: snapshot?.newJobsCount || 0,
        activeJobsCount: snapshot?.activeJobsCount || 0,
        lastCrawlStatus: snapshot?.lastCrawlStatus || 'unknown',
      };
    });
  }

  ensureCompaniesLoaded() {
    if (this.isCacheStale() || !this.cache.companies) {
      this.cache.companies = this.loadCompaniesFromDisk();
      this.cache.loadedAt = Date.now();
    }
    return this.cache.companies;
  }

  ensureJobsLoaded() {
    if (this.isCacheStale() || !this.cache.allJobs || !this.cache.publicJobs || !this.cache.jobMetadata || !this.cache.jobHistoryIndex) {
      const snapshot = this.loadJobsSnapshot();
      this.cache.allJobs = snapshot.allJobs;
      this.cache.publicJobs = snapshot.publicJobs;
      this.cache.jobMetadata = snapshot.metadata;
      this.cache.jobHistoryIndex = this.loadJobHistoryIndex();
      this.cache.loadedAt = Date.now();
    }
  }

  getCompanies() {
    return this.ensureCompaniesLoaded();
  }

  getCompanyById(id) {
    return this.getCompanies().find((company) => company.id === id) || null;
  }

  getCompanyByName(name) {
    return this.getCompanies().find((company) => company.name === name) || null;
  }

  getJobs() {
    this.ensureJobsLoaded();
    return this.cache.publicJobs;
  }

  getAllJobs() {
    this.ensureJobsLoaded();
    return this.cache.allJobs;
  }

  getJobMetadata() {
    this.ensureJobsLoaded();
    return this.cache.jobMetadata;
  }

  getJobHistoryIndex() {
    this.ensureJobsLoaded();
    return this.cache.jobHistoryIndex;
  }

  getJobHistory(date) {
    const historyDir = join(this.basePath, JOB_HISTORY_DIR);
    return loadJobHistorySnapshot(historyDir, date);
  }

  getJobById(id) {
    return this.getAllJobs().find((job) => String(job.id) === String(id)) || null;
  }

  getJobByGiNo(giNo) {
    const targetId = `crawled-${giNo}`;
    return this.getAllJobs().find((job) => job.id === targetId) || null;
  }

  searchJobs(filters = {}) {
    let results = this.getJobs();

    if (filters.role) {
      results = results.filter((job) => job.role === filters.role);
    }

    if (filters.company) {
      results = results.filter((job) => job.company.includes(filters.company));
    }

    if (filters.skills) {
      const skillList = Array.isArray(filters.skills)
        ? filters.skills
        : String(filters.skills)
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean);

      results = results.filter((job) =>
        skillList.some((skill) =>
          (Array.isArray(job.reqSkills) ? job.reqSkills : []).some((required) =>
            required.toLowerCase().includes(skill.toLowerCase()),
          ),
        ),
      );
    }

    if (filters.minExp !== undefined) {
      results = results.filter((job) => job.reqExp >= Number(filters.minExp));
    }

    if (filters.maxExp !== undefined) {
      results = results.filter((job) => job.reqExp <= Number(filters.maxExp));
    }

    if (filters.query) {
      const query = String(filters.query).toLowerCase();
      results = results.filter((job) =>
        job.title.toLowerCase().includes(query)
        || job.company.toLowerCase().includes(query)
        || job.role.toLowerCase().includes(query)
        || (Array.isArray(job.reqSkills) ? job.reqSkills : []).some((skill) => skill.toLowerCase().includes(query)),
      );
    }

    return results;
  }

  getStatus() {
    const companies = this.getCompanies();
    const publicJobs = this.getJobs();
    const allJobs = this.getAllJobs();
    const metadata = this.getJobMetadata();

    return {
      dataSource: this.config.dataSource,
      version: this.config.version,
      nasPath: this.config.nasPath,
      companiesCount: companies.length,
      jobsCount: publicJobs.length,
      totalJobsCount: allJobs.length,
      publicJobsCount: allJobs.filter(isPublicJob).length,
      historySnapshotsCount: this.getJobHistoryIndex().length,
      cacheLoadedAt: this.cache.loadedAt ? new Date(this.cache.loadedAt).toISOString() : null,
      refreshInterval: this.config.refreshInterval,
      crawl: metadata,
    };
  }

  refresh() {
    this.cache = {
      companies: null,
      allJobs: null,
      publicJobs: null,
      jobMetadata: null,
      jobHistoryIndex: null,
      loadedAt: null,
    };
    this.getCompanies();
    this.getJobs();
  }

  async refreshFromNAS() {
    if (!this.config.nasPath) {
      return false;
    }
    return false;
  }
}
