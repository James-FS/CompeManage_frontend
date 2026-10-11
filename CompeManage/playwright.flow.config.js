import { defineConfig, devices } from '@playwright/test'

// 获奖填报全流程测试：后端需已在 8080 运行（globalSetup 会做健康检查），
// 前端 dev server 由 webServer 拉起在 5274 端口，/api 代理到 localhost:8080。
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',')

export default defineConfig({
  globalSetup: './e2e/global-setup-award-flow.js',
  testDir: './e2e/flow',
  testMatch: /award-fill-flow\.spec\.js/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: './test-results/award-flow',
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:5274',
    ...devices['Desktop Chrome'],
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5274 --strictPort',
    url: 'http://127.0.0.1:5274',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
