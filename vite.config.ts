import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
  plugins: [react()],
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
  },
});
