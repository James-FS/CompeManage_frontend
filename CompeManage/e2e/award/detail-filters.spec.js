import { test, expect } from 'playwright-test-coverage'

// award/detail.vue 筛选与搜索定向覆盖：
// 级别别名（冠军/金奖/二等/铜奖…）、类别别名（校赛/国际级）、关键字多字段命中、
// 筛选联动重置分页、数据加载失败双源

const TEAMS = [
  { id: 1, project_name: '项目冠军', award_name: '冠军', award_category: '校赛', award_month: '2026-05', members: [{ name: '学生甲', student_id: '001', college: '计算机学院', major: '软件' }], advisors: [{ name: '张老师', username: 'T001', college: '计算机学院' }] },
  { id: 2, project_name: '项目金奖', award_name: '金奖', award_category: '国际级', award_month: '2026-05', members: [{ name: '学生乙', student_id: '002', college: '数学学院', major: '统计' }], advisors: [{ name: '李老师', username: 'T002', college: '数学学院' }] },
  { id: 3, project_name: '项目二等', award_name: '二等', award_category: '国家级', award_month: '2026-06', members: [{ name: '学生丙', student_id: '003', college: '外语学院', major: '英语' }], advisors: [] },
  { id: 4, project_name: '项目铜奖', award_name: '铜奖', award_category: '省级', award_month: '2026-06', members: [{ name: '学生丁', student_id: '004', college: '电子学院', major: '通信' }], advisors: [] },
  { id: 5, project_name: '项目季军', award_name: '季军', award_category: '校级', award_month: '2026-07', members: [{ name: '学生戊', student_id: '005', college: '土木学院', major: '土木' }], advisors: [{ name: '王老师', username: 'T005', college: '土木学院' }] },
  { id: 6, project_name: '项目三等', award_name: '三等奖', award_category: '省级', award_month: '2026-07', members: [{ name: '学生己', student_id: '006', college: '机械学院', major: '机械' }], advisors: [] },
]

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'detail-filters-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/comp/7') {
      if (opts.detailFail) {
        await route.fulfill({ json: { code: 500, message: '赛事服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { comp_name: '筛选测试赛' } } })
      return
    }
    if (p === '/api/award/comp-awards') {
      if (opts.awardsFail) {
        await route.fulfill({ json: { code: 500, message: '获奖服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: TEAMS, total: TEAMS.length } } })
      return
    }
    if (p === '/api/college/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: [{ id: 4, name: '计算机学院' }] } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: { list: [], total: 0 } } })
  })
  await page.goto('/#/award/detail/7')
  if (!opts.detailFail && !opts.awardsFail) {
    await expect(page.getByText('6 个团队项目')).toBeVisible()
  }
  return page
}

async function rowCount(page) {
  return page.locator('.el-table__body tr').count()
}

test('级别筛选别名：冠军/金奖→一等奖，二等/亚军→二等奖，季军/铜奖→三等奖', async ({ page }) => {
  await setup(page)
  const levelSelect = page.locator('.el-select').nth(1) // 工具栏第 2 个：获奖等级

  await levelSelect.click()
  await page.getByRole('option', { name: '一等奖' }).click()
  await expect.poll(() => rowCount(page)).toBe(2) // 冠军 + 金奖

  await levelSelect.click()
  await page.getByRole('option', { name: '二等奖' }).click()
  await expect.poll(() => rowCount(page)).toBe(1) // 二等

  await levelSelect.click()
  await page.getByRole('option', { name: '三等奖' }).click()
  await expect.poll(() => rowCount(page)).toBe(3) // 季军 + 铜奖 + 三等奖

  // 清空筛选（clear 图标 hover 才显形，force 点击）
  await levelSelect.locator('.el-select__clear').click({ force: true })
  await expect.poll(() => rowCount(page)).toBe(6)
})

test('类别筛选别名：校级含校赛、国家级含国际级', async ({ page }) => {
  await setup(page)
  const catSelect = page.locator('.el-select').nth(0) // 工具栏第 1 个：获奖类别

  await catSelect.click()
  await page.getByRole('option', { name: '校级' }).click()
  await expect.poll(() => rowCount(page)).toBe(2) // 校赛 + 校级

  await catSelect.locator('.el-select__clear').click({ force: true })
  await catSelect.click()
  await page.getByRole('option', { name: '国家级' }).click()
  await expect.poll(() => rowCount(page)).toBe(2) // 国际级 + 国家级
})

test('关键字搜索命中项目名/成员/导师多字段', async ({ page }) => {
  await setup(page)
  const input = page.getByPlaceholder('搜索项目、姓名、学号、学院或指导老师')

  await input.fill('项目冠军')
  await expect.poll(() => rowCount(page)).toBe(1)

  await input.fill('学生乙')
  await expect.poll(() => rowCount(page)).toBe(1)

  await input.fill('003')
  await expect.poll(() => rowCount(page)).toBe(1)

  await input.fill('李老师')
  await expect.poll(() => rowCount(page)).toBe(1)

  await input.fill('电子学院')
  await expect.poll(() => rowCount(page)).toBe(1)

  await input.fill('')
  await expect.poll(() => rowCount(page)).toBe(6)
})

test('加载失败提示（赛事名源）', async ({ page }) => {
  await setup(page, { detailFail: true })
  await expect(page.locator('.el-message').filter({ hasText: /赛事服务不可用|操作失败/ }).first()).toBeVisible()
})

test('加载失败提示（获奖列表源）', async ({ page }) => {
  await setup(page, { awardsFail: true })
  await expect(page.locator('.el-message').filter({ hasText: /获奖服务不可用|操作失败/ }).first()).toBeVisible()
})
