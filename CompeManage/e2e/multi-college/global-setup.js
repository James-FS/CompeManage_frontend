/**
 * 多学院并行填报全局准备（不改业务代码，只造测试数据）：
 * 1. 健康检查后端 + 校管理员登录
 * 2. SQL 幂等播种 20 个 college_admin + 20 个学生（密码均为 "123"）
 * 3. 通过 API 给 20 个账号分配 college_admin 角色并绑定管理学院
 * 4. 由各学院账号申报，校管理员审批入库，覆盖项目来源与负责人单位不同的情况
 * 5. 关闭"导入需报名"，并清理历史 E2E 赛事
 *
 * 数据库：本地 MySQL root/lhh5555 库 CompeManage（与 .env / config-dev 一致）。
 */
import { execFileSync } from 'node:child_process'
import {
  BACKEND_URL, SCHOOL_ADMIN, COLLEGES, SEED_PASSWORD_HASH, YEAR,
  collegeAdmin, collegeStudent, RUN_TAG,
} from './helpers/multi-college-data.js'
import { writeState } from './helpers/state.js'

const MYSQL = 'mysql'
const MYSQL_ARGS = ['-uroot', '-plhh5555', '--default-character-set=utf8mb4', 'CompeManage']

export default async function globalSetup() {
  const token = await ensureBackend()
  await seedAccounts()
  const managerIds = await ensureCollegeAdminRoles(token)
  const comps = await ensureCompetitions(token, managerIds)
  await ensureImportSettings(token)
  cleanupStale()
  // 写入共享状态文件（globalSetup 与 worker 是不同进程，env 不互通）
  writeState({
    sourceCompetitions: comps.byCollege,
    collegeACompId: comps.collegeA.id,
    collegeBCompId: comps.collegeB.id,
    runTag: RUN_TAG,
  })
  console.log(`[multi-college] 准备完成 RUN_TAG=${RUN_TAG} 项目来源赛事 ${comps.byCollege.length} 项`)
}

