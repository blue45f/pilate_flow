import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { pwaBuild } from './scripts/pwa-build';
import { createFreeAiRoutes, createFreeAiService } from './backend/freeAiService';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let localSdkFallback = false;
try {
  require.resolve('@appdeploy/client');
} catch {
  localSdkFallback = true;
}

function createStudioAiServerPlugin(mode: string): Plugin {
  const attachMiddleware = (middlewares: {
    use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void;
  }) => {
    const fileEnv = loadEnv(mode, process.cwd(), '');
    const mergedServerEnv: Record<string, string | undefined> = {
      ...fileEnv,
      ...process.env,
    };
    const service = createFreeAiService({ env: mergedServerEnv });
    const routes = createFreeAiRoutes(service);

    middlewares.use((req, res, next) => {
      const rawUrl = req.url ?? '';
      const parsedUrl = new URL(rawUrl, 'http://localhost');
      if (
        parsedUrl.pathname !== '/api/studio/ai/status' &&
        parsedUrl.pathname !== '/api/studio/ai/assist'
      ) {
        next();
        return;
      }

      const query: Record<string, string> = {};
      parsedUrl.searchParams.forEach((val, key) => {
        query[key] = val;
      });
      const userIdHeader = req.headers['x-studio-user-id'];
      const userId =
        typeof userIdHeader === 'string' && userIdHeader.trim()
          ? userIdHeader.trim()
          : 'local-studio-instructor';

      const sendRouterResponse = (out: {
        statusCode: number;
        headers?: Record<string, string>;
        body: string;
      }) => {
        res.statusCode = out.statusCode;
        if (out.headers) {
          for (const [k, v] of Object.entries(out.headers)) {
            res.setHeader(k, v);
          }
        }
        res.end(out.body);
      };

      if (req.method === 'GET' && parsedUrl.pathname === '/api/studio/ai/status') {
        void routes['GET /api/studio/ai/status']({
          query,
          user: { userId, scope: 'user' },
        }).then(sendRouterResponse);
        return;
      }

      if (req.method === 'POST' && parsedUrl.pathname === '/api/studio/ai/assist') {
        const chunks: Buffer[] = [];
        let totalBytes = 0;
        req.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes <= 512_000) chunks.push(chunk);
        });
        req.on('end', () => {
          let body: unknown;
          try {
            const rawBody = Buffer.concat(chunks).toString('utf8');
            body = rawBody.trim() ? JSON.parse(rawBody) : {};
          } catch {
            sendRouterResponse({
              statusCode: 400,
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'private, no-store',
              },
              body: JSON.stringify({
                error: 'invalid_request',
                code: 'invalid_request',
                message: '요청 본문 JSON 형식을 확인해 주세요.',
              }),
            });
            return;
          }
          void routes['POST /api/studio/ai/assist']({
            query,
            body,
            user: { userId, scope: 'user' },
          }).then(sendRouterResponse);
        });
        return;
      }

      next();
    });
  };

  return {
    name: 'pilates-flow-studio-ai-server',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), pwaBuild(), createStudioAiServerPlugin(mode)],
  resolve: {
    alias: localSdkFallback
      ? {
          '@appdeploy/client': fileURLToPath(
            new URL('./src/lib/localAppDeploy.ts', import.meta.url),
          ),
        }
      : {},
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@firebase/') || id.includes('/node_modules/firebase/')) {
            return 'vendor-firebase';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-lucide';
          }
          return undefined;
        },
      },
    },
  },
}));
