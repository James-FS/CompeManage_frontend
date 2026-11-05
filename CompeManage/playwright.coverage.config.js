// @ts-check
// 覆盖率专用配置：
// 1. 独立端口 5220 + 不复用已有服务 —— 避免 5219 上的 dev server 被复用导致插桩产物
//    （vite-plugin-istanbul）没有被 E2E 实际加载，nyc 报 0%。
// 2. 排除 prod-* 探针脚本（外部环境探测用，不属于产品覆盖率口径）。
// 用法：npm run test:coverage
import { defineConfig, devices } from '@playwright/test'

// 代理环境下 Playwright 的 webServer 探活会走系统代理误判端口被占，必须豁免本地回环
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',');

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/prod-*.spec.js', '**/multi-college/**'],
  globalSetup: './e2e/global-setup.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 2,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5220',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run preview -- --port 5220',
    url: 'http://localhost:5220',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
