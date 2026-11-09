import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { pwaBuild } from './scripts/pwa-build';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let localSdkFallback = false;
try {
  require.resolve('@appdeploy/client');
} catch {
  localSdkFallback = true;
}

export default defineConfig({
  base: './',
  plugins: [react(), pwaBuild()],
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
});
