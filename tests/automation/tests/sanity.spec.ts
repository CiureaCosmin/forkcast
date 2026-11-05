import { expect, test } from '@playwright/test';

test('opens the app and plans a meal that survives a reload', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Cosmin', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();

  await page.getByRole('tab', { name: 'Plan' }).click();
  await page.getByRole('button', { name: 'Plan breakfast, Today' }).click();
  await page.getByRole('button', { name: 'Sarmale', exact: true }).click();

  const meal = page.getByRole('button', { name: 'Breakfast: Sarmale' });
  await expect(meal).toBeVisible();

  await page.reload();
  await expect(meal).toBeVisible();
});
