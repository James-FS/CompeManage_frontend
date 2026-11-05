import { test, expect } from 'playwright-test-coverage'

// competition/add.vue 定向覆盖：手动新增（成功/校验/失败/重置）、往年复用（加载失败、
// 勾选编辑导入、名称/学院校验、导入失败）、Excel 模板下载与空数据拦截

const MANAGER = { id: 65089, name: '何老师', work_id: 'T2023012', college: '计算机学院', role_code: 'teacher' }

const HISTORY_LIST = [
  {
    id: 11, comp_name: '往年赛事甲', comp_level: '省级', organizer: '主办方甲', undertaker: '承办方甲',
    manager: { realname: '何老师', id: 65089 }, college_info: { name: '计算机学院' }, year: 2025,
  },
  {
    id: 12, comp_name: '往年赛事乙', comp_level: '校级', organizer: '主办方乙', undertaker: '承办方乙',
    manager: { realname: '何老师', id: 65089 }, college_info: { name: '数学学院' }, year: 2025,
  },
]

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'add-form-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const state = { created: undefined, imported: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    let data = []
    if (p === '/api/comp/years') data = { years: ['2025', '2024'] }
    if (p === '/api/college/list') data = [{ id: 4, name: '计算机学院' }, { id: 5, name: '数学学院' }]
    if (p === '/api/department/list') data = [{ id: 1, name: '教务处' }]
    if (p === '/api/comp/manager/list') data = { list: [MANAGER], total: 1 }
    if (p === '/api/comp/list') data = { list: HISTORY_LIST, total: 2 }
    if (p === '/api/comp/create' && req.method() === 'POST') {
      if (opts.createFail) {
        await route.fulfill({ json: { code: 500, message: '创建失败' } })
        return
      }
      state.created = req.postDataJSON()
    }
    if (p === '/api/comp/batch-import') {
      if (opts.importFail) {
        await route.fulfill({ json: { code: 500, message: '导入服务不可用' } })
        return
      }
      state.imported = req.postDataJSON()
    }
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
  await page.goto('/#/competition/add')
  await expect(page.getByPlaceholder('请输入赛事名称')).toBeVisible()
  return state
}

async function pickManager(page) {
  await page.locator('.manager-input input').first().click()
  const dialog = page.getByRole('dialog', { name: '选择负责人（教职工）' })
  await expect(dialog).toBeVisible()
  await dialog.getByPlaceholder('输入姓名').fill('何')
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(1)
  await dialog.locator('.el-table__body tr').first().getByRole('button', { name: '选择', exact: true }).click()
  await expect(dialog).not.toBeVisible()
}

async function fillManualForm(page) {
  await page.getByPlaceholder('请输入赛事名称').fill('新增测试赛事')
  await page.locator('.el-form-item').filter({ hasText: '赛事级别' }).locator('.el-select').click()
  await page.getByRole('option', { name: '校级' }).click()
  await page.locator('.el-form-item').filter({ hasText: '赛事类型' }).locator('.el-select').click()
  await page.getByRole('option', { name: '学科竞赛' }).click()
  await page.locator('.el-form-item').filter({ hasText: '所属学院' }).locator('.el-select').click()
  await page.getByRole('option', { name: '计算机学院' }).click()
  await page.getByPlaceholder('请填写主办单位').fill('测试主办方')
  await page.getByPlaceholder('请填写承办单位').fill('测试承办方')
  await pickManager(page)
  await page.getByPlaceholder('请选择所属年份').fill('2026')
}

async function gotoCopyTab(page) {
  await page.getByText('从往年赛事复用').click()
  await page.locator('.el-form-item').filter({ hasText: '赛事所属年份' }).locator('.el-select').click()
  await page.getByRole('option', { name: '2025年' }).click()
}

// ==================== 手动新增 ====================

test('手动新增：全字段 + 负责人弹窗 → 创建成功并跳转列表', async ({ page }) => {
  const state = await setup(page)
  await fillManualForm(page)
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect.poll(() => state.created).toBeTruthy()
  expect(state.created).toMatchObject({
    comp_name: '新增测试赛事', comp_level: '校级', comp_type: '学科竞赛',
    organizer: '测试主办方', undertaker: '测试承办方', manager_id: 65089,
  })
  await expect(page.locator('.el-message').filter({ hasText: '赛事新增成功' })).toBeVisible()
  await page.waitForURL(/\/competition\/list/)
})

