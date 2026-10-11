import { test, expect } from 'playwright-test-coverage'
import { login } from '../helpers/auth'

// 辅助函数：登录并进入报名列表页面
async function loginAndNavigate(page) {
  await login(page)
  await page.goto('/#/register')
  await page.waitForLoadState('networkidle')
}

// 辅助函数：等待列表加载完成
async function waitForListLoaded(page) {
  await page.waitForLoadState('networkidle')
  // 等待列表或空状态出现
  await page.waitForSelector('.comp-list, .el-empty', { timeout: 15000 })
}

// 辅助函数：在筛选卡片中操作下拉筛选并等待列表刷新
async function selectFilter(page, label, optionText) {
  const formItem = page.locator('.filter-card .el-form-item').filter({ hasText: label })
  await formItem.locator('.el-select').click()
  await page.getByRole('option', { name: optionText, exact: true }).click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  return formItem
}

test.describe('报名列表页面测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page)
    await waitForListLoaded(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    // 验证搜索区域
    await expect(page.locator('input[placeholder="搜索赛事名称"]')).toBeVisible()
    await expect(page.locator('.filter-card button:has-text("搜索")')).toBeVisible()
    await expect(page.locator('.filter-card button:has-text("重置")')).toBeVisible()

    // 验证筛选下拉
    await expect(page.locator('.filter-card .el-form-item').filter({ hasText: '赛事级别' }).locator('.el-select')).toBeVisible()
    await expect(page.locator('.filter-card .el-form-item').filter({ hasText: '状态' }).locator('.el-select')).toBeVisible()

    // 验证分页组件
    await expect(page.locator('.el-pagination')).toBeVisible()
  })

  test('搜索功能 - 输入关键词搜索', async ({ page }) => {
    // 输入搜索关键词
    const searchInput = page.locator('input[placeholder="搜索赛事名称"]')
    await searchInput.fill('测试')

    // 点击搜索按钮
    await page.locator('.filter-card button:has-text("搜索")').click()
    await page.waitForLoadState('networkidle')

    // 等待搜索结果
    await page.waitForTimeout(500)

    // 验证列表更新（空状态或有数据）
    const hasList = await page.locator('.comp-list').isVisible().catch(() => false)
    const hasEmpty = await page.locator('.el-empty').isVisible().catch(() => false)
    expect(hasList || hasEmpty).toBeTruthy()
  })

  test('搜索功能 - 回车键搜索', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="搜索赛事名称"]')
    await searchInput.fill('自动化测试')
    await searchInput.press('Enter')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 验证页面没有崩溃
    await expect(page.locator('.page-container')).toBeVisible()
  })

  test('搜索功能 - 清空搜索', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="搜索赛事名称"]')
    await searchInput.fill('测试')
    await page.locator('.filter-card button:has-text("搜索")').click()
    await page.waitForLoadState('networkidle')

    // 先让输入框获得焦点，触发清除按钮显示
    await searchInput.hover()
    await page.waitForTimeout(200)

    // 点击清除按钮
    await page.locator('.el-input__clear').click()
    await page.waitForTimeout(300)

    // 验证搜索框已清空
    await expect(searchInput).toHaveValue('')
  })

  test('级别筛选 - 选择国家级', async ({ page }) => {
    const formItem = await selectFilter(page, '赛事级别', '国家级')
    await expect(formItem.locator('.el-select')).toContainText('国家级')
    await page.waitForTimeout(500)
  })

  test('级别筛选 - 选择省级', async ({ page }) => {
    const formItem = await selectFilter(page, '赛事级别', '省级')
    await expect(formItem.locator('.el-select')).toContainText('省级')
  })

  test('级别筛选 - 选择校级', async ({ page }) => {
    const formItem = await selectFilter(page, '赛事级别', '校级')
    await expect(formItem.locator('.el-select')).toContainText('校级')
  })

  test('级别筛选 - 重置后恢复全部', async ({ page }) => {
    await selectFilter(page, '赛事级别', '省级')

    // 重置后下拉恢复"全部级别"占位符
    await page.locator('.filter-card button:has-text("重置")').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    const formItem = page.locator('.filter-card .el-form-item').filter({ hasText: '赛事级别' })
    await expect(formItem.locator('.el-select')).not.toContainText('省级')
  })

  test('状态筛选 - 选择未开始', async ({ page }) => {
    const formItem = await selectFilter(page, '状态', '未开始')
    await expect(formItem.locator('.el-select')).toContainText('未开始')
  })

  test('状态筛选 - 选择报名中', async ({ page }) => {
    const formItem = await selectFilter(page, '状态', '报名中')
    await expect(formItem.locator('.el-select')).toContainText('报名中')
  })

  test('状态筛选 - 选择已结束', async ({ page }) => {
    const formItem = await selectFilter(page, '状态', '已结束')
    await expect(formItem.locator('.el-select')).toContainText('已结束')
  })

  test('状态筛选 - 重置后恢复全部', async ({ page }) => {
    await selectFilter(page, '状态', '报名中')

    await page.locator('.filter-card button:has-text("重置")').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    const formItem = page.locator('.filter-card .el-form-item').filter({ hasText: '状态' })
    await expect(formItem.locator('.el-select')).not.toContainText('报名中')
  })

  test('竞赛卡片 - 验证卡片元素', async ({ page }) => {
    // 等待列表加载
    await page.waitForTimeout(1000)

    // 检查是否有竞赛列表
    const hasList = await page.locator('.comp-list').isVisible().catch(() => false)

    if (hasList) {
      const firstCard = page.locator('.comp-item').first()

      // 验证卡片内元素
      await expect(firstCard.locator('.comp-name')).toBeVisible()
      await expect(firstCard.locator('.status-badge')).toBeVisible()
      await expect(firstCard.locator('.level-tag')).toBeVisible()

      // 验证元数据行有内容
      const metaRow = firstCard.locator('.meta-row')
      const metaTextCount = await metaRow.locator('.meta-text').count()
      expect(metaTextCount).toBeGreaterThan(0)

      // 验证操作按钮
      await expect(firstCard.locator('.primary-btn')).toBeVisible()
    } else {
      // 空状态验证
      await expect(page.locator('.el-empty')).toBeVisible()
    }
  })

  test('竞赛卡片 - 点击进入详情', async ({ page }) => {
    await page.waitForTimeout(1000)

    const hasList = await page.locator('.comp-list').isVisible().catch(() => false)
    const cardCount = await page.locator('.comp-item').count()

    if (hasList && cardCount > 0) {
      const firstCard = page.locator('.comp-item').first()

      // 点击卡片
      await firstCard.click()
      await page.waitForLoadState('networkidle')

      // 验证URL变化（可能进入详情页或报名页）
      const currentUrl = page.url()
      expect(currentUrl.includes('detail') || currentUrl.includes('register')).toBeTruthy()
    }
  })

  test('竞赛卡片 - 报名按钮点击', async ({ page }) => {
    await page.waitForTimeout(1000)

    const hasList = await page.locator('.comp-list').isVisible().catch(() => false)
    const cardCount = await page.locator('.comp-item').count()

    if (hasList && cardCount > 0) {
      const firstCard = page.locator('.comp-item').first()
      const registerBtn = firstCard.locator('.primary-btn')

      // 检查按钮是否可点击
      const isDisabled = await registerBtn.isDisabled().catch(() => false)

      if (!isDisabled) {
        await registerBtn.click()
        await page.waitForLoadState('networkidle')

        // 验证页面跳转
        const currentUrl = page.url()
        expect(currentUrl.includes('detail') || currentUrl.includes('register')).toBeTruthy()
      }
    }
  })

  test('分页 - 验证分页组件', async ({ page }) => {
    // 验证分页元素存在
    await expect(page.locator('.pagination-container .el-pagination')).toBeVisible()
  })

  test('分页 - 切换页码', async ({ page }) => {
    await page.waitForTimeout(1000)

    const hasList = await page.locator('.comp-list').isVisible().catch(() => false)
    const itemCount = await page.locator('.comp-item').count()

    // 只有在有多页数据时才测试翻页
    if (hasList && itemCount >= 10) {
      // 点击下一页
      const nextBtn = page.locator('.pagination-container .btn-next')
      const isDisabled = await nextBtn.isDisabled().catch(() => false)

      if (!isDisabled) {
        await nextBtn.click()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(500)

        // 验证分页仍然可见
        await expect(page.locator('.pagination-container .el-pagination')).toBeVisible()
      }
    }
  })

  test('分页 - 切换每页条数', async ({ page }) => {
    await page.waitForTimeout(1000)

    const hasList = await page.locator('.comp-list').isVisible().catch(() => false)

    if (hasList) {
      // 找到每页条数选择器（位于分页右侧）
      const sizeSelect = page.locator('.pagination-container .el-select')
      const isVisible = await sizeSelect.isVisible().catch(() => false)

      if (isVisible) {
        await sizeSelect.click()
        // 筛选卡也有 el-select，必须取最后打开的（分页条数的）下拉
        const dropdown = page.locator('.el-select-dropdown').last()
        await dropdown.waitFor({ state: 'visible', timeout: 5000 })

        // 选择第二项（20条）
        const options = dropdown.locator('.el-select-dropdown__item')
        const count = await options.count()

        if (count > 1) {
          await options.nth(1).click()
          await page.waitForLoadState('networkidle')
          await page.waitForTimeout(500)
        }
      }
    }
  })

  test('筛选联动 - 级别和状态同时筛选', async ({ page }) => {
    const levelItem = await selectFilter(page, '赛事级别', '省级')
    const statusItem = await selectFilter(page, '状态', '报名中')

    // 验证两个筛选条件都选中
    await expect(levelItem.locator('.el-select')).toContainText('省级')
    await expect(statusItem.locator('.el-select')).toContainText('报名中')
  })

  test('筛选联动 - 切换级别后重新搜索', async ({ page }) => {
    // 先搜索
    const searchInput = page.locator('input[placeholder="搜索赛事名称"]')
    await searchInput.fill('测试')
    await page.locator('.filter-card button:has-text("搜索")').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 再选择级别
    await selectFilter(page, '赛事级别', '校级')

    // 验证列表更新
    const hasList = await page.locator('.comp-list').isVisible().catch(() => false)
    const hasEmpty = await page.locator('.el-empty').isVisible().catch(() => false)
    expect(hasList || hasEmpty).toBeTruthy()
  })

  test('状态标签 - 验证状态显示', async ({ page }) => {
    await page.waitForTimeout(1000)

    const hasList = await page.locator('.comp-list').isVisible().catch(() => false)

    if (hasList) {
      const firstCard = page.locator('.comp-item').first()
      const statusBadge = firstCard.locator('.status-badge')

      // 验证状态标签存在且有内容
      await expect(statusBadge).toBeVisible()
      const statusText = await statusBadge.textContent()
      expect(['未开始', '报名中', '已结束', '筹备中']).toContain(statusText.trim())
    }
  })

  test('级别标签 - 验证级别显示', async ({ page }) => {
    await page.waitForTimeout(1000)

    const hasList = await page.locator('.comp-list').isVisible().catch(() => false)

    if (hasList) {
      const firstCard = page.locator('.comp-item').first()
      const levelTag = firstCard.locator('.level-tag')

      // 验证级别标签存在且有内容
      await expect(levelTag).toBeVisible()
      const levelText = await levelTag.textContent()
      expect(['国家级', '省级', '校级']).toContain(levelText.trim())
    }
  })

  test('空状态 - 无数据时的显示', async ({ page }) => {
    // 使用一个不可能匹配的值进行搜索
    const searchInput = page.locator('input[placeholder="搜索赛事名称"]')
    await searchInput.fill('这是一个不可能存在的赛事名称XYZ123456')
    await page.locator('.filter-card button:has-text("搜索")').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 验证空状态或无列表显示
    const hasEmpty = await page.locator('.el-empty').isVisible().catch(() => false)
    const hasList = await page.locator('.comp-list').isVisible().catch(() => false)

    // 如果有列表，列表应该为空
    if (hasList) {
      const items = page.locator('.comp-item')
      const count = await items.count()
      expect(count).toBe(0)
    }

    // 如果显示空状态（页面空状态文案为"暂无可报名的赛事"）
    if (hasEmpty) {
      await expect(page.locator('.el-empty')).toContainText(/暂无可报名的赛事/)
    }
  })
})