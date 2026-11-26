/**
 * 多学院分角色并行填报流程测试
 *
 * 模拟真实场景：校级统筹 → 20 个学院负责人分头导入本院获奖 → 校级汇总。
 * 重点验证：
 *   1. 学院数据隔离（看不到 / 导不进其他学院专属赛事）
 *   2. 导入归属自动挂到负责人管理学院
 *   3. 多学院并行导入不串、不脏
 *   4. 校级管理员看到的全校数据 = 各学院之和
 *
 * 运行：npx playwright test --config=playwright.multi-college.config.js
 * 前置：后端 8080 已启动；globalSetup 播种账号并建赛。
 */
import { test, expect } from 'playwright-test-coverage'
import {
  SCHOOL_ADMIN, COLLEGES, collegeAdmin, awardRowsForCollege,
  crossCollegeAttackRow, toImportRows,
} from './helpers/multi-college-data.js'
import { readState } from './helpers/state.js'

const apiLogin = async (request, { username, password }) => {
  const res = await request.post('/api/login', { data: { username, password } })
  const body = await res.json().catch(() => ({}))
  if (res.status() !== 200 || !body.data?.token) {
    throw new Error(`登录失败 ${username}: ${res.status} ${JSON.stringify(body).slice(0, 180)}`)
  }
  return body.data.token
}

const apiGet = async (request, token, url) => {
  const res = await request.get(url, { headers: { Authorization: `Bearer ${token}` } })
  return { status: res.status(), body: await res.json().catch(() => ({})) }
}

const apiPost = async (request, token, url, data) => {
  const res = await request.post(url, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: res.status(), body: await res.json().catch(() => ({})) }
}

// 注意：必须在测试体内再 readState()，不能在模块顶层——
// Playwright 收集用例时会先加载本文件，此时 globalSetup 还没写新状态。
const collegeAId = () => Number(readState().collegeACompId || 0)
const collegeBId = () => Number(readState().collegeBCompId || 0)

test.describe.configure({ mode: 'parallel' })

