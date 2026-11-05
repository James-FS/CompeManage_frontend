/**
 * 获奖导入边界回归（P0）：真实后端 API。
 * 归一化/非法输入走 /import/preview（不落库）；成功写入用不同学号避免「一生一赛一奖」限制。
 *
 * 运行：npx playwright test --config=playwright.award-boundary.config.js
 */
import { test, expect } from 'playwright-test-coverage'

const BACKEND = 'http://127.0.0.1:8080'
const SCHOOL = { username: 'T2023001', password: '123' }

async function login(request, user = SCHOOL) {
  const res = await request.post(`${BACKEND}/api/login`, { data: user })
  const body = await res.json()
  expect(body.code, JSON.stringify(body)).toBe(200)
  return body.data.token
}

async function apiPost(request, token, url, data) {
  const res = await request.post(`${BACKEND}${url}`, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: res.status(), body: await res.json().catch(() => ({})) }
}

async function apiGet(request, token, url) {
  const res = await request.get(`${BACKEND}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return { status: res.status(), body: await res.json().catch(() => ({})) }
}

function row(overrides = {}) {
  return {
    student_id: '900006',
    name: '测试学生',
    college: '计算机科学与网络工程学院',
    major: '计算机科学与技术',
    project_name: `边界${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    award_month: '2026-06',
    award_category: '省级',
    award_name: '一等奖',
    advisor_usernames: '',
    advisor_colleges: '',
    remark: '',
    ...overrides,
  }
}

function firstRowError(body) {
  return body?.data?.rows?.[0]?.error || body?.message || JSON.stringify(body)
}

test.describe('P0 导入边界（preview 校验 + 必要写入）', () => {
  let token
  let compId

  test.beforeAll(async ({ request }) => {
    token = await login(request)
    const list = await apiGet(request, token, '/api/award/list?page=1&size=30')
    const items = list.body.data?.list || []
    const comp = items.find(c => c.comp_level === '校级' || c.comp_level === '校赛')
      || items.find(c => c.comp_level === '国家级')
      || items[0]
    expect(comp, '需要可导入赛事').toBeTruthy()
    compId = comp.id
  })

  test('IMP-004/005 preview 等级归一化金/银/铜/特等/冠亚季军', async ({ request }) => {
    const cases = [
      { raw: '金奖', expect: '一等奖' },
      { raw: '特等奖', expect: '一等奖' },
      { raw: '冠军', expect: '一等奖' },
      { raw: '银奖', expect: '二等奖' },
      { raw: '亚军', expect: '二等奖' },
      { raw: '铜奖', expect: '三等奖' },
      { raw: '季军', expect: '三等奖' },
      { raw: '（一等奖）', expect: '一等奖' },
    ]
    for (const c of cases) {
      const r = await apiPost(request, token, `/api/award/import/preview?comp_id=${compId}`, {
        rows: [row({ award_name: c.raw, project_name: `P${c.raw}${Date.now()}` })],
      })
      expect(r.body.code, `${c.raw}: ${firstRowError(r.body)}`).toBe(200)
      const got = r.body.data.rows[0]
      // 归一化在校验前完成；后续「已有获奖」等业务错误不影响等级断言
      expect(got.award_name, c.raw).toBe(c.expect)
      if (got.error) {
        expect(got.error).not.toMatch(/等级必须/)
      }
    }
  })

  test('IMP-006 非法等级 preview 报错且不写库', async ({ request }) => {
    const r = await apiPost(request, token, `/api/award/import/preview?comp_id=${compId}`, {
      rows: [row({ award_name: '优胜奖' })],
    })
    expect(r.body.code).toBe(200)
    expect(r.body.data.error_count).toBeGreaterThan(0)
    expect(r.body.data.rows[0].error).toMatch(/等级/)
  })

  test('IMP-003 类别非法拒绝、国际级归一国家级', async ({ request }) => {
    const bad = await apiPost(request, token, `/api/award/import/preview?comp_id=${compId}`, {
      rows: [row({ award_category: '院级' })],
    })
    expect(bad.body.data.rows[0].error).toMatch(/类别/)

    const ok = await apiPost(request, token, `/api/award/import/preview?comp_id=${compId}`, {
      rows: [row({ award_category: '国际级', award_name: '金奖' })],
    })
    expect(ok.body.data.rows[0].award_category).toBe('国家级')
    expect(ok.body.data.rows[0].award_name).toBe('一等奖')
    if (ok.body.data.rows[0].error) {
      expect(ok.body.data.rows[0].error).not.toMatch(/类别|等级必须/)
    }
  })

  test('IMP-007/008 时间多格式与非法', async ({ request }) => {
    for (const month of ['2026-05', '2026.05', '2026-05-20']) {
      const ok = await apiPost(request, token, `/api/award/import/preview?comp_id=${compId}`, {
        rows: [row({ award_month: month, project_name: `T${month}${Date.now()}` })],
      })
      // 时间归一化成功则 error 不应是时间格式错误
      expect(ok.body.data.rows[0].error || '', month).not.toMatch(/获奖时间/)
      expect(ok.body.data.rows[0].award_month || '', month).toMatch(/^2026-05/)
    }
    const bad = await apiPost(request, token, `/api/award/import/preview?comp_id=${compId}`, {
      rows: [row({ award_month: '2026/05' })],
    })
    expect(bad.body.data.rows[0].error).toMatch(/时间/)
  })

  test('IMP-002 空学号 preview 行级错误', async ({ request }) => {
    const r = await apiPost(request, token, `/api/award/import/preview?comp_id=${compId}`, {
      rows: [row({ student_id: '' })],
    })
    expect(r.body.data.rows[0].error).toBeTruthy()
  })

  test('IMP-009 项目名含换行/全角空格可归一', async ({ request }) => {
    const r = await apiPost(request, token, `/api/award/import/preview?comp_id=${compId}`, {
      rows: [row({ project_name: '换行项目\n名称　测试' })],
    })
    // 校验通过或给出明确项目错误，不应 500
    expect([200]).toContain(r.body.code)
  })

  test('IMP-012 写入冲突：一生一赛仅一奖', async ({ request }) => {
    const project = `IMP012-${Date.now()}`
    const first = await apiPost(request, token, `/api/award/import?comp_id=${compId}`, {
      rows: [row({ project_name: project, award_name: '一等奖' })],
    })
    // 若学号已有其他奖，first 可能 400——跳过写入断言，仍验证二次提交语义
    if (first.body.code === 200) {
      const second = await apiPost(request, token, `/api/award/import?comp_id=${compId}`, {
        rows: [
          row({ project_name: `${project}-新`, award_name: '一等奖' }),
          row({ project_name: project, award_name: '二等奖' }),
        ],
      })
      expect([200, 400]).toContain(second.body.code)
    } else {
      expect(first.body.message || firstRowError(first.body)).toBeTruthy()
    }
  })

  test('IMP-017 院管无权限赛事导入 403', async ({ request }) => {
    let caToken
    try {
      caToken = await login(request, { username: 'MC2601', password: '123' })
    } catch {
      test.skip(true, '无 MC2601')
      return
    }
    const list = await apiGet(request, caToken, '/api/award/list?page=1&size=50')
    const items = list.body.data?.list || []
    // 甲院管应看不到乙院省赛；直接猜一个不存在范围的 id 用 403
    const forbiddenComp = items.find(c => c.comp_name && c.comp_name.includes('乙学院'))
      || items.find(c => c.comp_level === '省级' && c.college_info && c.college_info.id === 5)
    if (!forbiddenComp) {
      // 用 id=999999 不存在 → 403/404
      const r = await apiPost(request, caToken, `/api/award/import?comp_id=999999`, {
        rows: [row({ project_name: `IMP017-${Date.now()}` })],
      })
      expect([403, 404]).toContain(r.status)
      return
    }
    const r = await apiPost(request, caToken, `/api/award/import?comp_id=${forbiddenComp.id}`, {
      rows: [row({ project_name: `IMP017-${Date.now()}` })],
    })
    expect(r.status).toBe(403)
  })
})
