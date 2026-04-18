// Vite dev server starter (Node.js API)
import { createServer } from 'vite';

const PORT = parseInt(process.env.PORT || '4173');

const server = await createServer({
  root: '.',
  server: {
    port: PORT,
    strictPort: true,   // 포트 충돌 시 자동 변경 금지
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
});

await server.listen();
server.printUrls();
