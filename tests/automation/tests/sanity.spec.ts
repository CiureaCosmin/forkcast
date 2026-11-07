import { expect, test } from '../fixtures';

test.use({ signedInAs: null });

test('opens the app and plans a meal that survives a reload', async ({
  page,
  whoAreYou,
  recipes,
  plan,
  mealPicker,
}) => {
  await whoAreYou.goto();
  await whoAreYou.choose('Cosmin');
  await expect(recipes.title).toBeVisible();

  await recipes.openTab('Plan');
  await plan.openPicker('breakfast', 'Today');
  await mealPicker.pickRecipe('Sarmale');

  const meal = plan.meal('breakfast', 'Sarmale');
  await expect(meal).toBeVisible();

  await page.reload();
  await expect(meal).toBeVisible();
});
