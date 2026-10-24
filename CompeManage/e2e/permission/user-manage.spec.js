import { test, expect } from 'playwright-test-coverage'

// permission/userManage.vue 定向覆盖（135 条处女地）：
// 列表标签与筛选、isDirty 切换确认双分支、角色联动 managed 学院、
// 保存三分支（成功/缓存重试/缓存失败）、保存守卫、加载失败

const ROLES = [
  { id: 1, role_code: 'school_admin', role_name: '校级管理员' },
  { id: 2, role_code: 'college_admin', role_name: '院级管理员' },
  { id: 3, role_code: 'teacher', role_name: '教师' },
  { id: 4, role_code: 'student', role_name: '学生' },
]

const USERS = [
  { id: 101, username: 'T2023001', realname: '张管理', identity_type: 'staff', role: { id: 1, role_code: 'school_admin', role_name: '校级管理员' }, managed_college_id: null },
  { id: 102, username: 'T2023002', realname: '李院管', identity_type: 'staff', role: { id: 2, role_code: 'college_admin', role_name: '院级管理员' }, managed_college_id: 4 },
  { id: 103, username: 'S2024001', realname: '王同学', identity_type: 'student', role: null, managed_college_id: null },
  { id: 104, username: 'X9', realname: '赵异常', identity_type: 'external', role: { id: 3, role_code: 'teacher', role_name: '教师' }, managed_college_id: null, role_conflict: true },
]

async function setup(page, opts = {}) {
  await page.addInitScript(
    (uid) => {
      localStorage.setItem('token', 'user-manage-test')
      localStorage.setItem('role', 'school_admin')
      localStorage.setItem('userInfo', JSON.stringify({ id: uid, name: '张管理', username: 'T2023001' }))
    },
    opts.selfId ?? 101
  )
  const state = { urls: [], assigned: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    state.urls.push(decodeURIComponent(p + '?' + url.searchParams.toString()))
    if (p === '/api/perm/role/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: ROLES } })
      return
    }
    if (p === '/api/college/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: [{ id: 4, name: '计算机学院' }, { id: 5, name: '数学学院' }] } })
      return
    }
    if (p === '/api/perm/member/list') {
      if (opts.loadFail) {
        await route.fulfill({ json: { code: 500, message: '服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: USERS, total: USERS.length } } })
      return
    }
    if (p.match(/^\/api\/perm\/member\/\d+\/role$/)) {
      state.assigned = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: opts.cacheResult ?? {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  await page.goto('/#/permission/users')
  if (!opts.loadFail) await expect(page.getByText('张管理')).toBeVisible()
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('列表：身份/角色标签与异常标记、筛选与重置', async ({ page }) => {
  const state = await setup(page)
  // 标签渲染（identityLabel/roleTagType/待分配/多角色异常）
  await expect(page.getByText('教职工').first()).toBeVisible()
  await expect(page.getByText('本科生').first()).toBeVisible()
  await expect(page.getByText('外部/人工账号').first()).toBeVisible()
  await expect(page.getByText('待分配').first()).toBeVisible()
  await expect(page.getByText('多角色异常').first()).toBeVisible()

  // 关键字搜索（debounce）
  await page.getByPlaceholder('请输入账号、姓名或所属单位').fill('李院管')
  await expect.poll(() => state.urls.some((u) => u.includes('/api/perm/member/list') && u.includes('search=李院管')), { timeout: 8000 }).toBe(true)

  // 重置
  state.urls.length = 0
  await page.locator('.filter-card').getByRole('button', { name: '重置' }).click()
  await expect.poll(() => state.urls.some((u) => u.includes('/api/perm/member/list'))).toBe(true)
})

test('isDirty 切换用户确认双分支', async ({ page }) => {
  await setup(page, { selfId: 999 })
  // 选中用户 → 改角色（产生脏状态）
  await page.getByText('张管理').click()
  const panel = page.locator('.el-card').filter({ hasText: '角色配置' })
  await panel.locator('.el-radio').filter({ hasText: '教师' }).click()
  // 继续编辑分支
  await page.getByText('王同学').click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('当前角色修改尚未保存')
  await msgbox.getByRole('button', { name: '继续编辑' }).click()
  // 仍停留在原用户（编辑器回显张管理）
  await expect(page.locator('.user-item.active')).toContainText('张管理')

  // 放弃并切换分支
  await page.getByText('王同学').click()
  await msgbox.getByRole('button', { name: '放弃并切换' }).click()
  await expect(page.locator('.user-item.active')).toContainText('王同学')
})

test('角色切换联动 managed 学院', async ({ page }) => {
  await setup(page, { selfId: 999 })
  await page.getByText('王同学').click()
  const panel = page.locator('.el-card').filter({ hasText: '角色配置' })
  // 选 college_admin → 管理学院区出现
  await panel.locator('.el-radio').filter({ hasText: '院级管理员' }).click()
  await expect(panel.getByText('管理学院').first()).toBeVisible()
  // 切回非 college_admin → 管理学院区消失（managed 清空）
  await panel.locator('.el-radio').filter({ hasText: '教师' }).click()
  await expect(panel.getByText('管理学院')).toHaveCount(0)
})

test('保存成功并提示重新登录', async ({ page }) => {
  const state = await setup(page, { selfId: 999 })
  await page.getByText('王同学').click()
  const panel = page.locator('.el-card').filter({ hasText: '角色配置' })
  await panel.locator('.el-radio').filter({ hasText: '教师' }).click()
  await panel.getByRole('button', { name: /保存/ }).click()
  await expect.poll(() => state.assigned).toBeTruthy()
  expect(state.assigned).toMatchObject({ role_id: 3 })
  await toast(page, '角色分配成功，请通知该用户重新登录')
})

test('缓存刷新降级双警告', async ({ page }) => {
  await setup(page, { selfId: 999, cacheResult: { cache_refreshed: false, cache_retry_queued: true } })
  await page.getByText('王同学').click()
  const panel = page.locator('.el-card').filter({ hasText: '角色配置' })
  await panel.locator('.el-radio').filter({ hasText: '教师' }).click()
  await panel.getByRole('button', { name: /保存/ }).click()
  await toast(page, '权限缓存正在后台重试刷新')
})

test('缓存刷新与重试均失败警告', async ({ page }) => {
  await setup(page, { selfId: 999, cacheResult: { cache_refreshed: false, cache_retry_queued: false, cache_ttl_seconds: 300 } })
  await page.getByText('王同学').click()
  const panel = page.locator('.el-card').filter({ hasText: '角色配置' })
  await panel.locator('.el-radio').filter({ hasText: '教师' }).click()
  await panel.getByRole('button', { name: /保存/ }).click()
  await toast(page, '缓存刷新和重试入队均失败')
})

test('自己不可改（isSelf 守卫）', async ({ page }) => {
  await setup(page)
  await page.getByText('张管理').click()
  const panel = page.locator('.el-card').filter({ hasText: '角色配置' })
  await expect(panel.getByRole('button', { name: /保存/ })).toBeDisabled()
})

test('数据加载失败提示', async ({ page }) => {
  await setup(page, { loadFail: true })
  await toast(page, /服务不可用|用户管理数据加载失败/)
})
