import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for FinApp web E2E tests.
 *
 * Locally: assumes the dev server is up on http://localhost:3060 (matches the
 * `dev` script in apps/web/package.json). In CI we let Playwright start it via
 * `webServer` so a single `pnpm e2e` boots everything.
 *
 * Auth: tests are split into two projects — `setup` performs a one-time login
 * (or skips when E2E_BASE_URL points to a no-auth env) and stores the session
 * cookies in `.auth/user.json`. All other projects reuse that storage state so
 * the auth flow itself is exercised once per run.
 */

const PORT = process.env.PORT ?? '3060';
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: '.playwright/results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.playwright/.auth/user.json',
      },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: `pnpm --filter @finapp/web dev`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
