/**
 * e2e 全局数据播种：在整轮测试开始前，通过后端 API 幂等创建基础赛事数据。
 *
 * 大量用例（赛事目录筛选/分页、编辑、通知管理、报名、审核）依赖库里存在赛事，
 * 而业务表可能为空（例如刚重建的数据库）。这里保证至少有 MIN_COMPETITIONS 条赛事。
 */

const ADMIN = { username: 'T2023001', password: '123' }
// 用于负责人：教师池测试账号 T2023012 何老师（staff 身份，创建后自动提升为赛事负责人）
const MANAGER_WORK_ID = 'T2023012'
const MIN_COMPETITIONS = 12

const COLLEGES = [
  '计算机科学与网络工程学院',
  '数学学院',
  '机械工程学院',
  '电子信息工程学院',
]
const LEVELS = ['国家级', '省级', '校级']

export default async function globalSetup() {
  const apiBase = process.env.E2E_API_BASE || 'http://localhost:5219'

  // 登录拿 token
  const loginRes = await fetch(`${apiBase}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN),
  })
  const loginData = await loginRes.json().catch(() => ({}))
  const token = loginData?.data?.token
  if (!token) {
    console.log('[e2e-seed] 登录失败，跳过数据播种（后端未启动？）', loginData?.message || loginData?.msg)
    return
  }
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  // 查询现有赛事数量
  const listRes = await fetch(`${apiBase}/api/comp/list?page=1&page_size=1`, { headers: authHeaders })
  const listData = await listRes.json().catch(() => ({}))
  const total = listData?.data?.total ?? 0
  if (total >= MIN_COMPETITIONS) {
    console.log(`[e2e-seed] 已有 ${total} 条赛事，无需播种`)
    return
  }

  // 查询负责人（教师池）
  const mgrRes = await fetch(
    `${apiBase}/api/comp/manager/list?page=1&page_size=5&work_id=${MANAGER_WORK_ID}`,
    { headers: authHeaders }
  )
  const mgrData = await mgrRes.json().catch(() => ({}))
  const managerId = mgrData?.data?.list?.[0]?.id
  if (!managerId) {
    console.log('[e2e-seed] 未找到教师池负责人 T2023012，跳过数据播种')
    return
  }

  // 逐条补齐赛事
  const need = MIN_COMPETITIONS - total
  let created = 0
  for (let i = 0; i < need; i++) {
    const level = LEVELS[i % LEVELS.length]
    const college = COLLEGES[i % COLLEGES.length]
    const body = {
      comp_name: `E2E基础赛事_${level}_${String(total + i + 1).padStart(3, '0')}`,
      comp_level: level,
      comp_type: '学科竞赛',
      organizer: 'E2E测试主办方',
      undertaker: 'E2E测试承办方',
      college,
      manager_id: managerId,
      year: '2026',
      desc: 'Playwright 全局播种的基础测试赛事',
    }
    const createRes = await fetch(`${apiBase}/api/comp/create`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(body),
    })
    const createData = await createRes.json().catch(() => ({}))
    if (createData?.code === 200) {
      created++
    } else {
      console.log(`[e2e-seed] 创建赛事失败: ${createData?.message || createData?.msg}`)
    }
  }
  console.log(`[e2e-seed] 播种完成：原有 ${total} 条，新增 ${created} 条`)
}
