import { expect, type Locator, type Page } from '@playwright/test';

import { BasePage } from './base.page';
import type { PersonName } from './who-are-you.page';

export type Slot = 'breakfast' | 'lunch' | 'dinner';
export type DayHeading = 'Yesterday' | 'Today' | 'Tomorrow' | (string & {});

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The Plan tab: person switcher, review list, day strip and the selected day plus the next. */
export class PlanPage extends BasePage {
  readonly title: Locator;
  readonly reviewHeading: Locator;
  readonly nothingPlanned: Locator;

  constructor(page: Page) {
    super(page);
    this.title = this.heading("What's cooking");
    this.reviewHeading = this.heading('Did you eat these?');
    this.nothingPlanned = page.getByText('Nothing planned.');
  }

  async goto(): Promise<void> {
    await this.page.goto('/plan');
    await expect(this.title).toBeVisible();
  }

  personChip(name: PersonName): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  async viewPerson(name: PersonName): Promise<void> {
    await this.personChip(name).click();
    await expect(this.personChip(name)).toHaveAttribute('aria-selected', 'true');
  }

  /** "Not Cosmin? Switch to Partner": changes who this device belongs to. */
  switchDeviceOwner(to: PersonName): Locator {
    return this.page.getByRole('button', { name: new RegExp(`Switch to ${to}$`) });
  }

  /** A day in the strip, by its long label such as "Saturday 7". */
  stripDay(date: Date): Locator {
    const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
    return this.page.getByRole('button', { name: `${weekday} ${date.getDate()}`, exact: true });
  }

  async pickDay(date: Date): Promise<void> {
    await this.stripDay(date).click();
  }

  dayHeading(day: DayHeading): Locator {
    return this.heading(day);
  }

  /** The dashed button for an empty slot: "Plan lunch, Today" or "Log dinner, Yesterday". */
  emptySlot(slot: Slot, day: DayHeading): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^(Plan|Log) ${slot}, ${day}$`) });
  }

  /** The chip that adds another meal to a filled slot. */
  addToSlot(slot: Slot, day: DayHeading): Locator {
    return this.page.getByRole('button', { name: `Add to ${slot}, ${day}`, exact: true });
  }

  async openPicker(slot: Slot, day: DayHeading): Promise<void> {
    await this.emptySlot(slot, day).or(this.addToSlot(slot, day)).click();
  }

  /** A meal card or row: "Lunch: Pasta e fagioli". */
  meal(slot: Slot, name: string): Locator {
    return this.page.getByRole('button', { name: `${capitalize(slot)}: ${name}`, exact: true });
  }

  /** A read-only meal on the partner's plan, which isn't a button. */
  readOnlyMeal(slot: Slot, name: string): Locator {
    return this.page.getByLabel(`${capitalize(slot)}: ${name}`, { exact: true });
  }

  /** Today's card around a meal: the meal button, then "I ate it" and "Skip" or the status. */
  mealCard(slot: Slot, name: string): Locator {
    return this.meal(slot, name).locator('xpath=..');
  }

  ateItButton(slot: Slot, name: string): Locator {
    return this.mealCard(slot, name).getByRole('button', { name: 'I ate it' });
  }

  skipButton(slot: Slot, name: string): Locator {
    return this.mealCard(slot, name).getByRole('button', { name: 'Skip' });
  }

  async openMeal(slot: Slot, name: string): Promise<void> {
    await this.meal(slot, name).click();
  }

  reviewYes(name: string): Locator {
    return this.page.getByRole('button', { name: `Yes, I ate ${name}`, exact: true });
  }

  reviewNo(name: string): Locator {
    return this.page.getByRole('button', { name: `No, I skipped ${name}`, exact: true });
  }
}
