# Forkcast architecture

A living document describing how Forkcast is built and why. Update it whenever a structural decision is made. For the to-do list and ideas, see [plan.md](./plan.md).

_Last updated: 2026-11-05_

## 1. Overview

Forkcast is a personal, household meal planner: save recipes, plan upcoming meals and keep a history of what was eaten and how often.

- **Users:** one household (2+ people sharing the same data). Not published to app stores.
- **Platforms:** one codebase for Android, iOS and the web.
  - **Android:** an APK built with EAS and installed directly.
  - **iPhone:** the web build used as a PWA via "Add to Home Screen" (avoids the $99/year Apple developer account).
  - **Web:** any browser.

## 2. Tech stack

| Layer           | Choice                                     | Notes                                                                         |
| --------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| Runtime         | Node.js 26 LTS                             | Pinned in `.nvmrc` and `package.json#engines`, managed locally with fnm       |
| Framework       | Expo SDK 58, React Native 0.88, React 19.3 | React Native Web for the browser                                              |
| Language        | TypeScript 6.0 (strict)                    | The version Expo expects; used only for type checking                         |
| Navigation      | Expo Router (file-based)                   | Typed routes enabled                                                          |
| Compiler        | React Compiler (enabled in `app.json`)     | Automatic memoization; avoid manual `useMemo`/`useCallback` by default        |
| Lint and format | Biome 2                                    | Single tool and config (`biome.json`); no ESLint or Prettier                  |
| Git hooks       | Lefthook                                   | Pre-commit runs Biome on staged files, then the typecheck                     |
| CI              | GitHub Actions                             | Three jobs: lint, types and Jest; Android bundle; Playwright                  |
| Local storage   | AsyncStorage                               | One JSON list per data type; `localStorage` on web; stays as the offline copy |
| Tests           | Jest (`jest-expo`) + Testing Library       | `npm test`, also run in CI                                                    |
| Web E2E tests   | Playwright (Chromium)                      | `tests/automation/`, its own package; runs in CI                              |
| Backend         | Supabase (planned)                         | Postgres, Auth and Storage; not set up yet                                    |

## 3. Repository layout

```
forkcast/
├── src/
│   ├── app/            # Expo Router routes: every file is a screen, _layout.tsx defines navigators
│   │   ├── (tabs)/     # The three tabs
│   │   └── recipe/     # Recipe detail and forms, pushed above the tabs
│   ├── components/     # Reusable UI components (*.web.tsx = web-specific variant)
│   ├── constants/      # Theme (colors, fonts, radii)
│   ├── data/           # Recipe store and sample data (until the backend exists)
│   ├── hooks/          # Reusable hooks (color scheme, theme)
│   ├── lib/            # Pure helpers (stats, recipe form parsing, confirm dialog)
│   └── types/          # Domain models (models.ts) and ambient declarations (expo.d.ts)
├── tests/automation/   # Playwright tests: a separate package with its own dependencies
├── assets/             # App icons, splash and images
├── docs/               # architecture.md (this file), plan.md
├── .github/workflows/  # CI
├── app.json            # Expo app config
├── biome.json          # Lint and format rules
├── lefthook.yml        # Git hooks
└── tsconfig.json       # TypeScript config (strict + extra checks)
```

Path aliases: `@/*` → `src/*`, `@/assets/*` → `assets/*`.

## 4. App structure (current)

The app has three tabs (Recipes, Plan, History) in the "Fresh Market" design (light, card-based, tomato accent, with a matching dark palette). Recipes and meals are real and persist on the device. The people are fixed (`people` in `src/data/sample.ts`), and sample recipes and meals appear on first launch.

