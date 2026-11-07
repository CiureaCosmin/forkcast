import { expect, failWrites, readSaved, STORAGE_KEYS, seedStorage, test } from '../fixtures';

const sampleRecipe = (id: string, name: string, ingredients: string[]) => ({
  id,
  name,
  tags: [],
  ingredients: ingredients.map((ingredient) => ({ name: ingredient })),
  steps: [],
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
});

test.describe('recipe list', () => {
  test.beforeEach(async ({ recipes }) => {
    await recipes.goto();
  });

  test('shows the sample recipes with their stats', async ({ recipes }) => {
    await expect(recipes.subtitle).toHaveText('6 saved by your household');
    await expect(recipes.rows).toHaveCount(6);
    await expect(recipes.row('Sarmale')).toContainText('3 h · Weekend');
    await expect(recipes.row('Ciorbă de perișoare')).toContainText(/Eaten 9× · last/);
  });

  test('searches by name, ignoring case', async ({ recipes }) => {
    await recipes.searchFor('RISOTTO');
    await expect(recipes.rows).toHaveCount(1);
    await expect(recipes.row('Mushroom risotto')).toBeVisible();
  });

  test('says when nothing matches the search', async ({ recipes }) => {
    await recipes.searchFor('lasagne');
    await expect(recipes.rows).toHaveCount(0);
    await expect(recipes.noMatches).toBeVisible();
  });

  test('filters by tag, and All clears the filter', async ({ recipes }) => {
    await recipes.filterByTag('Soup');
    await expect(recipes.tagChip('Soup')).toHaveAttribute('aria-selected', 'true');
    await expect(recipes.rows).toHaveCount(2);
    await expect(recipes.row('Ciorbă de perișoare')).toBeVisible();
    await expect(recipes.row('Pasta e fagioli')).toBeVisible();

    await recipes.filterByTag('All');
    await expect(recipes.rows).toHaveCount(6);
  });

  test('combines search and tag filter', async ({ recipes }) => {
    await recipes.filterByTag('Quick');
    await recipes.searchFor('salad');
    await expect(recipes.rows).toHaveCount(1);
    await expect(recipes.row('Greek salad with feta')).toBeVisible();
  });

  test('opens a recipe', async ({ recipes, recipeDetail }) => {
    await recipes.openRecipe('Sarmale');
    await expect(recipeDetail.title('Sarmale')).toBeVisible();
    await expect(recipeDetail.text('3 h · Weekend')).toBeVisible();
    await expect(recipeDetail.text(/^Eaten 4× · last/)).toBeVisible();
  });
});

test.describe('adding a recipe', () => {
  test.beforeEach(async ({ recipes }) => {
    await recipes.goto();
    await recipes.startNewRecipe();
  });

  test('saves every field and shows it in the list and detail', async ({
    page,
    recipes,
    recipeForm,
    recipeDetail,
  }) => {
    await recipeForm.fill({
      name: 'Shakshuka',
      description: 'Eggs in spicy tomato sauce',
      prepMinutes: '25',
      newTags: ['Breakfast'],
      ingredients: ['Eggs', 'Tomatoes', 'Peppers'],
      steps: ['Soften the peppers', 'Add the tomatoes', 'Poach the eggs'],
    });
    await recipeForm.toggleTag('Vegetarian');
    await recipeForm.save();

    await expect(recipes.subtitle).toHaveText('7 saved by your household');
    await expect(recipes.row('Shakshuka')).toContainText('25 min · Breakfast · Vegetarian');
    await expect(recipes.row('Shakshuka')).toContainText('Not eaten yet');

    await page.reload();
    await recipes.openRecipe('Shakshuka');
    await expect(recipeDetail.title('Shakshuka')).toBeVisible();
    await expect(recipeDetail.text('Eggs in spicy tomato sauce')).toBeVisible();
    await expect(recipeDetail.ingredientsHeading).toBeVisible();
    await expect(recipeDetail.text('Tomatoes')).toBeVisible();
    await expect(recipeDetail.stepsHeading).toBeVisible();
    await expect(recipeDetail.text('3. Poach the eggs')).toBeVisible();
  });

  test('needs only a name', async ({ recipes, recipeForm, recipeDetail }) => {
    await recipeForm.fill({ name: 'Toast' });
    await recipeForm.save();
    await recipes.openRecipe('Toast');
    await expect(recipeDetail.title('Toast')).toBeVisible();
    await expect(recipeDetail.ingredientsHeading).toBeHidden();
    await expect(recipeDetail.stepsHeading).toBeHidden();
  });

  test('refuses to save without a name', async ({ page, recipeForm }) => {
    await recipeForm.fill({ description: 'No name yet' });
    await recipeForm.save();
    await expect(recipeForm.nameError).toBeVisible();
    await expect(recipeForm.saveButton).toBeVisible();
    expect(await readSaved(page, STORAGE_KEYS.recipes)).toHaveLength(0);
  });

  test('refuses a prep time that is not a number', async ({ recipeForm }) => {
    await recipeForm.fill({ name: 'Soup', prepMinutes: 'soon' });
    await recipeForm.save();
    await expect(recipeForm.prepMinutesError).toBeVisible();
    await expect(recipeForm.saveButton).toBeVisible();
  });

  test('cancels without asking when nothing was typed', async ({ recipes, recipeForm }) => {
    await recipeForm.cancel();
    await expect(recipes.title).toBeVisible();
  });

  test('asks before discarding typed changes', async ({ recipes, recipeForm }) => {
    await recipeForm.fill({ name: 'Half-typed' });

    const kept = recipeForm.answerNextConfirm(false);
    await recipeForm.cancel();
    expect(await kept).toContain('Discard changes?');
    await expect(recipeForm.name).toHaveValue('Half-typed');

    const discarded = recipeForm.answerNextConfirm(true);
    await recipeForm.cancel();
    await discarded;
    await expect(recipes.title).toBeVisible();
    await expect(recipes.row('Half-typed')).toBeHidden();
  });

  test('shows an error and stays open when the save fails', async ({ page, recipeForm }) => {
    await failWrites(page, STORAGE_KEYS.recipes);
    await recipeForm.fill({ name: 'Doomed' });
    await recipeForm.save();
    await expect(recipeForm.saveError).toBeVisible();
    await expect(recipeForm.name).toHaveValue('Doomed');
  });
});

