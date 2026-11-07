import { expect, type Locator, type Page } from '@playwright/test';

import { BasePage } from './base.page';

/** The Recipes tab: search, tag filters and the list. */
export class RecipesPage extends BasePage {
  readonly title: Locator;
  readonly subtitle: Locator;
  readonly addButton: Locator;
  readonly search: Locator;
  readonly rows: Locator;
  readonly noMatches: Locator;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('Recipes');
    this.subtitle = page.getByText(/saved by your household$/);
    this.addButton = page.getByRole('button', { name: 'Add recipe' });
    this.search = page.getByRole('textbox', { name: 'Search recipes' });
    // Every row ends with its stats, which tells rows apart from the stack's back link.
    this.rows = page.getByRole('link').filter({ hasText: /Eaten \d+×|Not eaten yet/ });
    this.noMatches = page.getByText('No recipes match your search.');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.title).toBeVisible();
  }

  /** A recipe row, found by its exact name (the row also holds initials, details and stats). */
  row(name: string): Locator {
    return this.rows.filter({ has: this.page.getByText(name, { exact: true }) });
  }

  tagChip(tag: string): Locator {
    return this.page.getByRole('button', { name: tag, exact: true });
  }

  async searchFor(text: string): Promise<void> {
    await this.search.fill(text);
  }

  async filterByTag(tag: string): Promise<void> {
    await this.tagChip(tag).click();
  }

  async openRecipe(name: string): Promise<void> {
    await this.row(name).click();
  }

  async startNewRecipe(): Promise<void> {
    await this.addButton.click();
  }
}
