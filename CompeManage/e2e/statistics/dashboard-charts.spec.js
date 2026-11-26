import { test, expect } from 'playwright-test-coverage'

// statistics/dashboard.vue 定向覆盖：
// 后端总览、赛事明细分页与排名、筛选联动和导出上报

async function setup(page, opts = {}) {
  const requests = []
  await page.addInitScript(() => {
    localStorage.setItem('token', 'dashboard-charts-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    requests.push(url)
    let data = []
    if (p === '/api/statistics/dashboard') {
      if (!opts.overviewFail) {
        const months = Number(url.searchParams.get('months'))
        data = {
          summary: {
            total_competitions: 10, total_registrations: 40, pending_audits: 3, total_awards: 8,
            total_award_students: 12, registration_pass_rate: 72.5, summary_archive_rate: 40,
          },
          distributions: {
            level: [{ name: '校级', value: 4 }, { name: '省级', value: 6 }, { name: '国家级', value: 1 }],
            college: [{ name: '计算机学院', value: 20 }, { name: '数学学院', value: 15 }],
          },
          trend: {
            months: Array.from({ length: months }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`),
            registrations: Array(months).fill(3), awards: Array(months).fill(2),
          },
          funnel: [{ name: '已申报', value: 12 }, { name: '已报名', value: 40 }],
          todos: [{ title: '赛事申报待审核', value: 3, path: '/competition/audit' }],
        }
      } else {
        await route.fulfill({ json: { code: 200, message: 'success' } })
        return
      }
    }
    if (p === '/api/statistics/dashboard/competitions') {
      const params = url.searchParams
      const ranking = params.get('ranking') === 'true'
      const source = opts.many ? Array.from({ length: 12 }, (_, index) => ({
        id: index + 1, comp_name: `统计赛事 ${index + 1}`, comp_level: '校级', award_count: 12 - index,
      })) : [
        { id: 1, comp_name: '数学建模竞赛', comp_level: '省级', college_name: '数学学院', reg_count: 20, award_count: 5 },
        { id: 2, comp_name: '程序设计大赛', comp_level: '国家级', college_name: '计算机学院', reg_count: 10, award_count: 3 },
        { id: 3, comp_name: '英语演讲赛', comp_level: '校级', college_name: '外语学院', reg_count: 5, award_count: 0 },
      ]
      const list = source.filter(row =>
        (!ranking || row.award_count > 0) &&
        (!params.get('name') || row.comp_name.includes(params.get('name'))) &&
        (!params.get('level') || row.comp_level === params.get('level')) &&
        (!params.get('college') || row.college_name === params.get('college')))
      const current = Number(params.get('page') || '1')
      const size = Number(params.get('page_size'))
      data = { list: list.slice((current - 1) * size, current * size), total: list.length }
    }
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
  return requests
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

test('总览失败时提示错误，保持对明细的独立读取', async ({ page }) => {
  const requests = await setup(page, { overviewFail: true })
  await expect(page.getByText('统计总览加载失败，请刷新页面重试。')).toBeVisible()
  await expect(page.getByText('数学建模竞赛')).toBeVisible()
  expect(requests.some(url => ['/api/comp/list', '/api/reg/list', '/api/award/audit/list'].includes(url.pathname))).toBe(false)
})

// ==================== 明细筛选联动 ====================

test('明细统计筛选：名称、级别和学院', async ({ page }) => {
  await setup(page, { aggregate: true })
  const table = page.locator('.el-table__body tr')

  // 名称筛选
  await page.getByPlaceholder('按赛事名称筛选').fill('数学')
  await expect(table).toHaveCount(1)
  await expect(table.first()).toContainText('数学建模竞赛')

  // 级别筛选（叠加已有的名称条件会空 → 先清名称）
  await page.getByPlaceholder('按赛事名称筛选').fill('')
  await page.getByText('按级别筛选', { exact: true }).click()
  await page.getByRole('option', { name: '国家级' }).click()
  await expect(table).toHaveCount(1)
  await expect(table.first()).toContainText('程序设计大赛')

  // 学院筛选（与级别组合）
  await page.locator('.el-select').filter({ hasText: '按所属单位筛选' }).click()
  await page.getByRole('option', { name: '计算机学院' }).click()
  await page.getByRole('button', { name: '重置' }).click()
  await expect(table).toHaveCount(3)
})

test('明细翻页独立于获奖排名', async ({ page }) => {
  const requests = await setup(page, { many: true })
  const rows = page.locator('.el-table__body tr')
  await expect(rows).toHaveCount(10)
  await expect(page.getByRole('img', { name: /当前筛选中有 12 项赛事获奖/ })).toBeVisible()
  await page.locator('.detail-pagination .btn-next').click()
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('统计赛事 11')
  expect(requests.filter(url => url.searchParams.get('ranking') === 'true')).toHaveLength(1)
  expect(requests.find(url => url.pathname === '/api/statistics/dashboard').searchParams.get('include_competition_stats')).toBe('false')
})

// ==================== 导出上报三分支 ====================

test('导出上报：成功下载与成功提示', async ({ page }) => {
  await setup(page)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: /导出上报Excel/ }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe(`${new Date().getFullYear()}年大学生参加省级以上各类竞赛获奖上报汇总.xlsx`)
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
