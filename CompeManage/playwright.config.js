// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  // 排除项：
  // - prod-*：外部环境探测脚本，不属于产品回归口径
  // - multi-college：有专属 globalSetup 播种（test:multi-college 独立运行），主配置下状态文件必过期
  testIgnore: ['**/prod-*.spec.js', '**/multi-college/**'],
  globalSetup: './e2e/global-setup.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 2,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5219',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:5219',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});

