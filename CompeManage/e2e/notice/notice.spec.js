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

async function navigateToNoticeList(page) {
  await page.goto('/#/notice/list')
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.page-container', { timeout: 15000 })
}

test.describe('通知详情页面 - 基本功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeList(page)
    await page.waitForTimeout(1000)
  })

  test('从列表页跳转到详情页', async ({ page }) => {
    const rowCount = await page.locator('.list-table__body tr').count()

    if (rowCount > 0) {
      // 获取第一行标题
      const firstTitle = await page.locator('.table-title').first().textContent()
      console.log(`准备查看的通知: ${firstTitle}`)

      // 点击第一行
      await page.locator('.list-table__body tr').first().click()
      await page.waitForURL(/\/notice\/notice\/\d+/, { timeout: 10000 })

      // 验证页面元素
      await expect(page.locator('.notice-card')).toBeVisible()
      console.log('成功进入通知详情页')
    } else {
      console.log('表格无数据，跳过测试')
    }
  })
})

test.describe('通知详情页面 - 页面结构验证', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeList(page)
    await page.waitForTimeout(1000)
  })

  test('详情页基本结构', async ({ page }) => {
    const rowCount = await page.locator('.list-table__body tr').count()

    if (rowCount > 0) {
      // 跳转到详情页
      await page.locator('.list-table__body tr').first().click()
      await page.waitForURL(/\/notice\/notice\/\d+/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // 验证卡片容器
      await expect(page.locator('.notice-card')).toBeVisible()

      // 验证标题区域
      await expect(page.locator('.header-title')).toBeVisible()

      // 验证日期
      await expect(page.locator('.notice-date')).toBeVisible()

      // 验证内容区域
      await expect(page.locator('.notice-body')).toBeVisible()
    } else {
      console.log('表格无数据，跳过测试')
    }
  })

  test('详情页标题显示', async ({ page }) => {
    const rowCount = await page.locator('.list-table__body tr').count()

    if (rowCount > 0) {
      // 从列表获取标题
      const listTitle = await page.locator('.table-title').first().textContent()
      console.log(`列表中的标题: ${listTitle}`)

      // 跳转到详情页
      await page.locator('.list-table__body tr').first().click()
      await page.waitForURL(/\/notice\/notice\/\d+/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // 验证详情页标题
      const detailTitle = await page.locator('.header-title').textContent()
      console.log(`详情页标题: ${detailTitle}`)
      expect(detailTitle.trim().length).toBeGreaterThan(0)
    } else {
      console.log('表格无数据，跳过测试')
    }
  })

  test('详情页日期显示', async ({ page }) => {
    const rowCount = await page.locator('.list-table__body tr').count()

    if (rowCount > 0) {
      // 跳转到详情页
      await page.locator('.list-table__body tr').first().click()
      await page.waitForURL(/\/notice\/notice\/\d+/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // 验证日期显示
      const dateText = await page.locator('.notice-date').textContent()
      console.log(`日期: ${dateText}`)
      expect(dateText.trim().length).toBeGreaterThan(0)
    } else {
      console.log('表格无数据，跳过测试')
    }
  })

  test('详情页内容或无附件提示', async ({ page }) => {
    const rowCount = await page.locator('.list-table__body tr').count()

    if (rowCount > 0) {
      // 跳转到详情页
      await page.locator('.list-table__body tr').first().click()
      await page.waitForURL(/\/notice\/notice\/\d+/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // 验证内容区域
      const contentSection = page.locator('.content-section')
      const noAttachment = page.locator('.no-attachment')

      const hasContent = await contentSection.isVisible().catch(() => false)
      const hasNoAttachment = await noAttachment.isVisible().catch(() => false)

      console.log(`有内容: ${hasContent}, 无附件提示: ${hasNoAttachment}`)
      expect(hasContent || hasNoAttachment).toBe(true)
    } else {
      console.log('表格无数据，跳过测试')
    }
  })
})

test.describe('通知详情页面 - 附件功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeList(page)
    await page.waitForTimeout(1000)
  })

  test('有附件时显示附件下载区域', async ({ page }) => {
    const rowCount = await page.locator('.list-table__body tr').count()

    if (rowCount > 0) {
      // 跳转到详情页
      await page.locator('.list-table__body tr').first().click()
      await page.waitForURL(/\/notice\/notice\/\d+/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // 检查是否有附件下载区域
      const attachmentBox = page.locator('.attachment-box')
      const noAttachment = page.locator('.no-attachment')

      const hasAttachment = await attachmentBox.isVisible().catch(() => false)
      const hasNoAttachment = await noAttachment.isVisible().catch(() => false)

      console.log(`有附件: ${hasAttachment}, 无附件: ${hasNoAttachment}`)

      if (hasAttachment) {
        // 验证附件区域内容
        await expect(attachmentBox.locator('.file-label')).toContainText('附件下载')
        await expect(attachmentBox.locator('.download-hint')).toContainText('点击下载')
      } else {
        // 验证无附件提示
        await expect(noAttachment).toBeVisible()
      }
    } else {
      console.log('表格无数据，跳过测试')
    }
  })

  test('附件下载区域悬停效果', async ({ page }) => {
    const rowCount = await page.locator('.list-table__body tr').count()

    if (rowCount > 0) {
      // 跳转到详情页
      await page.locator('.list-table__body tr').first().click()
      await page.waitForURL(/\/notice\/notice\/\d+/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // 检查是否有附件
      const attachmentBox = page.locator('.attachment-box')
      const hasAttachment = await attachmentBox.isVisible().catch(() => false)

      if (hasAttachment) {
        // 悬停到附件区域
        await attachmentBox.hover()
        await page.waitForTimeout(300)

        // 验证悬停效果 - 下载提示应该显示
        const downloadHint = attachmentBox.locator('.download-hint')
        await expect(downloadHint).toBeVisible()
        console.log('附件悬停效果正常')
      } else {
        console.log('该通知没有附件，跳过悬停测试')
      }
    } else {
      console.log('表格无数据，跳过测试')
    }
  })
})

test.describe('通知详情页面 - 返回功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeList(page)
    await page.waitForTimeout(1000)
  })

  test('返回按钮回到列表页', async ({ page }) => {
    const rowCount = await page.locator('.list-table__body tr').count()

    if (rowCount > 0) {
      // 跳转到详情页
      await page.locator('.list-table__body tr').first().click()
      await page.waitForURL(/\/notice\/notice\/\d+/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')

      // 点击返回按钮
      await page.locator('.back-btn').click()
      await page.waitForURL(/\/notice\/list/, { timeout: 5000 })

      // 验证回到列表页
      await expect(page).toHaveURL(/\/notice\/list/)
      await expect(page.locator('.header-title')).toContainText('赛事通知列表')
      console.log('成功返回列表页')
    } else {
      console.log('表格无数据，跳过测试')
    }
  })
})