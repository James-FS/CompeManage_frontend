import { test, expect } from 'playwright-test-coverage'

// registerDetail 赛道/赛题联动、学生弹窗分页重置、成员编辑、附件上传路径的定向覆盖
// mock 风格沿用 participation.spec；提交成功后页面 router.back()（registerDetail.vue:592），
// 必须等待导航收尾，否则 playwright-test-coverage teardown 会因上下文销毁而炸

const allStudents = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: `学生${String.fromCharCode(65 + (i % 26))}${i}`,
  username: `00${String(100 + i).slice(-3)}`,
  college: i % 2 ? '学院乙' : '学院甲',
}))

const TRACKS = [
  { trackName: '算法赛道', subTrack: [{ title: '题A' }, { title: '题B' }] },
  { trackName: '创意赛道', subTrack: [] },
]

async function setup(page, config = {}, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'register-detail-test')
    localStorage.setItem('role', 'student')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '学生A0', username: '00100' }))
  })
  const state = { submitted: undefined, method: undefined, uploads: 0 }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    let data = []
    if (url.pathname === '/api/reg/config/get') {
      data = {
        comp_name: '赛道上传测试', participant_type: 2, min_team_member: 2, max_team_member: 3,
        need_advisor: 0, need_attachment: 0, track: TRACKS, ...config,
      }
    }
    if (url.pathname === '/api/reg/status') data = null
    if (url.pathname === '/api/reg/user/list') {
      const search = url.searchParams.get('search') || ''
      const pageNo = Number(url.searchParams.get('page') || 1)
      const size = Number(url.searchParams.get('page_size') || 10)
      let list = allStudents
      if (search) list = allStudents.filter((s) => s.username.includes(search) || s.name.includes(search))
      data = { list: list.slice((pageNo - 1) * size, pageNo * size), total: list.length }
    }
    if (url.pathname === '/api/upload') {
      state.uploads += 1
      if (opts.uploadFail) {
        await route.fulfill({ status: 500, json: { code: 500, message: '上传失败' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { url: 'http://mock/plan.docx' } } })
      return
    }
    if (['/api/reg/submit', '/api/reg/resubmit'].includes(url.pathname)) {
      state.submitted = req.postDataJSON()
      state.method = req.method()
    }
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
  await page.goto('/#/register/detail/7')
  await expect(page.getByRole('heading', { name: '赛道上传测试' })).toBeVisible()
  await expect(page.getByPlaceholder('请输入参赛项目名称')).toBeVisible()
  return state
}

// 提交成功后 router.back() → 无历史记录时退到 about:blank；等导航收尾避免 teardown 竞态
async function settleAfterSubmit(page) {
  await page.waitForURL((u) => u.href === 'about:blank', { timeout: 5000 })
}

async function fillContactOf(card) {
  await card.getByPlaceholder('请输入手机号').fill('13800000001')
  await card.getByPlaceholder('请输入邮箱').fill('a@example.com')
}

async function fillTeamForm(page, projectName = '赛道项目') {
  await page.getByRole('button', { name: '选择队长', exact: true }).click()
  await page.getByRole('dialog', { name: '选择队长', exact: true })
    .locator('.el-table__body tr').first()
    .getByRole('button', { name: '选择', exact: true }).click()
  await fillContactOf(page.locator('.info-grid'))
  // 申报人（学生A0）本人已在队长位，成员选第二行
  await page.getByRole('button', { name: '添加成员', exact: true }).click()
  await page.getByRole('dialog', { name: '选择队员', exact: true })
    .locator('.el-table__body tr').nth(1)
    .getByRole('button', { name: '选择', exact: true }).click()
  await fillContactOf(page.locator('.member-card'))
  await page.getByPlaceholder('请输入参赛项目名称').fill(projectName)
}

// el-select 不渲染 placeholder input，需按表单项定位
async function chooseTrack(page, optionName) {
  await page.locator('.el-form-item').filter({ hasText: '赛道' }).locator('.el-select').click()
  await page.getByRole('option', { name: optionName }).click()
}

async function chooseSubTrack(page, optionName) {
  await page.locator('.el-form-item').filter({ hasText: '赛题' }).locator('.el-select').click()
  await page.getByRole('option', { name: optionName }).click()
}

function subTrackItem(page) {
  return page.locator('.el-form-item').filter({ hasText: '赛题' })
}

// ==================== 赛道 / 赛题 ====================

test('赛道必选、赛题必选校验，track 拼接为「赛道 / 赛题」', async ({ page }) => {
  const state = await setup(page)
  await fillTeamForm(page)

  // 未选赛道直接提交 → 请选择赛道
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect(page.locator('.el-message').filter({ hasText: '请选择赛道' })).toBeVisible()
  expect(state.submitted).toBeUndefined()

  // 选了赛道未选赛题（有子赛题）→ 请选择赛题
  await chooseTrack(page, '算法赛道')
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect(page.locator('.el-message').filter({ hasText: '请选择赛题' })).toBeVisible()
  expect(state.submitted).toBeUndefined()

  // 选赛题 → 提交，track 拼接
  await chooseSubTrack(page, '题A')
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect.poll(() => state.submitted).toBeTruthy()
  await settleAfterSubmit(page)
  expect(state.submitted.track).toBe('算法赛道 / 题A')
})

