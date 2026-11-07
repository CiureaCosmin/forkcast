# 🍴 Forkcast

**Plan what's for dinner, remember what you've had.**

Forkcast is a cross-platform meal planner for a household: save your recipes, plan what you'll eat in the coming days, and keep a history of what you've eaten and how often.

> 🚧 Early development. Recipes, planning and history work on the device, and sync between the household's phones through Supabase, offline included.

## Features

- **Recipes**: add and edit recipes with ingredients, steps, prep time and tags
- **Planner**: plan today and the coming days, per person, with quick meals and leftovers
- **History**: what you ate and when, and a review of meals nobody marked
- **Stats**: most-eaten dishes, how many times, and "not had in a while"

- **Household**: email and password accounts; the partner joins with an invite code
- **Offline first**: everything works with no internet; changes sync when you're back online

Later ideas: shopping list generated from the weekly plan, suggestions.

## Tech stack

| Area          | Choice                                                           |
| ------------- | ---------------------------------------------------------------- |
| App framework | [Expo](https://expo.dev) SDK 58 · React Native 0.88 · React 19.3 |
| Language      | TypeScript 6 (strict)                                            |
| Navigation    | Expo Router (file-based)                                         |
| Lint & format | [Biome](https://biomejs.dev)                                     |
| Git hooks     | [Lefthook](https://lefthook.dev)                                 |
| CI            | GitHub Actions                                                   |
| Backend       | [Supabase](https://supabase.com) (Postgres, Auth, RLS)           |

One codebase runs on **Android**, **iOS** and the **web**.

## Getting started

Requirements: Node.js 26 LTS (see `.nvmrc`). With [fnm](https://github.com/Schniz/fnm): `fnm use`.

```bash
npm install          # also installs the git hooks
npm start            # dev server: press w for web, or scan the QR code with Expo Go
```

| Script                            | What it does                                                        |
| --------------------------------- | ------------------------------------------------------------------- |
| `npm run web` / `android` / `ios` | Start the dev server for a platform                                 |
| `npm run check`                   | Biome (lint + format check) and TypeScript typecheck. CI runs this. |
| `npm test`                        | Jest unit and component tests. CI runs this.                        |
| `npm run fix`                     | Auto-fix lint and formatting issues                                 |
| `npm run typecheck`               | TypeScript only                                                     |
| `npm run doctor`                  | Check Expo dependency and config health                             |
| `npm run db:start` / `db:stop`    | Start or stop a local Supabase in Docker                            |
| `npm run db:test`                 | Database tests (schema, RLS, sync rules) against the local Supabase |
| `npm run db:reset`                | Rebuild the local database from the migrations                      |
| `npm run db:types`                | Regenerate `src/types/database.ts` from the local schema            |

### Backend (optional)

Without Supabase keys the app runs in **local mode**: data stays on the device, with sample recipes and two fixed people. To use accounts and sync:

1. **Local Supabase** (needs Docker): `npm run db:start`, then `npx supabase status` prints the API URL and publishable key. Studio is at http://127.0.0.1:54323 and the local inbox at http://127.0.0.1:54324.
2. Copy `.env.example` to `.env.local` and fill in the URL and key, then restart `npm start`.
3. **Hosted project:** `npx supabase login`, `npx supabase link --project-ref <ref>` and `npx supabase db push` apply the migrations. Put the project's URL and publishable key in `.env.local`.

## Project structure

```
src/
  app/          # screens and routes (Expo Router: every file is a route)
  components/   # reusable UI components
  constants/    # theme (colors, fonts, radii)
  data/         # store and sample data
  hooks/        # reusable React hooks
  lib/          # pure helpers (stats, recipes, meals)
  types/        # domain models and ambient type declarations
assets/         # images, icons, fonts
supabase/       # Supabase config, migrations and database tests
tests/automation/  # Playwright tests (a separate package)
docs/           # architecture and plan
```

## Docs

- [Architecture](docs/architecture.md): how the app is built and why (stack, structure, data model, decisions)
- [Plan](docs/plan.md): roadmap, to-do list, ideas and what's been done

## License

[MIT](LICENSE)
