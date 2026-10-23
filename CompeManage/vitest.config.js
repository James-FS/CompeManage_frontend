import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

// 前端单元测试（Vitest）：仅覆盖 src/ 下的纯函数与 store，
// E2E 仍在 e2e/ 目录用 Playwright（互不冲突：vitest 只收 *.test.js）。
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js'],
  },
})
