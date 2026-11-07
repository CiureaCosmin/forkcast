import type { Locator, Page } from '@playwright/test';

import { BasePage } from './base.page';

export type QuickMeal = 'Eating out' | 'Takeout' | 'Quick bite';

/** The "Add a meal" modal: quick meals, a planned/eaten choice for today and the recipe list. */
export class MealPickerPage extends BasePage {
  readonly plannedChip: Locator;
  readonly alreadyEatenChip: Locator;
  readonly search: Locator;
  readonly noMatches: Locator;
  readonly invalidLink: Locator;

  constructor(page: Page) {
    super(page);
    this.plannedChip = page.getByRole('button', { name: 'Planned', exact: true });
    this.alreadyEatenChip = page.getByRole('button', { name: 'Already eaten', exact: true });
    this.search = page.getByRole('textbox', { name: 'Search recipes' });
    this.noMatches = page.getByText('No recipes match. Add new ones in the Recipes tab.');
    this.invalidLink = page.getByText("This link doesn't point to a meal.");
  }

  async goto(params: { date: string; mealType: string }): Promise<void> {
    await this.page.goto(`/meal/new?${new URLSearchParams(params)}`);
  }

  /** "Lunch · Sat 7 Nov". */
  slotHeading(): Locator {
    return this.page.getByRole('heading', { name: /^(Breakfast|Lunch|Dinner) · / });
  }

  recipe(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  quickMeal(name: QuickMeal): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  async searchFor(text: string): Promise<void> {
    await this.search.fill(text);
  }

  async pickRecipe(name: string): Promise<void> {
    await this.recipe(name).click();
  }

  async pickQuickMeal(name: QuickMeal): Promise<void> {
    await this.quickMeal(name).click();
  }
}
