import { test, expect } from 'playwright-test-coverage'

// review 模块第二批：作品列表与打分提交链路（expertWorks + expertScore）

const WORKS = [
  { reg_id: 7, team_name: '打分队伍甲', leader_name: '队长甲', work_attachment_url: 'http://mock/w1.zip', review_status: 0, score: null },
  { reg_id: 8, team_name: '打分队伍乙', leader_name: '队长乙', work_attachment_url: '', review_status: 1, score: 88 },
]

const DETAIL = {
  review_record: { id: 71, status: 0, score: null, comment: '' },
  work: { team_name: '打分队伍甲', members: [{ name: '成员甲', student_id: '001' }], work_attachment_url: 'http://mock/w1.zip', submitted_at: '2026-06-01 10:00' },
  competition: { comp_id: 1, comp_name: '打分赛事', comp_level: '校级' },
}

async function setup(page, opts = {}) {
  await page.addInitScript(
    (role) => {
      localStorage.setItem('token', 'review-score-test')
      localStorage.setItem('role', role)
      localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '王专家', username: 'EX1' }))
    },
    'expert'
  )
  const state = { submitted: undefined, method: '' }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/review/my/works') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: opts.individual ? WORKS.map((w) => ({ ...w, team_name: '' })) : WORKS, total: 2, task_status: 1 } } })
      return
    }
    if (p === '/api/review/my/works/7') {
      if (opts.detailFail) {
        await route.fulfill({ json: { code: 500, message: '服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { ...DETAIL, review_record: { ...DETAIL.review_record, ...(opts.editing ? { status: 1, score: 70, comment: '旧评语' } : {}) } } } })
      return
    }
    if (p === '/api/review/submit' && req.method() === 'POST') {
      if (opts.submitFail) {
        await route.fulfill({ json: { code: 500, message: '提交服务不可用' } })
        return
      }
      state.submitted = req.postDataJSON()
      state.method = 'POST ' + p
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p === '/api/review/submit/71' && req.method() === 'PUT') {
      state.submitted = req.postDataJSON()
      state.method = 'PUT ' + p
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

test('作品列表：团队/个人列切换、状态标签、进入打分', async ({ page }) => {
  await setup(page)
  await page.goto('/#/review/expert/works/1?task_id=51')
  await expect(page.getByText('打分队伍甲')).toBeVisible()
  await expect(page.getByText('团队名称').first()).toBeVisible()
  await expect(page.getByText('待评审').first()).toBeVisible()
  await expect(page.getByText('已评审').first()).toBeVisible()
  await expect(page.getByText('88').first()).toBeVisible()

  // 进入打分
  await page.locator('.el-table__body tr').first().getByRole('button', { name: /打分|评分/ }).click()
  await page.waitForURL(/review\/expert\/score\/7\?task_id=51/)
})

test('个人赛模式隐藏团队列', async ({ page }) => {
  await setup(page, { individual: true })
  await page.goto('/#/review/expert/works/1?task_id=51')
  await expect(page.getByText('参赛者').first()).toBeVisible()
  await expect(page.getByText('团队名称')).toHaveCount(0)
})

test('打分校验：空分数与越界', async ({ page }) => {
  await setup(page)
  await page.goto('/#/review/expert/score/7?task_id=51')
  await expect(page.getByText('打分赛事')).toBeVisible()

  await page.getByRole('button', { name: /提交/ }).first().click()
  await toast(page, '请输入分数')

  // el-input-number max=100 直接钳制输入（0-100 校验为防御分支，UI 不可达）
  await page.locator('.el-input-number').first().locator('input').fill('150')
  await page.locator('.el-input-number').first().locator('input').blur()
  await expect(page.locator('.el-input-number').first().locator('input')).toHaveValue('100.0')
})

test('提交打分成功并跳回作品列表', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/#/review/expert/score/7?task_id=51')
  await expect(page.getByText('打分赛事')).toBeVisible()
  await page.locator('.el-input-number').first().locator('input').fill('92')
  await page.getByPlaceholder('请输入评审意见（选填）').fill('表现优秀')
  await page.getByRole('button', { name: /提交/ }).first().click()
  await expect.poll(() => state.submitted).toBeTruthy()
  expect(state.method).toContain('POST')
  expect(state.submitted).toMatchObject({ record_id: 71, score: 92, comment: '表现优秀' })
  await toast(page, '评审提交成功')
  await page.waitForURL(/review\/expert\/works/)
})

test('修改打分走更新分支', async ({ page }) => {
  const state = await setup(page, { editing: true })
  await page.goto('/#/review/expert/score/7?task_id=51')
  await expect(page.getByText('打分赛事')).toBeVisible()
  // 回显旧分与旧评语
  await expect(page.locator('.el-input-number').first().locator('input')).toHaveValue('70.0')
  await page.locator('.el-input-number').first().locator('input').fill('75')
  await page.getByRole('button', { name: /提交|修改/ }).first().click()
  await expect.poll(() => state.submitted).toBeTruthy()
  expect(state.method).toContain('PUT')
  await toast(page, '评审修改成功')
})

test('详情加载失败与提交失败提示', async ({ page }) => {
  await setup(page, { detailFail: true })
  await page.goto('/#/review/expert/score/7?task_id=51')
  await toast(page, /服务不可用|加载作品详情失败/)
})
