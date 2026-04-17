import { test, expect } from '@playwright/test';

const E2E_ENABLED = !!process.env.E2E_USER_EMAIL && !!process.env.E2E_USER_PASSWORD;

test.skip(!E2E_ENABLED, 'Authenticated flows require E2E_USER_EMAIL + E2E_USER_PASSWORD');

/**
 * Flow 2: Logged-in dashboard renders with the user's net worth + KPI cards.
 * Catches regressions in the dashboard summary RPC + materialised view wiring.
 */
test('dashboard overview loads with KPI cards', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 });
  await expect(
    page.locator('[data-testid="kpi-net-worth"], text=/čisté\\s*imanie|net\\s*worth/i').first()
  ).toBeVisible();
});
