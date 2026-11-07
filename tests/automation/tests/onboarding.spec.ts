import { expect, test } from '../fixtures';

test.describe('first launch', () => {
  test.use({ signedInAs: null });

  test('asks who is using the device before showing anything', async ({ whoAreYou, recipes }) => {
    await whoAreYou.goto();
    await expect(whoAreYou.title).toBeVisible();
    await expect(whoAreYou.person('Cosmin')).toBeVisible();
    await expect(whoAreYou.person('Partner')).toBeVisible();
    await expect(recipes.tab('Recipes')).toBeHidden();
  });

  test('remembers the choice across reloads', async ({ page, whoAreYou, recipes, plan }) => {
    await whoAreYou.goto();
    await whoAreYou.choose('Partner');
    await expect(recipes.title).toBeVisible();

    await page.reload();
    await expect(recipes.title).toBeVisible();
    await expect(whoAreYou.title).toBeHidden();

    await recipes.openTab('Plan');
    await expect(plan.personChip('Partner')).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('tabs', () => {
  test('switch between Recipes, Plan and History', async ({ recipes, plan, history }) => {
    await recipes.goto();
    await expect(recipes.tab('Recipes')).toHaveAttribute('aria-selected', 'true');

    await recipes.openTab('Plan');
    await expect(plan.title).toBeVisible();

    await plan.openTab('History');
    await expect(history.title).toBeVisible();

    await history.openTab('Recipes');
    await expect(recipes.title).toBeVisible();
  });

  test('open directly from a URL', async ({ plan, history }) => {
    await plan.goto();
    await expect(plan.tab('Plan')).toHaveAttribute('aria-selected', 'true');
    await history.goto();
    await expect(history.tab('History')).toHaveAttribute('aria-selected', 'true');
  });
});
