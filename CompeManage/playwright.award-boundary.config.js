import { defineConfig, devices } from '@playwright/test'

// 获奖导入边界回归：后端需已在 8080 运行。
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',')

export default defineConfig({
  testDir: './e2e/award-boundary',
  testMatch: /import-boundary\.spec\.js/,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: './test-results/award-boundary',
  timeout: 180_000,
  use: {
    baseURL: 'http://127.0.0.1:5277',
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5277 --strictPort',
    url: 'http://127.0.0.1:5277',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
