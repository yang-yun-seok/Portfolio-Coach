import { Router } from 'express';

export function createDataRouter({ dataLoader, crawlService }) {
  const router = Router();

  router.get('/api/companies', (req, res) => {
    res.json(dataLoader.getCompanies());
  });

  router.get('/api/companies/:id', (req, res) => {
    const company = dataLoader.getCompanyById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: '기업을 찾을 수 없습니다.' });
    }

    return res.json(company);
  });

  router.get('/api/jobs', (req, res) => {
    const { role, company, skills, minExp, maxExp, query } = req.query;
    const results = dataLoader.searchJobs({ role, company, skills, minExp, maxExp, query });
    res.json(results);
  });

  router.get('/api/jobs/:id', (req, res) => {
    const job = dataLoader.getJobById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: '공고를 찾을 수 없습니다.' });
    }

    return res.json(job);
  });

  router.get('/api/data/status', (req, res) => {
    res.json(dataLoader.getStatus());
  });

  router.post('/api/data/refresh', (req, res) => {
    dataLoader.refresh();
    res.json({ success: true, status: dataLoader.getStatus() });
  });

  router.post('/api/jobs/resolve', async (req, res) => {
    const result = await crawlService.resolveJobByGiNo(req.body?.giNo);
    res.status(result.status).json(result.body);
  });

  return router;
}
