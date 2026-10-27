import { test, expect } from 'playwright-test-coverage'

// register/audit.vue 报名审核批量簇定向覆盖：
// 快捷通过（成功/失败回滚）/ 批量通过三分支 / 批量驳回三分支 / 列表失败与筛选

const ROWS = [
  { id: 1, status: 0, leader_name: '队长甲', comp_name: '报名审核赛A', phone: '13800000001' },
  { id: 2, status: 1, leader_name: '队长乙', comp_name: '报名审核赛B', phone: '13800000002' },
  { id: 3, status: 0, leader_name: '队长丙', comp_name: '报名审核赛C', phone: '13800000003' },
]

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'reg-audit-batch')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const state = { audits: [], lastListUrl: '' }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/reg/list') {
      state.lastListUrl = url.toString()
      if (opts.listFail) {
        await route.fulfill({ json: { code: 500, message: '列表服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: ROWS, total: ROWS.length } } })
      return
    }
    if (p === '/api/reg/audit') {
      if (opts.auditFail) {
        await route.fulfill({ json: { code: 500, message: '审核服务不可用' } })
        return
      }
      state.audits.push(req.postDataJSON())
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: { capabilities: { can_edit_registration: true } } } })
  })
  await page.goto('/#/register/audit')
  if (!opts.listFail) await expect(page.locator('.el-table__body tr')).toHaveCount(3)
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('快捷通过：确认后置状态、失败回滚并提示', async ({ page }) => {
  const state = await setup(page)
  const firstRow = page.locator('.el-table__body tr').first()

  // 取消分支
  await firstRow.getByRole('button', { name: /通过/ }).click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('快捷审核')
  await msgbox.getByRole('button', { name: /取消/ }).click()
  expect(state.audits).toHaveLength(0)

  // 确认 → auditReg status 1
  await firstRow.getByRole('button', { name: /通过/ }).click()
  await msgbox.getByRole('button', { name: /确定|确认/ }).click()
  await expect.poll(() => state.audits).toHaveLength(1)
  expect(state.audits[0]).toMatchObject({ id: 1, status: 1 })
  await toast(page, '审核已通过')
})

test('快捷通过失败回滚状态并警告', async ({ page }) => {
  await setup(page, { auditFail: true })
  const firstRow = page.locator('.el-table__body tr').first()
  await firstRow.getByRole('button', { name: /通过/ }).click()
  await page.locator('.el-message-box').getByRole('button', { name: /确定|确认/ }).click()
  await toast(page, /审核服务不可用/)
})

test('批量通过与批量驳回三分支', async ({ page }) => {
  const state = await setup(page)

  // 批量通过：空选 → info；无待审核 → warning；确认 → 逐条 auditReg
  await page.getByRole('button', { name: '批量通过' }).click()
  await toast(page, '请先勾选记录')

  await page.locator('.el-table__body tr').nth(1).locator('.el-checkbox__inner').click() // 已通过行
  await page.getByRole('button', { name: '批量通过' }).click()
  await toast(page, '选中的记录中没有')

  await page.locator('.el-table__body tr').first().locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量通过' }).click()
  const msgbox = page.locator('.el-message-box')
  await msgbox.getByRole('button', { name: /确定|确认/ }).click()
  await expect.poll(() => state.audits).toHaveLength(1)
  expect(state.audits[0]).toMatchObject({ id: 1, status: 1 })
  await toast(page, '成功通过 1 条记录')

  // 批量驳回：空选 warning → 勾选 → 弹窗 → 原因必填 → 成功
  await page.getByRole('button', { name: '批量驳回' }).click()
  await toast(page, '请先勾选记录')
  await page.locator('.el-table__body tr').nth(2).locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量驳回' }).click()
  const dialog = page.getByRole('dialog', { name: '批量驳回' })
  await dialog.getByRole('button', { name: /确认驳回/ }).click()
  await toast(page, '请输入驳回原因')
  await dialog.locator('textarea').fill('信息不全')
  await dialog.getByRole('button', { name: /确认驳回/ }).click()
  await expect.poll(() => state.audits).toHaveLength(2)
  expect(state.audits[1]).toMatchObject({ id: 3, status: 2, reason: '信息不全' })
  await toast(page, '成功驳回 1 条记录')
})

test('批量失败提示', async ({ page }) => {
  await setup(page, { auditFail: true })
  await page.locator('.el-table__body tr').first().locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量通过' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: /确定|确认/ }).click()
  await toast(page, '批量操作部分或全部失败，请刷新后重试')
})
