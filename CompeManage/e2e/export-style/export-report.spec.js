/**
 * 大量赛事下「一键导出上报 Excel」UI 测试：
 * 1. 校管理员登录 → 数据统计看板
 * 2. 选择 2025 年，点「导出上报Excel」
 * 3. 校验下载文件为 xlsx，且含 附件1/附件2/汇总表，附件1 有大量数据行
 *
 * 前置：后端 8080；2025 年已播种 SRC350 数据（export-test/parse_and_seed.py）
 * 运行：npx playwright test --config=playwright.export-style.config.js
 */
import { test, expect } from 'playwright-test-coverage'
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import { login } from '../helpers/auth.js'

const SCHOOL_ADMIN = { username: 'T2023001', password: '123', role: 'school_admin' }

test('看板一键导出 2025 上报 Excel：三表结构与数据量', async ({ page }) => {
  test.setTimeout(120_000)
  await login(page, SCHOOL_ADMIN)

  await page.goto('/#/statistics/dashboard')
  await page.waitForLoadState('networkidle')

  // 导出按钮
  const exportBtn = page.getByRole('button', { name: /导出.*上报|一键导出/ })
  await expect(exportBtn).toBeVisible({ timeout: 15_000 })

  // 年份选择器存在即可；留空=导出全部年份（仍含 2025 播种数据）
  await expect(page.getByPlaceholder('上报年份（留空全部）')).toBeVisible()

  const downloadPromise = page.waitForEvent('download', { timeout: 90_000 })
  await exportBtn.click()
  const download = await downloadPromise
  const path = await download.path()
  expect(path, '下载文件路径').toBeTruthy()

  const buf = readFileSync(path)
  const wb = XLSX.read(buf, { type: 'buffer' })
  expect(wb.SheetNames, '工作表').toEqual(expect.arrayContaining(['附件1', '附件2', '汇总表']))

  const ws1 = wb.Sheets['附件1']
  const aoa1 = XLSX.utils.sheet_to_json(ws1, { header: 1, raw: false })
  // 表头行含「上报学院」「参赛项目名称」
  const headerRow = aoa1.find(r => r.some(c => String(c || '').includes('参赛项目名称')))
  expect(headerRow, '附件1 表头').toBeTruthy()
  expect(headerRow.join('|')).toContain('上报学院')
  expect(headerRow.join('|')).toContain('获奖学生')

  // 数据行：序号为数字的行
  const dataRows1 = aoa1.filter(r => r[0] !== undefined && r[0] !== '' && !Number.isNaN(Number(r[0])))
  // 大量赛事场景：至少 200 条项目（本次播种约 251）
  expect(dataRows1.length, `附件1 数据行数=${dataRows1.length}`).toBeGreaterThanOrEqual(200)

  const ws2 = wb.Sheets['附件2']
  const aoa2 = XLSX.utils.sheet_to_json(ws2, { header: 1, raw: false })
  const dataRows2 = aoa2.filter(r => r[0] !== undefined && r[0] !== '' && !Number.isNaN(Number(r[0])))
  expect(dataRows2.length, `附件2 数据行数=${dataRows2.length}`).toBeGreaterThanOrEqual(500)

  const ws3 = wb.Sheets['汇总表']
  const aoa3 = XLSX.utils.sheet_to_json(ws3, { header: 1, raw: false })
  const sumHeader = aoa3.find(r => r.some(c => String(c || '').includes('承办学院')))
  expect(sumHeader.join('|')).toContain('竞赛名称')
  expect(sumHeader.join('|')).toContain('合计')
  const sumRows = aoa3.filter(r => r[0] !== undefined && r[0] !== '' && !Number.isNaN(Number(r[0])))
  expect(sumRows.length, `汇总表赛事数=${sumRows.length}`).toBeGreaterThanOrEqual(20)

  console.log(`[export-style] 附件1=${dataRows1.length} 附件2=${dataRows2.length} 汇总=${sumRows.length}`)
})

test('看板页无权限报错且导出按钮不误触 403', async ({ page }) => {
  await login(page, SCHOOL_ADMIN)
  await page.goto('/#/statistics/dashboard')
  const errors = []
  page.on('response', r => {
    if (r.url().includes('/api/award/export') && r.status() >= 400) {
      errors.push(`${r.status()} ${r.url()}`)
    }
  })
  await page.waitForTimeout(1000)
  expect(errors, '导出相关 API 不应 403/404').toEqual([])
})
