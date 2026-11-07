import { daysFromToday, isoDate } from '../dates';
import { expect, personId, type SavedMeal, seedStorage, test } from '../fixtures';

const unmarked = (id: string, recipeId: string, daysAgo: number): SavedMeal => ({
  id,
  personId: personId('Cosmin'),
  recipeId,
  date: isoDate(daysFromToday(-daysAgo)),
  mealType: 'dinner',
  status: 'planned',
  isLeftovers: false,
  updatedAt: '2026-11-01T00:00:00.000Z',
});

test.beforeEach(async ({ page, plan }) => {
  await seedStorage(page, {
    meals: [unmarked('old-sarmale', 'sarmale', 3), unmarked('old-risotto', 'risotto', 2)],
  });
  await plan.goto();
});

test('asks about past meals nobody marked, and keeps them out of history', async ({
  plan,
  history,
}) => {
  await expect(plan.reviewHeading).toBeVisible();
  await expect(plan.reviewYes('Sarmale')).toBeVisible();
  await expect(plan.reviewYes('Mushroom risotto')).toBeVisible();

  await plan.openTab('History');
  await expect(history.nothingLogged).toBeVisible();
});

test('"Yes" logs the meal as eaten', async ({ plan, history }) => {
  await plan.reviewYes('Sarmale').click();
  await expect(plan.reviewYes('Sarmale')).toBeHidden();
  await expect(plan.reviewHeading).toBeVisible();

  await plan.openTab('History');
  await expect(history.entry('Sarmale, Dinner · eaten')).toBeVisible();
  await expect(history.last30Days).toContainText('1');
});

test('"No" logs it as skipped, and the list goes once it is empty', async ({ plan, history }) => {
  await plan.reviewNo('Sarmale').click();
  await plan.reviewNo('Mushroom risotto').click();
  await expect(plan.reviewHeading).toBeHidden();

  await plan.openTab('History');
  await expect(history.entry('Sarmale, Dinner · skipped')).toBeVisible();
  await expect(history.last30Days).toContainText('2 skipped');
});

test("isn't shown on the partner's plan", async ({ plan }) => {
  await plan.viewPerson('Partner');
  await expect(plan.reviewHeading).toBeHidden();
});
