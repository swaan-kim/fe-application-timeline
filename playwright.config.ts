import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '4173';
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: process.env.CI ? 'test-results' : '../../work/qa/playwright-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: /reading\.spec\.ts/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testMatch: /reading\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run preview -- --outDir dist-qa --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
