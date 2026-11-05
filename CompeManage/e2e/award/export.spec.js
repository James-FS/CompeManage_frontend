import { test, expect } from 'playwright-test-coverage'
import { mockAwardSession } from '../helpers/award-mock.js'

test('附件导出使用赛事年份，下载新版格式并显示后端错误', async ({ page }) => {
  await mockAwardSession(page)
  const requests = []
  const listRequests = []
  const currentYear = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Hong_Kong', year: 'numeric' }).format(new Date())
  const previousYear = String(Number(currentYear) - 1)
  const competitions = [
    { id: 1, comp_name: '当年赛事', year: Number(currentYear), status: 1, comp_level: '省级' },
    { id: 2, comp_name: '历史赛事', year: Number(previousYear), status: 2, comp_level: '省级' },
  ]
  await page.route(url => url.pathname === '/api/award/list', async route => {
    const url = new URL(route.request().url())
    listRequests.push(url)
    const list = competitions.filter(comp => !url.searchParams.get('year') || String(comp.year) === url.searchParams.get('year'))
    await route.fulfill({ json: { code: 200, data: { list, total: list.length } } })
  })
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
  await expect(year).toHaveValue(currentYear)
  await expect.poll(() => listRequests.at(-1)?.searchParams.get('year')).toBe(currentYear)
  await expect(page.getByText('当年赛事', { exact: true })).toBeVisible()
  await expect(page.getByText('历史赛事', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '导入获奖名单', exact: true })).toBeVisible()
  await year.fill(previousYear)
  await year.press('Enter')
  await year.blur()
  const projectDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出附件1（省级以上项目）' }).click()
  expect((await projectDownload).suggestedFilename()).toBe(`${previousYear}年大学生参加省级以上各类竞赛获奖项目一览表（本科生获奖统计）.xlsx`)
  expect(requests[0].searchParams.get('year')).toBe(previousYear)
  await expect(page.getByText('历史赛事', { exact: true })).toBeVisible()
  await year.fill('')
  await year.press('Enter')
  await year.blur()
  const studentDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出附件2（省级以上学生）' }).click()
  expect((await studentDownload).suggestedFilename()).toBe('全部赛事年份大学生参加省级以上各类竞赛获奖学生一览表（本科生获奖统计）.xlsx')
  expect(requests[1].searchParams.has('year')).toBe(false)
  await expect(page.locator('.comp-card')).toHaveCount(2)
  const unexpectedDownloads = []
  page.on('download', download => unexpectedDownloads.push(download))
  await page.getByRole('button', { name: '导出附件1（省级以上项目）' }).click()
  await expect(page.getByText('生成附件失败', { exact: true })).toBeVisible()
  expect(unexpectedDownloads).toHaveLength(0)
  await page.getByRole('button', { name: '重置', exact: true }).click()
  await expect(year).toHaveValue(currentYear)
  await expect.poll(() => listRequests.at(-1)?.searchParams.get('year')).toBe(currentYear)
  await expect(page.locator('.comp-card')).toHaveCount(1)
  await page.getByRole('button', { name: '查看获奖名单', exact: true }).click()
  await expect(page).toHaveURL(/award\/detail\/1$/)
  await page.getByRole('button', { name: '导入获奖名单', exact: true }).click()
  await expect(page).toHaveURL(/award\/import\/1$/)
})
