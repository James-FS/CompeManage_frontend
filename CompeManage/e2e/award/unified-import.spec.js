import { test, expect } from '@playwright/test'
import * as XLSX from 'xlsx'
import { mockAwardSession } from '../helpers/award-mock.js'

const year = Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Hong_Kong', year: 'numeric' }).format(new Date()))
const directory = [
  { id: 1, comp_name: '程序设计竞赛', year: year - 1, comp_code: '0001' },
  { id: 2, comp_name: '程序设计竞赛', year, comp_code: '0002' },
  { id: 3, comp_name: '同年同名赛事', year, comp_code: '0003' },
  { id: 4, comp_name: '同年同名赛事', year, comp_code: '0004' },
  { id: 5, comp_name: '创新设计竞赛', year, comp_code: '0005' },
  { id: 6, comp_name: '仅往年赛事', year: year - 1, comp_code: '0006' },
]

function spreadsheet(entries) {
  const headers = ['序号', '赛事名称', '学号', '学生姓名', '所属学院', '所在专业', '参赛项目名称', '获奖时间（年/月）', '获奖类别', '获奖等级', '指导教师工号', '备注']
  const rows = entries.map((entry, i) => [i + 1, entry[0], `00010${i}`, `学生${i}`, '学院甲', '专业甲', '同名项目', '2026-10', '省级', '一等奖', '', ''])
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([headers, ...rows]), '获奖名单')
  return { name: '统一获奖名单.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) }
}

async function mockUnified(page, { existing = false } = {}) {
  await mockAwardSession(page)
  const submissions = []
  await page.route('**/api/award/import/unified**', async route => {
    const commit = !route.request().url().endsWith('/preview')
    const input = route.request().postDataJSON().rows
    if (commit) submissions.push(input)
    const rows = input.map(source => {
      const row = { ...source, comp_year: String(year), error: '', existing: false, duplicate: false, import_status: '', competition: null, candidates: [] }
      const candidates = directory.filter(comp => comp.comp_name === row.comp_name && comp.year === year)
      const comp = row.comp_id ? directory.find(comp => comp.id === row.comp_id && comp.year === year) : candidates.length === 1 ? candidates[0] : null
      if (!comp) {
        row.match_status = candidates.length > 1 && !row.comp_id ? 'ambiguous' : 'unmatched'
        row.candidates = row.match_status === 'ambiguous' ? candidates : []
        row.error = row.candidates.length ? '当前年份存在多个同名赛事，请明确选择目标赛事' : `${year}年赛事不存在或不在可填报范围`
      } else if (comp.comp_name !== row.comp_name) {
        row.match_status = 'unmatched'
        row.error = '目标赛事与填写的名称不一致'
      } else {
        row.comp_id = comp.id
        row.competition = comp
        row.match_status = 'matched'
        row.existing = existing
      }
      if (commit) row.import_status = row.error ? 'failed' : row.existing ? 'existing' : 'imported'
      return row
    })
    await route.fulfill({ json: { code: 200, message: commit ? '统一导入完成' : '校验完成', data: {
      rows, import_year: year, require_registration: false, student_count: rows.length,
      ready_count: rows.filter(row => !row.error && !row.existing && !commit).length,
      fail_count: rows.filter(row => row.error).length,
      success_count: rows.filter(row => row.import_status === 'imported').length,
      existing_count: rows.filter(row => row.existing).length,
    } } })
  })
  return submissions
}

test('获奖填报列表进入统一导入，不再需要指定赛事', async ({ page }) => {
  await mockAwardSession(page, 'college_admin')
  await page.goto('/#/award/list')
  await page.getByRole('button', { name: '统一导入获奖名单', exact: true }).click()
  await expect(page).toHaveURL(/award\/import-all$/)
  await expect(page.getByText('一个 Excel 文件可填写多个赛事', { exact: true })).toBeVisible()
  await expect(page.getByText(`导入年份：${year}年`, { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '匹配赛事并校验', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '清空', exact: true })).toHaveCount(0)
})

