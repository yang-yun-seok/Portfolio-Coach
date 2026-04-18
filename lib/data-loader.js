import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * DataLoader — 외부 데이터 디렉토리에서 기업/공고 데이터를 로드하고 캐싱·검색하는 클래스.
 *
 * 현재: 로컬 파일 시스템 (data/ 디렉토리)
 * 향후: NAS 동기화 확장 가능 (config.nasPath 설정 시)
 */
export class DataLoader {
  constructor(basePath) {
    this.basePath = basePath;
    this.configPath = join(basePath, 'config.json');
    this.config = this._loadConfig();
    this.cache = {
      companies: null,
      jobs: null,
      loadedAt: null,
    };
  }

  // ── 설정 ────────────────────────────────────────────────────────────
  _loadConfig() {
    if (!existsSync(this.configPath)) {
      console.warn('[DataLoader] config.json 없음, 기본값 사용');
      return { dataSource: 'local', localPath: this.basePath, nasPath: null, refreshInterval: 3600000 };
    }
    return JSON.parse(readFileSync(this.configPath, 'utf-8'));
  }

  _isCacheStale() {
    if (!this.cache.loadedAt) return true;
    return Date.now() - this.cache.loadedAt > this.config.refreshInterval;
  }

  // ── 기업 데이터 ────────────────────────────────────────────────────
  _loadCompaniesFromDisk() {
    const dir = join(this.basePath, 'companies');
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== '_index.json');
    return files.map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), 'utf-8'));
      } catch (err) {
        console.error(`[DataLoader] 기업 파일 로드 오류: ${f}`, err.message);
        return null;
      }
    }).filter(Boolean);
  }

  getCompanies() {
    if (this._isCacheStale() || !this.cache.companies) {
      this.cache.companies = this._loadCompaniesFromDisk();
      this.cache.loadedAt = Date.now();
    }
    return this.cache.companies;
  }

  getCompanyById(id) {
    return this.getCompanies().find((c) => c.id === id) || null;
  }

  getCompanyByName(name) {
    return this.getCompanies().find((c) => c.name === name) || null;
  }

  // ── 공고 데이터 ────────────────────────────────────────────────────
  _loadJobsFromDisk() {
    const dir = join(this.basePath, 'jobs');
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== '_index.json');
    return files.map((f) => {
      try {
        return JSON.parse(readFileSync(join(dir, f), 'utf-8'));
      } catch (err) {
        console.error(`[DataLoader] 공고 파일 로드 오류: ${f}`, err.message);
        return null;
      }
    }).filter(Boolean);
  }

  getJobs() {
    if (this._isCacheStale() || !this.cache.jobs) {
      this.cache.jobs = this._loadJobsFromDisk();
      if (!this.cache.loadedAt) this.cache.loadedAt = Date.now();
    }
    return this.cache.jobs;
  }

  getJobById(id) {
    return this.getJobs().find((j) => j.id === Number(id)) || null;
  }

  /**
   * GameJob GI_No로 공고 검색 (crawled-XXXXXX 형태의 id 또는 url에 포함된 번호)
   * @param {string} giNo - GameJob 공고 번호 (예: '258667')
   * @returns {object|null}
   */
  getJobByGiNo(giNo) {
    const targetId = `crawled-${giNo}`;
    return this.getJobs().find((j) => j.id === targetId) || null;
  }

  /**
   * 공고 검색/필터링
   * @param {Object} filters - { role, company, skills, minExp, maxExp, query }
   */
  searchJobs(filters = {}) {
    let results = this.getJobs();

    if (filters.role) {
      results = results.filter((j) => j.role === filters.role);
    }

    if (filters.company) {
      results = results.filter((j) => j.company.includes(filters.company));
    }

    if (filters.skills) {
      const skillList = Array.isArray(filters.skills) ? filters.skills : filters.skills.split(',').map((s) => s.trim());
      results = results.filter((j) =>
        skillList.some((skill) =>
          j.reqSkills.some((rs) => rs.toLowerCase().includes(skill.toLowerCase()))
        )
      );
    }

    if (filters.minExp !== undefined) {
      results = results.filter((j) => j.reqExp >= Number(filters.minExp));
    }

    if (filters.maxExp !== undefined) {
      results = results.filter((j) => j.reqExp <= Number(filters.maxExp));
    }

    if (filters.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.role.toLowerCase().includes(q) ||
          j.reqSkills.some((s) => s.toLowerCase().includes(q))
      );
    }

    return results;
  }

  // ── 데이터 소스 상태 ──────────────────────────────────────────────
  getStatus() {
    const companies = this.getCompanies();
    const jobs = this.getJobs();
    return {
      dataSource: this.config.dataSource,
      version: this.config.version,
      nasPath: this.config.nasPath,
      companiesCount: companies.length,
      jobsCount: jobs.length,
      cacheLoadedAt: this.cache.loadedAt ? new Date(this.cache.loadedAt).toISOString() : null,
      refreshInterval: this.config.refreshInterval,
    };
  }

  // ── 캐시 강제 리프레시 ────────────────────────────────────────────
  refresh() {
    this.cache = { companies: null, jobs: null, loadedAt: null };
    this.getCompanies();
    this.getJobs();
    console.log('[DataLoader] 캐시 리프레시 완료');
  }

  // ── NAS 연동 스텁 (향후 구현) ─────────────────────────────────────
  async refreshFromNAS() {
    if (!this.config.nasPath) {
      console.warn('[DataLoader] nasPath가 설정되지 않았습니다.');
      return false;
    }
    // TODO: NAS 동기화 로직 구현
    // 1. nasPath에서 파일 목록 읽기
    // 2. localPath에 동기화 (새 파일 복사, 업데이트된 파일 덮어쓰기)
    // 3. 캐시 리프레시
    console.log('[DataLoader] NAS 동기화 스텁 호출됨 — 아직 미구현');
    return false;
  }
}
