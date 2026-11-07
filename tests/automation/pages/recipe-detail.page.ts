import type { Locator, Page } from '@playwright/test';

import { BasePage } from './base.page';

/** A recipe's detail screen, pushed above the tabs. */
export class RecipeDetailPage extends BasePage {
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly ingredientsHeading: Locator;
  readonly stepsHeading: Locator;
  readonly notFound: Locator;

  constructor(page: Page) {
    super(page);
    this.editButton = page.getByRole('button', { name: 'Edit', exact: true });
    this.deleteButton = page.getByRole('button', { name: 'Delete', exact: true });
    this.ingredientsHeading = this.heading('Ingredients');
    this.stepsHeading = this.heading('Steps');
    this.notFound = page.getByText('This recipe no longer exists.');
  }

  async goto(id: string): Promise<void> {
    await this.page.goto(`/recipe/${id}`);
  }

  title(name: string): Locator {
    return this.heading(name);
  }

  /** Text on this screen. The screen it was opened from stays in the page, hidden underneath. */
  text(content: string | RegExp): Locator {
    return this.page
      .getByText(content, { exact: typeof content === 'string' })
      .filter({ visible: true });
  }

  async edit(): Promise<void> {
    await this.editButton.click();
  }

  /** Deletes the recipe, accepting or dismissing the confirmation. Returns its message. */
  async delete({ confirm }: { confirm: boolean }): Promise<string> {
    const answered = this.answerNextConfirm(confirm);
    await this.deleteButton.click();
    return answered;
  }
}