test.describe('editing and deleting', () => {
  test.beforeEach(async ({ recipes }) => {
    await recipes.goto();
  });

  test('edits a recipe', async ({ recipes, recipeDetail, recipeForm }) => {
    await recipes.openRecipe('Sarmale');
    await recipeDetail.edit();
    await expect(recipeForm.name).toHaveValue('Sarmale');
    await expect(recipeForm.prepMinutes).toHaveValue('180');

    await recipeForm.fill({ name: 'Sarmale cu mămăligă', prepMinutes: '200' });
    await recipeForm.save();

    await expect(recipeDetail.title('Sarmale cu mămăligă')).toBeVisible();
    await expect(recipeDetail.text('3 h 20 min · Weekend')).toBeVisible();
  });

  test('keeps the recipe when the delete is cancelled', async ({ recipes, recipeDetail }) => {
    await recipes.openRecipe('Sarmale');
    const message = await recipeDetail.delete({ confirm: false });
    expect(message).toContain('Delete Sarmale?');
    await expect(recipeDetail.title('Sarmale')).toBeVisible();
  });

  test('archives a recipe that has meals, keeping its history', async ({
    page,
    recipes,
    recipeDetail,
    history,
  }) => {
    await recipes.openRecipe('Greek salad with feta');
    await recipeDetail.delete({ confirm: true });

    await expect(recipes.title).toBeVisible();
    await expect(recipes.row('Greek salad with feta')).toBeHidden();
    await expect(recipes.subtitle).toHaveText('5 saved by your household');

    const saved = await readSaved<{ id: string; archivedAt?: string }>(page, STORAGE_KEYS.recipes);
    expect(saved.find((recipe) => recipe.id === 'greek-salad')?.archivedAt).toBeTruthy();

    await recipes.openTab('History');
    await expect(history.entry('Greek salad with feta, Lunch · eaten').first()).toBeVisible();
  });

  test('removes a recipe with no meals outright', async ({
    page,
    recipes,
    recipeForm,
    recipeDetail,
  }) => {
    await recipes.startNewRecipe();
    await recipeForm.fill({ name: 'Never cooked' });
    await recipeForm.save();

    await recipes.openRecipe('Never cooked');
    await recipeDetail.delete({ confirm: true });
    await expect(recipes.row('Never cooked')).toBeHidden();

    const saved = await readSaved<{ name: string }>(page, STORAGE_KEYS.recipes);
    expect(saved.map((recipe) => recipe.name)).not.toContain('Never cooked');
  });

  test('a deleted recipe link shows that it no longer exists', async ({ recipeDetail }) => {
    await recipeDetail.goto('does-not-exist');
    await expect(recipeDetail.notFound).toBeVisible();
  });
});

