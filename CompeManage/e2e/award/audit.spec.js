import { test, expect } from '@playwright/test'

async function setup(page, fail = false) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'manager-ui-test')
    localStorage.setItem('role', 'competition_manager')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '赛事负责人' }))
  })
  const record = { id: 7, student_name: '学生甲', comp_name: '数学建模', project_name: '申报项目', status: 0, award_level: '省级一等奖', award_name: '一等奖', update_time: '2026-10-19T09:00:00+08:00' }
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (route.request().method() === 'PUT' && fail) {
      await route.fulfill({ status: 403, json: { msg: '赛事不存在或不在可访问范围' } })
      return
    }
    let data = []
    if (path === '/api/award/audit/list') data = { list: [record], total: 1 }
    if (path === '/api/award/audit/detail/7') data = record
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
}

test('负责人快捷通过申报后更新审核状态', async ({ page }) => {
  await setup(page)
  await page.goto('/#/award/audit')
  const row = page.getByRole('row').filter({ hasText: '学生甲' })
  await row.getByRole('button', { name: '通过', exact: true }).click()
  const request = page.waitForRequest(request => request.method() === 'PUT' && request.url().endsWith('/7/pass'))
  await page.getByRole('button', { name: '确定通过', exact: true }).click()
  expect((await request).postDataJSON().update_time).toBe('2026-10-19T09:00:00+08:00')
  await expect(row.getByText('已通过', { exact: true })).toBeVisible()
})

test('快捷审核 403 只提示一次，记录仍待审核', async ({ page }) => {
  await setup(page, true)
  await page.goto('/#/award/audit')
  const row = page.getByRole('row').filter({ hasText: '学生甲' })
  await row.getByRole('button', { name: '通过', exact: true }).click()
  await page.getByRole('button', { name: '确定通过', exact: true }).click()
  await expect(page.locator('.el-message')).toHaveCount(1)
  await expect(page.locator('.el-message')).toHaveText('赛事不存在或不在可访问范围')
  await expect(row.getByText('待审核', { exact: true })).toBeVisible()
})

test('详情审核 403 只提示一次，取消确认不会发起审核', async ({ page }) => {
  await setup(page, true)
  let mutations = 0
  page.on('request', request => { if (request.method() === 'PUT') mutations++ })
  await page.goto('/#/award/audit/detail/7')
  await page.getByRole('button', { name: '通过审核', exact: true }).click()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  expect(mutations).toBe(0)
  await expect(page.locator('.el-message')).toHaveCount(0)
  await page.getByRole('button', { name: '通过审核', exact: true }).click()
  await page.getByRole('button', { name: '确定通过', exact: true }).click()
  await expect(page.locator('.el-message')).toHaveCount(1)
  await expect(page.locator('.el-message')).toHaveText('赛事不存在或不在可访问范围')
})
