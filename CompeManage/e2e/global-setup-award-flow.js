/**
 * 获奖填报全流程测试的全局准备：
 * 1. 健康检查后端（未启动时给出明确提示，而不是让用例在浏览器里莫名失败）
 * 2. 幂等播种 E2E 专用学生（users 表 + student 角色），覆盖 8 个学院
 * 3. 幂等播种赛事负责人账号（FLOW_COMPS 引用的工号必须存在，否则选负责人弹窗查不到行）
 * 4. 关闭"导入需报名审核"，让导入不依赖报名记录
 *
 * 播种走 SQL 直连 MySQL（与 multi-college 套件一致的测试数据准备方式）：
 * 优先 docker 容器 compemanage_mysql，不可用时回退本机 mysql 客户端；
 * SQL 通过 stdin 传入避免命令行中文转义问题。
 */
import { execSync } from 'node:child_process'
import {
  BACKEND_URL, SCHOOL_ADMIN, FLOW_STUDENTS, FLOW_MANAGERS, SEED_PASSWORD_HASH, E2E_COMP_PREFIX,
} from './helpers/award-flow-data'

/**
 * MySQL 访问方式：优先 docker 容器 compemanage_mysql，容器不可用时回退到本机 mysql 客户端。
 * 本机原生 MySQL（服务 MySQL80）与 docker 容器两种环境都能跑，避免"套件只能在一种环境通过"。
 * 可用 E2E_MYSQL_HOST/USER/PASSWORD/DB 覆盖本地连接参数。
 */
const DOCKER_MYSQL_BASE =
  'docker exec -i compemanage_mysql mysql -uroot -p123456 --default-character-set=utf8mb4 CompeManage'
const LOCAL_MYSQL_HOST = process.env.E2E_MYSQL_HOST || '127.0.0.1'
const LOCAL_MYSQL_USER = process.env.E2E_MYSQL_USER || 'root'
const LOCAL_MYSQL_PASSWORD = process.env.E2E_MYSQL_PASSWORD || 'lhh5555'
const LOCAL_MYSQL_DB = process.env.E2E_MYSQL_DB || 'CompeManage'
const LOCAL_MYSQL_BASE = `mysql -h${LOCAL_MYSQL_HOST} -u${LOCAL_MYSQL_USER} -p${LOCAL_MYSQL_PASSWORD} --default-character-set=utf8mb4 ${LOCAL_MYSQL_DB}`

/** 探测成功的连接基础命令（不含 -N 等每次不同的附加参数） */
let resolvedMysqlBase = null

/** 首次调用时探测：docker 容器在就用 docker，否则用本机 mysql 客户端 */
function runSQL(sql, { extraArgs = '' } = {}) {
  const withArgs = (base) => (extraArgs ? `${base} ${extraArgs}` : base)
  if (resolvedMysqlBase) {
    const command = withArgs(resolvedMysqlBase)
    return { out: execSync(command, { input: sql, encoding: 'utf8', shell: true }), via: command }
  }
  const errors = []
  for (const base of [DOCKER_MYSQL_BASE, LOCAL_MYSQL_BASE]) {
    const command = withArgs(base)
    try {
      const out = execSync(command, { input: sql, encoding: 'utf8', shell: true })
      resolvedMysqlBase = base
      return { out, via: command }
    } catch (error) {
      errors.push(error.message)
    }
  }
  throw new Error(`MySQL 不可用（docker 容器与本地 mysql 客户端均连接失败）：\n${errors.join('\n')}`)
}

export default async function globalSetup() {
  const token = await ensureBackend()
  await ensureImportSettings(token)
  seedStudents()
  seedManagers()
  cleanupStaleE2EComps()
}

async function ensureBackend() {
  let res
  try {
    res = await fetch(`${BACKEND_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: SCHOOL_ADMIN.username, password: SCHOOL_ADMIN.password }),
    })
  } catch {
    throw new Error(
      `后端 ${BACKEND_URL} 不可达。请先启动依赖与服务：\n` +
      '  docker compose up -d            # MySQL + Redis（CompeManage_backend 目录）\n' +
      '  cd CompeManage_backend && go run main.go',
    )
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.code !== 200) {
    throw new Error(`校管理员登录失败：HTTP ${res.status} ${JSON.stringify(body)}`)
  }
  console.log(`[award-flow] 后端就绪，校管理员 ${SCHOOL_ADMIN.username} 登录成功`)
  return body.data.token
}

async function ensureImportSettings(token) {
  const res = await fetch(`${BACKEND_URL}/api/award/import/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ require_registration: false }),
  })
  if (!res.ok) throw new Error(`关闭"导入需报名审核"失败：HTTP ${res.status} ${await res.text()}`)
  console.log('[award-flow] 导入报名要求已确保为：无需报名')
}

