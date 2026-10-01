import {defineConfig, devices} from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3101);

/**
 * The suite runs against the production build served by the same Node server a
 * reviewer starts with `npm start`.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure'
  },
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome'], viewport: {width: 1440, height: 900}}},
    // Focus handling differs between engines, so the keyboard scenarios also run in Firefox and WebKit.
    {
      name: 'firefox',
      testMatch: /keyboard\.spec\.ts/,
      use: {...devices['Desktop Firefox'], viewport: {width: 1440, height: 900}}
    },
    {
      name: 'webkit',
      testMatch: /keyboard\.spec\.ts/,
      use: {...devices['Desktop Safari'], viewport: {width: 1440, height: 900}}
    }
  ],
  webServer: {
    command: 'npm run build && npm start',
    url: `http://localhost:${port}/api/clients`,
    env: {PORT: String(port)},
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
