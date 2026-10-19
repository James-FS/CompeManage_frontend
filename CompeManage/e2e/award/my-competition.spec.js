import { test, expect } from '@playwright/test'
const awards = [
  { id: 1, project_name: '待审核项目', status: 'draft', source: 'supplement' },
  { id: 2, project_name: '已通过申报项目', status: 'approved', source: 'supplement' },
  { id: 3, project_name: '驳回项目', status: 'rejected', source: 'supplement', reject_reason: '证书信息不完整' },
  { id: 4, project_name: '系统导入项目', status: 'approved', source: 'import' },
].map(a => ({ ...a, comp_id: 7, competition: { comp_name: '数学建模竞赛' }, award_level: '国家级一等奖', award_name: '一等奖', award_time: '2026-10-12', create_time: '2026-10-12T10:00:00+08:00' }))
async function setup(page) {
  const queries = []
  await page.addInitScript(() => {
    localStorage.setItem('token', 'student-ui-test'); localStorage.setItem('role', 'student')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, username: '00123', name: '学生甲' }))
  })
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url())
    let data = []
    if (url.pathname === '/api/reg/my-reg') {
      expect(url.searchParams.get('registration_only')).toBe('true')
      data = { list: [{ id: 10, comp_id: 7, comp_name: '已报名赛事', status: 1 }], total: 1 }
    }
    if (url.pathname === '/api/award/student/my-awards') {
      const query = Object.fromEntries(url.searchParams); queries.push(query)
      const list = awards.filter(a => (!query.source || a.source === query.source) && (!query.status || a.status === query.status))
      data = { list, total: list.length }
    }
    if (url.pathname === '/api/reg/user/list') data = { list: [{ id: 1, name: '学生甲', username: '00123', college: '学院甲' }], total: 1 }
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
  await page.goto('/#/award/student')
  await expect(page.getByRole('button', { name: '申报奖项', exact: true })).toBeVisible()
  return queries
}
test('三个标签顺序正确；申报展示审核状态，获奖仅展示已通过记录', async ({ page }) => {
  const queries = await setup(page)
  await expect(page.getByRole('tab')).toHaveText(['我的报名', '我的申报', '我的获奖'])
  await expect(page.getByText('已报名赛事', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: '我的申报', exact: true }).click()
  await expect(page.getByText('参赛项目：待审核项目', { exact: true })).toBeVisible()
  await expect(page.getByText('参赛项目：已通过申报项目', { exact: true })).toBeVisible()
  await expect(page.getByText('驳回原因：证书信息不完整')).toBeVisible()
  await expect(page.getByRole('button', { name: '重新申报' })).toBeVisible()
  await expect(page.getByText('参赛项目：系统导入项目', { exact: true })).toHaveCount(0)
  expect(queries.at(-1)).toMatchObject({ source: 'supplement', page: '1', size: '10' })
  await page.getByRole('tab', { name: '我的获奖', exact: true }).click()
  await expect(page.getByText('参赛项目：系统导入项目', { exact: true })).toBeVisible()
  await expect(page.getByText('参赛项目：已通过申报项目', { exact: true })).toBeVisible()
  await expect(page.getByText('参赛项目：待审核项目', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '重新申报' })).toHaveCount(0)
  expect(queries.at(-1)).toMatchObject({ status: 'approved', page: '1' })
  await page.reload()
  await expect(page.getByRole('tab', { name: '我的获奖', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('参赛项目：系统导入项目', { exact: true })).toBeVisible()
})
test('我的申报中的重新申报携带原项目和赛事数据', async ({ page }) => {
  await setup(page)
  await page.getByRole('tab', { name: '我的申报', exact: true }).click()
  await page.getByRole('button', { name: '重新申报', exact: true }).click()
  await expect(page).toHaveURL(/award\/student\/declare\?comp_id=7/)
  await expect(page.getByPlaceholder('请输入参赛项目名称，同一赛事通过项目名称区分团队')).toHaveValue('驳回项目')
})
