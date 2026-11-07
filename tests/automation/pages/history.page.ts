import { expect, type Locator, type Page } from '@playwright/test';

import { BasePage } from './base.page';
import type { PersonName } from './who-are-you.page';

/** The History tab: stats, the "haven't had in a while" banner and the log by day. */
export class HistoryPage extends BasePage {
  readonly title: Locator;
  readonly last30Days: Locator;
  readonly mostEaten: Locator;
  readonly staleBanner: Locator;
  readonly nothingLogged: Locator;
  readonly showMoreButton: Locator;

  constructor(page: Page) {
    super(page);
    this.title = this.heading('History');
    this.last30Days = this.statCard('Last 30 days');
    this.mostEaten = this.statCard('Most eaten');
    this.staleBanner = this.parentOf(page.getByText("Haven't had in a while", { exact: true }));
    this.nothingLogged = page.getByText('Nothing logged yet.');
    this.showMoreButton = page.getByRole('button', { name: 'Show more', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/history');
    await expect(this.title).toBeVisible();
  }

  /** A stat card: its label, value and detail sit side by side in the card. */
  private statCard(label: string): Locator {
    return this.parentOf(this.page.getByText(label, { exact: true }));
  }

  private parentOf(element: Locator): Locator {
    return element.locator('xpath=..');
  }

  personChip(name: PersonName): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  async viewPerson(name: PersonName): Promise<void> {
    await this.personChip(name).click();
    await expect(this.personChip(name)).toHaveAttribute('aria-selected', 'true');
  }

  /** A day's header in the log: "Today · Sat 7 Nov", "Yesterday · …" or "Thu 5 Nov". */
  dayHeader(text: string | RegExp): Locator {
    return this.page.getByRole('heading', { name: text });
  }

  /** A logged meal, labelled "Sarmale, Dinner · eaten" (with leftovers and notes when set). */
  entry(label: string | RegExp): Locator {
    return this.page.getByLabel(label, { exact: typeof label === 'string' });
  }

  entries(): Locator {
    return this.page.getByLabel(/, (Breakfast|Lunch|Dinner) · /);
  }
}
