import { defineConfig, devices } from '@playwright/test';

const PORT = 8100;

// WebKit is closest to iPhone Safari, which runs the PWA. It needs Ubuntu's libraries, so it runs
// in CI, and locally only when asked for (`npm run test:webkit`).
const withWebKit = !!process.env.CI || !!process.env.PW_WEBKIT;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Pixel 7'] } },
    ...(withWebKit ? [{ name: 'webkit', use: { ...devices['iPhone 15'] } }] : []),
  ],
  // Tests the production web build, from the repo root, so a stale dev server can't mislead them.
  webServer: {
    command: `npx expo export --platform web && npx expo serve dist --port ${PORT}`,
    cwd: '../..',
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
