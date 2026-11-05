import { test, expect } from 'playwright-test-coverage'

// summary/summaryEdit.vue 定向覆盖：
// 回显（附件三种形态解析/默认经费行）、保存草稿/提交归档、不可编辑跳转、经费校验、附件上传分支

const DETAIL = {
  comp_name: '总结测试赛事', organizer: '主办方', undertaker: '承办方',
  college_info: { name: '计算机学院' }, manager: '何老师', time_range: '2026-01 ~ 2026-03',
  participant_count: 120,
  award_stats: [{ level: '一等奖', count: 3 }],
  expenses: [],
  summary_content: '',
  attachments: [
    'http://mock/files/a_计划书.pdf',
    { name: '名单.xlsx', url: 'http://mock/files/b' },
    { url: 'http://mock/files/c_照片.jpg' },
  ],
  capabilities: { can_edit_summary: true },
}

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'summary-edit-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const state = { saved: undefined, uploads: 0 }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    let data = []
    if (p === '/api/summary/7' && req.method() === 'GET') {
      data = { ...DETAIL, ...(opts.detail || {}) }
    }
    if (p === '/api/summary/7' && req.method() === 'POST') {
      state.saved = req.postDataJSON()
    }
    if (p === '/api/upload') {
      state.uploads += 1
      if (opts.uploadMissingUrl) {
        await route.fulfill({ json: { code: 200, message: 'success', data: { name: 'x' } } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { url: 'http://mock/new_附件.docx', name: '附件.docx' } } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
  await page.goto('/#/summary/summary/edit/7')
  if (opts.detail?.capabilities && opts.detail.capabilities.can_edit_summary === false) {
    return state
  }
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeVisible()
  return state
}

async function confirmMessageBox(page, buttonText = '确定') {
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toBeVisible()
  await msgbox.getByRole('button', { name: buttonText }).click()
}

// ==================== 回显与保存草稿 ====================

test('详情回显（附件三种形态/默认经费行）并保存草稿', async ({ page }) => {
  const state = await setup(page)

  // 基础信息回显
  await expect(page.getByText('总结测试赛事')).toBeVisible()
  await expect(page.getByText('何老师')).toBeVisible()

  // 附件三种形态解析：字符串取下划线后名字；对象取 name；对象无 name 取 url 尾段下划线后
  await expect(page.getByText('计划书.pdf').first()).toBeVisible()
  await expect(page.getByText('名单.xlsx').first()).toBeVisible()
  await expect(page.getByText('照片.jpg').first()).toBeVisible()

  // expenses 空数组 → 默认 1 行空经费（页面有两个表格，按用途输入框圈定）
  const expenseRows = page.locator('.el-table__body tr').filter({ has: page.getByPlaceholder('例如：打印费、奖品采购') })
  await expect(expenseRows).toHaveCount(1)

  // 保存草稿
  await page.getByPlaceholder('请填写本次赛事的组织情况、成效、存在问题及改进建议...').fill('本次赛事组织顺利。')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await confirmMessageBox(page, '确定')
  await expect.poll(() => state.saved).toBeTruthy()
  expect(state.saved.summary_content).toBe('本次赛事组织顺利。')
  expect(state.saved.status).toBe(0)
  expect(state.saved.attachments.map((a) => a.url)).toEqual([
    'http://mock/files/a_计划书.pdf',
    'http://mock/files/b',
    'http://mock/files/c_照片.jpg',
  ])
  await expect(page.locator('.el-message').filter({ hasText: '保存草稿成功' })).toBeVisible()
})

// ==================== 提交归档 ====================

test('提交归档：确认后 status=1 并跳转列表', async ({ page }) => {
  const state = await setup(page)
  await page.getByPlaceholder('请填写本次赛事的组织情况、成效、存在问题及改进建议...').fill('归档版总结。')
  await page.getByRole('button', { name: '提交归档' }).click()
  await confirmMessageBox(page, '确定')
  await expect.poll(() => state.saved).toBeTruthy()
  expect(state.saved.status).toBe(1)
  await expect(page.locator('.el-message').filter({ hasText: '提交归档成功' })).toBeVisible()
  await page.waitForURL(/\/summary\/summary-list/)
})

// ==================== 不可编辑跳转 ====================

test('不可编辑时提示并跳回列表', async ({ page }) => {
  await setup(page, { detail: { capabilities: { can_edit_summary: false } } })
  await expect(page.locator('.el-message').filter({ hasText: '当前赛事总结不可编辑' })).toBeVisible()
  await page.waitForURL(/\/summary\/summary-list/)
})

// ==================== 经费校验 ====================

test('经费有金额无用途时拦截提交', async ({ page }) => {
  const state = await setup(page)
  const firstRow = page.locator('.el-table__body tr').filter({ has: page.getByPlaceholder('例如：打印费、奖品采购') }).first()
  await firstRow.locator('.el-input-number__increase').click() // 0 → 1，金额>0 触发校验
  await page.getByPlaceholder('请填写本次赛事的组织情况、成效、存在问题及改进建议...').fill('经费校验场景。')
  await page.getByRole('button', { name: '保存草稿' }).click()
  await expect(page.locator('.el-message').filter({ hasText: '请完善经费使用明细' })).toBeVisible()
  expect(state.saved).toBeUndefined()
})

// ==================== 附件上传与取消分支 ====================

test('新增附件随保存上传；取消确认框不保存', async ({ page }) => {
  const state = await setup(page)
  await page.getByPlaceholder('请填写本次赛事的组织情况、成效、存在问题及改进建议...').fill('带附件的总结。')
  await page.locator('input[type=file]').setInputFiles({
    name: '附件.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('doc'),
  })

  // 取消确认框 → 不保存不上传
  await page.getByRole('button', { name: '保存草稿' }).click()
  await confirmMessageBox(page, '取消')
  expect(state.saved).toBeUndefined()
  expect(state.uploads).toBe(0)

  // 确认 → 上传新附件并保存
  await page.getByRole('button', { name: '保存草稿' }).click()
  await confirmMessageBox(page, '确定')
  await expect.poll(() => state.saved).toBeTruthy()
  expect(state.uploads).toBe(1)
  expect(state.saved.attachments.some((a) => a.url === 'http://mock/new_附件.docx')).toBe(true)
})

test('上传响应缺 url 时不计入附件', async ({ page }) => {
  const state = await setup(page, { uploadMissingUrl: true })
  await page.getByPlaceholder('请填写本次赛事的组织情况、成效、存在问题及改进建议...').fill('附件缺失场景。')
  await page.locator('input[type=file]').setInputFiles({
    name: '附件.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('doc'),
  })
  await page.getByRole('button', { name: '保存草稿' }).click()
  await confirmMessageBox(page, '确定')
  await expect.poll(() => state.saved).toBeTruthy()
  expect(state.saved.attachments.some((a) => a.url === 'http://mock/new_附件.docx')).toBe(false)
})