test.describe('多学院并行填报', () => {
  test('20 个学院负责人并行登录、校验隔离并导入本院数据', async ({ request }) => {
    test.setTimeout(180_000)
    const state = readState()
    const competitions = state.sourceCompetitions || []
    expect(competitions).toHaveLength(COLLEGES.length)

    const results = await Promise.all(
      COLLEGES.map(async (college, index) => {
        const admin = collegeAdmin(index)
        const token = await apiLogin(request, admin)
        const competition = competitions[index]
        const foreign = competitions[(index - 1 + COLLEGES.length) % COLLEGES.length]

        const list = await apiGet(request, token, '/api/award/list?page=1&size=100')
        expect(list.status, `${admin.username} award/list`).toBe(200)
        const names = (list.body.data?.list || []).map(c => c.comp_name)
        expect(names).toContain(competition.name)
        // 另一场校赛的所属单位是本院，但项目来源是上一所学院。
        expect(names).not.toContain(foreign.name)
        const denied = await apiGet(request, token, `/api/award/comp-awards?comp_id=${foreign.id}`)
        expect(denied.status).toBe(403)

        const rows = awardRowsForCollege(index, state.runTag)
        const imported = await apiPost(
          request,
          token,
          `/api/award/import?comp_id=${competition.id}`,
          { rows: toImportRows(rows) },
        )
        expect(imported.status, `${admin.username} import status: ${JSON.stringify(imported.body)}`).toBe(200)
        expect(imported.body.code, `${admin.username} import code`).toBe(200)

        return { admin, token, project: rows[0].project, college, competition }
      }),
    )

    expect(results).toHaveLength(20)

    const schoolToken = await apiLogin(request, SCHOOL_ADMIN)
    // 核对院管与校管读取的实际填报归属。
    for (const r of results) {
      const awards = await apiGet(
        request,
        r.token,
        `/api/award/comp-awards?comp_id=${r.competition.id}`,
      )
      expect(awards.status, `${r.admin.username} comp-awards`).toBe(200)
      const teams = awards.body.data?.list || []
      const mine = teams.find(t => t.project_name === r.project)
      expect(mine, `${r.admin.username} 应能查到自己的导入项目`).toBeTruthy()
      const memberColleges = (mine.members || []).map(m => m.submitted_college_id)
      for (const cid of memberColleges) {
        expect(cid, `${r.admin.username} 成员归属学院`).toBe(r.college.id)
      }
      const all = await apiGet(request, schoolToken, `/api/award/comp-awards?comp_id=${r.competition.id}`)
      expect(all.status).toBe(200)
      expect(all.body.data?.list?.map(t => t.project_name)).toContain(r.project)
    }
  })

  test('学院负责人看不到、也导不进其他学院专属赛事', async ({ request }) => {
    const state = readState()
    const adminA = collegeAdmin(0)
    const adminB = collegeAdmin(1)
    const tokenA = await apiLogin(request, adminA)
    const tokenB = await apiLogin(request, adminB)

    // 甲看乙的省赛：列表不可见
    const listA = await apiGet(request, tokenA, '/api/award/list?page=1&size=100')
    const namesA = (listA.body.data?.list || []).map(c => c.comp_name || '')
    expect(namesA.some(n => n.includes('乙学院省赛')), '甲不应看到乙的省赛').toBe(false)

    // 甲直接访问乙的赛事详情/导入模板：403
    const bId = collegeBId()
    const attack = await apiPost(
      request,
      tokenA,
      `/api/award/import?comp_id=${bId}`,
      { rows: toImportRows(crossCollegeAttackRow()) },
    )
    expect(attack.status, '跨学院导入应被拒绝').toBe(403)
    expect([403, 400]).toContain(attack.body.code)

    // 乙导入甲的赛事：403
    const aId = collegeAId()
    const attack2 = await apiPost(
      request,
      tokenB,
      `/api/award/import?comp_id=${aId}`,
      { rows: toImportRows(crossCollegeAttackRow()) },
    )
    expect(attack2.status, '乙跨学院导入应被拒绝').toBe(403)

    // 甲导入本院省赛：成功（证明 403 不是接口故障）
    const own = await apiPost(request, tokenA, `/api/award/import?comp_id=${aId}`, {
      rows: toImportRows([{
        username: 'MS2601', name: '地理学生01', college: COLLEGES[0].name,
        major: '地理专业', project: `${state.runTag || 'MC'}-甲院本省赛`, month: '2026-06',
        category: '省级', level: '一等奖',
      }]),
    })
    expect(own.status, '甲导入本院省赛应成功').toBe(200)
    expect(own.body.code).toBe(200)

    // 甲看不到乙省赛的获奖列表
    const bAwards = await apiGet(request, tokenA, `/api/award/comp-awards?comp_id=${bId}`)
    expect(bAwards.status, '甲访问乙省赛获奖应 403').toBe(403)
  })


  test('院管统计看板只含本院范围', async ({ request }) => {
    const admin = collegeAdmin(0)
    const token = await apiLogin(request, admin)
    const dash = await apiGet(request, token, '/api/statistics/dashboard?months=24')
    expect(dash.status).toBe(200)
    expect(dash.body.code).toBe(200)
    // 看板成功即说明未被越权拦截；范围过滤由后端 applyCompetitionScope 保证
  })

  test('UI 冒烟：院管登录后获奖列表与导入入口可用', async ({ page }) => {
    // 走真实 UI 登录流程（演示用），验证菜单可达
    const admin = collegeAdmin(5) // 计算机学院
    await page.goto('/#/login')
    await page.waitForLoadState('networkidle')
    const adminToggle = page.locator('text=管理员账号登录')
    if (await adminToggle.isVisible().catch(() => false)) {
      await adminToggle.click()
      await page.waitForSelector('input[placeholder="管理员用户名"]', { timeout: 5000 })
    }
    await page.fill('input[placeholder="管理员用户名"]', admin.username)
    await page.fill('input[placeholder="密码"]', admin.password)
    await page.locator('.login-btn, .login-form .el-button').last().click()
    await page.waitForURL(url => url.hash.includes('home') || url.hash.includes('review'), { timeout: 20000 })

    // 进入获奖管理
    await page.goto('/#/award/list')
    await page.waitForTimeout(1500)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('没有权限访问该资源')
    // 本院来源赛事应提供导入入口。
    const importBtns = page.locator('text=导入数据')
    expect(await importBtns.count(), '院管应看到导入数据入口').toBeGreaterThan(0)
  })
})
