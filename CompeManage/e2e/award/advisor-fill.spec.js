import { test, expect } from 'playwright-test-coverage'

// award/advisor.vue 定向覆盖：列表筛选分页、详情回显与修改记录解析、
// 编辑保存链路、上传/下载/失败分支

const ROWS = [
  { id: 1, comp_name: '指导赛A', project_name: '项目甲', award_level: '一等奖', award_time: '2026-05-01T00:00:00Z', status: 'draft', can_edit: true },
  { id: 2, comp_name: '指导赛B', project_name: '项目乙', award_level: '二等奖', award_time: '2026-06-01T00:00:00Z', status: 'rejected', can_edit: true },
  { id: 3, comp_name: '指导赛C', project_name: '项目丙', award_level: '三等奖', award_time: '2026-07-01T00:00:00Z', status: 'approved', can_edit: false },
]

const DETAIL = {
  award: {
    id: 1, comp_name: '指导赛A', project_name: '项目甲', award_category: '国家级', award_name: '一等奖',
    award_time: '2026-05-01T00:00:00Z', proof_url: 'http://mock/proof.pdf', remark: '原始备注', update_time: '2026-05-02T00:00:00Z',
    status: 'rejected', reject_reason: '证明材料不清晰',
    competition: { comp_name: '指导赛A' },
    advisors: [{ name: '张老师', username: 'T001' }],
    award_members: [{ name: '学生甲', student_number: '00123', college: '学院甲', is_leader: true }],
  },
  can_edit: true,
  changes: [
    { id: 11, operator_name: '张老师', create_time: '2026-05-03T00:00:00Z', before: JSON.stringify({ project_name: '旧项目' }), after: JSON.stringify({ project_name: '项目甲' }) },
    { id: 12, operator_name: '张老师', create_time: '2026-05-04T00:00:00Z', before: 'not-json', after: 'x' },
    { id: 13, operator_name: '张老师', create_time: '2026-05-05T00:00:00Z', before: JSON.stringify({ remark: 'a' }), after: JSON.stringify({ remark: 'a' }) },
  ],
}

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'advisor-fill-test')
    localStorage.setItem('role', 'teacher')
    localStorage.setItem('userInfo', JSON.stringify({ id: 11, name: '张老师', username: 'T001' }))
  })
  const state = { listUrls: [], saved: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    state.listUrls.push(decodeURIComponent(url.pathname + '?' + url.searchParams.toString()))
    if (p === '/api/award/advisor/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: ROWS, total: 20 } } })
      return
    }
    if (p === '/api/award/advisor/1' && req.method() === 'GET') {
      if (opts.detailFail) {
        await route.fulfill({ json: { code: 500, message: '详情服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: DETAIL } })
      return
    }
    if (p === '/api/award/advisor/1' && req.method() === 'PUT') {
      if (opts.saveFail) {
        await route.fulfill({ json: { code: 500, message: '保存服务不可用' } })
        return
      }
      state.saved = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p === '/api/upload') {
      if (opts.uploadFail) {
        await route.fulfill({ status: 500, json: { code: 500, message: '上传失败' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { url: 'http://mock/new-proof.pdf' } } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  await page.goto('/#/award/advisor')
  await expect(page.getByText('项目甲').first()).toBeVisible()
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('列表：状态标签、关键字与状态筛选、分页', async ({ page }) => {
  const state = await setup(page)

  // 状态标签文案
  await expect(page.getByText('待审核').first()).toBeVisible()
  await expect(page.getByText('已退回').first()).toBeVisible()
  await expect(page.getByText('已通过').first()).toBeVisible()

  // 关键字搜索
  await page.getByPlaceholder('赛事 / 项目名称').fill('项目甲')
  await page.getByRole('button', { name: '查询' }).click()
  await expect.poll(() => state.listUrls.some((u) => u.includes('keyword=项目甲') && u.includes('page=1'))).toBe(true)

  // 状态筛选
  await page.locator('.el-form-item').filter({ hasText: '审核状态' }).locator('.el-select').click()
  await page.getByRole('option', { name: '已退回' }).click()
  await expect.poll(() => state.listUrls.some((u) => u.includes('status=rejected'))).toBe(true)

  // 翻页
  await page.locator('.el-pagination .btn-next').click()
  await expect.poll(() => state.listUrls.some((u) => u.includes('page=2'))).toBe(true)
})

test('详情回显与修改记录解析三分支', async ({ page }) => {
  await setup(page)
  await page.locator('.el-table__body tr').first().getByRole('button', { name: /查看 \/ 修改/ }).click()
  const dialog = page.getByRole('dialog', { name: '指导获奖详情' })
  await expect(dialog).toBeVisible()

  // 回显：描述区/退回原因/成员表/表单字段
  await expect(dialog.getByText('证明材料不清晰')).toBeVisible()
  await expect(dialog.getByText('队长 / 申报人')).toBeVisible()
  await expect(dialog.locator('input').first()).toHaveValue('项目甲')

  // 修改记录三分支：JSON diff / 解析失败 / 空 diff
  await expect(dialog.getByText('项目名称：旧项目 → 项目甲')).toBeVisible()
  await expect(dialog.getByText('修改填报')).toBeVisible()
  await expect(dialog.getByText('保存填报')).toBeVisible()
})

test('编辑保存并送审', async ({ page }) => {
  const state = await setup(page)
  await page.locator('.el-table__body tr').first().getByRole('button', { name: /查看 \/ 修改/ }).click()
  const dialog = page.getByRole('dialog', { name: '指导获奖详情' })
  await expect(dialog).toBeVisible()

  await dialog.locator('input').first().fill('修改后的项目')
  await dialog.getByRole('button', { name: '保存并送审' }).click()
  await expect.poll(() => state.saved).toBeTruthy()
  expect(state.saved.project_name).toBe('修改后的项目')
  await toast(page, '修改成功，等待管理员审核')
  await expect(dialog).not.toBeVisible()
})

test('上传证明失败提示', async ({ page }) => {
  await setup(page, { uploadFail: true })
  await page.locator('.el-table__body tr').first().getByRole('button', { name: /查看 \/ 修改/ }).click()
  const dialog = page.getByRole('dialog', { name: '指导获奖详情' })
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'proof.png', mimeType: 'image/png', buffer: Buffer.from('png'),
  })
  await toast(page, /服务器内部错误|上传失败/)
})

test('上传证明成功后按钮变更换证明', async ({ page }) => {
  await setup(page)
  await page.locator('.el-table__body tr').first().getByRole('button', { name: /查看 \/ 修改/ }).click()
  const dialog = page.getByRole('dialog', { name: '指导获奖详情' })
  await dialog.locator('input[type=file]').setInputFiles({
    name: 'proof.png', mimeType: 'image/png', buffer: Buffer.from('png'),
  })
  await expect(dialog.getByRole('button', { name: '更换证明' }).first()).toBeVisible()
})

test('保存失败提示', async ({ page }) => {
  await setup(page, { saveFail: true })
  await page.locator('.el-table__body tr').first().getByRole('button', { name: /查看 \/ 修改/ }).click()
  const dialog = page.getByRole('dialog', { name: '指导获奖详情' })
  await dialog.getByRole('button', { name: '保存并送审' }).click()
  await toast(page, /保存服务不可用|操作失败/)
})
