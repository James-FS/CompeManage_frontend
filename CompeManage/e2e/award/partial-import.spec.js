import { test, expect } from 'playwright-test-coverage'
import * as XLSX from 'xlsx'
import { mockAwardSession } from '../helpers/award-mock.js'

function spreadsheet(size, invalidLevels = false, timeHeader = '获奖时间（年/月）') {
  const workbook = XLSX.utils.book_new()
  const headers = ['序号', '学号', '学生姓名', '所属学院', '所在专业', '参赛项目名称', timeHeader, '获奖类别', '获奖等级', '备注']
  const rows = Array.from({ length: size }, (_, i) => [i + 1, String(i).padStart(6, '0'), `学生${i}`, '学院甲', '专业甲', `项目${i}`, '2026-10', '省级', invalidLevels && i >= size - 10 ? '国家级' : '一等奖', ''])
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ...rows]), '获奖名单')
  return { name: `${size}行.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) }
}

async function respond(route, rows) {
  await route.fulfill({ json: { code: 200, message: '本次导入处理完成', data: {
    rows,
    student_count: rows.length,
    fail_count: rows.filter(row => row.error).length,
    success_count: rows.filter(row => row.import_status === 'imported').length,
    existing_count: rows.filter(row => row.import_status === 'existing').length,
  } } })
}

test('13行部分导入全部保留并显示状态，导出失败名单，修正后仅重交失败行', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1100 })
  await mockAwardSession(page)
  const submissions = []
  await page.route('**/api/award/import?*', async route => {
    const input = route.request().postDataJSON().rows
    submissions.push(input)
    const first = submissions.length === 1
    const rows = input.map((row, i) => ({ ...row, error: first && i >= 3 ? '学生姓名与系统学号不匹配' : '', import_status: first && i >= 3 ? 'failed' : 'imported', existing: false }))
    await respond(route, rows)
  })
  await page.goto('/#/award/import/1')
  await page.locator('input[type=file]').setInputFiles(spreadsheet(13))
  await expect(page.locator('.preview-table .el-table__body tbody tr')).toHaveCount(13)
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '校验失败结果' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('本次导入 13 行，其中 10 行校验失败，3 行成功导入。')
  await expect(dialog.locator('.el-table__body tbody tr')).toHaveCount(10)
  const downloadEvent = page.waitForEvent('download')
  await dialog.getByRole('button', { name: '导出校验失败名单（10 行）', exact: true }).click()
  const download = await downloadEvent
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const book = XLSX.read(Buffer.concat(chunks), { type: 'buffer' })
  const exported = XLSX.utils.sheet_to_json(book.Sheets['校验失败名单'])
  expect(exported).toHaveLength(10)
  expect(exported[0]).toMatchObject({ 序号: 4, 学号: '000003', 校验失败原因: '学生姓名与系统学号不匹配' })
  await page.screenshot({ path: 'test-results/award-partial-import.png', fullPage: true })
  await dialog.getByRole('button', { name: '定位修改', exact: true }).first().click()
  const preview = page.locator('.preview-table .el-table__body tbody tr')
  await expect(preview).toHaveCount(13)
  await expect(preview.first().locator('input').first()).toHaveValue('000000')
  await expect(preview.first().getByText('导入成功', { exact: true })).toBeVisible()
  await expect(preview.nth(3).getByText('导入失败', { exact: true })).toBeVisible()
  await expect(page.locator('.preview-table').getByRole('columnheader', { name: '获奖时间', exact: true })).toBeVisible()
  await expect(page.locator('.preview-table').getByRole('columnheader', { name: '导入状态', exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/award-import-status.png', fullPage: true })
  for (let i = 3; i < 13; i++) await preview.nth(i).locator('input').nth(1).fill(`修正学生${i}`)
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  await expect(preview.getByText('导入成功', { exact: true })).toHaveCount(13)
  await expect(page).toHaveURL(/award\/import\/1/)
  await expect(page.getByRole('button', { name: '提交导入', exact: true })).toBeDisabled()
  expect(submissions[1]).toHaveLength(10)
  expect(submissions[1].every(row => Number(row.student_id) >= 3)).toBe(true)
})

test('已有学生重复导入计为跳过，不计为新增成功或校验失败', async ({ page }) => {
  await mockAwardSession(page)
  await page.route('**/api/award/import?*', async route => {
    const rows = route.request().postDataJSON().rows.map((row, i) => ({ ...row, existing: i < 3, import_status: i < 3 ? 'existing' : 'failed', error: i < 3 ? '' : '学号不存在' }))
    await respond(route, rows)
  })
  await page.goto('/#/award/import/1')
  await page.locator('input[type=file]').setInputFiles(spreadsheet(13))
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '校验失败结果' })
  await expect(dialog).toContainText('本次导入 13 行，其中 10 行校验失败，0 行成功导入，3 行已存在或重复，已跳过。')
  const preview = page.locator('.preview-table .el-table__body tbody tr')
  await expect(preview).toHaveCount(13)
  await expect(preview.getByText('已存在，已跳过', { exact: true })).toHaveCount(3)
  await expect(preview.getByText('导入失败', { exact: true })).toHaveCount(10)
})

test('1000行中存在基础校验错误仍可提交有效行，返回990成功10失败', async ({ page }) => {
  await mockAwardSession(page)
  let submitted = 0
  await page.route('**/api/award/import?*', async route => {
    const input = route.request().postDataJSON().rows
    submitted = input.length
    await respond(route, input.map(row => ({ ...row, existing: false, import_status: row.error ? 'failed' : 'imported' })))
  })
  await page.goto('/#/award/import/1')
  await page.locator('input[type=file]').setInputFiles(spreadsheet(1000, true))
  await expect(page.getByRole('button', { name: '查看校验结果', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '校验失败结果' })
  await expect(dialog).toContainText('本次导入 1000 行，其中 10 行校验失败，990 行成功导入。')
  expect(submitted).toBe(1000)
  await expect(page.locator('.preview-table .el-table__body tbody tr')).toHaveCount(50)
  await expect(page.getByText('导入数据预览（1000 名学生）', { exact: true })).toBeVisible()
})

test('全部成功后停留预览，修改一行后仅该行重新提交并更新为已存在状态', async ({ page }) => {
  await mockAwardSession(page)
  const submissions = []
  await page.route('**/api/award/import?*', async route => {
    const rows = route.request().postDataJSON().rows
    submissions.push(rows)
    const existing = submissions.length > 1
    await respond(route, rows.map(row => ({ ...row, error: '', existing, import_status: existing ? 'existing' : 'imported' })))
  })
  await page.goto('/#/award/import/1')
  await page.locator('input[type=file]').setInputFiles(spreadsheet(13, false, '获奖时间'))
  const preview = page.locator('.preview-table .el-table__body tbody tr')
  await expect(preview).toHaveCount(13)
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  await expect(preview.getByText('导入成功', { exact: true })).toHaveCount(13)
  await expect(page).toHaveURL(/award\/import\/1/)
  await expect(page.getByRole('button', { name: '提交导入', exact: true })).toBeDisabled()
  await preview.first().locator('input').nth(1).fill('修改姓名')
  await expect(preview.first().getByText('待导入', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '提交导入', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  await expect(preview.first().getByText('已存在，已跳过', { exact: true })).toBeVisible()
  expect(submissions[1]).toHaveLength(1)
  expect(submissions[1][0].student_id).toBe('000000')
  await expect(preview.getByText('导入成功', { exact: true })).toHaveCount(12)
})
