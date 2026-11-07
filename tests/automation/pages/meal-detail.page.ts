import type { Locator, Page } from '@playwright/test';

import { BasePage } from './base.page';
import type { PersonName } from './who-are-you.page';

/** The meal modal: status, copy to partner, leftovers and remove. */
export class MealDetailPage extends BasePage {
  readonly ateItButton: Locator;
  readonly skipButton: Locator;
  readonly backToPlannedButton: Locator;
  readonly removeButton: Locator;
  readonly leftoversLabel: Locator;
  readonly notFound: Locator;

  constructor(page: Page) {
    super(page);
    this.ateItButton = page.getByRole('button', { name: 'I ate it', exact: true });
    this.skipButton = page.getByRole('button', { name: 'Skip', exact: true });
    this.backToPlannedButton = page.getByRole('button', { name: 'Back to planned', exact: true });
    this.removeButton = page.getByRole('button', { name: 'Remove', exact: true });
    this.leftoversLabel = page.getByText(/^Leftovers on /);
    this.notFound = page.getByText('This meal no longer exists.');
  }

  async goto(id: string): Promise<void> {
    await this.page.goto(`/meal/${id}`);
  }

  title(name: string): Locator {
    return this.heading(name);
  }

  /**
   * The status line under the meal's title: "Planned", "Eaten · Leftovers" and so on. Scoped to
   * the title, because the plan underneath shows statuses too.
   */
  status(name: string, text: string): Locator {
    return this.title(name).locator('xpath=..').getByText(text, { exact: true });
  }

  copyTo(partner: PersonName): Locator {
    return this.page.getByRole('button', { name: `Copy to ${partner}`, exact: true });
  }

  leftoverSlot(label: 'Breakfast' | 'Lunch' | 'Dinner'): Locator {
    return this.page.getByRole('button', { name: label, exact: true });
  }

  async remove({ confirm }: { confirm: boolean }): Promise<string> {
    const answered = this.answerNextConfirm(confirm);
    await this.removeButton.click();
    return answered;
  }
}
