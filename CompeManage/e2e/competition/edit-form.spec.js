import { test, expect } from 'playwright-test-coverage'

// competition/edit.vue 定向覆盖：
// 详情加载三分支（无权限拦截/接口失败/空数据）、回显保存与更新失败、
// 负责人替换权限门（can_reassign_manager）、负责人选择教师分支、列表失败分支

const DETAIL = {
  comp_name: '编辑赛事甲', comp_level: '校级', comp_type: '学科竞赛',
  organizer: '主办原值', undertaker: '承办原值', manager_id: 65089,
  manager: { id: 65089, realname: '何老师' },
  college_info: { name: '计算机学院' },
  desc: '原简介', year: 2026,
  capabilities: { can_edit_competition: true, can_reassign_manager: true },
}

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'edit-form-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const state = { updated: undefined, managerUrls: [] }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/comp/7') {
      if (req.method() === 'PUT') {
        if (opts.updateFail) {
          await route.fulfill({ json: { code: 500, message: '更新服务不可用' } })
          return
        }
        try { state.updated = req.postDataJSON() } catch { state.updated = JSON.parse(req.postData() || '{}') }
        await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
        return
      }
      if (opts.detailFail) {
        await route.fulfill({ json: { code: 500, message: '详情服务不可用' } })
        return
      }
      if (opts.noPerm) {
        await route.fulfill({ json: { code: 200, message: 'success', data: { ...DETAIL, capabilities: { can_edit_competition: false } } } })
        return
      }
      if (opts.noReassign) {
        await route.fulfill({ json: { code: 200, message: 'success', data: { ...DETAIL, capabilities: { can_edit_competition: true, can_reassign_manager: false } } } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: DETAIL } })
      return
    }
    if (p === '/api/comp/manager/list') {
      state.managerUrls.push(decodeURIComponent(url.searchParams.toString()))
      if (opts.managerFail) {
        await route.fulfill({ json: { code: 500, message: '负责人服务不可用' } })
        return
      }
      const list = url.searchParams.get('name')
        ? [{ id: 65090, name: '钱老师', work_id: 'T2023013', college: '计算机学院', role_code: 'teacher' }]
        : []
      await route.fulfill({ json: { code: 200, message: 'success', data: { list, total: list.length } } })
      return
    }
    if (p === '/api/college/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: [{ id: 4, name: '计算机学院' }] } })
      return
    }
    if (p === '/api/department/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: [{ id: 8, name: '计算机系' }] } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  await page.goto('/#/competition/edit/7')
  return state
}

async function settle(page) {
  await expect(page.getByPlaceholder('请输入赛事名称')).toHaveValue('编辑赛事甲')
  await expect(page.locator('.el-loading-mask')).toHaveCount(0)
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('详情加载：无权限拦截并跳转', async ({ page }) => {
  await setup(page, { noPerm: true })
  await toast(page, '当前账号无权编辑该赛事')
  await page.waitForURL(/competition\/list/)
})

test('详情加载失败提示', async ({ page }) => {
  await setup(page, { detailFail: true })
  await toast(page, /详情服务不可用|获取赛事详情失败/)
})

test('回显保存并跳转列表', async ({ page }) => {
  const state = await setup(page)
  await settle(page)
  const nameInput = page.getByPlaceholder(/赛事名称|请输入赛事名称/).first()
  await nameInput.fill('编辑后赛事')
  await page.getByRole('button', { name: /保存|提交/ }).first().click({ force: true })
  await expect.poll(() => state.updated).toBeTruthy()
  expect(state.updated.comp_name).toBe('编辑后赛事')
  await page.waitForURL(/competition\/list/)
})

test('更新失败提示', async ({ page }) => {
  await setup(page, { updateFail: true })
  await settle(page)
  const nameInput = page.getByPlaceholder(/赛事名称|请输入赛事名称/).first()
  await nameInput.fill('修改失败赛事')
  await page.getByRole('button', { name: /保存|提交/ }).first().click({ force: true })
  await toast(page, /更新服务不可用|修改失败/)
})

test('负责人替换权限门：无权限不弹窗', async ({ page }) => {
  await setup(page, { noReassign: true })
  await settle(page)
  await page.locator('.manager-input').click({ force: true }).catch(() => {})
  await expect(page.locator('.el-dialog')).toHaveCount(0)
})

test('负责人选择教师分支', async ({ page }) => {
  const state = await setup(page)
  await settle(page) // 等加载落定
  await page.locator('.manager-input').click({ force: true })
  const dialog = page.locator('.el-dialog')
  if (!(await dialog.isVisible().catch(() => false))) {
    await page.locator('.manager-input').click({ force: true }) // 偶发一次不弹，重试一次
  }
  await expect(dialog).toBeVisible({ timeout: 10000 })
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(0)
  await dialog.getByPlaceholder('输入姓名').fill('钱')
  await expect.poll(() => state.managerUrls.some((u) => u.includes('name=钱')), { timeout: 8000 }).toBe(true)
  await dialog.getByRole('button', { name: '选择' }).first().click({ force: true })
  await toast(page, '已选择负责人：钱老师')
})

test('负责人列表失败分支', async ({ page }) => {
  await setup(page, { managerFail: true })
  await settle(page)
  await page.locator('.manager-input').click({ force: true })
  const dialog = page.locator('.el-dialog')
  await dialog.getByPlaceholder('输入姓名').fill('钱')
  await toast(page, /负责人服务不可用|获取负责人列表失败/)
})
