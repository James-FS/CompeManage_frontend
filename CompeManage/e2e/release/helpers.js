// @ts-check
// 发布测试公共工具：账号、API 调用、页面冒烟检查

export const ACCOUNTS = {
  schoolAdmin: { username: '900001', password: 'Pw@yy03', label: '校管理员' },
  schoolAdminB: { username: 'T2023001', password: '123', label: '校管理员B' },
  collegeAdmin: { username: 'T2023002', password: '123', label: '院级管理员' },
  compManager: { username: 'T2023003', password: '123', label: '赛事负责人' },
  teacher: { username: 'T2023010', password: '123', label: '教师' },
  student: { username: 'S2024001', password: '123', label: '学生' },
  studentB: { username: '900006', password: 'Pw@yy03', label: '学生B' },
  expert: { username: 'E2023001', password: '123', label: '专家' },
}

// 角色 API 越权测试时允许的"良性失败"：这些接口对部分角色返回 403 属预期（首页兜底调用等）
export const BENIGN_403 = ['/api/declare/my/pending']

/** 登录并返回 token（使用 API request 上下文） */
export async function apiLogin(request, { username, password }) {
  const res = await request.post('/api/login', { data: { username, password } })
  const body = await res.json().catch(() => ({}))
  if (res.status() !== 200 || !(body.data?.token || body.data?.accessToken)) {
    throw new Error(`登录失败 ${username}: ${res.status()} ${JSON.stringify(body).slice(0, 200)}`)
  }
  return body.data.token || body.data.accessToken
}

/** 登录失败返回 null（用于可选角色：本地库可能缺该种子账号） */
export async function tryApiLogin(request, account) {
  try {
    return await apiLogin(request, account)
  } catch (e) {
    console.log(`[release] 可选账号 ${account.username} 不可用: ${e.message.slice(0, 120)}`)
    return null
  }
}

/** 查询可用的赛事负责人ID：优先教师池 T2023012，回退 T2023003，再回退列表第一个 */
export async function getManagerId(request, token) {
  for (const workId of ['T2023012', 'T2023003', '']) {
    const qs = workId ? `&work_id=${workId}` : ''
    const { body } = await apiGet(request, token, `/api/comp/manager/list?page=1&page_size=5${qs}`)
    const id = body?.data?.list?.[0]?.id
    if (id) return id
  }
  return null
}

/** 带 token 的 GET，返回 {status, body} */
export async function apiGet(request, token, url) {
  const res = await request.get(url, { headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json().catch(() => ({}))
  return { status: res.status(), body }
}

/** 带 token 的 POST(JSON)，返回 {status, body} */
export async function apiPost(request, token, url, data) {
  const res = await request.post(url, { data, headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json().catch(() => ({}))
  return { status: res.status(), body }
}

/**
 * 页面冒烟检查：内容非空、无 JS 异常、无非预期 API 错误，并截图。
 * @param {import('@playwright/test').Page} page
 * @param {string} path hash 路由路径，如 /home
 * @param {{name: string, shotPrefix: string}} meta
 */
export async function smokePage(page, path, { name, shotPrefix }) {
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  const apiErrors = []
  page.on('response', r => {
    if (r.status() >= 400 && r.url().includes('/api/')) {
      const u = new URL(r.url())
      if (!BENIGN_403.some(p => u.pathname === p)) apiErrors.push(`${r.status()} ${u.pathname}`)
    }
  })

  await page.goto(`#${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  const bodyText = (await page.locator('body').innerText()).trim()
  const issues = []
  if (bodyText.length <= 20) issues.push(`页面内容过短(${bodyText.length}字符)`)
  if (bodyText.includes('Cannot read') || bodyText.includes('undefined is not')) issues.push('页面有JS崩溃痕迹')
  if (errors.length) issues.push(`JS异常: ${errors.slice(0, 3).join(' | ')}`)
  if (apiErrors.length) issues.push(`API失败: ${apiErrors.slice(0, 5).join(' | ')}`)

  const slug = path.replace(/\//g, '_')
  await page.screenshot({ path: `e2e/artifacts/release-${shotPrefix}${slug}.png`, fullPage: true })
  return { issues, bodyText }
}
