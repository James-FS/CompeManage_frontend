import { test, expect } from 'playwright-test-coverage'

// competition/list.vue 年度目录管理 CRUD 定向覆盖（handleAddYearInDialog/handleStartEdit/
// handleSaveEdit/handleCancelEdit/handleDeleteYear 及校验分支）

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'year-manage-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const years = ['2025', '2024']
  const state = { created: [], updated: [], deleted: [] }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    let data = []
    if (p === '/api/comp/years' && req.method() === 'GET') data = { years: [...years] }
    if (p === '/api/comp/years' && req.method() === 'POST') {
      state.created.push(req.postDataJSON())
      years.unshift(String(req.postDataJSON().year))
    }
    if (p.match(/^\/api\/comp\/years\/\d+$/) && req.method() === 'PUT') {
      state.updated.push({ old: p.split('/').pop(), body: req.postDataJSON() })
    }
    if (p.match(/^\/api\/comp\/years\/\d+$/) && req.method() === 'DELETE') {
      state.deleted.push(p.split('/').pop())
    }
    if (p === '/api/comp/list') data = { list: [], total: 0 }
    if (p === '/api/college/list') data = []
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
  await page.goto('/#/competition/list')
  await expect(page.getByText(/当前：\d+年度赛事|暂无年度目录/).first()).toBeVisible()
  return state
}

async function openYearDialog(page) {
  await page.locator('.tag-text').first().click()
  await page.getByText('管理年度目录').click()
  await expect(page.getByRole('dialog', { name: '年度目录管理' })).toBeVisible()
}

function yearDialog(page) {
  return page.getByRole('dialog', { name: '年度目录管理' })
}

test('新增年度：非法/重复拦截，合法年份创建并刷新', async ({ page }) => {
  const state = await setup(page)
  await openYearDialog(page)

  const input = page.getByPlaceholder('输入年份 (如 2026)')
  // 非法年份
  await input.fill('999')
  await page.getByRole('button', { name: '新增年份' }).click()
  await expect(page.locator('.el-message').filter({ hasText: '请输入1000至9999的4位年份' })).toBeVisible()
  expect(state.created).toHaveLength(0)

  // 重复年份
  await input.fill('2025')
  await page.getByRole('button', { name: '新增年份' }).click()
  await expect(page.locator('.el-message').filter({ hasText: '该年度目录已存在' })).toBeVisible()
  expect(state.created).toHaveLength(0)

  // 合法年份 → 创建 + 表格刷新
  await input.fill('2030')
  await page.getByRole('button', { name: '新增年份' }).click()
  await expect.poll(() => state.created).toHaveLength(1)
  expect(state.created[0]).toEqual({ year: '2030' })
  await expect(yearDialog(page).locator('.el-table__body tr').first()).toContainText('2030年度')
  await expect(page.locator('.el-message').filter({ hasText: '添加成功' })).toBeVisible()
})

test('行内编辑年度：同值退出、非法/重复拦截、合法保存', async ({ page }) => {
  const state = await setup(page)
  await openYearDialog(page)
  const rows = yearDialog(page).locator('.el-table__body tr')

  // 同值保存 → 直接退出编辑，不发请求
  await rows.first().getByRole('button', { name: '修改' }).click()
  await expect(rows.first().locator('input')).toBeVisible()
  await rows.first().getByRole('button', { name: '保存' }).click()
  await expect(rows.first().locator('input')).toHaveCount(0)
  expect(state.updated).toHaveLength(0)

  // 非法值
  await rows.first().getByRole('button', { name: '修改' }).click()
  await rows.first().locator('input').fill('20x')
  await rows.first().getByRole('button', { name: '保存' }).click()
  await expect(page.locator('.el-message').filter({ hasText: '请输入1000至9999的4位年份' })).toBeVisible()
  expect(state.updated).toHaveLength(0)

  // 重复值
  await rows.first().locator('input').fill('2024')
  await rows.first().getByRole('button', { name: '保存' }).click()
  await expect(page.locator('.el-message').filter({ hasText: '该年度目录已存在' })).toBeVisible()
  expect(state.updated).toHaveLength(0)

  // 取消编辑
  await rows.first().getByRole('button', { name: '取消' }).click()
  await expect(rows.first().locator('input')).toHaveCount(0)

  // 合法保存 → PUT
  await rows.first().getByRole('button', { name: '修改' }).click()
  await rows.first().locator('input').fill('2031')
  await rows.first().getByRole('button', { name: '保存' }).click()
  await expect.poll(() => state.updated).toHaveLength(1)
  expect(state.updated[0]).toMatchObject({ old: '2025', body: { year: '2031' } })
  await expect(page.locator('.el-message').filter({ hasText: '修改成功' })).toBeVisible()
})

test('删除年度：确认框确定删除、取消不删除', async ({ page }) => {
  const state = await setup(page)
  await openYearDialog(page)
  const rows = yearDialog(page).locator('.el-table__body tr')

  // 取消分支
  await rows.first().getByRole('button', { name: '删除' }).click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toContainText('确定要删除 2025 年度目录吗？')
  await msgbox.getByRole('button', { name: '取消' }).click()
  expect(state.deleted).toHaveLength(0)

  // 确定分支
  await rows.first().getByRole('button', { name: '删除' }).click()
  await msgbox.getByRole('button', { name: '确定' }).click()
  await expect.poll(() => state.deleted).toEqual(['2025'])
  await expect(page.locator('.el-message').filter({ hasText: '删除成功' })).toBeVisible()
})