- `src/app/_layout.tsx`: root layout. Loads the fonts and the saved data, keeps the splash screen up until both are done, sets the light or dark navigation theme and renders a `Stack` with the tabs at the bottom (or a retry screen if saved data can't be read, or `WhoAreYou` until the device has a person). `unstable_settings.anchor` puts the tabs under a directly opened recipe link.
- Tab routes (`src/app/(tabs)/`): `index.tsx` (Recipes: search and tag chips filter the list), `plan.tsx` (person switcher, "Did you eat these?" review, seven-day strip starting yesterday, the selected day and the next one), `history.tsx` (person switcher, 30-day stats, "haven't had in a while" banner, log by day).
- Meal routes (`src/app/meal/`): `new.tsx` (modal picker for a slot, with date and meal type as params) and `[id].tsx` (modal with status, copy, leftovers and remove).
- Recipe routes (`src/app/recipe/`): `[id]/index.tsx` (detail), `new.tsx` and `[id]/edit.tsx` (modal forms, both using `RecipeForm`).
- Tabs:
  - **Native** (`app-tabs.tsx`): `NativeTabs` from `expo-router/native-tabs` with SF Symbols (iOS) and Material symbols (Android), tinted with the accent color.
  - **Web** (`app-tabs.web.tsx`): a custom bottom bar built with `expo-router/ui` that matches the mockup (surface background, top border, icon and label, accent when active).
- **Theming:** `src/constants/theme.ts` defines the `Colors.light` and `Colors.dark` tokens (background, surface, text, textSecondary, border, divider, dashed, accent, onAccent, herb, herbSoft), `Fonts` and `Radius`. `useTheme()` returns the active palette; components read colors from it so both modes work. Text pairs are at least 4.5:1 contrast in both palettes (the dark `onAccent` is dark, because white on the lighter dark-mode tomato fails).
- **Fonts:** Bricolage Grotesque 700 for headings and Inter 400/500/600 for body, from `@expo-google-fonts/*`. Always set the weight by choosing the font family (`Fonts.bodySemiBold`), not `fontWeight`.
- **Text:** `ThemedText` has the type scale: `title` 34, `heading` 20, `stat` 32, `subheading` 17, `body` 16, `bodyStrong`, `compact` 15, `small` 14, `caption` 13, `label` 12 (uppercase).
- **Shared components** (`src/components/`): `Screen` (safe area, scroll, title header), `Card`, `Chip`, `StackContent` (scrolling body for pushed screens), `Button` (primary, secondary, dashed, herb), `SearchField`, `TextField`, `Icon`, `RecipeThumb` (initials tile), `RecipeRow`, `RecipeForm`, `RecipeNotFound`, `MealCard` and `MealRow`, `MealReview`, `PersonSwitcher`, `WhoAreYou`, `SaveErrorBanner`, `StatCard`.
- **Store:** `src/data/store.ts` holds recipes, meals, the device's person (`me`) and whose data is on screen (`viewing`) in a module-level store read through `useStore()` (`useSyncExternalStore`); `useMe()` gives the person once chosen. Each change writes to AsyncStorage first and updates the UI only if that worked, and saves run one at a time so two quick taps can't overwrite each other. A failed recipe save rejects, for the form to show. A failed meal save shows `SaveErrorBanner` on every screen. Unreadable saved data gives an error state instead of the samples, so the next save can't overwrite it. `recipes` includes archived ones because meals still need their names; use `activeRecipes()` for anything that lists or suggests recipes.
- **Whose data:** `meals` holds everyone's. Use `mealsFor(meals, id)` before any stat, with `viewing` on Plan and History and `useMe()` on Recipes. Your partner's plan is read-only; "Not X? Switch" on Plan changes `me`, and goes away when auth arrives.
- **Confirmations:** `src/lib/confirm.ts` uses `Alert`, and `confirm.web.ts` uses `window.confirm` because React Native Web's `Alert` does nothing. Use `confirm()` for destructive actions.
- **Links:** don't put a function `style` on a `Pressable` inside `Link asChild`: on the web the style is dropped. Use `router.push` in `onPress` instead.
- **Data layer:** `src/types/models.ts` (`Recipe`, `Meal`, `MealType`, `MealStatus`, `QuickMealType`, `Person`, matching section 5), `src/lib/recipes.ts` (pure recipe form parsing and validation), `src/lib/meals.ts` (pure meal labels and rules), `src/data/sample.ts` (sample recipes and meals; meal dates are generated relative to the real current date so Plan always has meals for today and tomorrow) and `src/lib/stats.ts` (pure functions that derive times eaten, last eaten, "6 days ago", 30-day counts, most eaten and history grouping from the meals, per the "derived, not stored" rule).
- **Platform-specific code:** Metro picks `*.web.tsx` over `*.tsx` on the web. The same convention applies to `.ios.tsx` and `.android.tsx`.

**Tabs:**

| Tab     | Purpose                                       | Status                    |
| ------- | --------------------------------------------- | ------------------------- |
| Recipes | List, search, add and edit recipes            | Done; saved on the device |
| Plan    | Upcoming days: what we eat today and tomorrow | Done; saved on the device |
| History | Eaten meals over time, plus stats             | Done; saved on the device |

## 5. Product rules and data model (draft)

The TypeScript models follow this already; the database doesn't exist yet. The rules below were agreed on 2026-11-05 and the schema follows from them.

**Product rules:**

- **Planning is mixed.** Some meals are planned days ahead and others are decided on the day, so empty slots are normal and a meal can be logged directly as eaten.
- **Meal types:** breakfast, lunch and dinner. No snacks.
- **Recipes are shared by the household.** Only the name is required; ingredients, steps, prep time, tags and description are optional. For now the form takes ingredients as one line each, stored as a name without a separate quantity or unit.
- **Each person has their own plan and history.** There are two people, each with a login. You see your own meals by default, and a switcher shows your partner's. Stats are per person.
- **Shared meals are copies.** A meal goes on your own plan, then "Copy to partner" creates a separate planned meal on theirs, so each person marks it eaten or skipped independently. Your partner's plan is read-only.
- **A slot can hold several meals** (for example soup and a main course), but the UI is designed around one.
- **Quick meals:** "Eating out", "Takeout" and "Quick bite" are logged with one tap and need no recipe or name. They appear in history but not in recipe stats.
- **Leftovers:** from a recipe meal, you pick a slot on the next day, and that creates a planned meal marked as leftovers.
- **Unmarked meals:** a planned meal whose day has passed stays planned, and the Plan tab asks "Did you eat these?". It doesn't count in history or stats until it's marked.
- **Deleting a recipe that has meals archives it,** so history stays intact. Archived recipes are hidden from the list and the picker.
- **The app works offline.** The data on the device stays the copy the app reads and writes. With no internet you can still add recipes and plan or mark meals, and changes sync with the server when you're back online.

```
recipes
  id            uuid  PK
  household_id  uuid  FK → households
  name          text
  description   text?
  ingredients   jsonb       -- [{ name, quantity, unit }], may be empty
  steps         jsonb       -- [string], may be empty
  prep_minutes  int?
  tags          text[]      -- e.g. "quick", "soup"
  photo_url     text?
  archived_at   timestamptz?
  created_at    timestamptz

meals
  id            uuid  PK
  household_id  uuid  FK → households
  person_id     uuid  FK → household_members
  recipe_id     uuid? FK → recipes
  quick_type    enum? (eating_out | takeout | quick_bite)
  date          date
  meal_type     enum (breakfast | lunch | dinner)
  status        enum (planned | eaten | skipped)
  is_leftovers  boolean     -- default false
  notes         text?
  -- check: exactly one of recipe_id and quick_type is set
  -- not unique per person, date and meal_type: a slot can hold several meals

households / household_members   -- link Supabase Auth users to shared data
```

**What offline sync requires (planned for Milestone 3):**

- **Ids are created on the device** (already true for new recipes), so a row made offline keeps its id on the server.
- **Every synced row gets `updated_at` and `deleted_at`.** A deletion has to reach the other phone, so rows are marked deleted instead of removed. Today a recipe with no meals is removed outright, and that changes.
- **Changes wait in a local queue** until they reach the server, and they survive restarts.
- **The web app must open offline.** That needs a service worker and `"output": "static"`, because `"server"` output needs a server to render the page. Without this, the iPhone PWA can't start with no internet, even with its data saved.

**Derived, not stored:**

- **"What do we eat tomorrow":** `meals` where `date = tomorrow` and `status = planned`.
- **History:** the person's `meals` where `status = eaten`, ordered by date.
- **Needs review ("Did you eat these?"):** the person's `meals` where `date < today` and `status = planned`.
- **Times eaten:** `count(*)` of the person's eaten meals where `is_leftovers = false`, grouped by `recipe_id`, so it means "how often we make this".
- **Last eaten:** `max(date)` of the person's eaten meals, grouped by `recipe_id`. Leftovers count here, because the dish was still eaten that day.

Access control: Supabase Row Level Security, so users only see their household's rows.

## 6. Quality and tooling

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `npm run check`  | Biome check and `tsc --noEmit` (same as CI)   |
| `npm test`       | Jest unit and component tests (same as CI)    |
| `npm run fix`    | Biome auto-fix (lint, format, import sorting) |
| `npm run doctor` | `expo-doctor` dependency and config checks    |

**Web E2E tests:** `npm test` inside `tests/automation/` builds the web app, serves it with `expo serve dist` and runs Playwright against that production build. Root Jest (`roots`) and `tsc` (`exclude`) skip that folder.

**CI:** `.github/workflows/ci.yml` runs on pull requests and on pushes to `main`, with three independent jobs: `check` (Biome, `tsc`, Jest), `build` (`expo export` for Android) and `e2e` (Playwright, which also builds the web bundle; its report is uploaded on failure). A clean checkout has no `.expo/types`, so CI's typecheck doesn't check typed routes; only a machine that has run the dev server does.

**TypeScript extras:** `noUncheckedIndexedAccess`, `noImplicitOverride` and `noFallthroughCasesInSwitch`.

**Biome:** single quotes, 2-space indentation, 100-character lines, `bracketSameLine`, and the React domain rules. `noReactNativeRawText` has to know which components render text. When you add a text-rendering component, add it to that rule's `skip` list in `biome.json`.

**Expo types:** `src/types/expo.d.ts` references `expo/types`. It mirrors the auto-generated, git-ignored `expo-env.d.ts`, so `tsc` also works in a clean CI checkout.

## 7. Decision log

Short records of important choices. Add new ones at the bottom.

| #   | Date       | Decision                                               | Why                                                                                           |
| --- | ---------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 1   | 2026-11-04 | Expo (React Native) over Flutter                       | One TS codebase for mobile and web, better web output, works from Linux                       |
| 2   | 2026-11-04 | Supabase as the backend (planned)                      | Shared household data across devices; real Postgres and auth are good for the CV              |
| 3   | 2026-11-04 | iPhone via PWA, Android via APK; no store publishing   | Personal use; avoids the Apple developer fee and the Mac requirement                          |
| 4   | 2026-11-04 | Biome instead of ESLint + Prettier                     | One fast tool and one config; Prettier-compatible formatting                                  |
| 5   | 2026-11-04 | TypeScript 6.0 (not 7)                                 | It's what Expo SDK 58 expects; TS 7 is too new for parts of the tooling ecosystem             |
| 6   | 2026-11-04 | Node 26 LTS                                            | Current Active LTS                                                                            |
| 7   | 2026-11-04 | "Fresh Market" design, Bricolage Grotesque + Inter     | Picked from the design mockups; light, card-based, tomato accent; own palette incl. dark mode |
| 8   | 2026-11-05 | Separate plan and history per person                   | We often eat different things; shared meals are copied, so each is marked independently       |
| 9   | 2026-11-05 | Build locally first, then move to Supabase             | See working screens sooner; syncing and real two-phone use wait for Milestone 3               |
| 10  | 2026-11-05 | Times eaten excludes leftovers                         | It should answer "how often do we make this", not count one pot of soup three times           |
| 11  | 2026-11-05 | AsyncStorage for local data, not `expo-sqlite`         | Works everywhere with no setup; SQLite on web needs wasm config and COOP/COEP headers         |
| 12  | 2026-11-05 | Offline-first: local data stays, and syncs to Supabase | Must keep working with no internet; replaces the plan to move data off the device             |
| 13  | 2026-11-05 | Playwright for web E2E, in its own package             | Covers web and the iPhone PWA, can test offline, and stays out of the app's dependencies      |
| 14  | 2026-11-05 | Public repo under the MIT license; merge through PRs   | Lets branch protection require green CI; good for the CV                                      |
