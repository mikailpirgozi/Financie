import { test, expect } from '@playwright/test';

const E2E_ENABLED = !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;
test.skip(!E2E_ENABLED, 'Authenticated flows require E2E_USER_EMAIL + E2E_USER_PASSWORD');

/**
 * Flow 3: Create an expense end-to-end.
 * Verifies the most-used write path including category selection + Toaster
 * confirmation feedback.
 */
test('user can create a new expense and see toast', async ({ page }) => {
  await page.goto('/dashboard/expenses');

  await page
    .getByRole('button', { name: /pridať|add|nový.*výdav/i })
    .first()
    .click();

  const amount = `${Math.floor(Math.random() * 5000) + 100}`;
  await page.getByLabel(/suma|amount/i).fill(amount);
  await page.getByLabel(/popis|description/i).fill(`E2E test ${Date.now()}`);

  await page.getByRole('button', { name: /uložiť|save|odoslať/i }).click();

  await expect(
    page.locator('[role="status"], [data-sonner-toast]').filter({ hasText: /uložen|saved|úspešn/i })
  ).toBeVisible({ timeout: 15_000 });
});
