import { test as base, type Page } from '@playwright/test';

import {
  HistoryPage,
  MealDetailPage,
  MealPickerPage,
  type PersonName,
  PlanPage,
  RecipeDetailPage,
  RecipeFormPage,
  RecipesPage,
  WhoAreYouPage,
} from './pages';

/** The app's AsyncStorage keys, which are plain `localStorage` keys on the web. */
export const STORAGE_KEYS = {
  recipes: 'forkcast:recipes:v1',
  meals: 'forkcast:meals:v1',
  me: 'forkcast:me:v1',
} as const;

const PERSON_IDS: Record<PersonName, string> = { Cosmin: 'person-1', Partner: 'person-2' };

type Pages = {
  whoAreYou: WhoAreYouPage;
  recipes: RecipesPage;
  recipeDetail: RecipeDetailPage;
  recipeForm: RecipeFormPage;
  plan: PlanPage;
  mealPicker: MealPickerPage;
  mealDetail: MealDetailPage;
  history: HistoryPage;
};

type Options = {
  /** Who this device belongs to before the app opens; `null` leaves the first-launch choice. */
  signedInAs: PersonName | null;
};

export const test = base.extend<Pages & Options>({
  signedInAs: ['Cosmin', { option: true }],
  page: async ({ page, signedInAs }, use) => {
    if (signedInAs) {
      // Only on the first load, so a test that changes the person keeps it across reloads.
      await page.addInitScript(
        ([key, id]) => {
          if (window.localStorage.getItem(key) === null) window.localStorage.setItem(key, id);
        },
        [STORAGE_KEYS.me, PERSON_IDS[signedInAs]] as const,
      );
    }
    await use(page);
  },
  whoAreYou: async ({ page }, use) => use(new WhoAreYouPage(page)),
  recipes: async ({ page }, use) => use(new RecipesPage(page)),
  recipeDetail: async ({ page }, use) => use(new RecipeDetailPage(page)),
  recipeForm: async ({ page }, use) => use(new RecipeFormPage(page)),
  plan: async ({ page }, use) => use(new PlanPage(page)),
  mealPicker: async ({ page }, use) => use(new MealPickerPage(page)),
  mealDetail: async ({ page }, use) => use(new MealDetailPage(page)),
  history: async ({ page }, use) => use(new HistoryPage(page)),
});

export { expect } from '@playwright/test';

/** A saved meal, as the app stores it (see `src/types/models.ts`). */
export type SavedMeal = {
  id: string;
  personId: string;
  recipeId?: string;
  quickType?: 'eating_out' | 'takeout' | 'quick_bite';
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  status: 'planned' | 'eaten' | 'skipped';
  isLeftovers: boolean;
  notes?: string;
  updatedAt: string;
};

export function personId(name: PersonName): string {
  return PERSON_IDS[name];
}

/**
 * Puts raw values into storage before the app first loads, in place of the sample data. Runs
 * once per tab, so the app's own saves survive a reload.
 */
export async function seedStorage(
  page: Page,
  values: Partial<Record<keyof typeof STORAGE_KEYS, unknown>>,
): Promise<void> {
  const entries = Object.entries(values).map(([name, value]) => [
    STORAGE_KEYS[name as keyof typeof STORAGE_KEYS],
    typeof value === 'string' ? value : JSON.stringify(value),
  ]);
  await page.addInitScript((pairs) => {
    if (window.sessionStorage.getItem('forkcast-test:seeded')) return;
    window.sessionStorage.setItem('forkcast-test:seeded', '1');
    for (const [key, value] of pairs) window.localStorage.setItem(key, value);
  }, entries);
}

/** The sample data's meal ids, built from person, status, recipe, days ago and meal type. */
export function sampleMealId(
  person: PersonName,
  status: SavedMeal['status'],
  recipeId: string,
  daysAgo: number,
  mealType: SavedMeal['mealType'],
): string {
  return `${PERSON_IDS[person]}-${status}-${recipeId}-${daysAgo}-${mealType}`;
}

type TestWindow = Window & { forkcastSetItem?: Storage['setItem'] };

/** Makes later writes to a storage key throw, as a full or blocked `localStorage` would. */
export async function failWrites(page: Page, key: string): Promise<void> {
  await page.evaluate((failing) => {
    const win = window as TestWindow;
    const setItem = win.forkcastSetItem ?? Storage.prototype.setItem;
    win.forkcastSetItem = setItem;
    Storage.prototype.setItem = function (this: Storage, name: string, value: string) {
      if (name === failing) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      setItem.call(this, name, value);
    };
  }, key);
}

/** Undoes `failWrites`. */
export async function restoreWrites(page: Page): Promise<void> {
  await page.evaluate(() => {
    const win = window as TestWindow;
    if (win.forkcastSetItem) Storage.prototype.setItem = win.forkcastSetItem;
  });
}

/** Reads a saved list straight from storage. */
export async function readSaved<T>(page: Page, key: string): Promise<T[]> {
  return page.evaluate((name) => JSON.parse(window.localStorage.getItem(name) ?? '[]'), key);
}