async function ensureBackend() {
  let res
  try {
    res = await fetch(`${BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SCHOOL_ADMIN),
    })
  } catch {
    throw new Error(`后端 ${BACKEND_URL} 不可达。请先：cd CompeManage_backend && go run main.go`)
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.code !== 200) {
    throw new Error(`校管理员登录失败：HTTP ${res.status} ${JSON.stringify(body)}`)
  }
  console.log(`[multi-college] 后端就绪，校管理员 ${SCHOOL_ADMIN.username} 登录成功`)
  return body.data.token
}

function runSQL(sql) {
  return execFileSync(MYSQL, [...MYSQL_ARGS, '-N', '-e', sql], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  })
}

async function seedAccounts() {
  const admins = COLLEGES.map((_, i) => collegeAdmin(i))
  const students = COLLEGES.map((_, i) => collegeStudent(i))

  const adminValues = admins.map((a) =>
    `('${a.username}','${a.realname}','${SEED_PASSWORD_HASH}','教职员工','${a.college.name}','${a.college.short}','staff',NOW(3),NOW(3))`,
  ).join(',\n')
  const studentValues = students.map((s) =>
    `('${s.username}','${s.name}','${SEED_PASSWORD_HASH}','2024级','${s.college}','${s.major}','student',NOW(3),NOW(3))`,
  ).join(',\n')

  const adminNames = admins.map(a => `'${a.username}'`).join(',')
  const studentNames = students.map(s => `'${s.username}'`).join(',')

  const sql = `
INSERT IGNORE INTO users (username, realname, password, grade, college, major, identity_type, create_time, update_time)
VALUES
${adminValues},
${studentValues};

UPDATE users SET delete_time=NULL WHERE username IN (${adminNames},${studentNames});

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.role_code='student'
WHERE u.username IN (${studentNames})
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);

SELECT COUNT(*) FROM users WHERE username IN (${adminNames},${studentNames});
`
  const out = runSQL(sql)
  console.log(`[multi-college] 账号播种完成（库中命中 ${out.trim()} 行）`)
}

async function ensureCollegeAdminRoles(token) {
  const roleRes = await fetch(`${BACKEND_URL}/api/perm/role/list`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const roleBody = await roleRes.json()
  const collegeRole = (roleBody.data || []).find(r => r.role_code === 'college_admin')
  if (!collegeRole) throw new Error('未找到 college_admin 角色')

  const managerIds = []
  let assigned = 0
  for (let i = 0; i < COLLEGES.length; i++) {
    const admin = collegeAdmin(i)
    const listRes = await fetch(
      `${BACKEND_URL}/api/perm/member/list?page=1&page_size=5&search=${admin.username}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    const listBody = await listRes.json()
    const user = (listBody.data?.list || []).find(u => u.username === admin.username)
    if (!user) throw new Error(`用户 ${admin.username} 不存在，播种失败`)
    managerIds.push(user.id)

    const putRes = await fetch(`${BACKEND_URL}/api/perm/member/${user.id}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role_id: collegeRole.id, managed_college_id: COLLEGES[i].id }),
    })
    const putBody = await putRes.json().catch(() => ({}))
    // 已绑定同一学院时接口幂等返回成功；多角色等异常才需要报告
    if (putRes.status !== 200 || (putBody.code !== 200 && !String(putBody.message || '').includes('多角色'))) {
      if (putBody.message && putBody.message.includes('必须指定')) {
        throw new Error(`分配角色失败 ${admin.username}: ${putBody.message}`)
      }
      // "不能修改自己"等对非当前用户不应出现；其余非 200 视为错误
      if (putBody.code && putBody.code !== 200) {
        console.warn(`[multi-college] 角色分配提示 ${admin.username}: ${putBody.message}`)
      }
    } else {
      assigned++
    }
  }
  console.log(`[multi-college] college_admin 角色处理完成（成功 ${assigned}/${COLLEGES.length}）`)
  return managerIds
}

async function post(path, payload, token) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.code !== 200) {
    throw new Error(`${path} 请求失败：HTTP ${res.status} ${body.message || ''}`)
  }
  return body.data
}

async function findCompByName(token, name) {
  const res = await fetch(`${BACKEND_URL}/api/comp/list?page=1&page_size=50&year=${YEAR}&comp_name=${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => ({}))
  const list = body.data?.list || body.data?.data || []
  return list.find(c => c.comp_name === name) || null
}

async function ensureCompetitions(token, managerIds) {
  const collegeTokens = await Promise.all(COLLEGES.map(async (_, index) => {
    const { username, password } = collegeAdmin(index)
    const login = await post('/api/login', { username, password })
    return login.token
  }))
  const createCompetition = async (sourceIndex, hostIndex, suffix, level) => {
    const name = `${RUN_TAG}多学院并行·${suffix}`
    const creator = collegeTokens[sourceIndex]
    const { declaration } = await post('/api/declare', {
      comp_name: name, comp_level: level, comp_type: '学科竞赛',
      organizer: 'E2E 测试单位', undertaker: COLLEGES[hostIndex].name,
      manager_id: managerIds[hostIndex], college_id: COLLEGES[sourceIndex].id, year: Number(YEAR),
    }, creator)
    await post(`/api/declare/${declaration.id}/submit`, {}, creator)
    await post('/api/declare/audit', { declare_id: declaration.id, audit_status: 2 }, token)
    const competition = await findCompByName(token, name)
    if (!competition || competition.project_source !== COLLEGES[sourceIndex].name) {
      throw new Error(`赛事「${name}」入库后项目来源不匹配`)
    }
    return { id: competition.id, name }
  }
  const byCollege = []
  for (let i = 0; i < COLLEGES.length; i++) {
    const source = COLLEGES[i]
    byCollege.push(await createCompetition(i, (i + 1) % COLLEGES.length, `${source.short}来源校赛`, '校级'))
  }
  return {
    byCollege,
    collegeA: await createCompetition(0, 0, '甲学院省赛', '省级'),
    collegeB: await createCompetition(1, 1, '乙学院省赛', '省级'),
  }
}

async function ensureImportSettings(token) {
  const res = await fetch(`${BACKEND_URL}/api/award/import/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ require_registration: false }),
  })
  if (!res.ok) throw new Error(`关闭"导入需报名审核"失败：HTTP ${res.status}`)
  console.log('[multi-college] 导入报名要求已确保为：无需报名')
}

function cleanupStale() {
  try {
    const out = runSQL(`
UPDATE comp_directories SET delete_time = NOW(3), update_time = NOW(3)
WHERE comp_name LIKE '%多学院并行%' AND delete_time IS NULL
  AND comp_name NOT LIKE '${RUN_TAG}%';
SELECT ROW_COUNT();
`)
    console.log(`[multi-college] 清理历史多学院 E2E 赛事：${out.trim().split('\n').pop()}`)
  } catch (e) {
    console.warn(`[multi-college] 清理历史赛事失败（不影响本次）：${e.message}`)
  }
}
