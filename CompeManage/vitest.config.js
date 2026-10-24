import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'

// 前端单元测试（Vitest）：src/ 下纯函数、store、api 与组件挂载测试（@vue/test-utils）。
// E2E 仍在 e2e/ 目录用 Playwright（互不冲突：vitest 只收 *.test.js）。
export default defineConfig({
  plugins: [vue()],
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
