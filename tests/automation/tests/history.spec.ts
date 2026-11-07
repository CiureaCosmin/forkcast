import { daysFromToday, shortDate } from '../dates';
import { expect, seedStorage, test } from '../fixtures';

test.describe('with the sample data', () => {
  test.beforeEach(async ({ history }) => {
    await history.goto();
  });

  test('shows the 30-day stats and the most eaten recipe', async ({ history }) => {
    await expect(history.last30Days).toContainText('20');
    await expect(history.last30Days).toContainText('meals eaten · 3 skipped');
    await expect(history.mostEaten).toContainText('9×');
    await expect(history.mostEaten).toContainText('Ciorbă de perișoare');
  });

  test('suggests a recipe we have not had in a while', async ({ history }) => {
    await expect(history.staleBanner).toContainText('Sarmale · 2 months ago');
  });

  test('lists meals by day, newest first, with skips, notes and leftovers', async ({ history }) => {
    const headers = history.page.getByRole('heading', { name: /^(Yesterday · )?\w{3} \d+ \w{3}$/ });
    await expect(headers.first()).toHaveText(`Yesterday · ${shortDate(daysFromToday(-1))}`);
    await expect(history.dayHeader(shortDate(daysFromToday(-2)))).toBeVisible();

    await expect(history.entry('Pasta e fagioli, Dinner · skipped — ate out')).toBeVisible();
    await expect(history.entry('Ciorbă de perișoare, Lunch · leftovers · eaten')).toBeVisible();
    await expect(history.entry('Eating out, Dinner · eaten')).toBeVisible();
  });

  test('shows a week of days at a time', async ({ history }) => {
    await expect(history.page.getByRole('heading', { name: /\d+ \w{3}$/ })).toHaveCount(7);
    await history.showMoreButton.click();
    await expect(history.page.getByRole('heading', { name: /\d+ \w{3}$/ })).toHaveCount(14);
  });

  test("switches to the partner's history and stats", async ({ history }) => {
    await history.viewPerson('Partner');
    await expect(history.last30Days).toContainText('3');
    await expect(history.last30Days).toContainText('0 skipped');
    await expect(history.entry('Chicken shawarma bowls, Dinner · eaten')).toBeVisible();
    await expect(history.entry('Eating out, Dinner · eaten')).toBeHidden();
  });

  test('leftovers count as eaten but not as times made', async ({ recipes }) => {
    // Ciorbă: 9 dinners plus one leftovers lunch.
    await recipes.goto();
    await expect(recipes.row('Ciorbă de perișoare')).toContainText('Eaten 9×');
  });
});

test.describe('with nothing logged', () => {
  test('says so', async ({ page, history }) => {
    await seedStorage(page, { meals: [] });
    await history.goto();
    await expect(history.nothingLogged).toBeVisible();
    await expect(history.last30Days).toContainText('0');
    await expect(history.mostEaten).toContainText('Nothing eaten yet');
    await expect(history.staleBanner).toBeHidden();
    await expect(history.showMoreButton).toBeHidden();
  });
});