test.describe('recipe list details', () => {
  test('searches ingredients too', async ({ page, recipes }) => {
    await seedStorage(page, {
      recipes: [
        sampleRecipe('shakshuka', 'Shakshuka', ['Eggs', 'Tomatoes']),
        sampleRecipe('pancakes', 'Pancakes', ['Flour', 'Eggs', 'Milk']),
      ],
    });
    await recipes.goto();
    await recipes.searchFor('tomato');
    await expect(recipes.rows).toHaveCount(1);
    await expect(recipes.row('Shakshuka')).toBeVisible();
    await recipes.searchFor('eggs');
    await expect(recipes.rows).toHaveCount(2);
  });

  test('invites you to add the first recipe when there are none', async ({ page, recipes }) => {
    await seedStorage(page, { recipes: [] });
    await recipes.goto();
    await expect(recipes.subtitle).toHaveText('0 saved by your household');
    await expect(recipes.noRecipes).toBeVisible();
    await expect(recipes.tagChip('All')).toBeVisible();
  });

  test('a new tag becomes a filter', async ({ recipes, recipeForm }) => {
    await recipes.goto();
    await recipes.startNewRecipe();
    await recipeForm.fill({ name: 'Pancakes', newTags: ['Breakfast'] });
    await expect(recipeForm.tagChip('Breakfast')).toHaveAttribute('aria-selected', 'true');
    await recipeForm.save();

    await recipes.filterByTag('Breakfast');
    await expect(recipes.rows).toHaveCount(1);
    await expect(recipes.row('Pancakes')).toBeVisible();
  });

  test('removing the last use of a tag drops its filter and shows all', async ({
    recipes,
    recipeDetail,
    recipeForm,
  }) => {
    await recipes.goto();
    await recipes.filterByTag('Weekend');
    await expect(recipes.rows).toHaveCount(1);

    await recipes.openRecipe('Sarmale');
    await recipeDetail.edit();
    await recipeForm.toggleTag('Weekend');
    await recipeForm.save();
    await recipeDetail.backButton.click();

    await expect(recipes.tagChip('Weekend')).toBeHidden();
    await expect(recipes.tagChip('All')).toHaveAttribute('aria-selected', 'true');
    await expect(recipes.rows).toHaveCount(6);
  });

  test('stats update when a meal is eaten', async ({ recipes, plan, mealPicker }) => {
    await plan.goto();
    await plan.openPicker('breakfast', 'Today');
    await mealPicker.alreadyEatenChip.click();
    await mealPicker.pickRecipe('Sarmale');

    await plan.openTab('Recipes');
    await expect(recipes.row('Sarmale')).toContainText('Eaten 5× · last today');
  });
});

test.describe('editing details', () => {
  test('cancelling an unchanged edit leaves without asking', async ({
    recipeDetail,
    recipeForm,
  }) => {
    await recipeDetail.goto('sarmale');
    await recipeDetail.edit();
    await recipeForm.cancel();
    await expect(recipeDetail.title('Sarmale')).toBeVisible();
  });

  test('asks before discarding an edit, and keeps the recipe as it was', async ({
    recipeDetail,
    recipeForm,
  }) => {
    await recipeDetail.goto('sarmale');
    await recipeDetail.edit();
    await recipeForm.fill({ name: 'Renamed' });
    const answered = recipeForm.answerNextConfirm(true);
    await recipeForm.cancel();
    expect(await answered).toContain('Discard changes?');
    await expect(recipeDetail.title('Sarmale')).toBeVisible();
  });

  test('an edit link to a missing recipe says so', async ({ recipeForm }) => {
    await recipeForm.gotoEdit('does-not-exist');
    await expect(recipeForm.notFound).toBeVisible();
    await expect(recipeForm.saveButton).toBeHidden();
  });

  test('shows an error when a delete fails, and keeps the recipe', async ({
    page,
    recipeDetail,
  }) => {
    await recipeDetail.goto('sarmale');
    await expect(recipeDetail.title('Sarmale')).toBeVisible();
    await failWrites(page, STORAGE_KEYS.recipes);
    await recipeDetail.delete({ confirm: true });
    await expect(recipeDetail.deleteError).toBeVisible();
    await expect(recipeDetail.title('Sarmale')).toBeVisible();
  });

  test('an archived recipe leaves the meal picker and the suggestions', async ({
    recipeDetail,
    plan,
    mealPicker,
    history,
  }) => {
    await recipeDetail.goto('sarmale');
    await recipeDetail.delete({ confirm: true });

    await plan.goto();
    await plan.openPicker('breakfast', 'Today');
    await expect(mealPicker.recipe('Mushroom risotto')).toBeVisible();
    await expect(mealPicker.recipe('Sarmale')).toBeHidden();

    // Sarmale was the one not had in the longest; the next is the risotto, three weeks ago.
    await history.goto();
    await expect(history.staleBanner).toContainText('Mushroom risotto · 3 weeks ago');
  });
});

test.describe("on the partner's device", () => {
  test.use({ signedInAs: 'Partner' });

  test('recipe stats are their own', async ({ recipes }) => {
    await recipes.goto();
    await expect(recipes.row('Sarmale')).toContainText('Not eaten yet');
    await expect(recipes.row('Greek salad with feta')).toContainText('Eaten 1× · last yesterday');
  });
});
