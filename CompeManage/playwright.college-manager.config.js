import { defineConfig, devices } from '@playwright/test'

process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',')

// API fixtures exercise UI permission boundaries without changing application data.
export default defineConfig({
  testDir: './e2e/competition',
  testMatch: 'college-manager.spec.js',
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: './test-results/college-manager',
  use: {
    baseURL: 'http://127.0.0.1:5283',
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 5283 --strictPort',
    url: 'http://127.0.0.1:5283',
    reuseExistingServer: false,
    timeout: 60000,
  },
})
