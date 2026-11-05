// @ts-check
// 上报导出 UI 验证：看板各赛事详细统计（转化率列 + 柱状图 + 一键三合一导出）
import { test, expect } from 'playwright-test-coverage'
import * as XLSX from 'xlsx'
import fs from 'fs'

const BASE = process.env.E2E_BASE || 'http://localhost:5219'

test('看板详细统计：转化率列、柱状图与三合一导出', async ({ page }) => {
  test.setTimeout(120000)
  // 登录
  await page.goto(`${BASE}/#/login?method=password`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /管理员账号登录/ }).click()
  await page.getByPlaceholder('管理员用户名').fill('900001')
  await page.getByPlaceholder('密码').fill('Pw@yy03')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  for (let i = 0; i < 15; i++) {
    if (!page.url().includes('/login')) break
    await page.waitForTimeout(1000)
  }
  expect(page.url()).not.toContain('/login')

  // 看板
  await page.goto(`${BASE}/#/statistics/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3500)

  // 1. 转化率列
  await expect(page.getByRole('columnheader', { name: '获奖转化率' })).toBeVisible()

  // 2. 柱状图（各赛事详细统计卡内的 canvas）
  const compBar = page.locator('.comp-bar canvas')
  await expect(compBar.first()).toBeVisible()

  // 3. 筛选与重置仍在
  await expect(page.getByPlaceholder('按赛事名称筛选')).toBeVisible()
  await expect(page.getByRole('button', { name: '重置' })).toBeVisible()

  // 4. 一键导出 → 下载三合一 Excel
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: /导出上报Excel/ }).click()
  ])
  console.log('下载文件:', download.suggestedFilename())
  expect(download.suggestedFilename()).toContain('上报汇总')
  const path = 'test-results/report-export-download.xlsx'
  await download.saveAs(path)

  const wb = XLSX.read(fs.readFileSync(path), { type: 'buffer' })
  expect(wb.SheetNames).toEqual(['附件1', '附件2', '汇总表'])

  const s1 = XLSX.utils.sheet_to_json(wb.Sheets['附件1'], { header: 1 })
  expect(s1[2]).toContain('上报学院')
  const s3 = XLSX.utils.sheet_to_json(wb.Sheets['汇总表'], { header: 1 })
  expect(s3[1]).toContain('承办学院')
  expect(s3[1]).toContain('合计')
  console.log('✅ 三合一导出 UI 链路通过：附件1/附件2/汇总表')
})
