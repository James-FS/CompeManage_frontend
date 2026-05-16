import { test, expect } from 'playwright-test-coverage'

// 测试用户 - school_admin
const TEST_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
}

async function login(page) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
  await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
  await page.locator('.el-button:has-text("立即登录")').click()
  await page.waitForURL(
    url => url.hash.includes('home') || url.hash.includes('notice'),
    { timeout: 10000 }
  )
}

async function navigateToNoticeEdit(page, noticeId = '0', compID = '') {
  let url = `/#/notice/edit/${noticeId}`
  if (compID) {
    url += `?compID=${compID}`
  }
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.paper-container', { timeout: 15000 })
}

test.describe('通知编辑页面 - 基本功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    // 访问新建通知页面
    await navigateToNoticeEdit(page)

    // 验证页面标题
    await expect(page.locator('.main-title')).toContainText('发布赛事通知')

    // 验证表单元素
    await expect(page.locator('input[placeholder="在此输入通知标题"]')).toBeVisible()
    await expect(page.locator('textarea[placeholder="在此撰写通知正文..."]')).toBeVisible()

    // 验证上传区域
    await expect(page.locator('.paper-uploader')).toBeVisible()

    // 验证按钮
    await expect(page.locator('button:has-text("取消")')).toBeVisible()
    await expect(page.locator('button:has-text("确认发布")')).toBeVisible()

    // 验证返回按钮
    await expect(page.locator('.back-area')).toBeVisible()
  })

  test('返回按钮可点击', async ({ page }) => {
    await navigateToNoticeEdit(page)
    await page.locator('.back-area').click()
    await page.waitForTimeout(500)
    // 返回上一页
  })
})

test.describe('通知编辑页面 - 表单验证', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeEdit(page)
  })

  test('标题为空时提交应提示错误', async ({ page }) => {
    // 直接点击提交按钮
    await page.locator('button:has-text("确认发布")').click()

    // 验证错误提示
    await expect(page.locator('.el-form-item__error').first()).toBeVisible()
    await expect(page.locator('.el-form-item__error').first()).toContainText('请输入通知标题')
  })

  test('正文为空时提交应提示错误', async ({ page }) => {
    // 填写标题
    await page.fill('input[placeholder="在此输入通知标题"]', '测试通知标题')

    // 点击提交
    await page.locator('button:has-text("确认发布")').click()

    // 验证错误提示
    await expect(page.locator('.el-form-item__error').first()).toBeVisible()
    await expect(page.locator('.el-form-item__error').first()).toContainText('请输入正文内容')
  })

  test('填写标题和正文后可提交', async ({ page }) => {
    await page.fill('input[placeholder="在此输入通知标题"]', '自动化测试通知_' + Date.now())
    await page.fill('textarea[placeholder="在此撰写通知正文..."]', '这是自动化测试通知的正文内容')

    // 验证按钮可点击（无disabled状态）
    const submitBtn = page.locator('button:has-text("确认发布")')
    await expect(submitBtn).not.toHaveClass(/is-disabled/)
  })
})

test.describe('通知编辑页面 - 取消功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeEdit(page)
  })

  test('取消按钮可点击并关闭', async ({ page }) => {
    const cancelBtn = page.locator('button:has-text("取消")')
    await expect(cancelBtn).toBeVisible()

    // 填写一些内容
    await page.fill('input[placeholder="在此输入通知标题"]', '测试标题')
    await page.fill('textarea[placeholder="在此撰写通知正文..."]', '测试正文')

    // 点击取消
    await cancelBtn.click()
    await page.waitForTimeout(300)
  })
})

test.describe('通知编辑页面 - 上传功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeEdit(page)
  })

  test('上传区域默认显示', async ({ page }) => {
    const uploader = page.locator('.paper-uploader')
    await expect(uploader).toBeVisible()
    await expect(page.locator('.upload-placeholder')).toContainText('点击或拖拽文件上传')
  })
})