import { test, expect } from 'playwright-test-coverage'

// register/auditDetail.vue 定向覆盖：
// 详情回显与附件/作品文件名解析、通过/驳回审核链路、advisor_info 解析三分支、失败分支

const DETAIL = {
  id: 7,
  leader_name: '队长甲',
  team_name: '审核详情队伍',
  status: 0,
  comp_name: '详情审核赛事',
  advisor_info: JSON.stringify({ name: '张老师', username: 'T001' }),
  attachment_url: '/static/202601/123_需求.docx, /static/202601/456_材料.pdf, ,',
  work_url: '/static/202601/789_作品.zip',
  reject_reason: '',
}

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'audit-detail-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const state = { audits: [] }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/reg/detail') {
      if (opts.detailFail) {
        await route.fulfill({ json: { code: 500, message: '详情服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { ...DETAIL, ...(opts.detail || {}) } } })
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
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  await page.goto('/#/register/audit/detail/7')
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('详情回显与附件/作品文件名解析', async ({ page }) => {
  await setup(page)
  await expect(page.getByText('审核详情队伍').first()).toBeVisible()
  // 附件文件名去时间戳前缀、空条目过滤
  await expect(page.getByText('需求.docx')).toBeVisible()
  await expect(page.getByText('材料.pdf')).toBeVisible()
  await expect(page.getByText('作品.zip')).toBeVisible()
  // advisor_info 字符串 JSON 解析
  await expect(page.getByText('张老师')).toBeVisible()
})

test('通过审核：取消不调、确认通过', async ({ page }) => {
  const state = await setup(page)

  // 取消分支
  await page.getByRole('button', { name: /通过|确定通过/ }).first().click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('通过审核')
  await msgbox.getByRole('button', { name: /取消/ }).click()
  expect(state.audits).toHaveLength(0)

  // 确认分支
  await page.getByRole('button', { name: /通过|确定通过/ }).first().click()
  await msgbox.getByRole('button', { name: /确定通过|确定|确认/ }).click()
  await expect.poll(() => state.audits).toHaveLength(1)
  expect(state.audits[0]).toMatchObject({ id: 7, status: 1 })
  await toast(page, '审核已通过')
})

test('驳回：原因必填与确认驳回', async ({ page }) => {
  const state = await setup(page)
  await page.getByRole('button', { name: '驳回' }).click()
  const dialog = page.locator('.el-dialog')
  await dialog.locator('textarea').fill('')
  await dialog.getByRole('button', { name: /确认驳回|驳回/ }).last().click()
  await toast(page, '请输入驳回原因')

  await dialog.locator('textarea').fill('材料不全')
  await dialog.getByRole('button', { name: /确认驳回/ }).click()
  await expect.poll(() => state.audits).toHaveLength(1)
  expect(state.audits[0]).toMatchObject({ id: 7, status: 2, reason: '材料不全' })
  await toast(page, '已驳回申请')
})

test('审核接口失败提示', async ({ page }) => {
  await setup(page, { auditFail: true })
  await page.getByRole('button', { name: /通过|确定通过/ }).first().click()
  await page.locator('.el-message-box').getByRole('button', { name: /确定通过|确定|确认/ }).click()
  await toast(page, /审核服务不可用|审核操作失败/)
})

test('详情加载失败提示', async ({ page }) => {
  await setup(page, { detailFail: true })
  await toast(page, /详情服务不可用|获取详情失败/)
})

test('advisor_info 解析失败降级为无导师', async ({ page }) => {
  await setup(page, { detail: { advisor_info: 'not-json{' } })
  await expect(page.getByText('审核详情队伍').first()).toBeVisible()
})
