import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const BASE_URL = process.env.DEMO_BASE_URL || 'http://1.117.230.218'
const OUTPUT_DIR = path.resolve(process.cwd(), '..', 'docs', 'images')
const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const accounts = {
  admin: { username: 'T2023001', password: '123', label: '校级管理员' },
  student: { username: 'S2024001', password: '123', label: '学生' },
}

const adminPages = [
  ['02-home-dashboard.png', '/home', '首页总览'],
  ['03-competition-list.png', '/competition/list', '赛事目录'],
  ['04-competition-create.png', '/competition/add', '新增赛事'],
  ['05-competition-audit.png', '/competition/audit', '赛事审核/申报'],
  ['06-registration-list.png', '/register', '赛事报名'],
  ['07-registration-settings.png', '/register/edit', '报名设置'],
  ['08-registration-audit.png', '/register/audit', '报名审核'],
  ['09-work-audit.png', '/register/work-audit', '作品审核'],
  ['10-award-report.png', '/award/list', '获奖填报'],
  ['11-award-audit.png', '/award/audit', '填报审核'],
  ['12-summary.png', '/summary/summary-list', '赛事总结'],
  ['13-statistics.png', '/statistics/dashboard', '数据汇总'],
  ['14-review.png', '/review', '专家评审'],
  ['15-permission.png', '/permission', '权限管理'],
  ['16-notice-list.png', '/notice/list', '通知列表'],
]

const studentPages = [
  ['17-student-registration.png', '/register', '学生报名入口'],
  ['18-student-work.png', '/register/work', '学生作品提交'],
  ['19-student-awards.png', '/award/student', '学生竞赛中心'],
]

async function waitForSettled(page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1800)
}

async function login(page, account) {
  await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' })
  await waitForSettled(page)

  const adminButton = page.getByText('管理员账号登录')
  if (await adminButton.isVisible().catch(() => false)) {
    await adminButton.click()
  }

  await page.getByPlaceholder('管理员用户名').fill(account.username)
  await page.getByPlaceholder('密码').fill(account.password)
  await page.getByRole('button', { name: /^登录$/ }).click()
  await page.waitForURL(/#\/home/, { timeout: 15000 })
  await waitForSettled(page)
}

async function capture(page, filename, route, label) {
  const url = `${BASE_URL}/#${route}`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await waitForSettled(page)
  if (route === '/permission') {
    await page.getByText('校级管理员').click().catch(() => {})
    await waitForSettled(page)
  }
  await page.screenshot({
    path: path.join(OUTPUT_DIR, filename),
    fullPage: false,
  })
  console.log(`captured ${filename} - ${label} - ${url}`)
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 920 },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
  })

  const page = await context.newPage()
  page.on('dialog', async (dialog) => {
    console.log(`dismissed dialog: ${dialog.message()}`)
    await dialog.dismiss()
  })

  await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' })
  await waitForSettled(page)
  if (await page.getByText('管理员账号登录').isVisible().catch(() => false)) {
    await page.getByText('管理员账号登录').click()
    await waitForSettled(page)
  }
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '01-login.png'),
    fullPage: false,
  })
  console.log('captured 01-login.png - 登录页')

  await login(page, accounts.admin)
  for (const [filename, route, label] of adminPages) {
    await capture(page, filename, route, label)
  }

  await page.evaluate(() => {
    localStorage.clear()
  })
  await login(page, accounts.student)
  for (const [filename, route, label] of studentPages) {
    await capture(page, filename, route, label)
  }

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
