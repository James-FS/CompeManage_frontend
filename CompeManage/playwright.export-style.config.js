import { defineConfig, devices } from '@playwright/test'

// 大量赛事导出 Excel 样式测试：后端需已在 8080，2025 数据需已播种。
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',')

export default defineConfig({
  testDir: './e2e/export-style',
  testMatch: /export-report\.spec\.js/,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: './test-results/export-style',
  timeout: 150_000,
  use: {
    baseURL: 'http://127.0.0.1:5276',
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
    acceptDownloads: true,
    actionTimeout: 20_000,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5276 --strictPort',
    url: 'http://127.0.0.1:5276',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
