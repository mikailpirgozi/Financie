import { test, expect } from '@playwright/test';

const E2E_ENABLED = !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;
test.skip(!E2E_ENABLED, 'Authenticated flows require E2E_USER_EMAIL + E2E_USER_PASSWORD');

/**
 * Flow 4: Create a loan and verify the schedule preview renders.
 * Touches the loan engine (annuity calculator) + RPC roundtrip.
 */
test('user can create an annuity loan and see schedule', async ({ page }) => {
  await page.goto('/dashboard/loans');
  await page
    .getByRole('button', { name: /pridať|add|nový.*úver/i })
    .first()
    .click();

  await page.getByLabel(/názov|name/i).fill(`E2E loan ${Date.now()}`);
  await page.getByLabel(/veriteľ|lender/i).fill('E2E Bank');
  await page.getByLabel(/istina|principal/i).fill('100000');
  await page.getByLabel(/úrok|rate/i).fill('3.5');
  await page.getByLabel(/splátky|term|mesiacov/i).fill('120');

  await page.getByRole('button', { name: /uložiť|save|vytvoriť/i }).click();

  await page.waitForURL(/\/dashboard\/loans\/[0-9a-f-]+/, { timeout: 20_000 });
  await expect(page.getByText(/splátkový kalendár|schedule/i).first()).toBeVisible();
});
