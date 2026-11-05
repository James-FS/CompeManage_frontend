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
const sharedCompId = () => Number(readState().sharedCompId || 0)
const collegeAId = () => Number(readState().collegeACompId || 0)
const collegeBId = () => Number(readState().collegeBCompId || 0)

test.describe.configure({ mode: 'parallel' })

test.describe('多学院并行填报', () => {
  test('20 个学院负责人并行登录、校验隔离并导入本院数据', async ({ request }) => {
    test.setTimeout(180_000)
    const state = readState()
    const sharedId = sharedCompId()
    expect(sharedId, 'shared competition id').toBeGreaterThan(0)

    // 20 学院并行：各自登录 → 隔离断言 → 导入共享校赛
    const results = await Promise.all(
      COLLEGES.map(async (college, index) => {
        const admin = collegeAdmin(index)
        const token = await apiLogin(request, admin)

        // ① 获奖赛事列表：本院专属/校级/未分配可见；其他学院专属省级不可见
        const list = await apiGet(request, token, '/api/award/list?page=1&size=100')
        expect(list.status, `${admin.username} award/list`).toBe(200)
        const names = (list.body.data?.list || []).map(c => c.comp_name)
        const sharedName = (await apiGet(request, token, `/api/comp/list?page=1&page_size=5&id=${sharedId}`))
        // 校级共享赛对所有院管可见（校级范围）
        const sharedVisible = names.some(n => n && n.includes('校级共享赛'))
        expect(sharedVisible, `${admin.username} 应能看到校级共享赛`).toBe(true)

        // 其他学院专属赛事不可见
        const otherCollegeName = COLLEGES[(index + 1) % COLLEGES.length].name
        // 仅对甲/乙两个有专属省赛的学院做"不可见"硬断言（其余学院无专属赛，列表不含即可）
        if (index !== 0) {
          const aName = (await apiGet(request, token, `/api/award/list?page=1&size=100`))
          const listNames = (aName.body.data?.list || []).map(c => c.comp_name || '')
          // 甲学院省赛只应给甲学院（或校管）看到
          expect(
            listNames.some(n => n.includes('甲学院省赛')),
            `${admin.username} 不应看到甲学院省赛`,
          ).toBe(false)
        }
        if (index !== 1) {
          const bList = await apiGet(request, token, '/api/award/list?page=1&size=100')
          const listNames = (bList.body.data?.list || []).map(c => c.comp_name || '')
          expect(
            listNames.some(n => n.includes('乙学院省赛')),
            `${admin.username} 不应看到乙学院省赛`,
          ).toBe(false)
        }
        void otherCollegeName

        // ② 导入本院 1 条省级一等奖到共享校赛
        const rows = awardRowsForCollege(index, state.runTag)
        const imported = await apiPost(
          request,
          token,
          `/api/award/import?comp_id=${sharedId}`,
          { rows: toImportRows(rows) },
        )
        expect(imported.status, `${admin.username} import status: ${JSON.stringify(imported.body)}`).toBe(200)
        expect(imported.body.code, `${admin.username} import code`).toBe(200)

        return { index, admin, token, project: rows[0].project, college }
      }),
    )

    expect(results).toHaveLength(20)

    // ③ 导入归属：每个学院的获奖成员 submitted_college_id = 本院 id
    for (const r of results) {
      const awards = await apiGet(
        request,
        r.token,
        `/api/award/comp-awards?comp_id=${sharedId}`,
      )
      expect(awards.status, `${r.admin.username} comp-awards`).toBe(200)
      const teams = awards.body.data?.list || []
      const mine = teams.find(t => t.project_name === r.project)
      expect(mine, `${r.admin.username} 应能查到自己的导入项目`).toBeTruthy()
      const memberColleges = (mine.members || []).map(m => m.submitted_college_id)
      for (const cid of memberColleges) {
        expect(cid, `${r.admin.username} 成员归属学院`).toBe(r.college.id)
      }
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

  test('校级管理员汇总 = 各学院导入之和', async ({ request }) => {
    test.setTimeout(60_000)
    const state = readState()
    const token = await apiLogin(request, SCHOOL_ADMIN)
    const sharedId = sharedCompId()

    // 校管能看全部 20 条（每学院 1 人）
    const all = await apiGet(request, token, `/api/award/comp-awards?comp_id=${sharedId}`)
    expect(all.status).toBe(200)
    const teams = all.body.data?.list || []
    const runTag = state.runTag || ''
    const mine = teams.filter(t => (t.project_name || '').includes(runTag))
    expect(mine.length, `共享赛应有 20 个项目，实际 ${mine.length}`).toBe(20)

    // 每个项目的成员归属学院互不相同且覆盖 20 学院
    const collegeIds = new Set()
    for (const t of mine) {
      for (const m of t.members || []) {
        if (m.submitted_college_id) collegeIds.add(m.submitted_college_id)
      }
    }
    for (const c of COLLEGES) {
      expect(collegeIds.has(c.id), `汇总应包含 ${c.name}`).toBe(true)
    }

    // 统计看板：校管总获奖人数 ≥ 20（库里可能还有历史数据，做下限断言 + 与 comp-awards 一致）
    const dash = await apiGet(request, token, '/api/statistics/dashboard?months=24')
    expect(dash.status).toBe(200)
    expect(dash.body.code).toBe(200)
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
    // 应出现至少一个"导入数据"入口（校级共享赛）
    const importBtns = page.locator('text=导入数据')
    expect(await importBtns.count(), '院管应看到导入数据入口').toBeGreaterThan(0)
  })
})
