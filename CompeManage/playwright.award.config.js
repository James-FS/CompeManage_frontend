import { defineConfig, devices } from '@playwright/test'
process.env.NO_PROXY = [process.env.NO_PROXY, 'localhost', '127.0.0.1', '::1'].filter(Boolean).join(',')
export default defineConfig({
  testDir: './e2e/award',
  testMatch: ['import.spec.js', 'detail.spec.js', 'export.spec.js', 'student-declare.spec.js'],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: './test-results/award-workflow',
  use: { baseURL: 'http://127.0.0.1:5273', ...devices['Desktop Chrome'], screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5273 --strictPort', url: 'http://127.0.0.1:5273', reuseExistingServer: false, timeout: 60000 },
})
