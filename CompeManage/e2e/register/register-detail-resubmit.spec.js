import { test, expect } from 'playwright-test-coverage'

// registerDetail 补充覆盖：驳回重提链路、提交失败双分支、回显解析分支、附件待传直提路径

const STATUS_REJECTED = {
  status: 2,
  reject_reason: '材料不全',
  advisor_info: JSON.stringify({ id: 11, username: 'T001', name: '张老师', phone: '', email: '', college: '学院甲' }),
  members: [
    { name: '队长甲', student_id: '00100', phone: '13800000001', email: 'a@example.com', college: '学院甲', is_leader: true },
    { name: '成员乙', stu_id: '00200', phone: '13800000002', email: 'b@example.com', college: '学院乙', is_leader: false },
  ],
}

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'rd-resubmit-test')
    localStorage.setItem('role', 'student')
    localStorage.setItem('userInfo', JSON.stringify({ id: 9, name: '队长甲', username: '00100' }))
  })
  const state = { submitted: undefined, method: '' }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    let data = []
    if (p === '/api/reg/config/get') {
      data = {
        comp_name: '重提测试赛', participant_type: 2, min_team_member: 2, max_team_member: 3,
        need_advisor: 1, need_attachment: 1, track: [],
        capabilities: { can_edit_registration: true },
      }
    }
    if (p === '/api/reg/status') {
      if (opts.statusFail) {
        await route.fulfill({ json: { code: 500, message: '状态服务不可用' } })
        return
      }
      data = { ...STATUS_REJECTED, ...(opts.status || {}) }
    }
    if (p === '/api/reg/submit' || p === '/api/reg/resubmit') {
      if (opts.submitFail) {
        await route.abort('failed')
        return
      }
      if (opts.submitBizFail) {
        // code:0 可过拦截器但 submitForm 判 !=200 → 走 response.msg 分支
        await route.fulfill({ json: { code: 0, msg: '提交被拒绝' } })
        return
      }
      state.submitted = req.postDataJSON()
      state.method = req.method() + ' ' + p
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p === '/api/reg/user/list') {
      data = { list: [{ id: 11, name: '张老师', username: 'T001', college: '学院甲' }], total: 1 }
    }
    if (p === '/api/upload') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { url: 'http://mock/proof.pdf' } } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
  await page.goto('/#/register/detail/7')
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('驳回状态回显并重新提交成功', async ({ page }) => {
  const state = await setup(page)
  // 回显：驳回原因 + 队长/成员映射 + advisor 解析
  await expect(page.getByText('材料不全').first()).toBeVisible()
  await expect(page.locator('.info-grid').first().getByPlaceholder('请输入手机号').first()).toHaveValue('13800000001')
  await expect(page.locator('.member-card').first().getByPlaceholder('请输入手机号')).toHaveValue('13800000002')

  await page.getByPlaceholder('请输入参赛项目名称').fill('重提项目')
  await page.getByRole('button', { name: /确认报名|重新提交/ }).click()
  await expect.poll(() => state.submitted, { timeout: 10000 }).toBeTruthy()
  expect(state.method).toContain('resubmit')
  await page.waitForURL((u) => u.href === 'about:blank', { timeout: 5000 })
})

test('提交失败分支：业务拒绝', async ({ page }) => {
  await setup(page, { submitBizFail: true })
  await expect(page.getByText('材料不全').first()).toBeVisible() // 等 fetchStatus 回填落定
  await page.getByPlaceholder('请输入参赛项目名称').fill('拒绝项目')
  await page.getByRole('button', { name: /确认报名|重新提交/ }).click()
  await toast(page, '提交被拒绝')
})

test('提交失败分支：接口异常', async ({ page }) => {
  await setup(page, { submitFail: true })
  await expect(page.getByText('材料不全').first()).toBeVisible() // 等 fetchStatus 回填落定
  await page.getByPlaceholder('请输入参赛项目名称').fill('异常项目')
  await page.getByRole('button', { name: /确认报名|重新提交/ }).click()
  await toast(page, /网络错误|Network Error|提交失败|报名失败/)
})

test('回显解析分支：advisor 坏 JSON 降级、成员兼容 stu_id', async ({ page }) => {
  await setup(page, {
    status: {
      advisor_info: 'not-json{',
      members: [{ name: '兼容成员', stu_id: '00300', phone: '', email: '', college: '学院丙', is_leader: true }],
    },
  })
  // stu_id 兼容映射到 stuID
  await expect(page.locator('.info-grid').first().locator('input').first()).toHaveValue('兼容成员')
  // 页面正常渲染（坏 JSON 降级不崩）
  await expect(page.getByPlaceholder('请输入参赛项目名称')).toBeVisible()
})

test('附件待传直提路径', async ({ page }) => {
  const state = await setup(page)
  await expect(page.getByText('材料不全').first()).toBeVisible() // 等 fetchStatus 回填落定
  await page.getByPlaceholder('请输入参赛项目名称').fill('附件直提项目')
  await page.locator('input[type=file]').setInputFiles({
    name: '证明.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf'),
  })
  await page.getByRole('button', { name: /确认报名|重新提交/ }).click()
  await expect.poll(() => state.submitted, { timeout: 10000 }).toBeTruthy()
  // 走 resubmit（驳回态）确认提交闭环
  expect(state.method).toContain('resubmit')
  await page.waitForURL((u) => u.href === 'about:blank', { timeout: 5000 })
})
