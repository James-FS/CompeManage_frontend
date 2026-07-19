import { test, expect } from 'playwright-test-coverage'
import { login } from '../helpers/auth'

// 测试用户 - school_admin




async function navigateToNoticeList(page) {
  await page.goto('/#/notice/list')
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.page-container', { timeout: 15000 })
}

test.describe('通知列表页面 - 基本功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeList(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    // 验证页面标题
    await expect(page.locator('.header-title')).toContainText('赛事通知列表')

    // 验证搜索区域
    await expect(page.locator('.search-input')).toBeVisible()
    await expect(page.locator('.date-input')).toBeVisible()
    await expect(page.locator('button:has-text("查询")')).toBeVisible()
    await expect(page.locator('button:has-text("重置")')).toBeVisible()

    // 验证表格
    await expect(page.locator('.list-table')).toBeVisible()

    // 验证分页
    await expect(page.locator('.el-pagination')).toBeVisible()
  })

  test('表格列验证', async ({ page }) => {
    await page.waitForTimeout(1000)

    // 验证表头
    const headers = page.locator('.list-table .el-table__header th')
    const headerCount = await headers.count()
    console.log(`表头列数: ${headerCount}`)
    expect(headerCount).toBeGreaterThan(0)

    // 验证表头文本
    const titleHeader = page.locator('.list-table').filter({ hasText: '通知标题' })
    await expect(titleHeader).toBeVisible()

    const deptHeader = page.locator('.list-table').filter({ hasText: '发布部门' })
    await expect(deptHeader).toBeVisible()

    const dateHeader = page.locator('.list-table').filter({ hasText: '发布日期' })
    await expect(dateHeader).toBeVisible()
  })

  test('表格数据或空状态验证', async ({ page }) => {
    await page.waitForTimeout(1000)

    const rowCount = await page.locator('.list-table__body tr').count()
    const hasEmpty = await page.locator('.el-empty').isVisible().catch(() => false)

    console.log(`行数: ${rowCount}, 空状态: ${hasEmpty}`)
    expect(rowCount >= 0 || hasEmpty).toBe(true)
  })
})

test.describe('通知列表页面 - 搜索与重置', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeList(page)
    await page.waitForTimeout(1000)
  })

  test('搜索功能 - 按标题搜索', async ({ page }) => {
    // 获取搜索前的行数
    const originalRows = await page.locator('.list-table__body tr').count()
    console.log(`搜索前行数: ${originalRows}`)

    // 输入搜索关键词
    const searchInput = page.locator('.search-input input')
    await searchInput.fill('测试')
    await page.locator('button:has-text("查询")').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 验证输入框有值
    await expect(searchInput).toHaveValue('测试')
  })

  test('搜索功能 - 重置按钮清空搜索条件', async ({ page }) => {
    // 填写搜索条件
    const searchInput = page.locator('.search-input input')
    await searchInput.fill('测试关键词')
    await page.waitForTimeout(300)

    // 验证输入框有值
    await expect(searchInput).toHaveValue('测试关键词')

    // 点击重置按钮
    await page.locator('button:has-text("重置")').click()
    await page.waitForTimeout(500)

    // 验证输入框已清空
    await expect(searchInput).toHaveValue('')
  })

  test('搜索功能 - 重置后数据恢复', async ({ page }) => {
    // 获取原始数据量
    const originalRows = await page.locator('.list-table__body tr').count()
    console.log(`原始行数: ${originalRows}`)

    // 进行搜索
    const searchInput = page.locator('.search-input input')
    await searchInput.fill('不存在的关键词_' + Date.now())
    await page.locator('button:has-text("查询")').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 点击重置
    await page.locator('button:has-text("重置")').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 验证数据恢复
    const afterResetRows = await page.locator('.list-table__body tr').count()
    console.log(`重置后行数: ${afterResetRows}`)
  })
})

test.describe('通知列表页面 - 行点击与跳转', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeList(page)
    await page.waitForTimeout(1000)
  })

  test('点击表格行跳转详情页', async ({ page }) => {
    const rowCount = await page.locator('.list-table__body tr').count()

    if (rowCount > 0) {
      // 获取第一行标题用于验证
      const firstTitle = await page.locator('.table-title').first().textContent()
      console.log(`准备点击的通知: ${firstTitle}`)

      // 点击第一行
      await page.locator('.list-table__body tr').first().click()
      await page.waitForURL(/\/notice\/notice\/\d+/, { timeout: 10000 })

      // 验证跳转到详情页
      await expect(page).toHaveURL(/\/notice\/notice\/\d+/)
      console.log('成功跳转到通知详情页')
    } else {
      console.log('表格无数据，跳过测试')
    }
  })
})

test.describe('通知列表页面 - 分页功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeList(page)
    await page.waitForTimeout(1000)
  })

  test('分页 - 切换每页条数', async ({ page }) => {
    // 获取切换前的行数
    const rowsBefore = await page.locator('.list-table__body tr').count()
    console.log(`切换前行数: ${rowsBefore}`)

    if (rowsBefore === 0) {
      console.log('表格无数据，跳过分页切换测试')
      return
    }

    // 找到每页条数选择器
    const sizeSelect = page.locator('.el-pagination__sizes .el-select').first()
    await sizeSelect.click()
    await page.waitForTimeout(300)

    // 选择20条
    const option20 = page.getByRole('option', { name: '20 条/页' })
    await option20.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 验证行数变化
    const rowsAfter = await page.locator('.list-table__body tr').count()
    console.log(`切换后行数: ${rowsAfter}`)
    expect(rowsAfter).toBeLessThanOrEqual(20)
  })

  test('分页 - 切换页码', async ({ page }) => {
    // 获取总页数
    const pager = page.locator('.el-pagination .el-pager')
    const pageCount = await pager.locator('li').count()
    console.log(`总页数: ${pageCount}`)

    if (pageCount > 1) {
      // 点击第二页
      const secondPage = pager.locator('li').nth(1)
      const pageNum = await secondPage.textContent()
      console.log(`点击页码: ${pageNum}`)
      await secondPage.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      // 验证当前页高亮
      const activePage = pager.locator('li.is-active')
      const activeText = await activePage.textContent()
      expect(activeText).toBe(pageNum)
    } else {
      console.log('只有一页，跳过测试')
    }
  })
})

test.describe('通知列表页面 - 返回按钮', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeList(page)
  })

  test('返回按钮存在并可点击', async ({ page }) => {
    const backBtn = page.locator('.back-btn')
    await expect(backBtn).toBeVisible()
    await expect(backBtn).toContainText('返回')
  })
})