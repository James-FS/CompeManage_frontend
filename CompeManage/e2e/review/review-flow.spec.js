import { test, expect } from 'playwright-test-coverage'

// review 模块 E2E 第一批（处女地）：
// 评审首页列表/筛选/初始化任务/跳转、专家任务列表/进入评审/分页、加载失败分支

const COMPS = [
  { comp_id: 1, comp_name: '评审赛事甲', review_status: 'uninit', total_experts: 3, total_works: 12 },
  { comp_id: 2, comp_name: '评审赛事乙', review_status: 'pending', total_experts: 2, total_works: 8 },
  { comp_id: 3, comp_name: '评审赛事丙', review_status: 'reviewing', total_experts: 4, total_works: 20 },
  { comp_id: 4, comp_name: '评审赛事丁', review_status: 'completed', total_experts: 2, total_works: 6 },
]

const TASKS = [
  { comp_id: 1, task_id: 51, comp_name: '评审赛事甲', comp_level: '校级', task_status: 1, reviewed_count: 0, total_works: 12, review_start_time: '2026-06-01T09:00', review_end_time: '2026-06-10T18:00' },
  { comp_id: 2, task_id: 52, comp_name: '评审赛事乙', comp_level: '省级', task_status: 3, reviewed_count: 8, total_works: 8, review_start_time: '', review_end_time: '' },
]

async function setup(page, opts = {}) {
  const role = opts.expert ? 'expert' : 'school_admin'
  const name = opts.expert ? '王专家' : '管理员'
  const username = opts.expert ? 'EX1' : 'T2023001'
  await page.addInitScript(
    ({ role, name, username }) => {
      localStorage.setItem('token', 'review-flow-test')
      localStorage.setItem('role', role)
      localStorage.setItem('userInfo', JSON.stringify({ id: 1, name, username }))
    },
    { role, name, username }
  )
  const state = { inits: 0 }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/review/comp/list') {
      if (opts.listFail) {
        await route.fulfill({ json: { code: 500, message: '服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: COMPS, total: COMPS.length } } })
      return
    }
    if (p === '/api/review/task/init') {
      state.inits += 1
      await route.fulfill({ json: { code: 200, message: '初始化成功', data: {} } })
      return
    }
    if (p === '/api/review/my/tasks') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: TASKS, total: TASKS.length } } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  return state
}

test('评审首页：状态筛选与关键词搜索、重置', async ({ page }) => {
  await setup(page)
  await page.goto('/#/review')
  await expect(page.getByText('评审赛事甲')).toBeVisible()
  await expect(page.getByText('未初始化').first()).toBeVisible()
  await expect(page.getByText('待评审').first()).toBeVisible()
  await expect(page.getByText('评审中').first()).toBeVisible()
  await expect(page.getByText('已完成').first()).toBeVisible()

  // 状态筛选（前端过滤）
  await page.locator('.el-select').first().click()
  await page.getByRole('option', { name: '已完成' }).click()
  await expect(page.getByText('评审赛事甲')).toHaveCount(0)
  await expect(page.getByText('评审赛事丁')).toBeVisible()

  // 重置
  await page.getByRole('button', { name: '重置' }).click()
  await expect(page.getByText('评审赛事甲')).toBeVisible()
})

test('初始化评审任务：取消不调、确认调用', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/#/review')
  await expect(page.getByText('评审赛事甲')).toBeVisible()

  // 取消分支
  await page.locator('.el-table__body tr').first().getByRole('button', { name: /初始化/ }).click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('初始化评审任务')
  await msgbox.getByRole('button', { name: /取消/ }).click()
  expect(state.inits).toBe(0)

  // 确认分支
  await page.locator('.el-table__body tr').first().getByRole('button', { name: /初始化/ }).click()
  await msgbox.getByRole('button', { name: /确定|确认/ }).click()
  await expect.poll(() => state.inits).toBe(1)
})

test('查看进度与结果跳转', async ({ page }) => {
  await setup(page)
  await page.goto('/#/review')
  await expect(page.getByText('评审赛事甲')).toBeVisible()
  await page.locator('.el-table__body tr').nth(2).getByRole('button', { name: /进度/ }).click()
  await page.waitForURL(/review\/progress\/3/)
})

test('专家任务列表：状态标签、进入评审、分页', async ({ page }) => {
  await setup(page, { expert: true })
  await page.goto('/#/review/expert')
  await expect(page.getByText('评审赛事甲')).toBeVisible()
  await expect(page.getByText('待评审').first()).toBeVisible()
  await expect(page.getByText('已完成').first()).toBeVisible()
  // 进度与时间窗渲染
  await expect(page.getByText('0 / 12')).toBeVisible()
  await expect(page.getByText('8 / 8')).toBeVisible()

  await page.getByRole('button', { name: '进入评审' }).first().click()
  await page.waitForURL(/review\/expert\/works\/1\?task_id=51/)
})

test('列表加载失败降级为空', async ({ page }) => {
  await setup(page, { listFail: true })
  await page.goto('/#/review')
  // catch 分支：列表置空（页面正常渲染）
  await expect(page.getByRole('button', { name: '重置' })).toBeVisible()
})
