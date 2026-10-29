import { test, expect } from '@playwright/test'
import * as XLSX from 'xlsx'

const fixture = process.env.COMPE_UNIFIED_LIVE_FIXTURE ? JSON.parse(process.env.COMPE_UNIFIED_LIVE_FIXTURE) : null
test.skip(!fixture, '由 TestUnifiedAwardBrowserMySQL 提供隔离数据库、真实API与测试JWT')

async function downloadedBuffer(download) {
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

test('真实模板下载 → 匹配校验 → 部分导入 → 失败导出重传 → 重复跳过 → 赛事名单查看编辑', async ({ page, request }) => {
  page.on('pageerror', error => console.error('真实联调页面异常:', error.message))
  await page.setViewportSize({ width: 1920, height: 1100 })
  await page.addInitScript(token => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ name: '实测管理员', role: 'school_admin' }))
  }, fixture.token)
  // Every API request goes to a real Gin server with JWT and permissions.
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url())
    const response = await route.fetch({ url: fixture.url + url.pathname + url.search })
    await route.fulfill({ response })
  })
  const unauthenticated = await request.post(`${fixture.url}/api/award/import/unified`, { data: { rows: [] } })
  expect(unauthenticated.status()).toBe(401)
  await page.goto('/#/award/list')
  await page.getByRole('button', { name: '统一导入获奖名单', exact: true }).click()
  const templateDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载模板', exact: true }).click()
  const book = XLSX.read(await downloadedBuffer(await templateDownload), { type: 'buffer' })
  expect(book.SheetNames).toEqual(['获奖名单', '可填报赛事目录', '填写说明'])
  expect(XLSX.utils.sheet_to_json(book.Sheets['可填报赛事目录'])).toHaveLength(2)
  const header = XLSX.utils.sheet_to_json(book.Sheets['获奖名单'], { header: 1 })[0]
  expect(header).not.toContain('赛事年份')
  expect(header).not.toContain('赛事编号')
  const values = [
    [1, fixture.competitions[0].comp_name, '000101', '实测学生甲', fixture.college, '实测专业', '真实同名项目', '2026-10', '省级', '金奖', 'T0001', ''],
    [2, fixture.competitions[1].comp_name, '000101', '实测学生甲', fixture.college, '实测专业', '真实同名项目', '2026-10', '省级', '金奖', 'T0001', ''],
    [3, fixture.competitions[0].comp_name, '000102', '错误学生姓名', fixture.college, '实测专业', '真实同名项目', '2026-10', '省级', '金奖', 'T0001', ''],
  ]
  book.Sheets['获奖名单'] = XLSX.utils.aoa_to_sheet([header, ...values])
  const file = buffer => ({ name: '真实联调获奖.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer })
  await page.locator('input[type=file]').setInputFiles(file(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })))
  await page.getByRole('button', { name: '导入可新增的 2 行', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: /导入数据预览/ })
  await expect(dialog.locator('.preview-table .el-table__body tbody tr')).toHaveCount(1)
  const failedDownload = page.waitForEvent('download')
  await dialog.getByRole('button', { name: '导出失败名单（1 条）', exact: true }).click()
  const failedBook = XLSX.read(await downloadedBuffer(await failedDownload), { type: 'buffer' })
  const failedData = XLSX.utils.sheet_to_json(failedBook.Sheets['校验失败名单'], { header: 1, raw: false })
  expect(failedData[0]).not.toContain('赛事编号')
  expect(failedData[0]).not.toContain('赛事年份')
  failedData[1][failedData[0].indexOf('学生姓名')] = '实测学生乙'
  failedBook.Sheets['校验失败名单'] = XLSX.utils.aoa_to_sheet(failedData)
  await dialog.locator('.el-dialog__headerbtn').click()
  await page.locator('input[type=file]').setInputFiles(file(XLSX.write(failedBook, { type: 'buffer', bookType: 'xlsx' })))
  await page.getByRole('button', { name: '导入可新增的 1 行', exact: true }).click()
  await page.getByRole('button', { name: '查看全部明细', exact: true }).click()
  await expect(page.locator('.preview-table')).toContainText('导入成功')
  await page.getByRole('button', { name: '完成编辑', exact: true }).click()
  values[2][3] = '实测学生乙'
  book.Sheets['获奖名单'] = XLSX.utils.aoa_to_sheet([header, ...values])
  await page.locator('input[type=file]').setInputFiles(file(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })))
  await page.getByRole('button', { name: '确认跳过重复记录', exact: true }).click()
  await page.getByRole('button', { name: '查看全部明细', exact: true }).click()
  await expect(page.locator('.preview-table').getByText('已存在，已跳过', { exact: true })).toHaveCount(3)
  await page.getByRole('button', { name: '完成编辑', exact: true }).click()
  await page.goto(`/#/award/detail/${fixture.competitions[0].id}`)
  await expect(page.getByText('1 个团队项目 · 2 名获奖学生')).toBeVisible()
  await page.getByRole('button', { name: /实测学生甲、实测学生乙/ }).click()
  const members = page.getByRole('dialog', { name: '获奖成员', exact: true })
  await members.locator('.el-table__body tbody tr').filter({ hasText: '实测学生乙' }).getByRole('button', { name: '编辑', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '修改成员信息' })
  await edit.locator('textarea').fill('真实数据库中修改备注')
  await edit.getByRole('button', { name: '保存', exact: true }).click()
  await expect(edit).toBeHidden()
  await expect(members.getByText('真实数据库中修改备注', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/unified-award-live-members.png', fullPage: true })
})
