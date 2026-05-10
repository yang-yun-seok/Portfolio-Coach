import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { DataLoader } from './lib/data-loader.js';
import { createAnalysisRouter } from './server/routes/analysis-routes.js';
import { createConfigRouter } from './server/routes/config-routes.js';
import { createDataRouter } from './server/routes/data-routes.js';
import { createCrawlRouter } from './server/routes/crawl-routes.js';
import { createAnalysisService } from './server/services/analysis-service.js';
import { createConfigService } from './server/services/config-service.js';
import { createCrawlService } from './server/services/crawl-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, 'data');
const dataLoader = new DataLoader(dataDir);
const isDev = process.env.NODE_ENV !== 'production';

const configService = createConfigService({
  baseDir: __dirname,
  isDev,
  fetchImpl: fetch,
});

const serverConfig = configService.loadServerConfig();

const app = express();
app.use(cors());
app.use(express.json({ limit: serverConfig.bodyLimit }));

const crawlService = createCrawlService({ dataDir, dataLoader });
const analysisService = createAnalysisService({
  loadPrompts: configService.loadPrompts,
  loadServerConfig: configService.loadServerConfig,
  getProviderConfig: configService.getProviderConfig,
  findModel: configService.findModel,
  fetchWithRetry: configService.fetchWithRetry,
  fetchImpl: fetch,
});

app.use(createAnalysisRouter({ analysisService }));
app.use(createConfigRouter({ configService }));
app.use(createDataRouter({ dataLoader, crawlService }));
app.use(createCrawlRouter({ crawlService }));

const distDir = join(__dirname, 'dist');
const distIndexFile = join(distDir, 'index.html');

if (existsSync(distIndexFile)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(distIndexFile);
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      ok: true,
      service: 'portfolio-coach-api',
      message: 'Frontend is deployed separately. Use the GitHub Pages URL for the web app.',
    });
  });
}

const port = process.env.PORT || serverConfig.port;
const enabledProviders = configService.getEnabledProviders();
configService.loadPrompts();
const dataStatus = dataLoader.getStatus();

app.listen(port, () => {
  console.log('\nGame Career Assistant Backend');
  console.log(`   Backend : http://localhost:${port}`);
  console.log('   Frontend: http://localhost:5173');
  console.log(`   Mode    : ${isDev ? 'development' : 'production'}`);
  console.log(`   Models  : ${enabledProviders.join(', ')}`);
  console.log(`   Data    : companies ${dataStatus.companiesCount}, jobs ${dataStatus.jobsCount} (${dataStatus.dataSource})\n`);
});
