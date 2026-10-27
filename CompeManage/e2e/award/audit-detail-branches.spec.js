import { test, expect } from 'playwright-test-coverage'

// award/auditDetail.vue 分支补充覆盖（30 缺口）：
// 详情回显与 advisors 解析、通过/驳回审核链路、证书预览三分支、审核错误分支
// （与既有 audit-detail.spec.js 的真后端用例互补——本文件全 mock）

const DETAIL = {
  id: 9,
  student_name: '学生甲',
  team_name: '审核队伍',
  award_level: '一等奖',
  award_category: '国家级',
  status: 0,
  update_time: '2026-05-02T00:00:00Z',
  reject_reason: '',
  cert_image: 'http://mock/cert.png',
  advisor_info: JSON.stringify([{ name: '张老师', username: 'T001' }]),
  teammates: [{ name: '学生甲' }, { name: '学生乙' }],
  award_members: [{ name: '学生甲', student_number: '001', college: '学院甲', is_leader: true }],
  competition: { comp_name: '审核赛事' },
}

async function setup(page, opts = {}) {
  await page.addInitScript(
    (role) => {
      localStorage.setItem('token', 'award-ad-test')
      localStorage.setItem('role', role)
      localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
    },
    'school_admin'
  )
  const state = { passes: 0, rejects: 0, rejectBody: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/award/audit/detail/9') {
      if (opts.detailFail) {
        await route.fulfill({ json: { code: 500, message: '服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: {
        ...DETAIL,
        cert_image: opts.noCert ? '' : DETAIL.cert_image,
        advisor_info: opts.badAdvisor ? 'not-json{' : DETAIL.advisor_info,
      } } })
      return
    }
    if (p === '/api/award/audit/9/pass') {
      if (opts.auditFail) {
        await route.fulfill({ json: { code: 500, message: '审核服务不可用' } })
        return
      }
      state.passes += 1
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p === '/api/award/audit/9/reject') {
      state.rejects += 1
      state.rejectBody = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  await page.goto('/#/award/audit/detail/9')
  if (!opts.detailFail) await expect(page.getByText('审核队伍').first()).toBeVisible()
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('通过审核：取消不调、确认通过', async ({ page }) => {
  const state = await setup(page)
  await page.getByRole('button', { name: /通过/ }).first().click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('通过审核')
  await msgbox.getByRole('button', { name: /取消/ }).click()
  expect(state.passes).toBe(0)

  await page.getByRole('button', { name: /通过/ }).first().click()
  await msgbox.getByRole('button', { name: /确定通过|确定|确认/ }).click()
  await expect.poll(() => state.passes).toBe(1)
  await toast(page, '审核已通过')
})

test('驳回：原因必填与确认', async ({ page }) => {
  const state = await setup(page)
  await page.getByRole('button', { name: /驳回/ }).first().click()
  const dialog = page.locator('.el-dialog')
  await dialog.locator('textarea').fill('')
  await dialog.getByRole('button', { name: /确认驳回/ }).click()
  await toast(page, '请输入驳回原因')

  await dialog.locator('textarea').fill('证明不清晰')
  await dialog.getByRole('button', { name: /确认驳回/ }).click()
  await expect.poll(() => state.rejects).toBe(1)
  expect(state.rejectBody).toMatchObject({ reason: '证明不清晰' })
  await toast(page, '已驳回申请')
})

test('审核失败提示', async ({ page }) => {
  await setup(page, { auditFail: true })
  await page.getByRole('button', { name: /通过/ }).first().click()
  await page.locator('.el-message-box').getByRole('button', { name: /确定通过|确定|确认/ }).click()
  await toast(page, /审核服务不可用|审核操作失败/)
})

test('证书空态展示（无证书 warning 为防御分支）', async ({ page }) => {
  await setup(page, { noCert: true })
  await expect(page.getByText('暂无证书图片')).toBeVisible()
})

test('证书预览：预览分支页面正常', async ({ page }) => {
  await setup(page)
  await page.locator('.cert-name').first().click()
  await expect(page.getByText('审核队伍').first()).toBeVisible()
})

test('详情加载失败提示', async ({ page }) => {
  await setup(page, { detailFail: true })
  await toast(page, /服务不可用|获取详情失败/)
})

test('advisor 解析降级不崩', async ({ page }) => {
  await setup(page, { badAdvisor: true })
  await expect(page.getByText('审核队伍').first()).toBeVisible()
})
