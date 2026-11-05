import { test, expect } from 'playwright-test-coverage'

// competition/audit.vue 校管理员审核簇定向覆盖：
// handleReset / 分页 / 单条通过（确认双分支） / 批量通过（拦截/成功/失败） /
// 驳回弹窗（原因必填/成功/失败） / 草稿提交、删除、撤回

const ROWS = [
  { id: 1, comp_name: '待审赛事甲', declare_status: 1, college: '计算机学院' },
  { id: 2, comp_name: '待审赛事乙', declare_status: 1, college: '数学学院' },
  { id: 3, comp_name: '草稿赛事丙', declare_status: 0, college: '计算机学院' },
  { id: 4, comp_name: '已通过赛事丁', declare_status: 2, college: '数学学院' },
]

async function setup(page, opts = {}) {
  await page.addInitScript((role) => {
    localStorage.setItem('token', 'comp-audit-batch')
    localStorage.setItem('role', role)
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: role === 'school_admin' ? 'T2023001' : 'T2023002' }))
  }, opts.role || 'school_admin')
  const state = { audits: [], submits: 0, deletes: 0, revokes: 0, lastListUrl: '' }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p.startsWith('/api/declare/') && (p.endsWith('/list') || p.endsWith('/pending') || p.endsWith('/published'))) {
      state.lastListUrl = url.toString()
      await route.fulfill({ json: { code: 200, message: 'success', data: { items: ROWS, total: 20 } } })
      return
    }
    if (p === '/api/college/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: [{ id: 4, name: '计算机学院' }, { id: 5, name: '数学学院' }] } })
      return
    }
    if (p === '/api/declare/audit') {
      if (opts.auditFail) {
        await route.fulfill({ json: { code: 500, message: '审核服务不可用' } })
        return
      }
      state.audits.push(req.postDataJSON())
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p.match(/^\/api\/declare\/\d+\/submit$/)) {
      state.submits += 1
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p.match(/^\/api\/declare\/\d+\/revoke$/)) {
      state.revokes += 1
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p.match(/^\/api\/declare\/\d+$/) && req.method() === 'DELETE') {
      state.deletes += 1
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: [] } })
  })
  await page.goto('/#/competition/audit')
  await expect(page.locator('.el-table__body tr')).toHaveCount(4)
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('单条通过：确认分支调用审核接口，取消分支不调用', async ({ page }) => {
  const state = await setup(page)

  // 取消分支
  await page.locator('.el-table__body tr').first().getByRole('button', { name: '通过', exact: true }).click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('通过后将自动加入本年年度赛事目录')
  await msgbox.getByRole('button', { name: '取消' }).click()
  expect(state.audits).toHaveLength(0)

  // 确认分支
  await page.locator('.el-table__body tr').first().getByRole('button', { name: '通过', exact: true }).click()
  await msgbox.getByRole('button', { name: '通过并发布' }).click()
  await expect.poll(() => state.audits).toHaveLength(1)
  expect(state.audits[0]).toMatchObject({ declare_id: 1, audit_status: 2 })
  await toast(page, '审核通过，已合并至本年年度赛事目录')
})

test('批量通过：空选拦截、确认批量、失败提示', async ({ page }) => {
  const state = await setup(page)

  // 空选时按钮直接禁用（handler 的空选提示是 UI 不可达的防御分支）
  await expect(page.getByRole('button', { name: '批量通过' })).toBeDisabled()

  // 勾选两行待审核 → 确认 → 逐条调用
  await page.locator('.el-table__body tr').first().locator('.el-checkbox__inner').click()
  await page.locator('.el-table__body tr').nth(1).locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量通过' }).click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('批量审核')
  await msgbox.getByRole('button', { name: '确定' }).click()
  await expect.poll(() => state.audits).toHaveLength(2)
  await toast(page, '批量操作成功')
})

test('批量通过失败提示', async ({ page }) => {
  await setup(page, { auditFail: true })
  await page.locator('.el-table__body tr').first().locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量通过' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click()
  await toast(page, /审核服务不可用|批量审核失败/)
})

test('驳回弹窗：原因必填、成功与失败提示', async ({ page }) => {
  const state = await setup(page)

  await page.locator('.el-table__body tr').first().getByRole('button', { name: '驳回', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '驳回申请' })
  await expect(dialog).toBeVisible()

  // 空原因拦截
  await dialog.getByRole('button', { name: '确认驳回' }).click()
  await toast(page, '请输入驳回原因')

  // 填原因 → 确认
  await dialog.getByPlaceholder('请输入驳回原因（如：附件缺失、级别填写错误等）').fill('附件缺失')
  await dialog.getByRole('button', { name: '确认驳回' }).click()
  await expect.poll(() => state.audits).toHaveLength(1)
  expect(state.audits[0]).toMatchObject({ declare_id: 1, audit_status: 3, audit_remark: '附件缺失' })
  await toast(page, '已驳回该申请')
})

test('草稿行提交与删除、已通过行撤回（申报人视角）', async ({ page }) => {
  // 草稿的编辑/提交/删除、已通过的撤回仅对申报人（院管理员）展示
  const state = await setup(page, { role: 'college_admin' })

  // 草稿行：按名称圈定（行序不受渲染影响）
  const draftRow = page.locator('.el-table__body tr').filter({ hasText: '草稿赛事丙' })
  await draftRow.getByRole('button', { name: '提交', exact: true }).click()
  const msgbox = page.locator('.el-message-box')
  await msgbox.getByRole('button', { name: '确定' }).click()
  await expect.poll(() => state.submits).toBe(1)

  // 草稿行：删除（确认）
  await draftRow.getByRole('button', { name: '删除', exact: true }).click()
  await msgbox.getByRole('button', { name: '确定' }).click()
  await expect.poll(() => state.deletes).toBe(1)

  // 申报人视角下撤回按钮在「待审核」行
  await page.locator('.el-table__body tr').filter({ hasText: '待审赛事甲' }).getByRole('button', { name: '撤回', exact: true }).click()
  await msgbox.getByRole('button', { name: '确定' }).click()
  await expect.poll(() => state.revokes).toBe(1)
})

test('筛选重置与分页切换刷新列表', async ({ page }) => {
  const state = await setup(page)

  await page.getByPlaceholder('请输入赛事名称').fill('待审赛事甲')
  await page.getByRole('button', { name: '搜索' }).click()
  await expect.poll(() => state.lastListUrl).toContain('comp_name=')

  await page.getByRole('button', { name: '重置' }).click()
  await expect.poll(() => state.lastListUrl).not.toContain('comp_name=待审赛事甲')

  await page.locator('.el-pagination .btn-next').click()
  await expect.poll(() => state.lastListUrl).toContain('page=2')
})
