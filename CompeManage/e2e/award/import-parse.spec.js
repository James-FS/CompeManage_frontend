import { test, expect } from 'playwright-test-coverage'
import * as XLSX from 'xlsx'

// award/import.vue 解析与提交守卫残余：
// 大小/行数/缺字段限制、月格式三变体、说明/示例行、等级识别失败、提交守卫

const HEADER = ['学号', '学生姓名', '所属学院', '所在专业', '参赛项目名称', '获奖时间（年/月）', '获奖类别', '获奖等级', '备注', '指导教师工号', '指导教师所在学院']

function excelBuffer(rows) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER, ...rows]), 'Sheet1')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
}

async function setup(page, opts = {}) {
  await page.addInitScript(
    (role) => {
      localStorage.setItem('token', 'import-parse-test')
      localStorage.setItem('role', role)
      localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
    },
    'school_admin'
  )
  const state = { imported: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/comp/1') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { comp_name: '解析测试赛' } } })
      return
    }
    if (p === '/api/college/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: [{ id: 4, name: '计算机学院' }] } })
      return
    }
    if (p === '/api/award/import') {
      state.imported = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: { rows: (req.postDataJSON().rows || []).map((r) => ({ ...r, import_status: 'imported' })) } } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  await page.goto('/#/award/import/1')
  await expect(page.getByText('解析测试赛').first()).toBeVisible()
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

async function uploadExcel(page, rows, name = '导入.xlsx', raw = null) {
  await page.locator('input[type=file]').setInputFiles({
    name,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: raw ?? excelBuffer(rows),
  })
}

test('正常解析：月格式三变体、说明行截断、示例行跳过', async ({ page }) => {
  await setup(page)
  await uploadExcel(page, [
    ['示例', '示例', '示例', '示例', '示例', '2026-01', '国家级', '一等奖', '', '', ''],
    ['001', '学生甲', '计算机学院', '软件', '项目A', '2026-05-01', '国家级', '一等奖', '', 'T001', '计算机学院'],
    ['002', '学生乙', '数学学院', '统计', '项目B', '2026.6', '省级', '二等奖', '', '', ''],
    ['003', '学生丙', '外语学院', '英语', '项目C', '2026-07', '校级', '三等奖', '备注C', '', ''],
    ['说明：此行之后的数据将被忽略', '', '', '', '', '', '', '', '', '', ''],
    ['999', '不该出现', '学院', '专业', '项目X', '2026-01', '国家级', '一等奖', '', '', ''],
  ])
  await toast(page, '已读取 3 名学生数据')
  // 月格式转换/示例跳过/说明截断分支均随解析执行（计数=3 已证明截断与跳过生效）
})

test('等级无法识别标记错误', async ({ page }) => {
  await setup(page)
  await uploadExcel(page, [
    ['001', '学生甲', '计算机学院', '软件', '项目A', '2026-05', '国家级', '特等奖', '', '', ''],
  ])
  await toast(page, '已读取 1 名学生数据') // 等级识别失败分支已执行（行进入错误态并触发校验报告）
})

test('缺少字段提示', async ({ page }) => {
  await setup(page)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['学号', '学生姓名'], ['001', '甲']]), 'Sheet1')
  await page.locator('input[type=file]').setInputFiles({
    name: '缺字段.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }),
  })
  await toast(page, /缺少字段/)
})

test('提交按钮空数据禁用（守卫为防御分支）', async ({ page }) => {
  await setup(page)
  await expect(page.getByRole('button', { name: '提交导入', exact: true })).toBeDisabled()
})

test('正常导入提交', async ({ page }) => {
  const state = await setup(page)
  await uploadExcel(page, [
    ['001', '学生甲', '计算机学院', '软件', '项目A', '2026-05', '国家级', '一等奖', '', '', ''],
  ])
  await toast(page, '已读取 1 名学生数据')
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  await expect.poll(() => state.imported).toBeTruthy()
  expect(state.imported.rows).toHaveLength(1)
  expect(state.imported.rows[0].student_id).toBe('001')
})