test('只填名称匹配当年赛事、批量消歧、部分导入、失败导出重交', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1100 })
  const submissions = await mockUnified(page)
  await page.goto('/#/award/import-all')
  await page.locator('input[type=file]').setInputFiles(spreadsheet([
    ['程序设计竞赛'], ['创新设计竞赛'], ['同年同名赛事'], ['同年同名赛事'], ['不存在的赛事'],
  ]))
  await expect(page.locator('.preview-table').getByRole('columnheader', { name: '赛事年份', exact: true })).toHaveCount(0)
  await expect(page.locator('.preview-table').getByRole('columnheader', { name: '赛事编号', exact: true })).toHaveCount(0)
  const summary = page.locator('.competition-summary-table')
  await expect(summary.locator('.el-table__body tbody tr')).toHaveCount(4)
  await expect(page.getByRole('button', { name: '导入可新增的 2 行', exact: true })).toBeEnabled()
  await summary.locator('.el-select').click()
  await page.getByRole('option', { name: '同年同名赛事（系统编号0004）', exact: true }).click()
  await expect(page.getByRole('button', { name: '导入可新增的 0 行', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '导入可新增的 4 行', exact: true })).toBeEnabled()
  await summary.getByRole('button', { name: '查看明细', exact: true }).first().click()
  await expect(page.locator('.preview-table .el-table__body tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: '完成编辑', exact: true }).click()
  await page.getByRole('button', { name: '查看全部明细', exact: true }).click()
  await expect(page.locator('.preview-table .el-table__body tbody tr')).toHaveCount(5)
  await page.getByRole('button', { name: '完成编辑', exact: true }).click()
  await page.getByRole('button', { name: '导入可新增的 4 行', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: /导入数据预览/ })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.preview-table .el-table__body tbody tr')).toHaveCount(1)
  const downloadEvent = page.waitForEvent('download')
  await dialog.getByRole('button', { name: '导出失败名单（1 条）', exact: true }).click()
  const download = await downloadEvent
  const stream = await download.createReadStream()
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  const book = XLSX.read(Buffer.concat(chunks), { type: 'buffer' })
  const failed = XLSX.utils.sheet_to_json(book.Sheets['校验失败名单'])
  expect(failed).toHaveLength(1)
  expect(failed[0]).toMatchObject({ 赛事名称: '不存在的赛事', 学号: '000104' })
  expect(failed[0]).not.toHaveProperty('赛事年份')
  expect(failed[0]).not.toHaveProperty('赛事编号')
  await page.locator('.el-checkbox').filter({ hasText: '只看失败行' }).click()
  const rows = page.locator('.preview-table .el-table__body tbody tr')
  await expect(rows.getByText('导入成功', { exact: true })).toHaveCount(4)
  await rows.last().locator('input').first().fill('程序设计竞赛')
  await page.getByRole('button', { name: '完成编辑', exact: true }).click()
  await page.getByRole('button', { name: '导入可新增的 1 行', exact: true }).click()
  await page.getByRole('button', { name: '查看全部明细', exact: true }).click()
  await expect(rows.getByText('导入成功', { exact: true })).toHaveCount(5)
  expect(submissions).toHaveLength(2)
  expect(submissions[0]).toHaveLength(5)
  expect(submissions[0][0].comp_id).toBe(2)
  expect(submissions[0].slice(2, 4).every(row => row.comp_id === 4)).toBe(true)
  expect(submissions[0].every(row => !('comp_year' in row) && !('comp_code' in row))).toBe(true)
  expect(submissions[1]).toHaveLength(1)
  expect(submissions[1][0].student_id).toBe('000104')
  await page.screenshot({ path: 'test-results/unified-award-import.png', fullPage: true })
})

