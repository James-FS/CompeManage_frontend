import { test, expect } from '@playwright/test'
import * as XLSX from 'xlsx'
import { mockAwardSession } from '../helpers/award-mock.js'
const headers = ['序号', '学号', '学生姓名', '所属学院', '所在专业', '参赛项目名称', '获奖时间（年/月）', '获奖类别', '获奖等级', '备注']
function excelBuffer() {
  const wb = XLSX.utils.book_new()
  const rows = [headers, ['示例', '0000', '示例学生'], [1, '00123', '学生甲', '学院甲', '专业甲', '跨院项目', '2026-10', '国际级', '一等奖', '备注'], [], ['说明：1. 获奖类别'], ['2. 获奖等级'], ['3. 一行一个学生']]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '获奖录入')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
}
test('Excel解析排除说明、保留学号文本，并可新增和提交', async ({ page }) => {
  const state = await mockAwardSession(page)
  await page.goto('/#/award/import/1')
  await page.locator('input[type=file]').setInputFiles({ name: '新模板.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: excelBuffer() })
  const rows = page.locator('.preview-table .el-table__body tbody tr')
  await expect(rows).toHaveCount(1)
  await expect(rows.first().locator('input').first()).toHaveValue('00123')
  await page.getByRole('button', { name: '新增一条', exact: true }).click()
  await expect(rows).toHaveCount(2)
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  // 新版 UI：校验失败会自动弹出「校验失败结果」弹窗
  const resultDialog = page.getByRole('dialog', { name: '校验失败结果' })
  await expect(resultDialog).toBeVisible()
  await expect(resultDialog.getByText('学号不能为空', { exact: true })).toBeVisible()
  await resultDialog.locator('.el-dialog__headerbtn').click()
  await expect(page.getByText('校验未通过，本批数据未导入', { exact: true })).toHaveCount(0)
  await expect(page.locator('.preview-table').getByRole('columnheader', { name: '校验结果', exact: true })).toHaveCount(0)
  // 行内含「选择指导老师」按钮，删除用 el-icon Delete 或危险按钮
  await rows.nth(1).locator('button.el-button--danger').click()
  await expect(rows).toHaveCount(1)
  await page.locator('.el-table__body-wrapper .el-scrollbar__wrap').evaluate(el => { el.scrollLeft = 0 })
  await page.locator('.import-page').evaluate(el => el.scrollIntoView({ block: 'start' }))
  await page.screenshot({ path: 'test-results/award-import-validation.png', fullPage: true })
  // 新版部分导入语义：已处理行不再重复提交——提交按钮禁用、行内展示导入结果
  await expect(page.getByRole('button', { name: '提交导入', exact: true })).toBeDisabled()
  await expect(page.getByText(/导入成功|处理完成/).first()).toBeVisible()
  expect(state.getSubmitted().rows.some(row => row.student_id === '00123')).toBe(true)
})

function batchExcelBuffer(count, invalidLevels = false) {
  const wb = XLSX.utils.book_new()
  const rows = [headers.concat('指导教师工号')]
  for (let i = 0; i < count; i++) {
    rows.push([i + 1, String(i).padStart(6, '0'), `学生${i}`, '学院甲', '专业甲', `项目${Math.floor(i / 5)}`, '2026.10', '国际级', invalidLevels ? '国家级' : '金奖', `备注${i}`, 'T001'])
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '获奖录入')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
}

for (const count of [100, 1000]) {
  test(`批量${count}行只渲染当前页，跨页修改删除后仍提交整批`, async ({ page }) => {
    const state = await mockAwardSession(page)
    await page.goto('/#/award/import/1')
    const start = Date.now()
    await page.locator('input[type=file]').setInputFiles({ name: `${count}行.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: batchExcelBuffer(count) })
    const rows = page.locator('.el-table__body tbody tr')
    await expect(rows).toHaveCount(50)
    await expect(page.getByText(`导入数据预览（${count} 名学生）`, { exact: true })).toBeVisible()
    console.log(`${count}行 Excel 到预览可操作：${Date.now() - start}ms`)
    await page.getByRole('listitem', { name: 'page 2', exact: true }).click()
    await expect(rows.first().locator('input').first()).toHaveValue('000050')
    await rows.first().locator('input').nth(1).fill('分页修改学生')
    await rows.nth(1).locator('button.el-button--danger').click()
    await expect(rows.nth(1).locator('input').first()).toHaveValue('000052')
    await page.getByRole('listitem', { name: 'page 1', exact: true }).click()
    await expect(rows.first().locator('input').first()).toHaveValue('000000')
    await page.getByRole('button', { name: '提交导入', exact: true }).click()
    await expect(page.getByText(/导入成功|处理完成/).first()).toBeVisible()
    const submitted = state.getSubmitted().rows
    expect(submitted).toHaveLength(count - 1)
    expect(submitted.find(row => row.student_id === '000050').name).toBe('分页修改学生')
    expect(submitted.some(row => row.student_id === '000051')).toBe(false)
    expect(submitted.every(row => row.advisor_usernames === 'T001' && row.award_month === '2026-10' && row.award_name === '一等奖')).toBe(true)
    expect(submitted.every(row => !('_rowKey' in row))).toBe(true)
  })
}

test('批量校验失败跳到错误页，修正后可重新提交整批', async ({ page }) => {
  const state = await mockAwardSession(page)
  let firstSubmit = true
  await page.route('**/api/award/import?*', async route => {
    if (!firstSubmit) return route.fallback()
    firstSubmit = false
    const rows = route.request().postDataJSON().rows.map((row, index) => ({ ...row, error: index === 75 ? '姓名不一致' : '' }))
    await route.fulfill({ status: 400, json: { code: 400, message: '数据校验未通过，未写入任何数据', data: { rows, error_count: 1 } } })
  })
  await page.goto('/#/award/import/1')
  await page.locator('input[type=file]').setInputFiles({ name: '100行.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: batchExcelBuffer(100) })
  const rows = page.locator('.el-table__body tbody tr')
  await expect(rows).toHaveCount(50)
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  // 服务端 400 后自动弹窗并跳到错误行所在页
  const reportDialog = page.getByRole('dialog', { name: '校验失败结果' })
  await expect(reportDialog).toBeVisible()
  await reportDialog.locator('.el-dialog__headerbtn').click()
  await expect(rows.first().locator('input').first()).toHaveValue('000050')
  await expect(page.getByRole('checkbox', { name: /只看错误行/ })).toHaveCount(0)
  await expect(rows.nth(25).locator('input').first()).toHaveValue('000075')
  await rows.nth(25).locator('input').nth(1).fill('修正姓名')
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  // 新版 UI：部分导入成功后停留在导入页，展示导入结果而非跳转详情
  await expect(page.getByText(/导入成功|处理完成/).first()).toBeVisible()
  expect(state.getSubmitted().rows).toHaveLength(100)
  expect(state.getSubmitted().rows[75].name).toBe('修正姓名')
})

async function readValidationDownload(download) {
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const workbook = XLSX.read(Buffer.concat(chunks), { type: 'buffer' })
  const sheetName = workbook.SheetNames.includes('校验失败名单') ? '校验失败名单' : '未导入名单'
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
}

test('100行服务端校验结果可弹窗查看，导出完整未导入原因并保留校验快照', async ({ page }) => {
  await mockAwardSession(page)
  await page.route('**/api/award/import?*', async route => {
    const rows = route.request().postDataJSON().rows.map((row, index) => ({ ...row, existing: index === 1, error: index === 75 ? '姓名与系统资料不一致' : '' }))
    await route.fulfill({ status: 400, json: { code: 400, message: '数据校验未通过，未写入任何数据', data: { rows, error_count: 1 } } })
  })
  await page.goto('/#/award/import/1')
  await page.locator('input[type=file]').setInputFiles({ name: '100行校验.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: batchExcelBuffer(100) })
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '校验失败结果' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('.preview-header-actions .el-button').nth(0)).toHaveText('查看校验结果')
  await expect(page.locator('.preview-header-actions .el-button').nth(1)).toHaveText('新增一条')
  await expect(dialog.locator('.el-table__body tbody tr')).toHaveCount(1)
  await expect(dialog.getByText('000075', { exact: true })).toBeVisible()
  await expect(dialog.getByText('姓名与系统资料不一致', { exact: true })).toBeVisible()
  const downloadEvent = page.waitForEvent('download')
  await dialog.getByRole('button', { name: /导出校验失败名单/ }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toMatch(/100行校验_.*\.xlsx$/)
  const exported = await readValidationDownload(download)
  // 新版导出仅包含校验失败行（含失败原因列），不再逐行罗列全量
  expect(exported).toHaveLength(1)
  expect(exported[0]).toMatchObject({ 序号: 76, 学号: '000075', 学生姓名: '学生75', 校验失败原因: '姓名与系统资料不一致' })
  await page.screenshot({ path: 'test-results/award-validation-dialog.png', fullPage: true })
  await dialog.getByRole('button', { name: '定位修改', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  const previewRows = page.locator('.preview-table .el-table__body tbody tr')
  await expect(previewRows.first().locator('input').first()).toHaveValue('000050')
  await previewRows.nth(25).locator('input').nth(1).fill('已修改姓名')
  await page.getByRole('button', { name: '查看校验结果', exact: true }).click()
  await expect(dialog.getByText('学生75', { exact: true })).toBeVisible()
  await dialog.locator('.el-dialog__headerbtn').click()
  await page.getByRole('button', { name: '清空', exact: true }).click()
  await expect(page.getByRole('button', { name: /查看校验结果/ })).toHaveCount(0)
})

test('1000行解析失败结果分页显示全部记录，并可一次导出全部名单', async ({ page }) => {
  await mockAwardSession(page)
  await page.goto('/#/award/import/1')
  await page.locator('input[type=file]').setInputFiles({ name: '1000行错误.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: batchExcelBuffer(1000, true) })
  await page.getByRole('button', { name: '查看校验结果', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '校验失败结果' })
  const rows = dialog.locator('.el-table__body tbody tr')
  await expect(rows).toHaveCount(50)
  await dialog.getByRole('listitem', { name: 'page 20', exact: true }).click()
  await expect(rows.first().getByText('000950', { exact: true })).toBeVisible()
  const downloadEvent = page.waitForEvent('download')
  await dialog.getByRole('button', { name: /导出校验失败名单/ }).click()
  const exported = await readValidationDownload(await downloadEvent)
  expect(exported).toHaveLength(1000)
  expect(exported[999]).toMatchObject({ 学号: '000999' })
  // 新版导出的原因列名为「校验失败原因」
  expect(String(exported[999]['校验失败原因'] || exported[999].未导入原因 || '')).toContain('无法识别')
})

test('学生补录重复记录时显示服务端提示', async ({ page }) => {
  await mockAwardSession(page, 'student')
  await page.addInitScript(() => sessionStorage.setItem('resubmitAward', JSON.stringify({
    comp_id: 1,
    award_level: '省级二等奖',
    award_name: '二等奖',
    award_time: '2026-10-12T00:00:00+08:00',
    advisor_info: [{ id: 11, username: 'T001', name: '张老师', college: '学院甲' }],
    team_name: '已有导入项目',
    proof_url: '/uploads/e2e-certificate.pdf',
    members: [{
      is_leader: true,
      name: '测试学生',
      stu_id: 'S2024001',
      phone: '13800000000',
      email: 'student@example.com',
      college: '学院甲',
    }],
  })))
  await page.goto('/#/award/student/declare?comp_id=1&comp_name=校验赛事')
  await page.getByRole('button', { name: '确认提交' }).click()
  await expect(page.locator('.el-message--error').filter({ hasText: '记录已存在' })).toBeVisible()
})

test('校管理员在校赛填报列表调整全局导入设置', async ({ page }) => {
  await mockAwardSession(page)
  await page.goto('/#/award/list')
  await page.getByRole('button', { name: '导入设置' }).click()
  const dialog = page.getByRole('dialog', { name: '导入设置' })
  await expect(dialog).toBeVisible()
  const dialogSwitch = dialog.getByRole('switch') // aria-checked 挂在内层 input[role=switch] 上
  await expect(dialogSwitch).toBeEnabled()
  await expect(dialogSwitch).toHaveAttribute('aria-checked', 'false')
  await dialog.locator('.el-switch').click()
  await expect(dialogSwitch).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('已更新所有赛事的报名要求，历史获奖不受影响')).toBeVisible()
})
test('导入页无报名要求开关，支持新增/清空', async ({ page }) => {
  await mockAwardSession(page)
  await page.goto('/#/award/import/1')
  await expect(page.getByRole('switch')).toHaveCount(0)
  // 新版导入页不再展示「当前报名要求」文案（设置仅在校赛填报列表）
  await expect(page.getByText('当前报名要求：无需报名')).toHaveCount(0)
  await page.getByRole('button', { name: '新增一条', exact: true }).click()
  await expect(page.locator('.el-table__body tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: '清空', exact: true }).click()
  await expect(page.locator('.el-table__body tbody tr')).toHaveCount(0)
})
test('院管理员导入页无开关，旧模板明确提示', async ({ page }) => {
  await mockAwardSession(page, 'college_admin')
  await page.goto('/#/award/import/1')
  await expect(page.getByRole('switch')).toHaveCount(0)
  await expect(page.getByText('当前报名要求：无需报名')).toHaveCount(0)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['奖项等级', '负责人']]), '旧模板')
  await page.locator('input[type=file]').setInputFiles({ name: '旧模板.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) })
  await expect(page.getByText(/请下载新版模板/)).toBeVisible()
  await expect(page.locator('.el-table__body tbody tr')).toHaveCount(0)
})
