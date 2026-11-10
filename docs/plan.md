# Forkcast plan

The working plan: what's done, what's next, and ideas for later. Tick items off as they're finished and move them to **Done**, with the date. For how things are built, see [architecture.md](./architecture.md).

_Last updated: 2026-11-10_

## In progress

Nothing in flight: `main` has all the work, and CI passes on it. Next is trying the backend on both phones (Milestone 3) and shipping to our devices (Milestone 4).

## Next up

### Test automation

- [ ] Offline test: the PWA opens and saves with the network off (after the service worker)
- [ ] Mobile automation for the Android app (Appium, WebdriverIO or Maestro)

Product rules are in [architecture.md, section 5](./architecture.md#5-product-rules-and-data-model).

### Milestone 3: Backend and offline sync (Supabase)

- [ ] Decide on "Confirm email" in the project's auth settings (the app handles both)
- [ ] Try it on both phones: sign up, join with the code, plan offline, sync
- [ ] Recipe photos in Supabase Storage
- [ ] Backend E2E tests: Playwright against a local Supabase, also in CI (Docker on the runner)
- [ ] Change your name, and leave a household
- [ ] Reset a forgotten password (needs email sending set up in Supabase)

### Milestone 4: Ship it to our devices

- [ ] Switch the web output to `"static"` (`app.json` has `"server"`, which can't open offline)
- [ ] Service worker so the PWA opens with no internet, tested in airplane mode on iPhone
- [ ] Deploy the web version (Vercel, Netlify or EAS Hosting)
- [ ] PWA setup: manifest and icons, tested with "Add to Home Screen" on iPhone
- [ ] Android APK via an EAS build, installed on our phones
- [ ] Our own app icon and splash screen (replace the Expo defaults, incl. the blue splash background)
- [ ] Web tab bar: pad for the iPhone home indicator if the PWA uses `viewport-fit=cover`
- [ ] Check the native tab bar, icons and safe areas on real Android and iPhone devices
- [ ] Check the recipe form on a real Android phone: keyboard, modal and the discard prompt on the back button

## Ideas (backlog)

- Shopping list generated from the week's plan (needs ingredient quantities and units in the recipe form)
- "Suggest something": recipes we haven't eaten in a while, with a "Plan it" button on the History banner
- Plan more than a week ahead (the strip shows yesterday plus the next five days)
- Add a new recipe from the meal picker
- Weekly planner view (drag and drop)
- Favorite recipes and ratings
- Portions and scaling ingredients
- Import a recipe from a URL
- Dark mode polish (the palette itself is done; check it on devices)
- Romanian and English UI (i18n); the UI stays in English until then, with text kept easy to translate
- Notifications ("What's for dinner tonight?")

## Open questions

- Is AsyncStorage enough once meals build up? `localStorage` holds only about 5 MB.
- Live updates (Supabase Realtime) instead of syncing every minute, or is a minute fine?

## Done

### 2026-11-10: First CI run and `main` protected

- [x] Merged the CI pipeline, the Playwright suite and the Supabase backend into `main` (PR #1); all three CI jobs passed on the first run
- [x] WebKit (iPhone 15) runs next to Chromium in the Playwright CI job, and passed on its first run
- [x] Deleted the merged branches, leaving only `main`
- [x] Protected `main`: changes go through pull requests, and the three CI jobs must pass

### 2026-11-08: Hosted Supabase project

- [x] Connected the repo to the hosted project: URL and publishable key in the git-ignored `.env`, CLI linked
- [x] Applied the migrations with `npx supabase db push --remote -p <database password>`; signed-out reads return nothing, and signed-out writes and `join_household` are refused

### 2026-11-07: Milestone 3, backend and offline sync

- [x] Local Supabase in Docker (`npm run db:start`), with the CLI as a dev dependency
- [x] Schema and migration: households, members, recipes, meals, with sync columns
- [x] Row Level Security, and pgTAP tests for it (`npm run db:test`)
- [x] Email and password sign-up and sign-in
- [x] Start a household, or join one with its invite code; real names for the people
- [x] Moving the device's existing data into a new household
- [x] Offline sync: a persistent outbox, push then pull, latest edit wins, soft deletes
- [x] Show when changes haven't synced, a Household screen, signing in again and signing out
- [x] Local mode stays when no keys are set, so the app and its tests run without a backend
- [x] Checked end to end in a browser against the local Supabase: two people, copy to partner, offline changes, deletions
- Answered: our own sync (decision 18), the latest edit wins, households share an invite code (decision 19)

### 2026-11-07: Page objects and core-flow tests

- [x] Page objects for every screen (`tests/automation/pages/`) and fixtures that hand them to tests
- [x] 81 Playwright tests: first launch and tabs, recipes (search, tags, add, validation, edit, delete or archive, discard prompt), plan (marking, quick meals, the day strip, copy to partner, leftovers, partner's read-only view), the review list, history and stats, failed saves and unreadable data
- [x] Filled the gaps from a feature-by-feature check (ingredient search, tag changes, edit discard, failed deletes, archived recipes, leftovers edge cases, banner recovery and more); the coverage table is in `tests/automation/README.md`
- [x] Fixed: accepting "Discard changes?" on the recipe form didn't leave the form (`usePreventRemove` now needs `repeat()`)
- [x] Fixed: selected chips, days and tabs didn't expose `aria-selected` on the web

### 2026-11-05: CI pipeline

- [x] Three CI jobs: lint, types and Jest; Android bundle; Playwright in Chromium
- [x] MIT license

### 2026-11-05: Playwright setup

- [x] Playwright in `tests/automation/` as its own package, with a sanity test that plans a meal

### 2026-11-05: Milestone 2, planning and history

- [x] `updatedAt` on recipes and meals
- [x] Two people, a "who's using this phone" choice and a read-only view of the partner's plan and history
- [x] Pick a recipe or quick meal for a day and meal type, or log it directly as eaten
- [x] Today and Tomorrow view, with breakfast, lunch and dinner
- [x] Mark a meal as eaten or skipped, or put it back to planned
- [x] "Copy to partner", and leftovers for the next day
- [x] "Did you eat these?" review for past unmarked meals
- [x] History by date and stats, per person, with leftovers left out of "times eaten"
- [x] Save queue and an app-wide banner for failed meal saves

### 2026-11-05: Milestone 1, recipes

- [x] Local storage with AsyncStorage, saved across restarts (decision 11)
- [x] Updated models: no snacks; people, quick meals, leftovers and recipe archiving
- [x] Add and edit recipe form, with only the name required and a prompt before losing changes
- [x] Recipe detail screen
- [x] Delete a recipe with a confirmation, archiving it if it has meals
- [x] Jest and React Native Testing Library, with tests in CI

### 2026-11-05: Product decisions

- [x] Agreed the product rules: per-person plans, three meal types, optional recipe detail, quick meals, leftovers and the review of unmarked meals
- [x] Chose local-first, then Supabase

### 2026-11-04: Fresh Market design

- [x] Replaced the template's demo screens with Forkcast tabs: Recipes, Plan, History (on sample data)
- [x] Recipe and meal model and TypeScript types
- [x] Our own color palette (light and dark), fonts and shared components
- [x] Recipe list screen with search and tag filters (on sample data)
- [x] Design mockup of the three tabs: https://claude.ai/artifact/4iBBbsXqdhxhfL5RGzafML (direction A chosen)

### 2026-11-04: Project setup

- [x] Chose the stack: Expo, TypeScript, Expo Router and Supabase (planned)
- [x] Picked the name: **Forkcast**
- [x] Installed Node 26 LTS via fnm
- [x] Scaffolded the app with Expo SDK 58 (React Native 0.88, React 19.3)
- [x] TypeScript 6.0 with strict settings (tried TS 7, switched back for compatibility)
- [x] Biome for linting and formatting
- [x] Lefthook pre-commit hook
- [x] GitHub Actions CI workflow
- [x] README, architecture and plan docs
- [x] First commit