test('切换赛道清空赛题，无子赛题的赛道不校验赛题', async ({ page }) => {
  const state = await setup(page)
  await fillTeamForm(page)

  await chooseTrack(page, '算法赛道')
  await chooseSubTrack(page, '题A')
  // 切换赛道 → 赛题清空（watch 行为）
  await chooseTrack(page, '创意赛道')
  await expect(subTrackItem(page)).toHaveCount(0) // 赛题区整体消失=清空语义（registerDetail.vue:738 v-if）
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect.poll(() => state.submitted).toBeTruthy()
  await settleAfterSubmit(page)
  expect(state.submitted.track).toBe('创意赛道')
})

// ==================== 学生弹窗：搜索 / 重置 / 分页 ====================

test('学生弹窗支持学号搜索、重置与分页翻页', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: '选择队长', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '选择队长', exact: true })

  // 首屏 10 行（共 15）
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(10)

  // 学号搜索（输入即防抖搜索）
  await dialog.getByPlaceholder('输入学号').fill('00103')
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(1)
  await expect(dialog.locator('.el-table__body tr').first()).toContainText('00103')

  // 清空输入恢复列表
  await dialog.getByPlaceholder('输入学号').fill('')
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(10)

  // 翻到第 2 页 → 剩余 5 行
  await dialog.locator('.el-pagination .btn-next').click()
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(5)

  // 每页条数 20 → 全量 15 行
  await dialog.locator('.el-pagination .el-select').click()
  await page.locator('.el-select-dropdown__item:has-text("20")').first().click()
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(15)
})

// ==================== 成员：重复 / 上限 / 编辑换人 ====================

test('成员重复选择警告、人数上限警告、编辑成员换人', async ({ page }) => {
  await setup(page, { min_team_member: 2, max_team_member: 2 })
  await page.getByRole('button', { name: '选择队长', exact: true }).click()
  await page.getByRole('dialog', { name: '选择队长', exact: true })
    .locator('.el-table__body tr').first()
    .getByRole('button', { name: '选择', exact: true }).click()
  await fillContactOf(page.locator('.info-grid'))

  // 添加成员：选已在团队中的学生 → 重复警告
  await page.getByRole('button', { name: '添加成员', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '选择队员', exact: true })
  await dialog.locator('.el-table__body tr').first().getByRole('button', { name: '选择', exact: true }).click()
  await expect(page.getByText('该学生已在团队中，请勿重复选择').last()).toBeVisible()

  // 选正常成员 → 添加成功
  await dialog.locator('.el-table__body tr').nth(1).getByRole('button', { name: '选择', exact: true }).click()
  await expect(dialog).not.toBeVisible()

  // 已满（队长+1成员=2）：addMember 上限拦截
  await page.getByRole('button', { name: '添加成员', exact: true }).click()
  await expect(page.getByText(/团队成员最多只能添加到2人|参赛人数不能超过2人/).last()).toBeVisible()

  // 编辑成员换人：重新选择 → 成员信息更新、联系方式清空待补
  await page.locator('.member-card').getByRole('button', { name: '重新选择', exact: true }).click()
  const dialog2 = page.getByRole('dialog', { name: '选择队员', exact: true })
  await dialog2.locator('.el-table__body tr').nth(2).getByRole('button', { name: '选择', exact: true }).click()
  await expect(page.locator('.member-card').getByPlaceholder('请输入手机号')).toHaveValue('')
  await expect(page.locator('.member-card input').first()).toHaveValue(allStudents[2].name)
})

// ==================== 附件上传：成功自动提交 / 超限 / 失败 ====================

test('附件上传完成后自动提交（need_attachment=1）', async ({ page }) => {
  const state = await setup(page, { participant_type: 1, min_team_member: 1, max_team_member: 1, need_attachment: 1, track: [] })
  await fillContactOf(page.locator('.info-grid'))
  await page.getByPlaceholder('请输入参赛项目名称').fill('上传项目')
  await page.locator('input[type=file]').setInputFiles({
    name: '项目计划书.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('mock'),
  })
  // auto-upload=false：确认报名才触发 uploadRef.submit() → 成功后自动 submitForm
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect.poll(() => state.submitted).toBeTruthy()
  await settleAfterSubmit(page)
  expect(state.submitted.attachment_url).toContain('http://mock/plan.docx')
  expect(state.submitted.participation_type).toBe('individual')
})

test('附件超过数量限制给出警告', async ({ page }) => {
  const state = await setup(page, { participant_type: 1, min_team_member: 1, max_team_member: 1, need_attachment: 1, track: [] })
  await fillContactOf(page.locator('.info-grid'))
  await page.getByPlaceholder('请输入参赛项目名称').fill('超限项目')
  const files = Array.from({ length: 6 }, (_, i) => ({
    name: `f${i}.docx`, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('m'),
  }))
  await page.locator('input[type=file]').setInputFiles(files)
  await expect(page.getByText('附件数量超出限制')).toBeVisible()
  expect(state.submitted).toBeUndefined()
})

test('附件上传失败提示重试且不提交', async ({ page }) => {
  const state = await setup(page, { participant_type: 1, min_team_member: 1, max_team_member: 1, need_attachment: 1, track: [] }, { uploadFail: true })
  await fillContactOf(page.locator('.info-grid'))
  await page.getByPlaceholder('请输入参赛项目名称').fill('失败项目')
  await page.locator('input[type=file]').setInputFiles({
    name: '项目计划书.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('mock'),
  })
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect(page.getByText(/上传失败，请检查网络后重试/).first()).toBeVisible()
  expect(state.submitted).toBeUndefined()
})
