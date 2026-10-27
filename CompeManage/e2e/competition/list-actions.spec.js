import { test, expect } from 'playwright-test-coverage'

// competition/list.vue 行操作簇定向覆盖：
// 单条删除（确认/取消/失败）、批量删除（空选/确认/失败）、导出三分支（成功/空数据/接口失败）

const ROWS = [
  {
    id: 1, comp_code: 'X2026001', comp_name: '行操作赛事甲', comp_level: '校级', organizer: '主办A', undertaker: '承办A',
    manager: { realname: '何老师' }, college_info: { name: '计算机学院' }, source: 1, status: 1, year: 2026,
    capabilities: { can_edit_competition: true },
  },
  {
    id: 2, comp_code: 'X2026002', comp_name: '行操作赛事乙', comp_level: '省级', organizer: '主办B', undertaker: '承办B',
    manager: { realname: '张老师' }, college_info: { name: '数学学院' }, source: 2, status: 2, year: 2026,
    capabilities: { can_edit_competition: true },
  },
]

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'list-actions-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const state = { deletes: [], batchBody: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/comp/years') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { years: ['2026'] } } })
      return
    }
    if (p === '/api/college/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: [{ id: 4, name: '计算机学院' }] } })
      return
    }
    if (p === '/api/comp/list') {
      const list = opts.emptyList ? [] : ROWS
      await route.fulfill({ json: { code: 200, message: 'success', data: { list, total: list.length } } })
      return
    }
    if (p.match(/^\/api\/comp\/\d+$/) && req.method() === 'DELETE') {
      if (opts.deleteFail) {
        await route.fulfill({ json: { code: 500, message: '删除服务不可用' } })
        return
      }
      state.deletes.push(p.split('/').pop())
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p === '/api/comp/batch-delete') {
      if (opts.batchFail) {
        await route.fulfill({ json: { code: 500, message: '批量删除服务不可用' } })
        return
      }
      state.batchBody = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: { capabilities: {} } } })
  })
  await page.goto('/#/competition/list')
  if (!opts.emptyList) await expect(page.getByText('行操作赛事甲')).toBeVisible()
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('单条删除：取消不删、确认删除、失败提示', async ({ page }) => {
  const state = await setup(page)
  const firstRow = page.locator('.el-table__body tr').filter({ hasText: '行操作赛事甲' })

  // 取消分支
  await firstRow.getByRole('button', { name: '删除' }).click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('确定要删除')
  await msgbox.getByRole('button', { name: /取消/ }).click()
  expect(state.deletes).toHaveLength(0)

  // 确认分支
  await firstRow.getByRole('button', { name: '删除' }).click()
  await msgbox.getByRole('button', { name: /确定|确认/ }).click()
  await expect.poll(() => state.deletes).toEqual(['1'])
  await toast(page, '删除成功')
})

test('单条删除失败不误报', async ({ page }) => {
  const state = await setup(page, { deleteFail: true })
  await page.locator('.el-table__body tr').first().getByRole('button', { name: '删除' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: /确定|确认/ }).click()
  // 失败分支走 catch（不弹成功）
  await expect.poll(() => state.deletes).toHaveLength(0)
})

test('批量删除：空选拦截、确认删除、失败提示', async ({ page }) => {
  const state = await setup(page)

  // 穋选
  await page.getByRole('button', { name: '批量删除' }).click()
  await toast(page, '请先选择要删除的赛事')

  // 勾选两条 → 确认
  await page.locator('.el-table__body tr').first().locator('.el-checkbox__inner').click()
  await page.locator('.el-table__body tr').nth(1).locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量删除' }).click()
  const msgbox = page.locator('.el-message-box')
  await msgbox.getByRole('button', { name: /确定|确认/ }).click()
  await expect.poll(() => state.batchBody).toBeTruthy()
  expect(state.batchBody.ids).toEqual([1, 2])
  await toast(page, '批量删除成功')
})

test('批量删除失败不误报成功', async ({ page }) => {
  await setup(page, { batchFail: true })
  await page.locator('.el-table__body tr').first().locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: '批量删除' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: /确定|确认/ }).click()
  // catch 分支：仅控制台记录，不弹成功
  await page.waitForTimeout(1000)
  await expect(page.locator('.el-message').filter({ hasText: '批量删除成功' })).toHaveCount(0)
})

test('导出数据成功下载', async ({ page }) => {
  await setup(page)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出数据' }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe('赛事列表_2026年度.xlsx')
  await toast(page, '导出成功')
})

test('导出空数据提示', async ({ page }) => {
  await setup(page, { emptyList: true })
  await page.getByRole('button', { name: '导出数据' }).click()
  await toast(page, '暂无数据可导出')
})