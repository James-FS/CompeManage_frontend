/**
 * 获奖填报全流程测试的全局准备：
 * 1. 健康检查后端（未启动时给出明确提示，而不是让用例在浏览器里莫名失败）
 * 2. 幂等播种 E2E 专用学生（users 表 + student 角色），覆盖 8 个学院
 * 3. 关闭"导入需报名审核"，让导入不依赖报名记录
 *
 * 学生播种走 docker exec 直连 MySQL（与 docker-compose.yml 的容器名一致），
 * 是项目文档允许的测试数据准备方式；SQL 通过 stdin 传入避免命令行中文转义问题。
 */
import { execSync } from 'node:child_process'
import { BACKEND_URL, SCHOOL_ADMIN, FLOW_STUDENTS, SEED_PASSWORD_HASH, E2E_COMP_PREFIX } from './helpers/award-flow-data'

export default async function globalSetup() {
  const token = await ensureBackend()
  await ensureImportSettings(token)
  seedStudents()
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
    const out = execSync(
      'docker exec -i compemanage_mysql mysql -uroot -p123456 --default-character-set=utf8mb4 CompeManage',
      { input: sql, encoding: 'utf8', shell: true },
    )
    const rows = out.split('\n').filter(l => l.includes('E2E26')).length
    console.log(`[award-flow] E2E 学生播种完成（${FLOW_STUDENTS.length} 人，库中命中 ${rows} 行）`)
  } catch (error) {
    throw new Error(
      '播种 E2E 学生失败：需要 docker 容器 compemanage_mysql 在运行。\n' +
      `  docker compose up -d\n原始错误：${error.message}`,
    )
  }
}

/** 软删历史运行遗留的 E2E 赛事（连同其获奖不再出现在校赛填报与附件导出里） */
function cleanupStaleE2EComps() {
  const sql = `
SELECT COUNT(*) AS stale FROM comp_directories WHERE comp_name LIKE '${E2E_COMP_PREFIX}%' AND delete_time IS NULL;
UPDATE comp_directories SET delete_time = NOW(3), update_time = NOW(3) WHERE comp_name LIKE '${E2E_COMP_PREFIX}%' AND delete_time IS NULL;
`
  try {
    const out = execSync(
      'docker exec -i compemanage_mysql mysql -uroot -p123456 --default-character-set=utf8mb4 CompeManage -N',
      { input: sql, encoding: 'utf8', shell: true },
    )
    console.log(`[award-flow] 清理历史 E2E 赛事：${out.trim().split('\n')[0]} 条已软删`)
  } catch (error) {
    console.warn(`[award-flow] 清理历史 E2E 赛事失败（不影响本次运行）：${error.message}`)
  }
}
