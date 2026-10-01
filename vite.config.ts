/// <reference types="vitest/config" />

import {fileURLToPath} from 'node:url';
import {defineConfig}  from 'vite';

import react from '@vitejs/plugin-react';

const apiPort = Number(process.env.PORT ?? 3001);

export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        // Libraries change less often than the app; separate chunks cache separately and load in parallel.
        codeSplitting: {
          groups: [
            {name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/},
            {name: 'react-aria', test: /node_modules[\\/](react-aria|react-aria-components|react-stately|@react-aria|@react-stately|@react-types|@internationalized|@swc)[\\/]/},
            {name: 'vendor', test: /node_modules[\\/]/}
          ]
        }
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': `http://localhost:${apiPort}`
    }
  },
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    environment: 'jsdom',
    setupFiles: ['client/src/test/setup.ts'],
    include: ['{client,server,shared}/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['client/src/**/*.{ts,tsx}', 'server/src/**/*.ts', 'shared/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', 'client/src/test/**', 'client/src/main.tsx', 'server/src/node.ts', 'server/src/worker.ts'],
      reporter: ['text', 'html'],
      thresholds: {
        'client/src/lib/**': {100: true}
      }
    }
  }
});
