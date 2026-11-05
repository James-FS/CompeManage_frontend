import { test, expect } from 'playwright-test-coverage'

// award/audit.vue 批量审核与筛选定向覆盖：
// handleReset / handleBatchPass 三分支 / openBatchRejectDialog 两分支 / handleBatchReject 三分支

const ROWS = [
  { id: 1, student_name: '学生甲', status: 0, update_time: '2026-10-01T00:00:00Z', comp_name: '审核赛事A', award_level: '一等奖' },
  { id: 2, student_name: '学生乙', status: 1, update_time: '2026-10-02T00:00:00Z', comp_name: '审核赛事B', award_level: '二等奖' },
  { id: 3, student_name: '学生丙', status: 0, update_time: '2026-10-03T00:00:00Z', comp_name: '审核赛事C', award_level: '三等奖' },
]

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'award-audit-batch')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const state = { passReq: undefined, rejectReq: undefined, lastListUrl: '' }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/award/audit/list') {
      state.lastListUrl = url.toString()
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: ROWS, total: ROWS.length } } })
      return
    }
    if (p === '/api/award/audit/batch/pass') {
      if (opts.passFail) {
        await route.fulfill({ json: { code: 500, message: '审核服务不可用' } })
        return
      }
      state.passReq = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p === '/api/award/audit/batch/reject') {
      if (opts.rejectFail) {
        await route.fulfill({ json: { code: 500, message: '审核服务不可用' } })
        return
      }
      state.rejectReq = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fallback()
  })
  await page.goto('/#/award/audit')
  await expect(page.locator('.el-table__body tr')).toHaveCount(3)
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('批量通过：空选/无待审核拦截与确认通过', async ({ page }) => {
  const state = await setup(page)

  // ① 未勾选
  await page.getByRole('button', { name: '批量通过' }).click()
  await toast(page, '请先勾选记录')

  // ② 勾选的全是已审核（status=1）→ 无待审核拦截
  await page.locator('.el-table__body tr').nth(1).locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量通过' }).click()
  await toast(page, '选中的记录中没有"待审核"项')

  // ③ 再勾选待审核行 → 确认框 → 成功（仅待审核参与）
  await page.locator('.el-table__body tr').first().locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量通过' }).click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('批量通过')
  await msgbox.getByRole('button', { name: '确定' }).click()
  await expect.poll(() => state.passReq).toBeTruthy()
  expect(state.passReq.ids).toEqual([1])
  await toast(page, '成功通过 1 条记录')
})

test('批量驳回：空选拦截、原因必填与确认驳回', async ({ page }) => {
  const state = await setup(page)

  // 未勾选 → 拦截
  await page.getByRole('button', { name: '批量驳回' }).click()
  await toast(page, '请先勾选记录')

  // 勾选待审核行 → 打开弹窗
  await page.locator('.el-table__body tr').first().locator('.el-checkbox__inner').click()
  await page.locator('.el-table__body tr').nth(2).locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量驳回' }).click()
  const dialog = page.getByRole('dialog', { name: '批量驳回获奖申报' })
  await expect(dialog).toBeVisible()

  // 空原因 → 拦截
  await dialog.getByRole('button', { name: /确认驳回/ }).click()
  await toast(page, '请输入驳回原因')

  // 填原因 → 确认 → 成功
  await dialog.getByPlaceholder('请输入驳回原因（必填）').fill('材料不清晰')
  await dialog.getByRole('button', { name: /确认驳回/ }).click()
  await expect.poll(() => state.rejectReq).toBeTruthy()
  expect(state.rejectReq.ids).toEqual([1, 3])
  await toast(page, '成功驳回 2 条记录')
})

test('批量通过接口失败提示', async ({ page }) => {
  await setup(page, { passFail: true })
  await page.locator('.el-table__body tr').first().locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量通过' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click()
  await toast(page, /审核服务不可用|批量审核失败/)
})

test('批量驳回接口失败提示', async ({ page }) => {
  await setup(page, { rejectFail: true })
  await page.locator('.el-table__body tr').first().locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量驳回' }).click()
  const dialog = page.getByRole('dialog', { name: '批量驳回获奖申报' })
  await dialog.getByPlaceholder('请输入驳回原因（必填）').fill('材料不清晰')
  await dialog.getByRole('button', { name: /确认驳回/ }).click()
  await toast(page, /审核服务不可用|批量审核失败/)
})

test('筛选重置清空条件并刷新列表', async ({ page }) => {
  const state = await setup(page)

  await page.getByPlaceholder('请输入赛事名称').fill('审核赛事A')
  await page.getByPlaceholder('请输入姓名或学号').fill('学生甲')
  await page.getByRole('button', { name: /搜索/ }).click()
  await expect.poll(() => state.lastListUrl).toContain('keyword=')

  await page.getByRole('button', { name: '重置' }).click()
  await toast(page, '筛选条件已重置')
  await expect.poll(() => state.lastListUrl).not.toContain('keyword=学生甲')
})
