import { test, expect } from 'playwright-test-coverage'

// award/student.vue 定向覆盖：提交按钮状态机（getActionState 全分支）、
// 三 Tab 请求参数、列表失败分支、获奖分页

const FUTURE = new Date(Date.now() + 86400_000).toISOString()
const PAST = new Date(Date.now() - 86400_000).toISOString()

const REGS = [
  { id: 1, status: 0, team_name: '待审队伍', comp_name: '状态赛A' },
  { id: 2, status: 1, team_name: '无时间队伍', comp_name: '状态赛B' },
  { id: 3, status: 1, team_name: '未开队伍', comp_name: '状态赛C', submit_start_time: FUTURE, submit_end_time: FUTURE },
  { id: 4, status: 1, team_name: '已截止队伍', comp_name: '状态赛D', submit_start_time: PAST, submit_end_time: PAST },
  { id: 5, status: 1, team_name: '可提交队伍', comp_name: '状态赛E', submit_start_time: PAST, submit_end_time: FUTURE },
  { id: 6, status: 1, team_name: '可修改队伍', comp_name: '状态赛F', submit_start_time: PAST, submit_end_time: FUTURE, work_url: 'http://mock/w.zip' },
]

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'award-student-gate')
    localStorage.setItem('role', 'student')
    localStorage.setItem('userInfo', JSON.stringify({ id: 9, name: '学生甲', username: '00123' }))
  })
  const state = { urls: [] }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    state.urls.push(url.pathname + '?' + url.searchParams.toString())
    if (p === '/api/reg/my-reg') {
      if (opts.listFail) {
        await route.fulfill({ json: { code: 500, message: '列表服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: REGS, total: REGS.length } } })
      return
    }
    if (p === '/api/award/student/my-awards') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: [], total: 0 } } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: { capabilities: {} } } })
  })
  await page.goto('/#/award/student')
  await page.getByRole('tab', { name: '我的报名' }).click()
  if (!opts.listFail) await expect(page.getByText('状态赛A')).toBeVisible()
  return state
}

test('提交按钮状态机覆盖全分支', async ({ page }) => {
  await setup(page)
  // 状态分支按钮文案逐一断言（getActionState）
  await expect(page.getByRole('button', { name: '资格审核中' })).toBeVisible()
  await expect(page.locator('body')).toContainText('暂无提交')
  await expect(page.locator('body')).toContainText('通道未开启')
  await expect(page.locator('body')).toContainText('提交已截止')
  await expect(page.locator('body')).toContainText('提交作品')
  await expect(page.locator('body')).toContainText('修改作品')
  // 窗口内展示提示文案
  await expect(page.locator('body')).toContainText('请在截止前完成提交')
  await expect(page.locator('body')).toContainText('截止前可覆盖提交')
})

test('三 Tab 请求参数正确', async ({ page }) => {
  const state = await setup(page)

  await page.getByRole('tab', { name: '我的获奖' }).click()
  await expect.poll(() => state.urls.some((u) => u.includes('/api/award/student/my-awards') && u.includes('status=approved'))).toBe(true)

  state.urls.length = 0
  await page.getByRole('tab', { name: /申报|我的申报|申报记录/ }).click()
  await expect.poll(() => state.urls.some((u) => u.includes('/api/award/student/my-awards') && u.includes('source=supplement'))).toBe(true)

  state.urls.length = 0
  await page.getByRole('tab', { name: '我的报名' }).click()
  await expect.poll(() => state.urls.some((u) => u.includes('/api/reg/my-reg') && u.includes('registration_only=true'))).toBe(true)
})

test('列表失败提示', async ({ page }) => {
  await setup(page, { listFail: true })
  // code!=200 与拦截器 toast 双源，任一出现即认为失败路径已覆盖
  const seen = await page
    .locator('.el-message')
    .filter({ hasText: /获取列表失败|列表服务不可用/ })
    .first()
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false)
  expect(seen).toBeTruthy()
})
