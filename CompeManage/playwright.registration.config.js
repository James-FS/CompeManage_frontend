import { defineConfig, devices } from '@playwright/test'
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',')
export default defineConfig({
  testDir: './e2e/register', testMatch: 'participation.spec.js', workers: 1, retries: 0, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5275', ...devices['Desktop Chrome'], screenshot: 'only-on-failure' },
  outputDir: './test-results/registration',
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5275 --strictPort', url: 'http://127.0.0.1:5275', reuseExistingServer: false, timeout: 60000 },
})
