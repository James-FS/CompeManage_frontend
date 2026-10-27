/**
 * 共享登录辅助函数
 *
 * 登录页面改版后，密码登录表单默认折叠，需要先点击"管理员账号登录"展开。
 */

// 默认测试用户
export const DEFAULT_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
}

/**
 * 登录并等待跳转到首页
 * @param {import('@playwright/test').Page} page
 * @param {{ username: string, password: string, role?: string }} [user]
 * @param {{ timeout?: number }} [options]
 */
export async function login(page, user, options = {}) {
  const u = user || DEFAULT_USER
  const timeout = options.timeout || 30000

  // 移除 Vue DevTools 悬浮按钮（Vue 应用挂载后才创建，用观察器持续清除），
  // 避免其遮挡页面底部元素（分页等）导致点击被拦截
  await page.addInitScript(() => {
    const removeDevtools = () => {
      const el = document.getElementById('__vue-devtools-container__')
      if (el) el.remove()
    }
    removeDevtools()
    new MutationObserver(removeDevtools).observe(document.documentElement, {
      childList: true,
      subtree: true,
    })
  })

  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  // 展开管理员密码登录表单
  // 展开密码登录表单。带重试：页面可能被 401 拦截器重定向到 /login 或整体刷新，
  // 导致展开动作与导航互相打断（work-audit 等多账号切换场景易触发）。
  for (let attempt = 0; attempt < 3; attempt++) {
    const adminToggle = page.locator('button:has-text("管理员账号登录")').first()
    if (await adminToggle.isVisible().catch(() => false)) {
      await adminToggle.click().catch(() => {})
    }
    const formVisible = await page
      .waitForSelector('input[placeholder="管理员用户名"]', { timeout: 8000 })
      .then(() => true)
      .catch(() => false)
    if (formVisible) break
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
  }

  await page.fill('input[placeholder="管理员用户名"]', u.username)
  await page.fill('input[placeholder="密码"]', u.password)
  await page.locator('.login-btn, .login-form .el-button').last().click()

  await page.waitForURL((url) => url.hash.includes('home') || url.hash.includes('review'), {
    timeout,
  })
  await page.waitForLoadState('networkidle')

  // 登录落地后直接移除 DevTools 悬浮容器（其遮挡底部内容会拦截点击）
  await page
    .evaluate(() => document.getElementById('__vue-devtools-container__')?.remove())
    .catch(() => {})
}
