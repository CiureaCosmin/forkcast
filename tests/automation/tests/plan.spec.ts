import { daysFromToday, isoDate, shortDate } from '../dates';
import { expect, readSaved, type SavedMeal, STORAGE_KEYS, test } from '../fixtures';

// Sample data for Cosmin: today has Pasta e fagioli for lunch and Mushroom risotto for dinner,
// both planned; tomorrow has Ciorbă de perișoare for dinner. The partner has Chicken shawarma
// bowls for lunch today.

test.beforeEach(async ({ plan }) => {
  await plan.goto();
});

test.describe('plan overview', () => {
  test('shows today and tomorrow with their meals and empty slots', async ({ plan }) => {
    await expect(plan.personChip('Cosmin')).toHaveAttribute('aria-selected', 'true');
    await expect(plan.stripDay(daysFromToday(0))).toHaveAttribute('aria-selected', 'true');
    await expect(plan.dayHeading('Today')).toBeVisible();
    await expect(plan.dayHeading('Tomorrow')).toBeVisible();
    await expect(plan.meal('lunch', 'Pasta e fagioli')).toBeVisible();
    await expect(plan.meal('dinner', 'Mushroom risotto')).toBeVisible();
    await expect(plan.emptySlot('breakfast', 'Today')).toContainText('Plan breakfast');
    await expect(plan.meal('dinner', 'Ciorbă de perișoare')).toBeVisible();
    await expect(plan.reviewHeading).toBeHidden();
  });

  test('the strip runs from yesterday to five days ahead', async ({ plan }) => {
    for (let offset = -1; offset <= 5; offset++) {
      await expect(plan.stripDay(daysFromToday(offset))).toBeVisible();
    }
    await expect(plan.stripDay(daysFromToday(-2))).toBeHidden();
    await expect(plan.stripDay(daysFromToday(6))).toBeHidden();
  });

  test('picking a later day shows it and the day after', async ({ plan }) => {
    const day = daysFromToday(3);
    await plan.pickDay(day);
    await expect(plan.stripDay(day)).toHaveAttribute('aria-selected', 'true');
    await expect(plan.dayHeading(shortDate(day))).toBeVisible();
    await expect(plan.dayHeading(shortDate(daysFromToday(4)))).toBeVisible();
    await expect(plan.dayHeading('Today')).toBeHidden();
    await expect(plan.emptySlot('dinner', shortDate(day))).toContainText('Plan dinner');
  });

  test('picking yesterday shows what was eaten, with Log buttons', async ({ plan }) => {
    await plan.pickDay(daysFromToday(-1));
    await expect(plan.dayHeading('Yesterday')).toBeVisible();
    await expect(plan.meal('lunch', 'Greek salad with feta')).toContainText('Eaten');
    await expect(plan.meal('dinner', 'Pasta e fagioli')).toContainText('Skipped');
    await expect(plan.emptySlot('breakfast', 'Yesterday')).toContainText('Log breakfast');
  });
});

test.describe('marking meals', () => {
  test('"I ate it" on a card marks the meal eaten and counts it in history', async ({
    plan,
    history,
  }) => {
    await plan.ateItButton('lunch', 'Pasta e fagioli').click();
    await expect(plan.meal('lunch', 'Pasta e fagioli')).toBeVisible();
    await expect(plan.ateItButton('lunch', 'Pasta e fagioli')).toBeHidden();
    await expect(plan.mealCard('lunch', 'Pasta e fagioli')).toContainText('Eaten');

    await plan.openTab('History');
    await expect(history.last30Days).toContainText('21');
    await expect(history.entry('Pasta e fagioli, Lunch · eaten')).toBeVisible();
  });

  test('"Skip" marks the meal skipped', async ({ plan, history }) => {
    await plan.skipButton('dinner', 'Mushroom risotto').click();
    await expect(plan.mealCard('dinner', 'Mushroom risotto')).toContainText('Skipped');

    await plan.openTab('History');
    await expect(history.last30Days).toContainText('4 skipped');
  });

  test('the meal screen marks a meal and puts it back to planned', async ({
    page,
    plan,
    mealDetail,
  }) => {
    await plan.openMeal('lunch', 'Pasta e fagioli');
    await expect(mealDetail.title('Pasta e fagioli')).toBeVisible();
    await expect(mealDetail.status('Pasta e fagioli', 'Planned')).toBeVisible();
    await mealDetail.ateItButton.click();

    await expect(plan.ateItButton('lunch', 'Pasta e fagioli')).toBeHidden();
    const saved = await readSaved<SavedMeal>(page, STORAGE_KEYS.meals);
    const today = isoDate(daysFromToday(0));
    const lunch = saved.find((meal) => meal.recipeId === 'pasta-fagioli' && meal.date === today);
    expect(lunch?.status).toBe('eaten');

    await plan.openMeal('lunch', 'Pasta e fagioli');
    await expect(mealDetail.status('Pasta e fagioli', 'Eaten')).toBeVisible();
    await mealDetail.backToPlannedButton.click();
    await expect(plan.ateItButton('lunch', 'Pasta e fagioli')).toBeVisible();
  });

  test('a future meal cannot be marked yet', async ({ plan, mealDetail }) => {
    await plan.openMeal('dinner', 'Ciorbă de perișoare');
    await expect(mealDetail.status('Ciorbă de perișoare', 'Planned')).toBeVisible();
    await expect(mealDetail.ateItButton).toBeHidden();
    await expect(mealDetail.skipButton).toBeHidden();
  });
});

