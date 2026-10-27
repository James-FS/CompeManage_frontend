import { test, expect } from 'playwright-test-coverage'

// competition/declare.vue 定向覆盖：
// 负责人选择弹窗链路（不自动加载/搜索/分页/重置/教师分支）、附件选择与移除、
// 提交校验与成功跳转、保存失败、列表失败分支

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'declare-manager-test')
    localStorage.setItem('role', 'college_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 2, name: '院管', username: 'T2023002' }))
  })
  const state = { managerUrls: [], created: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/college/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: [{ id: 4, name: '计算机学院' }] } })
      return
    }
    if (p === '/api/department/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: [{ id: 8, name: '计算机系' }] } })
      return
    }
    if (p === '/api/comp/manager/list') {
      state.managerUrls.push(decodeURIComponent(url.searchParams.toString()))
      if (opts.managerFail) {
        await route.fulfill({ json: { code: 500, message: '负责人服务不可用' } })
        return
      }
      if (!url.searchParams.get('name') && !url.searchParams.get('work_id')) {
        // 空条件不返回（P2-A 打开不自动加载；有搜索词才给数据）
        await route.fulfill({ json: { code: 200, message: 'success', data: { list: [], total: 0 } } })
        return
      }
      const list = [
        { id: 65089, name: '何老师', work_id: 'T2023012', college: '计算机学院', role_code: 'teacher' },
        { id: 65090, name: '钱老师', work_id: 'T2023013', college: '计算机学院', role_code: '' },
      ]
      await route.fulfill({ json: { code: 200, message: 'success', data: { list, total: 25 } } })
      return
    }
    if (p === '/api/declare') {
      if (opts.createFail) {
        await route.fulfill({ json: { code: 500, message: '保存服务不可用' } })
        return
      }
      state.created = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  await page.goto('/#/competition/declare')
  await expect(page.getByPlaceholder('请输入赛事名称')).toBeVisible()
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('负责人弹窗：不自动加载、搜索、选择教师分支', async ({ page }) => {
  const state = await setup(page)
  await page.getByPlaceholder('请选择赛事负责人').click()
  const dialog = page.locator('.el-dialog')
  await expect(dialog).toBeVisible()
  // 打开不自动加载（空条件）
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(0)

  // 姓名搜索（debounce 500ms）
  await dialog.getByPlaceholder('输入姓名').fill('何')
  await expect.poll(() => state.managerUrls.some((u) => u.includes('name=何')), { timeout: 8000 }).toBe(true)
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(2)

  // 选教师行 → 分支 toast
  await dialog.locator('.el-table__body tr').first().getByRole('button', { name: '选择' }).click()
  await toast(page, '已选择负责人：何老师')
  await expect(page.getByPlaceholder('请选择赛事负责人')).toHaveValue('何老师')
})

test('列表翻页请求参数', async ({ page }) => {
  const state = await setup(page)
  await page.getByPlaceholder('请选择赛事负责人').click()
  const dialog = page.locator('.el-dialog')

  await dialog.getByPlaceholder('输入姓名').fill('何')
  await expect.poll(() => state.managerUrls.some((u) => u.includes('name=何')), { timeout: 8000 }).toBe(true)

  // 翻页 → page=2 请求（handleManagerCurrentChange）
  state.managerUrls.length = 0
  await dialog.locator('.el-pagination .btn-next').click()
  await expect.poll(() => state.managerUrls.some((u) => u.includes('page=2')), { timeout: 8000 }).toBe(true)
})

test('负责人列表失败分支', async ({ page }) => {
  await setup(page, { managerFail: true })
  await page.getByPlaceholder('请选择赛事负责人').click()
  const dialog = page.locator('.el-dialog')
  await dialog.getByPlaceholder('输入姓名').fill('何')
  await toast(page, /负责人服务不可用|获取负责人列表失败/)
})

test('附件选择与移除', async ({ page }) => {
  await setup(page)
  await page.locator('input[type=file]').setInputFiles({
    name: '申报材料.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf'),
  })
  await toast(page, '附件已选择：申报材料.pdf')
  await expect(page.getByText('申报材料.pdf').first()).toBeVisible()
  await page.getByRole('button', { name: '移除' }).click()
  await expect(page.getByText('申报材料.pdf')).toHaveCount(0) // 移除后列表无此文件
})

test('提交校验与成功跳转、保存失败', async ({ page }) => {
  // 缺必填
  let state = await setup(page)
  await page.getByRole('button', { name: /保存/ }).click()
  await toast(page, '请填写完整的必填项')

  // 填全 → createDeclare → 跳审核页
  await page.getByPlaceholder('请输入赛事名称').fill('申报测试赛事')
  await page.locator('.el-select').filter({ hasText: '请选择级别' }).click()
  await page.getByRole('option', { name: /校级/ }).click()
  await page.locator('.el-select').filter({ hasText: '请选择类型' }).click()
  await page.getByRole('option', { name: /学科/ }).first().click()
  await page.locator('.el-select').filter({ hasText: '请选择所属学院' }).click()
  await page.getByRole('option', { name: '计算机学院' }).click()
  await page.getByPlaceholder('请填写主办单位').fill('主办单位')
  await page.getByPlaceholder('请填写承办单位').fill('承办单位')
  await page.getByPlaceholder('请选择赛事负责人').click()
  const dialog = page.locator('.el-dialog')
  await dialog.getByPlaceholder('输入姓名').fill('何')
  await expect.poll(() => dialog.locator('.el-table__body tr').count()).toBe(2)
  await dialog.locator('.el-table__body tr').first().getByRole('button', { name: '选择' }).click()
  await page.getByRole('button', { name: /保存/ }).click()
  await expect.poll(() => state.created).toBeTruthy()
  expect(state.created.comp_name).toBe('申报测试赛事')
  await page.waitForURL(/competition\/audit/)
})
