import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@appdeploy/client': fileURLToPath(new URL('./src/lib/localAppDeploy.ts', import.meta.url)),
    },
  },
  test: {
    // Keep the DOM-heavy instructor journeys within the cloud runner's resources.
    // Test isolation, case time limits, and assertions stay unchanged.
    maxWorkers: 1,
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: [
      ...configDefaults.exclude,
      'src/booking-core/test/booking-engine.test.mjs',
      'src/utils/recurrence/test/pilates-recurrence.test.mjs',
    ],
  },
});
