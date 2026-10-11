// @ts-check
// 上线前发布测试配置：本地前后端已启动时直接运行，不重复起服务
// 运行：npx playwright test e2e/release --config=playwright.release.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/release',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE || 'http://localhost:5219',
    trace: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
