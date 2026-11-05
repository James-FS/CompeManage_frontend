import { defineConfig, devices } from '@playwright/test'

// 多学院并行填报测试：后端需已在 8080 运行（globalSetup 会做健康检查与播种），
// 前端 dev server 由 webServer 拉起在 5275，/api 代理到 localhost:8080。
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',')

export default defineConfig({
  globalSetup: './e2e/multi-college/global-setup.js',
  testDir: './e2e/multi-college',
  testMatch: /parallel-import\.spec\.js/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: './test-results/multi-college',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:5275',
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5275 --strictPort',
    url: 'http://127.0.0.1:5275',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
