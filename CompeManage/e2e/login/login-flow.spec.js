import { test, expect } from 'playwright-test-coverage'

// login.vue 定向覆盖：
// 登录成功双分支（普通/expert 跳转）、登录失败双分支（业务/网络静默）、
// CAS 回调 token 落库、CAS 错误回调、quickFill 测试账号

async function setup(page, opts = {}) {
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/login') {
      if (opts.netFail) {
        await route.abort('failed')
        return
      }
      if (opts.bizFail) {
        await route.fulfill({ json: { code: 401, message: '用户名或密码错误' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: {
        token: 'login-flow-token',
        userInfo: { id: 1, name: opts.expert ? '王专家' : '校管理员', username: 'T2023001', role: opts.expert ? 'expert' : 'school_admin' },
      } } })
      return
    }
    if (p === '/api/cas/login') {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html>cas</html>' })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  return page
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

async function doLogin(page) {
  await page.getByRole('button', { name: '管理员账号登录' }).click()
  await page.getByPlaceholder('管理员用户名').fill('T2023001')
  await page.getByPlaceholder('密码').fill('123')
  await page.getByRole('button', { name: '登录', exact: true }).click()
}

test('登录成功跳首页', async ({ page }) => {
  await setup(page)
  await page.goto('/#/login')
  await doLogin(page)
  await page.waitForURL(/home/) // 成功语义：跳转（toast 会被导航竞态影响）
})

test('expert 登录跳评审页', async ({ page }) => {
  await setup(page, { expert: true })
  await page.goto('/#/login')
  await doLogin(page)
  await page.waitForURL(/review\/expert/)
})

test('登录失败提示', async ({ page }) => {
  await setup(page, { bizFail: true })
  await page.goto('/#/login')
  await doLogin(page)
  await toast(page, /用户名或密码错误|登录失败/)
})

test('网络错误静默（拦截器已提示）', async ({ page }) => {
  await setup(page, { netFail: true })
  await page.goto('/#/login')
  await doLogin(page)
  await expect(page.locator('.el-message').filter({ hasText: '登录失败' })).toHaveCount(0)
})

test('CAS 回调 token 落库并跳首页', async ({ page }) => {
  await setup(page)
  await page.goto('/#/login?token=cas-tok-1&username=T2023005&realname=%E9%99%88%E8%80%81%E5%B8%88&role=teacher&user_id=77')
  await toast(page, '欢迎，陈老师')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBe('cas-tok-1')
  await expect.poll(() => page.evaluate(() => localStorage.getItem('role'))).toBe('teacher')
  await page.waitForURL(/home/)
})

test('CAS 错误回调提示并清参', async ({ page }) => {
  await setup(page)
  await page.goto('/#/login?cas_error=%E8%AE%A4%E8%AF%81%E5%A4%B1%E8%B4%A5')
  await toast(page, '认证失败')
  await expect.poll(() => new URL(page.url()).search).toBe('')
})

test('统一身份认证登录触发 CAS 跳转', async ({ page }) => {
  const state = { casHit: false }
  await setup(page)
  await page.route((url) => url.pathname === '/api/cas/login', async (route) => {
    state.casHit = true
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<html>cas</html>' })
  })
  await page.goto('/#/login')
  await page.getByRole('button', { name: '统一身份认证登录' }).click()
  await expect.poll(() => state.casHit, { timeout: 8000 }).toBe(true)
})
