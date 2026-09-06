import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { applicationContentPlugin } from './build/application-content-plugin.ts';
import { qaSnapshot } from './src/test/fixtures/application.ts';
import { detailEntryPlugin } from './build/detail-entry-plugin.ts';

export default defineConfig(({ command, mode }) => ({
  base: process.env.BASE_URL ?? '/',
  resolve: {
    alias:
      mode === 'test'
        ? [
            {
              find: /.*\/content\/application\.config(?:\.ts)?$/u,
              replacement: path.resolve(import.meta.dirname, 'src/test/fixtures/config.ts'),
            },
          ]
        : [],
  },
  build: { outDir: mode === 'test' ? 'dist-qa' : 'dist' },
  plugins: [
    detailEntryPlugin(import.meta.dirname),
    applicationContentPlugin({
      rootDir: import.meta.dirname,
      includeDrafts: command === 'serve' || mode === 'test',
      snapshot: mode === 'test' ? qaSnapshot : undefined,
    }),
    react(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    restoreMocks: true,
    exclude: ['e2e/**', '**/node_modules/**', '**/dist/**', '**/dist-qa/**'],
  },
}));
