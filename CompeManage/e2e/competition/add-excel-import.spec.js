import { test, expect } from 'playwright-test-coverage'
import * as XLSX from 'xlsx'

// competition/add.vue Excel 批量导入 Tab 定向覆盖：
// 解析/格式校验/自动匹配负责人、工号回车匹配、提交校验三分支、确认导入成功与失败

const HEADER = ['赛事名称', '赛事级别', '赛事类型', '主办单位', '承办单位', '赛事负责人工号', '赛事负责人姓名', '所属学院', '年份', '备注']

function excelBuffer(rows) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER, ...rows]), '导入模板')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
}

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'add-excel-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const state = { imported: undefined, lookupCalls: 0 }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/college/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: [{ id: 4, name: '计算机学院' }, { id: 5, name: '数学学院' }] } })
      return
    }
    if (p === '/api/comp/years') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { years: ['2026'] } } })
      return
    }
    if (p === '/api/comp/manager/lookup-by-work-ids') {
      state.lookupCalls += 1
      if (opts.lookupFail) {
        await route.fulfill({ json: { code: 500, message: '匹配服务不可用' } })
        return
      }
      const body = req.postDataJSON()
      const list = (body.work_ids || []).map((w, i) => ({ id: 65089 + i, name: '何老师', work_id: w, college: '计算机学院' }))
      await route.fulfill({ json: { code: 200, message: 'success', data: { list } } })
      return
    }
    if (p === '/api/comp/manager/list') {
      const wid = url.searchParams.get('work_id') || ''
      const list = wid === 'T999999' ? [] : [{ id: 65089, name: '何老师', work_id: wid || 'T2023012', college: '计算机学院' }]
      await route.fulfill({ json: { code: 200, message: 'success', data: { list, total: list.length } } })
      return
    }
    if (p === '/api/comp/batch-import') {
      if (opts.importFail) {
        await route.fulfill({ json: { code: 500, message: '导入服务不可用' } })
        return
      }
      state.imported = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: { capabilities: {} } } })
  })
  await page.goto('/#/competition/add')
  await page.getByText('Excel 批量导入').click()
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

async function uploadExcel(page, rows, name = '批量.xlsx') {
  await page.locator('input[type=file]').setInputFiles({
    name,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: excelBuffer(rows),
  })
}

test('解析成功并自动匹配负责人', async ({ page }) => {
  const state = await setup(page)
  await uploadExcel(page, [
    ['Excel赛事A', '校级', '学科竞赛', '主办A', '承办A', 'T2023012', '', '计算机学院', '2026', '备注A'],
    ['Excel赛事B', '省级', '学科竞赛', '主办B', '承办B', 'T2023013', '', '数学学院', '2026', '备注B'],
  ])
  await toast(page, '解析成功，共 2 条数据')
  // 自动匹配回填 manager（lookup-by-work-ids）
  await expect.poll(() => state.lookupCalls).toBe(1)
  const firstRow = page.locator('.el-table__body tr').first()
  await expect(firstRow.locator('input[placeholder="自动匹配或点击选择"]')).toHaveValue('何老师')
})

test('格式校验与空表拦截', async ({ page }) => {
  await setup(page)
  // 非 excel 文件
  await page.locator('input[type=file]').setInputFiles({
    name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('hi'),
  })
  await toast(page, '只能上传 xlsx / xls 文件')

  // 仅表头 → 表格内容为空
  await uploadExcel(page, [])
  await toast(page, '表格内容为空')
})

test('提交校验：字段缺失与学院不存在', async ({ page }) => {
  const state = await setup(page)
  // 缺级别/负责人
  await uploadExcel(page, [['缺字段赛事', '', '学科竞赛', '主办', '承办', 'T2023012', '', '计算机学院', '2026', '']])
  await toast(page, '解析成功，共 1 条数据')
  await page.getByRole('button', { name: /确认导入/ }).click()
  await toast(page, '存在赛事名称、级别或负责人为空的数据')
  expect(state.imported).toBeUndefined()

  // 学院不存在（先回填负责人保证通过前置校验）
  await uploadExcel(page, [['学院错误赛事', '校级', '学科竞赛', '主办', '承办', 'T2023012', '', '不存在学院', '2026', '']])
  await page.getByRole('button', { name: /确认导入/ }).click()
  await toast(page, '不存在，请检查后重试')
  expect(state.imported).toBeUndefined()
})

test('确认导入成功与失败', async ({ page }) => {
  // 成功
  let state = await setup(page)
  await uploadExcel(page, [['可导入赛事', '校级', '学科竞赛', '主办', '承办', 'T2023012', '', '计算机学院', '2026', '']])
  await toast(page, '解析成功，共 1 条数据')
  await page.getByRole('button', { name: /确认导入/ }).click()
  const msgbox = page.locator('.el-message-box')
  await msgbox.getByRole('button', { name: /确认|确定/ }).click()
  await expect.poll(() => state.imported).toBeTruthy()
  expect(state.imported.items[0].comp_name).toBe('可导入赛事')
  await page.waitForURL(/\/competition\/list/)

  // 失败
  state = await setup(page, { importFail: true })
  await uploadExcel(page, [['失败赛事', '校级', '学科竞赛', '主办', '承办', 'T2023012', '', '计算机学院', '2026', '']])
  await toast(page, '解析成功，共 1 条数据')
  await page.getByRole('button', { name: /确认导入/ }).click()
  await page.locator('.el-message-box').getByRole('button', { name: /确认|确定/ }).click()
  await toast(page, /导入服务不可用|导入失败/)
})

test('工号回车匹配与未匹配提示', async ({ page }) => {
  await setup(page)
  await uploadExcel(page, [['回车匹配赛事', '校级', '学科竞赛', '主办', '承办', '', '', '计算机学院', '2026', '']])
  const row = page.locator('.el-table__body tr').first()
  const workIdInput = row.locator('input[placeholder="输入工号回车"]')
  // 匹配成功
  await workIdInput.fill('T2023012')
  await workIdInput.press('Enter')
  await toast(page, '已匹配负责人')
  // 未匹配
  await workIdInput.fill('T999999')
  await workIdInput.press('Enter')
  await toast(page, '未匹配到教职工')
})
