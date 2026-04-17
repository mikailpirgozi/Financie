import { test as setup, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const AUTH_FILE = path.join(__dirname, '..', '.playwright', '.auth', 'user.json');

const E2E_EMAIL = process.env.E2E_USER_EMAIL;
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD;

/**
 * One-shot authentication flow. Skips with a clear message when test
 * credentials aren't provided so contributors can still run the suite against
 * a local public-only build (e.g. landing page smoke tests).
 */
setup('authenticate', async ({ page }) => {
  if (!E2E_EMAIL || !E2E_PASSWORD) {
    setup.skip(
      true,
      'E2E_USER_EMAIL / E2E_USER_PASSWORD not set — skipping authenticated suite. Run `E2E_USER_EMAIL=… E2E_USER_PASSWORD=… pnpm e2e` to enable.'
    );
    return;
  }

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill(E2E_EMAIL);
  await page.getByLabel(/heslo|password/i).fill(E2E_PASSWORD);
  await page.getByRole('button', { name: /prihl[áa]sit|log in/i }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.context().storageState({ path: AUTH_FILE });
});
