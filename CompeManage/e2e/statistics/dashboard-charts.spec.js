import { test, expect } from 'playwright-test-coverage'

// statistics/dashboard.vue 定向覆盖：
// 聚合口径 normalizeDashboardPayload / 六源本地聚合回退 / 明细筛选联动 / 导出上报三分支

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'dashboard-charts-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    let data = []
    if (p === '/api/statistics/dashboard') {
      if (opts.aggregate) {
        data = {
          summary: {
            total_competitions: 10, total_registrations: 40, pending_audits: 3, total_awards: 8,
            total_award_students: 12, registration_pass_rate: 72.5, summary_archive_rate: 40,
          },
          distributions: {
            level: [{ name: '校级', value: 4 }, { name: '省级', value: 6 }],
            college: [{ name: '计算机学院', value: 20 }, { name: '数学学院', value: 15 }],
          },
          trend: { months: ['2026-05', '2026-06'], registrations: [3, 5], awards: [1, 2] },
          funnel: [{ name: '已申报', value: 12 }, { name: '已报名', value: 40 }],
          todos: [{ title: '赛事申报待审核', value: 3, path: '/competition/audit' }],
          competition_stats: [
            { id: 1, comp_name: '数学建模竞赛', comp_level: '省级', reg_count: 20, award_count: 5 },
            { id: 2, comp_name: '程序设计大赛', comp_level: '国家级', reg_count: 10, award_count: 3 },
            { id: 3, comp_name: '英语演讲赛', comp_level: '校级', reg_count: 5, award_count: 0 },
          ],
        }
      } else {
        // code=200 但无 data：才落入六源本地聚合（code!=200 会被请求拦截器 reject）
        await route.fulfill({ json: { code: 200, message: 'success' } })
        return
      }
    }
    if (p === '/api/comp/list') {
      data = {
        list: [
          { id: 1, comp_name: '数学建模竞赛', comp_level: '省级' },
          { id: 2, comp_name: '程序设计大赛', comp_level: '国家级' },
          { id: 3, comp_name: '英语演讲赛', comp_level: '校级' },
        ],
        total: 3,
      }
    }
    if (p === '/api/reg/list') {
      data = {
        list: [
          { status: 1, college_name: '计算机学院', created_at: '2026-10-01T10:00:00Z' },
          { status: 0, college_name: '数学学院', created_at: '2026-09-15T10:00:00Z' },
          { status: 3, leader: { college: { name: '外语学院' } }, created_at: '2026-08-20T10:00:00Z' },
        ],
        total: 3,
      }
    }
    if (p === '/api/declare/pending/list') data = { list: [{}, {}], total: 2 }
    if (p === '/api/declare/all') data = { list: [{}, {}, {}], total: 5 }
    if (p === '/api/award/audit/list') data = { list: [{ status: 0 }, { status: 1, created_at: '2026-10-05T00:00:00Z' }, { status: 1 }], total: 3 }
    if (p === '/api/summary/list') data = { list: [{ status: 1 }, { status: 0 }], total: 2 }
    if (p === '/api/college/list') data = [{ id: 4, name: '计算机学院' }, { id: 5, name: '数学学院' }]
    if (p === '/api/award/export/report') {
      if (opts.exportJsonError) {
        await route.fulfill({ json: { code: 500, message: '导出服务不可用' } })
        return
      }
      if (opts.exportNetworkFail) {
        await route.abort('failed')
        return
      }
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        body: Buffer.from('PK-mock-xlsx'),
      })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
  await page.goto('/#/statistics/dashboard')
  await expect(page.locator('.stat-cards')).toBeVisible()
}

function statValue(page, label) {
  return page.locator('.stat-card').filter({ hasText: label }).locator('.value')
}

// ==================== 聚合口径 ====================

test('聚合口径：summary/分布/趋势/漏斗渲染与卡片数值', async ({ page }) => {
  await setup(page, { aggregate: true })
  await expect(statValue(page, '赛事总数')).toHaveText('10')
  await expect(statValue(page, '报名总数')).toHaveText('40')
  await expect(statValue(page, '待审核项')).toHaveText('3')
  await expect(statValue(page, '已通过团队奖项')).toHaveText('8')
  await expect(statValue(page, '报名通过率')).toHaveText('72.5%')
  // 图表已渲染（canvas 存在）
  await expect(page.locator('.stat-cards + div canvas, canvas').first()).toBeVisible()
  // 聚合口径的明细表
  await expect(page.getByText('数学建模竞赛')).toBeVisible()
  await expect(page.getByText('赛事申报待审核')).toBeVisible()
})

// ==================== 本地聚合回退口径 ====================

test('聚合不可用时本地六源聚合：卡片/待办/图表', async ({ page }) => {
  await setup(page)
  await expect(statValue(page, '赛事总数')).toHaveText('3')
  await expect(statValue(page, '报名总数')).toHaveText('3')
  // 待审核项 = 申报2 + 报名待审2(status 0/3) + 获奖待审1 = 5
  await expect(statValue(page, '待审核项')).toHaveText('5')
  // 已通过团队奖项 = award status=1 计 2
  await expect(statValue(page, '已通过团队奖项')).toHaveText('2')
  await expect(page.getByText('总结待归档')).toBeVisible()
  await expect(page.locator('canvas').first()).toBeVisible()
})

// ==================== 明细筛选联动 ====================

test('明细统计筛选：名称/级别/学院与重置', async ({ page }) => {
  await setup(page, { aggregate: true })
  const table = page.locator('.el-table__body tr')

  // 名称筛选
  await page.getByPlaceholder('按赛事名称筛选').fill('数学')
  await expect(table).toHaveCount(1)
  await expect(table.first()).toContainText('数学建模竞赛')

  // 级别筛选（叠加已有的名称条件会空 → 先清名称）
  await page.getByPlaceholder('按赛事名称筛选').fill('')
  await page.locator('.el-select').filter({ hasText: '按级别筛选' }).click()
  await page.getByRole('option', { name: '国家级' }).click()
  await expect(table).toHaveCount(1)
  await expect(table.first()).toContainText('程序设计大赛')

  // 学院筛选（与级别组合）
  await page.locator('.el-select').filter({ hasText: '按所属学院筛选' }).click()
  await page.getByRole('option', { name: '计算机学院' }).click()
  await page.getByRole('button', { name: '重置' }).click()
  await expect(table).toHaveCount(3)
})

// ==================== 导出上报三分支 ====================

test('导出上报：成功下载与成功提示', async ({ page }) => {
  await setup(page)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: /导出上报Excel/ }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe('全部年大学生参加省级以上各类竞赛获奖上报汇总.xlsx')
  await expect(page.locator('.el-message').filter({ hasText: '导出成功' })).toBeVisible()
})

test('导出上报：JSON 错误与网络失败提示', async ({ page }) => {
  await setup(page, { exportJsonError: true })
  await page.getByRole('button', { name: /导出上报Excel/ }).click()
  await expect(page.locator('.el-message').filter({ hasText: '导出服务不可用' })).toBeVisible()

  await setup(page, { exportNetworkFail: true })
  await page.getByRole('button', { name: /导出上报Excel/ }).click()
  await expect(page.locator('.el-message').filter({ hasText: '网络请求失败' })).toBeVisible()
})
