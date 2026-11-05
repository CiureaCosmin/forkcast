# 🍴 Forkcast

**Plan what's for dinner, remember what you've had.**

Forkcast is a cross-platform meal planner for a household: save your recipes, plan what you'll eat in the coming days, and keep a history of what you've eaten and how often.

> 🚧 Early development. Recipes, planning and history work and are saved on the device. The backend and offline sync come next.

## Features

- **Recipes**: add and edit recipes with ingredients, steps, prep time and tags
- **Planner**: plan today and the coming days, per person, with quick meals and leftovers
- **History**: what you ate and when, and a review of meals nobody marked
- **Stats**: most-eaten dishes, how many times, and "not had in a while"

Later ideas: shopping list generated from the weekly plan, suggestions, shared household accounts.

## Tech stack

| Area              | Choice                                                           |
| ----------------- | ---------------------------------------------------------------- |
| App framework     | [Expo](https://expo.dev) SDK 58 · React Native 0.88 · React 19.3 |
| Language          | TypeScript 6 (strict)                                            |
| Navigation        | Expo Router (file-based)                                         |
| Lint & format     | [Biome](https://biomejs.dev)                                     |
| Git hooks         | [Lefthook](https://lefthook.dev)                                 |
| CI                | GitHub Actions                                                   |
| Backend (planned) | Supabase (Postgres + Auth)                                       |

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
tests/automation/  # Playwright tests (a separate package)
docs/           # architecture and plan
```

## Docs

- [Architecture](docs/architecture.md): how the app is built and why (stack, structure, data model, decisions)
- [Plan](docs/plan.md): roadmap, to-do list, ideas and what's been done

## License

[MIT](LICENSE)
