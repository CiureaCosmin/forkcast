import type { Locator, Page } from '@playwright/test';

import { BasePage } from './base.page';

export type RecipeInput = {
  name?: string;
  description?: string;
  prepMinutes?: string;
  newTags?: string[];
  ingredients?: string[];
  steps?: string[];
};

/** The new and edit recipe forms, which are the same component. */
export class RecipeFormPage extends BasePage {
  readonly name: Locator;
  readonly description: Locator;
  readonly prepMinutes: Locator;
  readonly newTag: Locator;
  readonly ingredients: Locator;
  readonly steps: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly saveError: Locator;
  readonly nameError: Locator;
  readonly prepMinutesError: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.getByRole('textbox', { name: 'Name', exact: true });
    this.description = page.getByRole('textbox', { name: 'Description (optional)' });
    this.prepMinutes = page.getByRole('textbox', { name: 'Prep time in minutes (optional)' });
    this.newTag = page.getByRole('textbox', { name: 'Tags (optional)' });
    this.ingredients = page.getByRole('textbox', { name: 'Ingredients (optional)' });
    this.steps = page.getByRole('textbox', { name: 'Steps (optional)' });
    this.saveButton = page.getByRole('button', { name: 'Save', exact: true });
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });
    this.saveError = page.getByRole('alert').filter({ hasText: "Couldn't save the recipe" });
    this.nameError = page.getByText('Give the recipe a name.', { exact: true });
    this.prepMinutesError = page.getByText('Enter the prep time in whole minutes.', {
      exact: true,
    });
  }

  async gotoNew(): Promise<void> {
    await this.page.goto('/recipe/new');
  }

  tagChip(tag: string): Locator {
    return this.page.getByRole('button', { name: tag, exact: true });
  }

  async fill(input: RecipeInput): Promise<void> {
    if (input.name !== undefined) await this.name.fill(input.name);
    if (input.description !== undefined) await this.description.fill(input.description);
    if (input.prepMinutes !== undefined) await this.prepMinutes.fill(input.prepMinutes);
    for (const tag of input.newTags ?? []) {
      await this.newTag.fill(tag);
      await this.newTag.press('Enter');
    }
    if (input.ingredients) await this.ingredients.fill(input.ingredients.join('\n'));
    if (input.steps) await this.steps.fill(input.steps.join('\n'));
  }

  async toggleTag(tag: string): Promise<void> {
    await this.tagChip(tag).click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