test('手动新增：必填校验拦截与创建失败提示', async ({ page }) => {
  const state = await setup(page, { createFail: true })

  // 空表单 → 必填校验（rules 三条）
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.locator('.el-form-item__error').filter({ hasText: '请输入赛事名称' })).toBeVisible()
  expect(state.created).toBeUndefined()

  // 填好后创建失败 → 统一错误提示
  await fillManualForm(page)
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect(page.locator('.el-message').filter({ hasText: '新增失败，请检查信息是否完整' })).toBeVisible()
  expect(state.created).toBeUndefined()
})

test('重置表单清空已填字段', async ({ page }) => {
  await setup(page)
  await page.getByPlaceholder('请输入赛事名称').fill('待重置赛事')
  await page.getByPlaceholder('请填写主办单位').fill('主办方X')
  await page.getByRole('button', { name: '重置', exact: true }).click()
  await expect(page.getByPlaceholder('请输入赛事名称')).toHaveValue('')
  await expect(page.getByPlaceholder('请填写主办单位')).toHaveValue('')
})

// ==================== 往年复用 ====================

test('往年复用：历史加载失败提示并清空表格', async ({ page }) => {
  await setup(page)
  // 拦截历史加载为失败（复用列表接口）
  await page.route((url) => url.pathname === '/api/comp/list', (route) =>
    route.fulfill({ json: { code: 500, message: '历史服务不可用' } }))
  await gotoCopyTab(page)
  await expect(page.locator('.el-message').filter({ hasText: '获取历史数据失败，请稍后重试' })).toBeVisible()
})

test('往年复用全流程：勾选→编辑→名称/学院校验→确认导入', async ({ page }) => {
  const state = await setup(page)
  await gotoCopyTab(page)
  const historyRows = page.locator('.el-table__body tr')
  await expect(historyRows).toHaveCount(2)

  // 勾选第一行 → 下一步
  await historyRows.first().locator('.el-checkbox__inner').click()
  await page.getByRole('button', { name: /下一步/ }).click()

  // 第二步：编辑导入列表。行按「赛事名称」输入框圈定，避免与历史表混淆
  const importRows = page.locator('.el-table__body tr').filter({ has: page.getByPlaceholder('赛事名称') })
  await expect(importRows).toHaveCount(1) // 只勾选了一行

  // 名称清空 → 空名校验拦截
  await importRows.first().locator('input').first().fill('')
  await page.getByRole('button', { name: /确认导入/ }).click()
  await expect(page.locator('.el-message').filter({ hasText: '赛事名称不能为空' })).toBeVisible()
  expect(state.imported).toBeUndefined()

  // 恢复名称，学院改为不存在 → 学院校验拦截
  await importRows.first().locator('input').first().fill('复用后的新赛事')
  await importRows.first().locator('input').last().fill('不存在学院')
  await page.getByRole('button', { name: /确认导入/ }).click()
  await expect(page.locator('.el-message').filter({ hasText: '不存在，请检查后重试' })).toBeVisible()
  expect(state.imported).toBeUndefined()

  // 修正学院 → 确认框 → 导入成功
  await importRows.first().locator('input').last().fill('计算机学院')
  await page.getByRole('button', { name: /确认导入/ }).click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toBeVisible()
  await msgbox.getByRole('button', { name: '确认导入' }).click()
  await expect.poll(() => state.imported).toBeTruthy()
  expect(state.imported.items).toHaveLength(1)
  expect(state.imported.items[0].comp_name).toBe('复用后的新赛事')
  await page.waitForURL(/\/competition\/list/)
})

// ==================== Excel 导入 ====================

test('Excel 导入：模板下载与空数据拦截', async ({ page }) => {
  await setup(page)
  await page.getByText('Excel 批量导入').click()

  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: /下载导入模板/ }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe('赛事导入模板.xlsx')

  // 未导入数据时「确认导入」按钮直接禁用（UI 级拦截）
  await expect(page.getByRole('button', { name: /确认导入/ })).toBeDisabled()
})