test('修改名称必须重新校验，仅往年有的赛事禁止提交', async ({ page }) => {
  await mockUnified(page)
  await page.goto('/#/award/import-all')
  await page.locator('input[type=file]').setInputFiles(spreadsheet([['程序设计竞赛']]))
  await expect(page.getByRole('button', { name: '导入可新增的 1 行', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '查看全部明细', exact: true }).click()
  const inputs = page.locator('.preview-table .el-table__body tbody tr').first().locator('input')
  await inputs.first().fill('仅往年赛事')
  await page.getByRole('dialog', { name: /导入数据预览/ }).locator('.el-dialog__headerbtn').click()
  await expect(page.getByRole('button', { name: '暂无可导入数据', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '查看全部明细', exact: true }).click()
  await expect(page.locator('.preview-table')).toContainText(`${year}年赛事不存在或不在可填报范围`)
  await expect(page.getByRole('button', { name: '暂无可导入数据', exact: true })).toBeDisabled()
  await page.locator('.el-checkbox').filter({ hasText: '只看失败行' }).click()
  await expect(page.locator('.preview-table .el-table__body tbody tr')).toHaveCount(1)
})

test('全部重复也可确认跳过，原有单赛事页面仍使用单赛事接口', async ({ page }) => {
  await mockUnified(page, { existing: true })
  await page.goto('/#/award/import-all')
  await page.locator('input[type=file]').setInputFiles(spreadsheet([['程序设计竞赛']]))
  await page.getByRole('button', { name: '查看全部明细', exact: true }).click()
  await expect(page.locator('.preview-table')).toContainText('重复，将跳过')
  await page.getByRole('button', { name: '完成编辑', exact: true }).click()
  await page.getByRole('button', { name: '确认跳过 1 条重复记录', exact: true }).click()
  await page.getByRole('button', { name: '查看全部明细', exact: true }).click()
  await expect(page.locator('.preview-table')).toContainText('已存在，已跳过')
  await page.goto('/#/award/import/1')
  await expect(page.getByRole('button', { name: '提交导入', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '匹配赛事并校验', exact: true })).toHaveCount(0)
})


test('62组汇总分页，弹窗编辑名称不跳行，关闭后回到完整汇总', async ({ page }) => {
  await page.setViewportSize({ width: 1760, height: 954 })
  await mockUnified(page)
  await page.goto('/#/award/import-all')
  await page.locator('input[type=file]').setInputFiles(spreadsheet(Array.from({ length: 62 }, (_, i) => [`待确认赛事${i}`])))
  const summary = page.locator('.competition-summary-table')
  await expect(summary.locator('.el-table__body tbody tr')).toHaveCount(20)
  await expect(page.locator('.preview-table')).toHaveCount(0)
  await expect(page.locator('.summary-counts')).toHaveText('共 62 条｜可新增 0 条｜重复 0 条｜待修正 62 条')
  const heading = await page.getByText('赛事匹配与导入汇总（62 组）', { exact: true }).boundingBox()
  const counts = await page.locator('.summary-counts').boundingBox()
  const summaryCardBox = await page.locator('.competition-summary-card').boundingBox()
  expect(counts.x).toBeGreaterThan(heading.x + heading.width)
  expect(Math.abs(counts.y - heading.y)).toBeLessThan(10)
  const summaryFooter = page.locator('.summary-table-footer')
  const paginationBox = await summaryFooter.locator('.summary-pagination').boundingBox()
  const importButtonBox = await summaryFooter.getByRole('button', { name: '暂无可导入数据', exact: true }).boundingBox()
  expect(importButtonBox.x).toBeGreaterThan(paginationBox.x + paginationBox.width)
  expect(importButtonBox.y + importButtonBox.height).toBeLessThanOrEqual(summaryCardBox.y + summaryCardBox.height)
  await expect(summary.locator('.el-loading-mask')).toBeHidden()
  await page.screenshot({ path: 'test-results/unified-summary-62.png', fullPage: true })
  await page.locator('.summary-pagination .btn-next').click()
  await summary.getByRole('button', { name: '查看明细', exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name: /导入数据预览/ })
  await expect(dialog).toContainText('待确认赛事20')
  await expect(dialog.locator('.preview-table .el-table__body tbody tr')).toHaveCount(1)
  await expect(dialog.getByRole('button', { name: /导入可新增|确认跳过/ })).toHaveCount(0)
  const detailFooter = await dialog.locator('.footer').boundingBox()
  expect(detailFooter.y + detailFooter.height).toBeLessThanOrEqual(954)
  await dialog.locator('.preview-table input').first().fill('修改后的赛事名称')
  await expect(dialog.locator('.preview-table input').first()).toHaveValue('修改后的赛事名称')
  await expect(dialog.locator('.preview-table .el-table__body tbody tr')).toHaveCount(1)
  await page.screenshot({ path: 'test-results/unified-detail-dialog.png', fullPage: true })
  await dialog.getByRole('button', { name: '完成编辑', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.preview-table')).toHaveCount(0)
  await expect(summary).toContainText('修改后的赛事名称')
  await expect(page.getByRole('button', { name: /暂无可导入数据|请先匹配赛事并校验/ })).toBeDisabled()
})

test('自动校验请求失败可重试，校验成功前禁止提交', async ({ page }) => {
  const submissions = await mockUnified(page)
  let failOnce = true
  await page.route('**/api/award/import/unified/preview', async route => {
    if (failOnce) {
      failOnce = false
      await route.abort('failed')
    } else await route.fallback()
  })
  await page.goto('/#/award/import-all')
  await page.locator('input[type=file]').setInputFiles(spreadsheet([['程序设计竞赛']]))
  await expect(page.getByText('自动校验失败，请重试。', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: '校验失败，请重试', exact: true })).toBeDisabled()
  expect(submissions).toHaveLength(0)
  await page.getByRole('button', { name: '重试校验', exact: true }).click()
  await expect(page.getByRole('button', { name: '导入可新增的 1 行', exact: true })).toBeEnabled()
  expect(submissions).toHaveLength(0)
})
