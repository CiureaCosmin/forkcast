# Forkcast automation

Playwright tests for the web app. This folder is its own package, so nothing here touches the app's dependencies.

```bash
cd tests/automation
npm ci
npx playwright install chromium
npm test            # builds the web app, serves it and runs the tests
npm run test:ui     # the same, in Playwright's UI
npm run report      # opens the last HTML report
```

Tests live in `tests/` as `*.spec.ts`. Each test starts with empty browser storage, so the app is on its first launch.
