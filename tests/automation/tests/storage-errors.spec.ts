import { expect, failWrites, STORAGE_KEYS, seedStorage, test } from '../fixtures';

test.describe('failed meal saves', () => {
  test('show the app-wide banner and leave the plan unchanged', async ({
    page,
    plan,
    mealPicker,
  }) => {
    await plan.goto();
    await failWrites(page, STORAGE_KEYS.meals);

    await plan.openPicker('breakfast', 'Today');
    await mealPicker.pickRecipe('Sarmale');

    await expect(plan.saveErrorBanner).toBeVisible();
    await expect(plan.meal('breakfast', 'Sarmale')).toBeHidden();
    await expect(plan.emptySlot('breakfast', 'Today')).toBeVisible();
  });

  test('the banner shows on every tab', async ({ page, plan, recipes }) => {
    await plan.goto();
    await failWrites(page, STORAGE_KEYS.meals);
    await plan.ateItButton('lunch', 'Pasta e fagioli').click();
    await expect(plan.saveErrorBanner).toBeVisible();
    await expect(plan.ateItButton('lunch', 'Pasta e fagioli')).toBeVisible();

    await plan.openTab('Recipes');
    await expect(recipes.saveErrorBanner).toBeVisible();
  });
});

test.describe('unreadable saved data', () => {
  test('shows an error instead of the samples, and retries', async ({ page, recipes }) => {
    await seedStorage(page, { recipes: '{not json' });
    await page.goto('/');

    const error = page.getByRole('alert').filter({ hasText: "Couldn't load your data." });
    await expect(error).toBeVisible();
    await expect(recipes.title).toBeHidden();

    await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEYS.recipes);
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(recipes.title).toBeVisible();
  });
});
