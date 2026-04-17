import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

/**
 * Flow 1: Public marketing pages render and the unauthenticated dashboard
 * redirects to /auth/login. Runs without credentials so it works on every PR.
 */
test.describe('public pages', () => {
  test('landing page renders the hero', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/FinApp/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('login page renders email + password fields', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/heslo|password/i)).toBeVisible();
  });

  test('protected route redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/auth\/login/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
