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
  const timeout = options.timeout || 15000

  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  // 展开管理员密码登录表单
  const adminToggle = page.locator('text=管理员账号登录')
  if (await adminToggle.isVisible().catch(() => false)) {
    await adminToggle.click()
    // 等待表单渲染
    await page.waitForSelector('input[placeholder="管理员用户名"]', { timeout: 5000 })
  }

  await page.fill('input[placeholder="管理员用户名"]', u.username)
  await page.fill('input[placeholder="密码"]', u.password)
  await page.locator('.login-btn, .login-form .el-button').last().click()

  await page.waitForURL((url) => url.hash.includes('home') || url.hash.includes('review'), {
    timeout,
  })
  await page.waitForLoadState('networkidle')
}
