import { test, expect } from 'playwright-test-coverage'

// review 模块收尾：评审进度页与评审结果确认链路

const PROGRESS = {
  comp_name: '进度赛事',
  total_works: 12, total_experts: 3, total_records: 36, reviewed_count: 24,
  experts: [
    { expert_name: '专家甲', expert_username: 'E01', reviewed_works: 12, assigned_works: 12, task_status: 3 },
    { expert_name: '专家乙', expert_username: 'E02', reviewed_works: 8, assigned_works: 12, task_status: 2 },
    { expert_name: '专家丙', expert_username: 'E03', reviewed_works: 4, assigned_works: 12, task_status: 1 },
  ],
}

const RESULT = {
  comp_name: '结果赛事',
  review_end_time: '2026-06-01T00:00',
  all_reviewed: true,
  has_award: false,
  list: [
    { rank: 1, team_name: '结果项目甲', members: [{ name: '成员甲', student_id: '001' }], avg_score: 95.5, scores: [{ expert_name: '专家甲', score: 95 }] },
    { rank: 2, team_name: '结果项目乙', members: [], avg_score: 88.0, scores: [] },
  ],
}

async function setup(page, opts = {}) {
  await page.addInitScript(
    (role) => {
      localStorage.setItem('token', 'review-pr-test')
      localStorage.setItem('role', role)
      localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
    },
    'school_admin'
  )
  const state = { confirmed: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/review/progress') {
      if (opts.progressFail) {
        await route.fulfill({ json: { code: 500, message: '服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: PROGRESS } })
      return
    }
    if (p === '/api/review/result/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: {
        ...RESULT,
        all_reviewed: opts.allReviewed !== false,
        has_award: !!opts.hasAward,
        review_end_time: opts.windowOpen ? '2099-01-01T00:00' : RESULT.review_end_time,
      } } })
      return
    }
    if (p === '/api/review/result/confirm') {
      state.confirmed = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('评审进度：统计卡与专家进度表、返回跳转', async ({ page }) => {
  await setup(page)
  await page.goto('/#/review/progress/1')
  await expect(page.getByText('评审进度 - 进度赛事')).toBeVisible()
  await expect(page.getByText('作品总数')).toBeVisible()
  await expect(page.getByText('12').first()).toBeVisible()
  await expect(page.getByText('专家甲')).toBeVisible()
  await expect(page.getByText('12 / 12')).toBeVisible()
  await expect(page.getByText('8 / 12')).toBeVisible()

  await page.getByRole('button', { name: /返回仪表盘/ }).click()
  await page.waitForURL(/\/review$/)
})

test('评审进度加载失败提示', async ({ page }) => {
  await setup(page, { progressFail: true })
  await page.goto('/#/review/progress/1')
  await toast(page, /服务不可用|加载评审进度失败/)
})

test('评审结果：列表渲染与已生成标签', async ({ page }) => {
  await setup(page, { hasAward: true })
  await page.goto('/#/review/result/1')
  await expect(page.getByText('评审结果 - 结果赛事')).toBeVisible()
  await expect(page.locator('.el-table__body tr')).toHaveCount(2)
  await expect(page.getByText('95.5').first()).toBeVisible()
  await expect(page.getByText('获奖名单已生成')).toBeVisible()
  // 已生成后不再显示确认按钮
  await expect(page.getByRole('button', { name: '确认生成获奖' })).toHaveCount(0)
})

test('确认生成：窗口未结束警告', async ({ page }) => {
  await setup(page, { windowOpen: true })
  await page.goto('/#/review/result/1')
  await page.getByRole('button', { name: '确认生成获奖' }).click()
  await toast(page, '评审窗口尚未结束')
})

test('确认生成成功链路与 JSON 校验', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/#/review/result/1')
  await page.getByRole('button', { name: '确认生成获奖' }).click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toBeVisible()

  // JSON 校验三分支：非法 JSON / 非数组 / 缺字段
  const input = msgbox.locator('textarea')
  await input.fill('not-json')
  await msgbox.getByRole('button', { name: '确认生成' }).click()
  await expect(msgbox).toContainText('JSON 格式不正确')

  await input.fill('{"level":"一等奖"}')
  await msgbox.getByRole('button', { name: '确认生成' }).click()
  await expect(msgbox).toContainText('请输入 JSON 数组')

  await input.fill('[{"level":"一等奖"}]')
  await msgbox.getByRole('button', { name: '确认生成' }).click()
  await expect(msgbox).toContainText('每项需包含 level 和 count')

  // 合法 JSON → 确认
  await input.fill('[{"level":"一等奖","count":1}]')
  await msgbox.getByRole('button', { name: '确认生成' }).click()
  await expect.poll(() => state.confirmed).toBeTruthy()
  expect(state.confirmed).toMatchObject({ comp_id: 1, award_counts: [{ level: '一等奖', count: 1 }] })
  await toast(page, '获奖名单已生成')
})
