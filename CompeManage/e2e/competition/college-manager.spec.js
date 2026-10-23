import { test, expect } from 'playwright-test-coverage'

const caps = (allowed) => ({
  is_manager: allowed,
  can_edit_competition: allowed,
  can_edit_registration: allowed,
  can_edit_summary: allowed,
  can_reassign_manager: false,
  can_change_college: false,
})
const comp = (id, allowed) => ({
  id, comp_code: `X202600${id}`, comp_name: allowed ? '本人负责的赛事' : '其他负责人赛事',
  comp_level: '校级', comp_type: 'A类', year: 2026, status: 2,
  manager_id: allowed ? 10 : 11, manager: { id: allowed ? 10 : 11, realname: '负责人' },
  college_id: 2, college_info: { id: 2, name: '学院甲' },
  capabilities: caps(allowed), detail: {}, summary_status: 0,
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'college-manager-ui-test')
    localStorage.setItem('role', 'college_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 10, name: '院管理员' }))
  })
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url())
    let data = []
    if (url.pathname === '/api/comp/years') data = { years: [2026] }
    else if (url.pathname === '/api/college/list') data = [{ id: 2, name: '学院甲' }]
    else if (url.pathname === '/api/comp/list' || url.pathname === '/api/summary/list') data = { list: [comp(1, true), comp(2, false)], total: 2 }
    else if (/^\/api\/comp\/\d+$/.test(url.pathname)) data = comp(Number(url.pathname.split('/').pop()), url.pathname.endsWith('/1'))
    else if (url.pathname === '/api/reg/config/get') data = { comp_name: '赛事', capabilities: caps(url.searchParams.get('comp_id') === '1'), participant_type: 1, grade_requirement: [] }
    else if (/^\/api\/summary\/\d+$/.test(url.pathname)) data = { comp_name: '赛事总结', capabilities: caps(url.pathname.endsWith('/1')), award_stats: [], attachments: [], expenses: [] }
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
})

test('college administrator edits own competition without reassigning or moving college', async ({ page }) => {
  await page.goto('/#/competition/list')
  const own = page.locator('.el-table__body tr').filter({ hasText: '本人负责的赛事' })
  const other = page.locator('.el-table__body tr').filter({ hasText: '其他负责人赛事' })
  await expect(own.getByRole('button', { name: '编辑', exact: true })).toBeVisible()
  await expect(other.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
  await own.getByRole('button', { name: '编辑', exact: true }).click()
  await expect(page).toHaveURL(/competition\/edit\/1/)
  await expect(page.getByPlaceholder('请输入赛事名称')).toBeEnabled()
  await expect(page.getByPlaceholder('请选择赛事负责人')).toBeDisabled()
  await expect(page.getByRole('combobox', { name: '所属学院', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '保存', exact: true })).toBeEnabled()
})

test('direct editing of another competition returns to the list', async ({ page }) => {
  await page.goto('/#/competition/edit/2')
  await expect(page).toHaveURL(/competition\/list/)
})

test('registration configuration for another competition is read only', async ({ page }) => {
  await page.goto('/#/register/edit')
  await expect(page.getByRole('button', { name: '报名设置', exact: true })).toHaveCount(1)
  await expect(page.getByRole('button', { name: '查看配置', exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: '查看配置', exact: true }).click()
  await expect(page.getByRole('button', { name: '保存设置', exact: true })).toHaveCount(0)
  await expect(page.locator('.config-form input').first()).toBeDisabled()
})

test('summary writing is shown only for own competition', async ({ page }) => {
  await page.goto('/#/summary/summary-list')
  const own = page.locator('.el-table__body tr').filter({ hasText: '本人负责的赛事' })
  const other = page.locator('.el-table__body tr').filter({ hasText: '其他负责人赛事' })
  await expect(own.getByRole('button', { name: '去总结', exact: true })).toBeVisible()
  await expect(other.getByRole('button', { name: '去总结', exact: true })).toHaveCount(0)
  await expect(other.getByRole('button', { name: '查看详情', exact: true })).toBeVisible()
  await own.getByRole('button', { name: '去总结', exact: true }).click()
  await expect(page.getByRole('button', { name: '保存草稿', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: '提交归档', exact: true })).toBeEnabled()
})

test('own registration configuration can be edited', async ({ page }) => {
  await page.goto('/#/register/edit/1')
  await expect(page.getByRole('button', { name: '保存设置', exact: true })).toBeVisible()
  await expect(page.locator('.config-form input').first()).toBeEnabled()
})

test('direct summary editing for another competition returns to the list', async ({ page }) => {
  await page.goto('/#/summary/summary/edit/2')
  await expect(page).toHaveURL(/summary\/summary-list/)
})
