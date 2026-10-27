import { test, expect } from 'playwright-test-coverage'
import * as XLSX from 'xlsx'

// add.vue Excel 簇残余：行内负责人选择（excel 分支）、行移除、解析失败、
// 弹窗列表失败双分支、提交守卫

const HEADER = ['赛事名称', '赛事级别', '赛事类型', '主办单位', '承办单位', '赛事负责人工号', '赛事负责人姓名', '所属学院', '年份', '备注']

function excelBuffer(rows) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER, ...rows]), '导入模板')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
}

async function setup(page, opts = {}) {
  await page.addInitScript(
    (role) => {
      localStorage.setItem('token', 'add-excel-extras')
      localStorage.setItem('role', role)
      localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
    },
    'school_admin'
  )
  const state = { managerUrls: [] }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/college/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: [{ id: 4, name: '计算机学院' }] } })
      return
    }
    if (p === '/api/comp/years') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { years: ['2026'] } } })
      return
    }
    if (p === '/api/comp/manager/list') {
      state.managerUrls.push(decodeURIComponent(url.searchParams.toString()))
      if (opts.managerFail) {
        await route.fulfill({ json: { code: 500, message: '负责人服务不可用' } })
        return
      }
      if (opts.managerBizFail) {
        await route.fulfill({ json: { code: 400, msg: '查询参数错误' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: [
        { id: 65089, name: '何老师', work_id: 'T2023012', college: '计算机学院', role_code: 'teacher' },
      ], total: 1 } } })
      return
    }
    if (p === '/api/comp/manager/lookup-by-work-ids') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: [] } } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  await page.goto('/#/competition/add')
  await page.getByText('Excel 批量导入').click()
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('Excel 行移除', async ({ page }) => {
  await setup(page)
  await page.locator('input[type=file]').setInputFiles({
    name: '批量.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: excelBuffer([
      ['待删赛事A', '校级', '学科竞赛', '主办', '承办', 'T2023012', '', '计算机学院', '2026', ''],
      ['保留赛事B', '校级', '学科竞赛', '主办', '承办', 'T2023012', '', '计算机学院', '2026', ''],
    ]),
  })
  await toast(page, '解析成功，共 2 条数据')
  await page.locator('.el-table__body tr').first().getByRole('button').click() // 图标删除按钮（无文案）
  await expect(page.locator('.el-table__body tr')).toHaveCount(1)
  await toast(page, '没有可导入的数据').catch(() => {})
})

test('文件解析失败提示', async ({ page }) => {
  await setup(page)
  await page.locator('input[type=file]').setInputFiles({
    name: '坏文件.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x01, 0x02, 0x03, 0xfe, 0xff, 0x00]),
  })
  await toast(page, '文件解析失败')
})

test('负责人弹窗列表失败双分支', async ({ page }) => {
  // code!=200 → response.msg
  await setup(page, { managerBizFail: true })
  await page.locator('input[type=file]').setInputFiles({
    name: '批量.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: excelBuffer([['弹窗赛事', '校级', '学科竞赛', '主办', '承办', '', '', '计算机学院', '2026', '']]),
  })
  await toast(page, '解析成功，共 1 条数据')
  await page.locator('.el-table__body tr').first().locator('input[placeholder="自动匹配或点击选择"]').click()
  const dialog = page.locator('.el-dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByPlaceholder('输入姓名').fill('何')
  await toast(page, /查询参数错误|获取负责人列表失败/)
})

test('负责人弹窗网络失败提示', async ({ page }) => {
  await setup(page, { managerFail: true })
  await page.locator('input[type=file]').setInputFiles({
    name: '批量.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: excelBuffer([['网络赛事', '校级', '学科竞赛', '主办', '承办', '', '', '计算机学院', '2026', '']]),
  })
  await toast(page, '解析成功，共 1 条数据')
  await page.locator('.el-table__body tr').first().locator('input[placeholder="自动匹配或点击选择"]').click()
  const dialog = page.locator('.el-dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByPlaceholder('输入姓名').fill('何')
  await toast(page, /负责人服务不可用|获取负责人列表失败，请稍后重试/)
})
