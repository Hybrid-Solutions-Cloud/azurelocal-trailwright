import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  // On the runner: one retry for timing noise, and GitHub annotations so a failure names its test and step.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4331 --strictPort',
    port: 4331,
    // Building first can take longer than Playwright's 60 second default on a slow machine.
    timeout: 180_000,
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: 'http://localhost:4331'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});