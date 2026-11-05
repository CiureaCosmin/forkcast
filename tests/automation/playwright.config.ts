import { defineConfig, devices } from '@playwright/test';

const PORT = 8100;

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
  projects: [{ name: 'chromium', use: { ...devices['Pixel 7'] } }],
  // Tests the production web build, from the repo root, so a stale dev server can't mislead them.
  webServer: {
    command: `npx expo export --platform web && npx expo serve dist --port ${PORT}`,
    cwd: '../..',
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
