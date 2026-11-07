This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Project docs

- `docs/architecture.md`: read it before structural changes, and update it (including the decision log) when the architecture changes.
- `docs/plan.md`: tick off finished items, move them to **Done** with the date, and add new ideas to the backlog.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npm run check               # Biome lint/format check + TypeScript typecheck
npm run fix                 # auto-fix lint and formatting (Biome)
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
npm run db:start            # local Supabase in Docker (db:stop, db:reset, db:test, db:types)
```

Run `npm run check` before declaring any task done (and `npm run db:test` after database changes).

## Database (Supabase)

- The schema lives in `supabase/migrations/`. Never edit an applied migration: add a new one (`npx supabase migration new <name>`), then run `npm run db:reset`, `npm run db:test` and `npm run db:types` (regenerates `src/types/database.ts`).
- Every table needs Row Level Security. Synced tables keep `updated_at`, `deleted_at` and `server_updated_at` (see `docs/architecture.md`, section 5), and rows are never hard-deleted.
- Without `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` the app runs in local mode. Keep both modes working: the Playwright tests use local mode. Linting and formatting use Biome (`biome.json`), not ESLint or Prettier. TypeScript is pinned to the version Expo expects (6.0); `tsc` is only used for type checking, since Babel/Metro does the transpiling.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
