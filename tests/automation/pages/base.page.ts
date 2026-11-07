import { expect, type Locator, type Page } from '@playwright/test';

export type TabName = 'Recipes' | 'Plan' | 'History';

/** What every screen shares: the page itself, the tab bar and the app-wide save banner. */
export abstract class BasePage {
  readonly saveErrorBanner: Locator;

  constructor(readonly page: Page) {
    this.saveErrorBanner = page
      .getByRole('alert')
      .filter({ hasText: "Couldn't save your last change" });
  }

  tab(name: TabName): Locator {
    return this.page.getByRole('tab', { name, exact: true });
  }

  async openTab(name: TabName): Promise<void> {
    await this.tab(name).click();
    await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true');
  }

  heading(name: string | RegExp): Locator {
    return this.page.getByRole('heading', { name, exact: typeof name === 'string' });
  }

  /** Accepts (or dismisses) the next `window.confirm`, which the web app uses for confirmations. */
  async answerNextConfirm(accept: boolean): Promise<string> {
    return new Promise((resolve) => {
      this.page.once('dialog', async (dialog) => {
        const message = dialog.message();
        await (accept ? dialog.accept() : dialog.dismiss());
        resolve(message);
      });
    });
  }
}
