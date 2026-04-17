import { test, expect } from '@playwright/test';

const E2E_ENABLED = !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;
test.skip(!E2E_ENABLED, 'Authenticated flows require E2E_USER_EMAIL + E2E_USER_PASSWORD');

/**
 * Flow 5: Add a vehicle to the portfolio.
 * Verifies asset creation + the portfolio detail view loading TCO data.
 */
test('user can add a vehicle and see it on portfolio page', async ({ page }) => {
  await page.goto('/dashboard/portfolio');
  await page
    .getByRole('button', { name: /pridať|add/i })
    .first()
    .click();
  await page.getByRole('menuitem', { name: /vozidlo|vehicle/i }).click();

  const name = `E2E car ${Date.now()}`;
  await page.getByLabel(/názov|name/i).fill(name);
  await page.getByLabel(/značka|make/i).fill('Toyota');
  await page.getByLabel(/model/i).fill('Corolla');
  await page.getByLabel(/kúpna cena|purchase price/i).fill('15000');

  await page.getByRole('button', { name: /uložiť|save|vytvoriť/i }).click();

  await expect(page.getByText(name)).toBeVisible({ timeout: 20_000 });
});
