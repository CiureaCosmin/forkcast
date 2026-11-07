import type { Locator, Page } from '@playwright/test';

import { BasePage } from './base.page';

export type PersonName = 'Cosmin' | 'Partner';

/** First launch: pick who's using this device. */
export class WhoAreYouPage extends BasePage {
  readonly title: Locator;

  constructor(page: Page) {
    super(page);
    this.title = this.heading("Who's using this phone?");
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  person(name: PersonName): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  async choose(name: PersonName): Promise<void> {
    await this.person(name).click();
  }
}
