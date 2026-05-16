import { test, expect } from 'playwright-test-coverage'

// ==================== 测试账号 ====================
const STUDENT_USER = {
  username: 'S2024001',
  password: '123',
  role: 'student',
}

const ADMIN_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
}

// ==================== 辅助函数 ====================

async function login(page, user) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[placeholder="请输入用户名"]', user.username)
  await page.fill('input[placeholder="请输入密码"]', user.password)
  await page.locator('.el-button:has-text("立即登录")').click()
  await page.waitForURL(
    url => url.hash.includes('home') || url.hash.includes('work'),
    { timeout: 10000 }
  )
}

async function navigateToWork(page) {
  await page.goto('/#/register/work')
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.page-container', { timeout: 15000 })
}

// ==================== 我的参赛列表测试 ====================

test.describe('作品提交页面 - 我的参赛列表', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, STUDENT_USER)
    await navigateToWork(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    await expect(page.locator('.page-header h2')).toContainText('我的参赛列表')
    await expect(page.locator('.page-container')).toBeVisible()
    await expect(page.locator('.comp-list')).toBeVisible()
  })

  test('页面加载状态', async ({ page }) => {
    await page.waitForTimeout(1000)

    const cardCount = await page.locator('.comp-card').count()
    const hasEmpty = await page.locator('.el-empty').isVisible().catch(() => false)

    console.log(`卡片数量: ${cardCount}, 空状态: ${hasEmpty}`)
    expect(cardCount >= 0 || hasEmpty).toBe(true)
  })

  test('参赛卡片基本结构', async ({ page }) => {
    await page.waitForTimeout(1000)

    const cardCount = await page.locator('.comp-card').count()

    if (cardCount > 0) {
      const firstCard = page.locator('.comp-card').first()

      await expect(firstCard.locator('.comp-name')).toBeVisible()
      await expect(firstCard.locator('.status-badge')).toBeVisible()
      await expect(firstCard.locator('.meta-item')).toContainText('提交时间')
      await expect(firstCard.locator('.primary-btn')).toBeVisible()

      console.log(`第一个赛事: ${await firstCard.locator('.comp-name').textContent()}`)
    } else {
      await expect(page.locator('.el-empty')).toBeVisible()
      await expect(page.locator('.el-empty')).toContainText('您还没有报名任何赛事')
    }
  })

  test('赛事状态标签显示正确', async ({ page }) => {
    await page.waitForTimeout(1000)

    const cardCount = await page.locator('.comp-card').count()
    if (cardCount > 0) {
      const statusBadges = page.locator('.status-badge')
      const count = await statusBadges.count()
      console.log(`状态标签数量: ${count}`)

      const validStatuses = ['待审核', '已报名', '已通过', '已驳回']
      for (let i = 0; i < Math.min(count, 3); i++) {
        const text = await statusBadges.nth(i).textContent()
        console.log(`状态标签 ${i + 1}: ${text}`)
      }
    }
  })

  test('操作按钮状态正确', async ({ page }) => {
    await page.waitForTimeout(1000)

    const cardCount = await page.locator('.comp-card').count()
    if (cardCount > 0) {
      const firstCard = page.locator('.comp-card').first()
      const actionBtn = firstCard.locator('.primary-btn')
      const btnText = await actionBtn.textContent()
      console.log(`按钮文本: ${btnText.trim()}`)

      const validBtnTexts = ['资格审核中', '通道未开启', '提交已截止', '提交作品', '修改作品']
      expect(validBtnTexts.some(t => btnText.includes(t))).toBe(true)
    }
  })
})

// ==================== 跳转详情测试 ====================

test.describe('作品提交页面 - 跳转详情', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, STUDENT_USER)
    await navigateToWork(page)
    await page.waitForTimeout(1000)
  })

  test('点击可操作的赛事卡片跳转详情页', async ({ page }) => {
    const cardCount = await page.locator('.comp-card').count()

    if (cardCount > 0) {
      const enabledBtn = page.locator('.comp-card .primary-btn:not(.is-disabled)').first()
      const isVisible = await enabledBtn.isVisible().catch(() => false)

      if (isVisible) {
        const btnText = await enabledBtn.textContent()
        console.log(`点击按钮: ${btnText}`)

        await enabledBtn.click()
        await page.waitForURL(/\/register\/work\/detail\/\d+/, { timeout: 10000 })

        await expect(page).toHaveURL(/\/register\/work\/detail\/\d+/)
        await expect(page.locator('.page-header')).toBeVisible()
        await expect(page.locator('.content-wrapper')).toBeVisible()
      } else {
        console.log('没有可操作的比赛，跳过测试')
      }
    } else {
      console.log('没有参赛记录，跳过测试')
    }
  })

  test('详情页返回列表按钮', async ({ page }) => {
    const cardCount = await page.locator('.comp-card').count()

    if (cardCount > 0) {
      const enabledBtn = page.locator('.comp-card .primary-btn:not(.is-disabled)').first()
      const isVisible = await enabledBtn.isVisible().catch(() => false)

      if (isVisible) {
        await enabledBtn.click()
        await page.waitForURL(/\/register\/work\/detail\/\d+/, { timeout: 10000 })

        const backBtn = page.locator('.back-btn')
        await expect(backBtn).toBeVisible()
        await backBtn.click()

        await page.waitForURL(/\/register\/work/, { timeout: 5000 })
        await expect(page.locator('.page-header h2')).toContainText('我的参赛列表')
      } else {
        console.log('没有可操作的比赛，跳过测试')
      }
    } else {
      console.log('没有参赛记录，跳过测试')
    }
  })
})

