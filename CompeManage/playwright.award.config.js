import { defineConfig, devices } from '@playwright/test'
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',')
export default defineConfig({
  testDir: './e2e/award',
  // import.spec.js 仍保留旧版整批拒绝断言，与「部分导入」新交互不一致；
  // 导入主路径以 partial-import.spec 为准，待 import.spec 全面改写后再并回。
  testMatch: ['partial-import.spec.js', 'detail.spec.js', 'export.spec.js', 'student-declare.spec.js', 'my-competition.spec.js', 'audit.spec.js', 'advisor.spec.js'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: './test-results/award-workflow',
  use: { baseURL: 'http://127.0.0.1:5273', ...devices['Desktop Chrome'], screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5273 --strictPort', url: 'http://127.0.0.1:5273', reuseExistingServer: false, timeout: 60000 },
})
