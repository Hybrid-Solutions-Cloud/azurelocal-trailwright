import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/browser',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4331 --strictPort',
    port: 4331,
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