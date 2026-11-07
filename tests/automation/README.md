# Forkcast automation

Playwright tests for the web app. This folder is its own package, so nothing here touches the app's dependencies.

```bash
cd tests/automation
npm ci
npx playwright install chromium
npm test            # builds the web app, serves it and runs the tests (Chromium; CI adds WebKit)
npm run test:webkit # WebKit only (needs Ubuntu's libraries: npx playwright install --with-deps webkit)
npm run test:ui     # the same, in Playwright's UI
npm run report      # opens the last HTML report
```

## Layout

```
tests/automation/
├── pages/          # Page objects, one per screen, plus index.ts
├── tests/          # Specs (*.spec.ts), one per area of the app
├── fixtures.ts     # `test` with the page objects, plus storage helpers
└── dates.ts        # Local dates and the app's date labels
```

**Page objects** (`pages/`) hold every locator and screen action. Specs never call `page.getByRole` for app elements themselves; if something is missing, add it to the page object.

| Page object        | Screen                                                       |
| ------------------ | ------------------------------------------------------------ |
| `BasePage`         | Shared: tab bar, save error banner, `window.confirm` dialogs |
| `WhoAreYouPage`    | First launch: "Who's using this phone?"                      |
| `RecipesPage`      | Recipes tab: search, tag chips, the list                     |
| `RecipeDetailPage` | `/recipe/[id]`: details, Edit, Delete                        |
| `RecipeFormPage`   | `/recipe/new` and `/recipe/[id]/edit`                        |
| `PlanPage`         | Plan tab: person switcher, review list, day strip, slots     |
| `MealPickerPage`   | `/meal/new`: quick meals, planned or eaten, recipe search    |
| `MealDetailPage`   | `/meal/[id]`: status, copy to partner, leftovers, remove     |
| `HistoryPage`      | History tab: stats, "haven't had in a while", the log        |

**Locators** use roles and accessible names, the same ones a screen reader gets, so a test that can't find something often points at an accessibility gap. Pushed screens leave the screen below them in the page, so page objects for pushed screens scope their text to the screen itself.

**Fixtures:** import `test` and `expect` from `../fixtures`, not from `@playwright/test`. Each page object is a fixture (`async ({ plan, mealPicker }) => …`).

- Each test starts with empty browser storage, so the app shows its sample data. Sample meal dates are relative to today.
- The device already belongs to Cosmin. Use `test.use({ signedInAs: null })` for the first-launch screen, or `'Partner'`.
- `seedStorage(page, { meals: [...] })` replaces the sample data before the app loads (once per tab, so the app's own saves survive a reload). A string is stored as is, for unreadable data.
- `failWrites(page, STORAGE_KEYS.meals)` makes later saves to that key throw, like a full `localStorage`.
- `readSaved(page, key)` reads a saved list, to check what reached storage.

## What's covered

| Spec                     | Covers                                                                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `onboarding.spec.ts`     | First launch and remembering the person, tabs, opening by URL, back from a recipe link                                                                                                                                                                             |
| `recipes.spec.ts`        | List and stats (per device owner), search by name and ingredient, tag filters, empty state; add (all fields, name only, validation, new tags), edit, discard prompts, failed save and delete, delete or archive, archived recipes hidden everywhere                |
| `plan.spec.ts`           | Day strip and day sections; mark eaten, skipped or back to planned (card and meal screen); add recipes and quick meals for today, past and later days; picker search; copy to partner; leftovers; remove; the partner's read-only plan; switching the device owner |
| `review.spec.ts`         | "Did you eat these?": Yes, No, kept out of history until answered, not on the partner's plan                                                                                                                                                                       |
| `history.spec.ts`        | 30-day stats, most eaten, "haven't had in a while", the log by day (today, skips, notes, leftovers), "Show more", the partner's history, the empty state                                                                                                           |
| `storage-errors.spec.ts` | Failed meal saves (banner on every tab, clears after a good save), unreadable saved data and retry                                                                                                                                                                 |
| `sanity.spec.ts`         | The smoke test: pick a person, plan a meal, reload                                                                                                                                                                                                                 |

**Not covered here:** anything native-only (native tabs, the Android back button, `Alert` confirmations; those wait for mobile automation), the day changing at midnight while the app is open, and how screens look (dark mode, layout).
