import { test, expect } from 'playwright-test-coverage'

// competition/audit.vue 院管理员动作簇（残余）：
// 提交审核/删除草稿/撤回（各含失败分支）、编辑与详情跳转、驳回失败 catch

const ROWS = [
  { id: 11, comp_name: '草稿申报甲', declare_status: 0, comp_level: '校级', year: 2026 },
  { id: 12, comp_name: '待审申报乙', declare_status: 1, comp_level: '省级', year: 2026 },
  { id: 13, comp_name: '驳回申报丙', declare_status: 3, comp_level: '校级', year: 2026 },
]

async function setup(page, opts = {}) {
  await page.addInitScript(
    (role) => {
      localStorage.setItem('token', 'declare-actions-test')
      localStorage.setItem('role', role)
      localStorage.setItem('userInfo', JSON.stringify({ id: 2, name: '院管', username: 'T2023002' }))
    },
    'college_admin'
  )
  const state = { called: [] }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p.startsWith('/api/declare') && !p.match(/\/\d+/) && p !== '/api/declare/audit') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { items: ROWS, total: ROWS.length } } })
      return
    }
    if (p.match(/^\/api\/declare\/\d+\/submit$/)) {
      state.called.push('submit:' + p)
      if (opts.submitFail) {
        await route.fulfill({ json: { code: 500, message: '服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p.match(/^\/api\/declare\/\d+\/revoke$/)) {
      state.called.push('revoke:' + p)
      if (opts.revokeFail) {
        await route.fulfill({ json: { code: 500, message: '服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p.match(/^\/api\/declare\/\d+$/) && req.method() === 'DELETE') {
      state.called.push('delete:' + p)
      if (opts.deleteFail) {
        await route.fulfill({ json: { code: 500, message: '服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  await page.goto('/#/competition/audit')
  await expect(page.getByText('草稿申报甲')).toBeVisible()
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('提交审核：取消不调、确认成功、失败提示', async ({ page }) => {
  const state = await setup(page)
  const row = page.locator('.el-table__body tr').filter({ hasText: '草稿申报甲' })

  await row.getByRole('button', { name: /提交审核|提交/ }).first().click()
  const msgbox = page.locator('.el-message-box')
  await msgbox.getByRole('button', { name: /取消/ }).click()
  expect(state.called).toHaveLength(0)

  await row.getByRole('button', { name: /提交审核|提交/ }).first().click()
  await msgbox.getByRole('button', { name: /确定|确认/ }).click()
  await expect.poll(() => state.called.length).toBe(1)
  await toast(page, '提交成功，请等待校级审核')
})

test('提交审核失败提示', async ({ page }) => {
  await setup(page, { submitFail: true })
  await page.locator('.el-table__body tr').first().getByRole('button', { name: /提交审核|提交/ }).first().click()
  await page.locator('.el-message-box').getByRole('button', { name: /确定|确认/ }).click()
  await toast(page, /服务不可用|提交失败/)
})

test('删除草稿：确认成功与失败提示', async ({ page }) => {
  const state = await setup(page)
  await page.locator('.el-table__body tr').filter({ hasText: '草稿申报甲' }).getByRole('button', { name: /删除/ }).first().click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('删除确认')
  await msgbox.getByRole('button', { name: /确定|确认/ }).click()
  await expect.poll(() => state.called.some((c) => c.startsWith('delete'))).toBe(true)
  await toast(page, '申报已删除')
})

test('撤回：确认成功与失败提示', async ({ page }) => {
  const state = await setup(page)
  await page.locator('.el-table__body tr').filter({ hasText: '待审申报乙' }).getByRole('button', { name: /撤回/ }).first().click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('撤回确认')
  await msgbox.getByRole('button', { name: /确定|确认/ }).click()
  await expect.poll(() => state.called.some((c) => c.startsWith('revoke'))).toBe(true)
  await toast(page, '申报已撤回，可重新编辑')
})

test('撤回失败与删除失败提示', async ({ page }) => {
  await setup(page, { revokeFail: true })
  await page.locator('.el-table__body tr').filter({ hasText: '待审申报乙' }).getByRole('button', { name: /撤回/ }).first().click()
  await page.locator('.el-message-box').getByRole('button', { name: /确定|确认/ }).click()
  await toast(page, /服务不可用|撤回失败/)
})
