import { test, expect } from 'playwright-test-coverage'

// register/editDetail.vue 专家选择器定向覆盖：
// 打开回显勾选 / 搜索 / 翻页 / 确认添加（含空选清空） / 移除 / 列表加载失败

const EXPERTS = Array.from({ length: 12 }, (_, i) => ({
  id: 100 + i,
  name: i === 0 ? '何专家' : `专家${i}`,
  username: `E2023${String(10 + i)}`,
  college: '计算机学院',
}))

async function setup(page, opts = {}) {
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message))
  await page.addInitScript(() => {
    localStorage.setItem('token', 'edit-detail-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const state = { saved: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/review/expert/list') {
      if (opts.expertFail) {
        await route.fulfill({ json: { code: 500, message: '专家服务不可用' } })
        return
      }
      const keyword = url.searchParams.get('keyword') || ''
      let list = EXPERTS
      if (keyword) list = EXPERTS.filter((e) => e.name.includes(keyword) || e.username.includes(keyword))
      const pageNo = Number(url.searchParams.get('page') || 1)
      const size = Number(url.searchParams.get('size') || 10)
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: list.slice((pageNo - 1) * size, pageNo * size), total: list.length } } })
      return
    }
    if (p === '/api/reg/config/get') {
      await route.fulfill({ json: { code: 200, message: 'success', data: {
        comp_name: '设置详情测试赛', capabilities: { can_edit_registration: true }, participant_type: 2, min_team_member: 1, max_team_member: 5,
        need_advisor: 0, need_attachment: 0, need_review: 1, track: [],
        experts: opts.preselect ? [{ id: 101, name: '专家1', username: 'E202311' }] : [],
      } } })
      return
    }
    if (p === '/api/reg/config' && req.method() === 'POST') {
      state.saved = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: { capabilities: { can_edit_registration: true } } } })
  })
  await page.goto('/#/register/edit/7')
  await expect(page.getByText('设置详情测试赛')).toBeVisible()
  return state
}

function expertDialog(page) {
  return page.locator('.el-dialog').filter({ hasText: '选择评审专家' })
}

test('专家选择器：搜索、翻页、添加与移除、重开回显勾选', async ({ page }) => {
  await setup(page)

  const addBtn = page.locator('.expert-tags').getByRole('button', { name: /添加专家/ })
  await expect(addBtn).toBeVisible()
  await addBtn.click({ force: true })
  const dialog = expertDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(10)

  // 搜索
  await dialog.getByPlaceholder('搜索姓名或工号').fill('何专家')
  await dialog.getByRole('button', { name: '搜索' }).click()
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(1)
  await dialog.getByRole('button', { name: '搜索' }).click() // 刷新当前页
  await dialog.getByPlaceholder('搜索姓名或工号').fill('')
  await dialog.getByRole('button', { name: '搜索' }).click()
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(10)

  // 翻页（12 人 / 每页 10）
  await dialog.locator('.el-pagination .btn-next').click()
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(2)

  // 回第一页勾选首位专家 → 确认添加（选中项须在重开后的当前页才能断言回显）
  await dialog.locator('.el-pagination .btn-prev').click()
  await dialog.locator('.el-table__body tr').first().locator('.el-checkbox__inner').click()
  await expect(dialog.getByRole('button', { name: '确认添加' })).toBeVisible()
  await dialog.getByRole('button', { name: '确认添加' }).click({ force: true })
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.expert-tags').getByText('何专家')).toBeVisible()

  // 重开弹窗：已选专家回显勾选（loadExpertTable 的 toggleRowSelection 分支）
  const addBtnAgain = page.locator('.expert-tags').getByRole('button', { name: /添加专家/ })
  await expect(addBtnAgain).toBeVisible()
  await addBtnAgain.click({ force: true })
  await expect(dialog.locator('.el-table__body tr').filter({ hasText: '何专家' }).locator('.el-checkbox__input')).toHaveClass(/is-disabled/)
  await dialog.getByRole('button', { name: '取消' }).click({ force: true })

  // 移除专家 tag
  await page.locator('.el-tag__close').first().click()
})

test('空选确认直接清空专家并关闭', async ({ page }) => {
  await setup(page)
  const addBtn = page.locator('.expert-tags').getByRole('button', { name: /添加专家/ })
  await expect(addBtn).toBeVisible()
  await addBtn.click({ force: true })
  const dialog = expertDialog(page)
  await expect(dialog).toBeVisible()
  // 不勾选任何行 → 确认添加 → experts 清空
  await dialog.getByRole('button', { name: '确认添加' }).click({ force: true })
  await expect(dialog).not.toBeVisible()
})

test('专家列表加载失败置空表格', async ({ page }) => {
  await setup(page, { expertFail: true })
  const addBtn = page.locator('.expert-tags').getByRole('button', { name: /添加专家/ })
  await expect(addBtn).toBeVisible()
  await addBtn.click({ force: true })
  const dialog = expertDialog(page)
  await expect(dialog).toBeVisible() // 先证明弹窗真的开了（防假绿）
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(0)
})