test.describe('adding meals', () => {
  test('plans a recipe for an empty slot', async ({ page, plan, mealPicker }) => {
    await plan.openPicker('breakfast', 'Today');
    await expect(mealPicker.slotHeading()).toHaveText(`Breakfast · ${shortDate(daysFromToday(0))}`);
    await expect(mealPicker.plannedChip).toHaveAttribute('aria-selected', 'true');
    await mealPicker.pickRecipe('Greek salad with feta');

    await expect(plan.meal('breakfast', 'Greek salad with feta')).toBeVisible();
    await expect(plan.ateItButton('breakfast', 'Greek salad with feta')).toBeVisible();
    await page.reload();
    await expect(plan.meal('breakfast', 'Greek salad with feta')).toBeVisible();
  });

  test('logs a meal that was already eaten today', async ({ plan, mealPicker }) => {
    await plan.openPicker('breakfast', 'Today');
    await mealPicker.alreadyEatenChip.click();
    await expect(mealPicker.alreadyEatenChip).toHaveAttribute('aria-selected', 'true');
    await mealPicker.pickRecipe('Sarmale');

    await expect(plan.meal('breakfast', 'Sarmale')).toBeVisible();
    await expect(plan.ateItButton('breakfast', 'Sarmale')).toBeHidden();
  });

  test('logs a quick meal with one tap', async ({ plan, mealPicker, history }) => {
    await plan.openPicker('breakfast', 'Today');
    await mealPicker.alreadyEatenChip.click();
    await mealPicker.pickQuickMeal('Takeout');
    await expect(plan.meal('breakfast', 'Takeout')).toBeVisible();

    await plan.openTab('History');
    await expect(history.entry('Takeout, Breakfast · eaten')).toBeVisible();
  });

  test('a second meal can join a filled slot', async ({ plan, mealPicker }) => {
    await plan.addToSlot('lunch', 'Today').click();
    await mealPicker.pickQuickMeal('Quick bite');
    await expect(plan.meal('lunch', 'Pasta e fagioli')).toBeVisible();
    await expect(plan.meal('lunch', 'Quick bite')).toBeVisible();
  });

  test('a meal logged for yesterday is eaten, with no planned option', async ({
    plan,
    mealPicker,
  }) => {
    await plan.pickDay(daysFromToday(-1));
    await plan.openPicker('breakfast', 'Yesterday');
    await expect(mealPicker.plannedChip).toBeHidden();
    await expect(mealPicker.alreadyEatenChip).toBeHidden();
    await mealPicker.pickRecipe('Mushroom risotto');
    await expect(plan.meal('breakfast', 'Mushroom risotto')).toContainText('Eaten');
  });

  test('plans a meal for a later day', async ({ plan, mealPicker }) => {
    const day = daysFromToday(2);
    await plan.pickDay(day);
    await plan.openPicker('lunch', shortDate(day));
    await mealPicker.pickRecipe('Sarmale');
    await expect(plan.meal('lunch', 'Sarmale')).toContainText('3 h');
  });

  test('the picker searches recipes', async ({ plan, mealPicker }) => {
    await plan.openPicker('breakfast', 'Today');
    await mealPicker.searchFor('RIS');
    await expect(mealPicker.recipe('Mushroom risotto')).toBeVisible();
    await expect(mealPicker.recipe('Sarmale')).toBeHidden();

    await mealPicker.searchFor('lasagne');
    await expect(mealPicker.noMatches).toBeVisible();
  });

  test('a broken picker link says so', async ({ mealPicker }) => {
    await mealPicker.goto({ date: 'someday', mealType: 'brunch' });
    await expect(mealPicker.invalidLink).toBeVisible();
  });
});