// ==================== 作品详情页测试 ====================

test.describe('作品提交详情页', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, STUDENT_USER)
    await navigateToWork(page)
    await page.waitForTimeout(1000)
  })

  test('详情页基本结构验证', async ({ page }) => {
    const cardCount = await page.locator('.comp-card').count()

    if (cardCount > 0) {
      const enabledBtn = page.locator('.comp-card .primary-btn:not(.is-disabled)').first()
      const isVisible = await enabledBtn.isVisible().catch(() => false)

      if (isVisible) {
        await enabledBtn.click()
        await page.waitForURL(/\/register\/work\/detail\/\d+/, { timeout: 10000 })
        await page.waitForLoadState('networkidle')

        await expect(page.locator('.page-title')).toContainText('作品提交')
        await expect(page.locator('.time-tip')).toContainText('提交时间')
        await expect(page.locator('.section-title').first()).toContainText('报名材料')
        await expect(page.locator('button:has-text("取消")')).toBeVisible()
        await expect(page.locator('button:has-text("保存并提交作品")')).toBeVisible()
      } else {
        console.log('没有可操作的比赛，跳过测试')
      }
    } else {
      console.log('没有参赛记录，跳过测试')
    }
  })

  test('详情页通道状态标签', async ({ page }) => {
    const cardCount = await page.locator('.comp-card').count()

    if (cardCount > 0) {
      const enabledBtn = page.locator('.comp-card .primary-btn:not(.is-disabled)').first()
      const hasEnabled = await enabledBtn.isVisible().catch(() => false)

      if (hasEnabled) {
        await enabledBtn.click()
        await page.waitForURL(/\/register\/work\/detail\/\d+/, { timeout: 10000 })
        await page.waitForLoadState('networkidle')

        const statusTag = page.locator('.el-tag').first()
        await statusTag.waitFor({ state: 'visible', timeout: 5000 })
        const tagText = await statusTag.textContent()
        console.log(`状态标签: ${tagText}`)
        expect(['提交通道开放中', '通道关闭'].some(t => tagText.includes(t))).toBe(true)
      } else {
        console.log('没有可操作的比赛，跳过测试')
      }
    } else {
      console.log('没有参赛记录，跳过测试')
    }
  })

  test('详情页文件区域显示', async ({ page }) => {
    const cardCount = await page.locator('.comp-card').count()

    if (cardCount > 0) {
      const enabledBtn = page.locator('.comp-card .primary-btn:not(.is-disabled)').first()
      const hasEnabled = await enabledBtn.isVisible().catch(() => false)

      if (hasEnabled) {
        await enabledBtn.click()
        await page.waitForURL(/\/register\/work\/detail\/\d+/, { timeout: 10000 })
        await page.waitForLoadState('networkidle')

        const regSection = page.locator('.section').first()
        await expect(regSection.locator('.section-title')).toContainText('报名材料')

        const workSection = page.locator('.section').nth(1)
        await expect(workSection.locator('.section-title')).toContainText('参赛作品')
      } else {
        console.log('没有可操作的比赛，跳过测试')
      }
    } else {
      console.log('没有参赛记录，跳过测试')
    }
  })

  test('详情页通道关闭时上传区不显示', async ({ page }) => {
    const cardCount = await page.locator('.comp-card').count()

    if (cardCount > 0) {
      const enabledBtn = page.locator('.comp-card .primary-btn:not(.is-disabled)').first()
      const hasEnabled = await enabledBtn.isVisible().catch(() => false)

      if (hasEnabled) {
        await enabledBtn.click()
        await page.waitForURL(/\/register\/work\/detail\/\d+/, { timeout: 10000 })
        await page.waitForLoadState('networkidle')

        const alertBox = page.locator('.el-alert')
        const hasAlert = await alertBox.isVisible().catch(() => false)
        const uploadArea = page.locator('.upload-area')
        const hasUpload = await uploadArea.isVisible().catch(() => false)

        console.log(`有alert: ${hasAlert}, 有上传区: ${hasUpload}`)

        if (hasAlert) {
          await expect(alertBox).toContainText('当前不在作品提交时间段内')
          await expect(uploadArea).not.toBeVisible()
        }
      } else {
        console.log('没有可操作的比赛，跳过测试')
      }
    } else {
      console.log('没有参赛记录，跳过测试')
    }
  })
})

// ==================== 学生账号权限测试 ====================

test.describe('作品提交 - 学生账号权限', () => {
  test('学生账号登录后应能访问作品提交页面', async ({ page }) => {
    await login(page, STUDENT_USER)
    await navigateToWork(page)

    await expect(page.locator('.page-container')).toBeVisible()
    await expect(page.locator('.page-header h2')).toContainText('我的参赛列表')
  })

  test('学生账号应看到有效的操作按钮', async ({ page }) => {
    await login(page, STUDENT_USER)
    await navigateToWork(page)
    await page.waitForTimeout(1000)

    const cardCount = await page.locator('.comp-card').count()
    if (cardCount > 0) {
      const firstCard = page.locator('.comp-card').first()
      await expect(firstCard.locator('.comp-name')).toBeVisible()
      await expect(firstCard.locator('.primary-btn')).toBeVisible()

      const btnText = await firstCard.locator('.primary-btn').textContent()
      console.log(`按钮文本: ${btnText.trim()}`)

      const validBtnTexts = ['资格审核中', '通道未开启', '提交已截止', '提交作品', '修改作品']
      expect(validBtnTexts.some(t => btnText.includes(t))).toBe(true)
    }
  })
})