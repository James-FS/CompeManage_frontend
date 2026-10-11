import { test, expect } from '@playwright/test'
import { mockAwardSession } from '../helpers/award-mock.js'

test('附件导出使用赛事年份，下载新版格式并显示后端错误', async ({ page }) => {
  await mockAwardSession(page)
  const requests = []
  await page.route('**/api/award/export/**', async route => {
    requests.push(new URL(route.request().url()))
    if (requests.length === 3) {
      await route.fulfill({ contentType: 'application/json; charset=utf-8', body: JSON.stringify({ code: 500, message: '生成附件失败' }) })
    } else {
      await route.fulfill({ contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', body: Buffer.from('mock workbook') })
    }
  })
  await page.goto('/#/award/list')
  await expect(page.getByText('赛事年份', { exact: true })).toBeVisible()
  const year = page.getByPlaceholder('全部赛事年份')
  await year.fill('2025')
  await year.press('Enter')
  await year.blur()
  const projectDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出附件1（省级以上项目）' }).click()
  expect((await projectDownload).suggestedFilename()).toBe('2025年大学生参加省级以上各类竞赛获奖项目一览表（本科生获奖统计）.xlsx')
  expect(requests[0].searchParams.get('year')).toBe('2025')
  await year.fill('')
  await year.press('Enter')
  await year.blur()
  const studentDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出附件2（省级以上学生）' }).click()
  expect((await studentDownload).suggestedFilename()).toBe('全部赛事年份大学生参加省级以上各类竞赛获奖学生一览表（本科生获奖统计）.xlsx')
  expect(requests[1].searchParams.has('year')).toBe(false)
  const unexpectedDownloads = []
  page.on('download', download => unexpectedDownloads.push(download))
  await page.getByRole('button', { name: '导出附件1（省级以上项目）' }).click()
  await expect(page.getByText('生成附件失败', { exact: true })).toBeVisible()
  expect(unexpectedDownloads).toHaveLength(0)
})