test.describe('meal actions', () => {
  test('copies a meal to the partner, as their own planned meal', async ({ plan, mealDetail }) => {
    await plan.openMeal('lunch', 'Pasta e fagioli');
    await mealDetail.copyTo('Partner').click();

    await plan.viewPerson('Partner');
    await expect(plan.readOnlyMeal('lunch', 'Pasta e fagioli')).toBeVisible();
    await expect(plan.readOnlyMeal('lunch', 'Chicken shawarma bowls')).toBeVisible();

    // Once the partner has it, it can't be copied twice.
    await plan.viewPerson('Cosmin');
    await plan.openMeal('lunch', 'Pasta e fagioli');
    await expect(mealDetail.title('Pasta e fagioli')).toBeVisible();
    await expect(mealDetail.copyTo('Partner')).toBeHidden();
  });

  test('plans leftovers for the next day', async ({ plan, mealDetail }) => {
    await plan.openMeal('dinner', 'Mushroom risotto');
    await expect(mealDetail.leftoversLabel).toHaveText(
      `Leftovers on ${shortDate(daysFromToday(1))}`,
    );
    await mealDetail.leftoverSlot('Lunch').click();

    const leftovers = plan.meal('lunch', 'Mushroom risotto');
    await expect(leftovers).toContainText('Leftovers');

    await plan.openMeal('lunch', 'Mushroom risotto');
    await expect(mealDetail.status('Mushroom risotto', 'Planned · Leftovers')).toBeVisible();
  });

  test('quick meals offer no leftovers', async ({ plan, mealPicker, mealDetail }) => {
    await plan.openPicker('breakfast', 'Today');
    await mealPicker.pickQuickMeal('Eating out');
    await plan.openMeal('breakfast', 'Eating out');
    await expect(mealDetail.title('Eating out')).toBeVisible();
    await expect(mealDetail.leftoversLabel).toBeHidden();
  });

  test('removes a meal after confirming', async ({ plan, mealDetail }) => {
    await plan.openMeal('dinner', 'Mushroom risotto');
    const message = await mealDetail.remove({ confirm: false });
    expect(message).toContain('Remove Mushroom risotto?');
    await expect(mealDetail.title('Mushroom risotto')).toBeVisible();

    await mealDetail.remove({ confirm: true });
    await expect(plan.meal('dinner', 'Mushroom risotto')).toBeHidden();
    await expect(plan.emptySlot('dinner', 'Today')).toBeVisible();
  });

  test('a removed meal link says it no longer exists', async ({ page, mealDetail }) => {
    await page.goto('/meal/not-a-meal');
    await expect(mealDetail.notFound).toBeVisible();
  });
});

test.describe("the partner's plan", () => {
  test('is read-only', async ({ plan }) => {
    await plan.viewPerson('Partner');
    await expect(plan.readOnlyMeal('lunch', 'Chicken shawarma bowls')).toBeVisible();
    await expect(plan.meal('lunch', 'Chicken shawarma bowls')).toHaveCount(0);
    await expect(plan.emptySlot('breakfast', 'Today')).toHaveCount(0);
    await expect(plan.addToSlot('lunch', 'Today')).toHaveCount(0);
    await expect(plan.page.getByRole('button', { name: 'I ate it' })).toHaveCount(0);
  });

  test('"Not Cosmin? Switch" hands the device to the partner', async ({ page, plan }) => {
    await plan.switchDeviceOwner('Partner').click();
    await expect(plan.personChip('Partner')).toHaveAttribute('aria-selected', 'true');
    await expect(plan.meal('lunch', 'Chicken shawarma bowls')).toBeVisible();
    await expect(plan.switchDeviceOwner('Cosmin')).toBeVisible();

    await page.reload();
    await expect(plan.personChip('Partner')).toHaveAttribute('aria-selected', 'true');
  });
});