/**
 * 播种测试数据。
 * 1. 学生：E2E26xx 9 人（覆盖 8 个学院）
 * 2. 赛事负责人：FLOW_COMPS 引用的工号必须真实存在于 users 表，否则"按工号选负责人"弹窗查不到行而超时。
 *    已存在的负责人（如 T2023003/T2023004）只补齐身份与角色，不改姓名等业务数据。
 */
function seedStudents() {
  const updates = FLOW_STUDENTS.map(s =>
    `UPDATE users SET realname='${s.name}', college='${s.college}', major='${s.major}', identity_type='student', delete_time=NULL WHERE username='${s.username}';`,
  ).join('\n')
  const usernames = FLOW_STUDENTS.map(s => `'${s.username}'`).join(',')
  const sql = `
INSERT IGNORE INTO users (username, realname, password, grade, college, major, identity_type, create_time, update_time) VALUES
${FLOW_STUDENTS.map(s => `('${s.username}','${s.name}','${SEED_PASSWORD_HASH}','2024级','${s.college}','${s.major}','student',NOW(3),NOW(3))`).join(',\n')};
${updates}
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.role_code='student'
WHERE u.username IN (${usernames})
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id);
SELECT username, realname, college FROM users WHERE username IN (${usernames}) ORDER BY username;
`
  try {
    const { out } = runSQL(sql)
    const rows = out.split('\n').filter(l => l.includes('E2E26')).length
    console.log(`[award-flow] E2E 学生播种完成（${FLOW_STUDENTS.length} 人，库中命中 ${rows} 行）`)
  } catch (error) {
    throw new Error(
      '播种 E2E 学生失败：需要 docker 容器 compemanage_mysql 在运行，或本机 mysql 客户端可用。\n' +
      `  docker compose up -d    # 或确保 mysql -uroot -p<密码> 可连\n原始错误：${error.message}`,
    )
  }
}

/**
 * 负责人账号幂等播种：不存在则插入（staff + competition_manager 角色），
 * 已存在则只保证 identity_type='staff' 且不具备角色时补 competition_manager。
 * 不覆盖真实教职工的姓名/学院，避免污染业务库中的既有数据。
 */
function seedManagers() {
  const userValues = FLOW_MANAGERS.map(m =>
    `('${m.username}','${m.name}','${SEED_PASSWORD_HASH}','教职员工','${m.college}','${m.major}','staff',NOW(3),NOW(3))`,
  ).join(',\n')
  const managerNames = FLOW_MANAGERS.map(m => `'${m.username}'`).join(',')
  const sql = `
INSERT IGNORE INTO users (username, realname, password, grade, college, major, identity_type, create_time, update_time) VALUES
${userValues};
UPDATE users SET identity_type='staff', delete_time=NULL WHERE username IN (${managerNames});
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.role_code='competition_manager'
WHERE u.username IN (${managerNames})
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id);
SELECT username, realname FROM users WHERE username IN (${managerNames}) ORDER BY username;
`
  try {
    const { out } = runSQL(sql)
    const rows = out.split('\n').filter(l => l.includes('T2023')).length
    console.log(`[award-flow] 赛事负责人播种完成（${FLOW_MANAGERS.length} 人，库中命中 ${rows} 行）`)
  } catch (error) {
    throw new Error(`播种赛事负责人失败：${error.message}`)
  }
}

/** 软删历史运行遗留的 E2E 赛事（连同其获奖不再出现在校赛填报与附件导出里） */
function cleanupStaleE2EComps() {
  const sql = `
SELECT COUNT(*) AS stale FROM comp_directories WHERE comp_name LIKE '${E2E_COMP_PREFIX}%' AND delete_time IS NULL;
UPDATE comp_directories SET delete_time = NOW(3), update_time = NOW(3) WHERE comp_name LIKE '${E2E_COMP_PREFIX}%' AND delete_time IS NULL;
`
  try {
    const { out } = runSQL(sql, { extraArgs: '-N' })
    console.log(`[award-flow] 清理历史 E2E 赛事：${out.trim().split('\n')[0]} 条已软删`)
  } catch (error) {
    console.warn(`[award-flow] 清理历史 E2E 赛事失败（不影响本次运行）：${error.message}`)
  }
}
