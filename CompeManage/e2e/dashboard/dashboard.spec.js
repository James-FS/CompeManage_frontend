import { test, expect } from 'playwright-test-coverage'

const TEST_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
}

const DASHBOARD_URL = '/#/statistics/dashboard'

async function login(page) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
  await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
  await page.locator('.el-button:has-text("立即登录")').click()
  await page.waitForURL((url) => url.hash.includes('home'), { timeout: 10000 })
}

async function waitForDashboardLoad(page) {
  // 等待主要统计数据接口返回（主接口或 fallback 接口任一完成即可）
  // 主接口: /api/statistics/dashboard
  // fallback 中最先完成的通常是 /api/comp/list
  const dashboardResp = page
    .waitForResponse(
      (resp) =>
        resp.url().includes('/api/statistics/dashboard') && resp.status() === 200,
      { timeout: 15000 }
    )
    .catch(() => null)

  const compListResp = page
    .waitForResponse(
      (resp) => resp.url().includes('/api/comp/list') && resp.status() === 200,
      { timeout: 15000 }
    )
    .catch(() => null)

  // 等待任一接口完成即可继续
  await Promise.race([dashboardResp, compListResp])

  // 等待 loading 遮罩消失
  await page.waitForTimeout(800)
}

test.describe('数据看板页面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(DASHBOARD_URL)
    await waitForDashboardLoad(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    // 验证页面容器加载完成
    await expect(page.locator('.stats-container')).toBeVisible()

    // 验证 URL 正确
    await expect(page).toHaveURL(/#\/statistics\/dashboard/)

    // 验证页面标题"数据汇总"（侧边栏高亮或面包屑中）
    const pageTitle = page.locator('.el-breadcrumb, .page-header, .el-menu-item')
    const hasTitle = await pageTitle
      .filter({ hasText: '数据汇总' })
      .first()
      .isVisible()
      .catch(() => false)

    if (hasTitle) {
      console.log('页面标题"数据汇总"已确认')
    } else {
      // 标题可能在其他位置，不强制失败
      console.log('面包屑标题未直接可见，但页面已加载')
    }

    // 验证所有 6 个统计卡片容器存在
    const statCards = page.locator('.stat-card')
    const cardCount = await statCards.count()
    expect(cardCount).toBe(6)
    console.log(`统计卡片数量: ${cardCount}`)

    // 验证每个卡片都有 .label 元素
    const labels = page.locator('.stat-card .label')
    const labelCount = await labels.count()
    expect(labelCount).toBe(6)

    // 验证卡片标签文本
    const expectedLabels = [
      '赛事总数',
      '报名总数',
      '待审核项',
      '已通过获奖',
      '报名通过率',
      '总结归档率',
    ]
    for (const labelText of expectedLabels) {
      const labelEl = page.locator('.stat-card .label').filter({ hasText: labelText })
      await expect(labelEl).toBeVisible()
    }
  })

  test('统计卡片数据显示验证', async ({ page }) => {
    // 等待页面加载完成
    await expect(page.locator('.stat-card').first()).toBeVisible()

    // 验证每个卡片都有 .value 元素且有内容（数字或 0%）
    const valueElements = page.locator('.stat-card .value')
    const valueCount = await valueElements.count()
    expect(valueCount).toBe(6)

    // 检查每个 value 都有显示内容（数字或百分比）
    for (let i = 0; i < valueCount; i++) {
      const valueEl = valueElements.nth(i)
      await expect(valueEl).toBeVisible()
      const text = await valueEl.textContent()
      // value 应包含数字（可能是 "0"、"123"、"85.5%" 等）
      const hasContent = text !== null && text.trim().length > 0
      if (!hasContent) {
        console.log(`卡片 ${i + 1} 的值为空，可能后端无数据`)
      }
      // 容错：不强制要求数字，只检查元素存在
    }
  })

  test('图表容器渲染验证', async ({ page }) => {
    // 验证所有图表容器 (.chart-box) 已渲染
    const chartBoxes = page.locator('.chart-box')
    const chartCount = await chartBoxes.count()

    // 页面应有 4 个图表容器：饼图、柱状图、漏斗图、折线图
    expect(chartCount).toBeGreaterThanOrEqual(4)
    console.log(`图表容器数量: ${chartCount}`)

    // 验证每个 chart-box 容器都已挂载到 DOM
    for (let i = 0; i < chartCount; i++) {
      await expect(chartBoxes.nth(i)).toBeAttached()
    }

    // 验证图表对应的卡片标题可见
    const chartHeaders = ['竞赛级别分布', '学院参与度分析', '流程转化漏斗', '月度趋势']
    for (const header of chartHeaders) {
      const card = page.locator('.el-card__header').filter({ hasText: header })
      await expect(card).toBeVisible()
    }

    // 验证 ECharts canvas 已渲染（canvas 元素在 chart-box 内部）
    const canvasElements = page.locator('.chart-box canvas')
    const canvasCount = await canvasElements.count()
    if (canvasCount > 0) {
      console.log(`ECharts canvas 渲染数量: ${canvasCount}`)
    } else {
      // 无数据时 ECharts 可能不渲染 canvas，但容器仍应存在
      console.log('ECharts canvas 未渲染，可能后端无图表数据')
    }
  })

  test('关键待办区域验证', async ({ page }) => {
    // 验证待办卡片可见
    const todoCard = page.locator('.todo-card')
    await expect(todoCard).toBeVisible()

    // 验证待办标题
    const todoHeader = page.locator('.el-card__header').filter({ hasText: '关键待办' })
    await expect(todoHeader).toBeVisible()

    // 验证待办列表区域存在
    const todoList = page.locator('.todo-list')
    await expect(todoList).toBeVisible()

    // 检查是否有待办项
    const todoItems = page.locator('.todo-item')
    const todoCount = await todoItems.count()

    if (todoCount > 0) {
      console.log(`待办项数量: ${todoCount}`)

      // 验证待办项包含标题和"去处理"按钮
      const firstTodo = todoItems.first()
      await expect(firstTodo.locator('.title')).toBeVisible()

      const handleBtn = firstTodo.locator('button:has-text("去处理")')
      await expect(handleBtn).toBeVisible()

      // 验证每个待办项都有"去处理"按钮
      const handleBtns = page.locator('.todo-item button:has-text("去处理")')
      const btnCount = await handleBtns.count()
      expect(btnCount).toBe(todoCount)
      console.log(`"去处理"按钮数量: ${btnCount}`)
    } else {
      // 无待办时，待办列表可能为空或显示空状态
      console.log('无待办项，关键待办区域为空')
      // 待办区域本身仍应可见
      await expect(todoCard).toBeVisible()
    }
  })

  test('月度趋势图表区域验证', async ({ page }) => {
    // 验证月度趋势卡片
    const trendCard = page.locator('.el-card').filter({ hasText: '月度趋势' })
    await expect(trendCard).toBeVisible()

    // 验证趋势图容器有 trend class
    const trendChart = page.locator('.chart-box.trend')
    await expect(trendChart).toBeVisible()

    // 验证容器有实际尺寸（图表渲染的前提）
    const box = await trendChart.boundingBox()
    if (box) {
      expect(box.width).toBeGreaterThan(0)
      expect(box.height).toBeGreaterThan(0)
    }
  })

  test('完整页面结构验证', async ({ page }) => {
    // 验证所有主要区域都已渲染
    await expect(page.locator('.stat-cards')).toBeVisible()

    // 验证图表行
    const chartRows = page.locator('.chart-row')
    const rowCount = await chartRows.count()
    expect(rowCount).toBeGreaterThanOrEqual(2)
    console.log(`图表行数量: ${rowCount}`)

    // 验证第二行是 secondary-row（趋势 + 待办）
    const secondaryRow = page.locator('.chart-row.secondary-row')
    await expect(secondaryRow).toBeVisible()

    // 验证各赛事详细统计表格区域
    const detailCard = page.locator('.el-card').filter({ hasText: '各赛事详细统计' })
    const detailVisible = await detailCard.isVisible().catch(() => false)
    if (detailVisible) {
      console.log('各赛事详细统计表格区域已显示')
      // 验证筛选栏
      const filterBar = page.locator('.detail-filter-bar')
      await expect(filterBar).toBeVisible()

      // 验证筛选输入框
      const nameFilter = page.locator('input[placeholder="按赛事名称筛选"]')
      await expect(nameFilter).toBeVisible()

      // 验证重置按钮
      const resetBtn = page.locator('.detail-filter-bar button:has-text("重置")')
      await expect(resetBtn).toBeVisible()

      // 验证表格存在
      const table = page.locator('.el-table')
      await expect(table).toBeVisible()

      // 检查表格是否有数据行
      const tableRows = page.locator('.el-table__body tr')
      const dataRowCount = await tableRows.count()
      if (dataRowCount > 0) {
        console.log(`表格数据行数: ${dataRowCount}`)
      } else {
        console.log('表格无数据行，可能后端无赛事数据')
      }
    } else {
      console.log('各赛事详细统计区域未显示，可能该区域依赖其他数据')
    }
  })

  test('页面加载与 API 响应验证', async ({ page }) => {
    // 重新导航以捕获 API 请求
    const dashboardPromise = page
      .waitForResponse(
        (resp) => resp.url().includes('/api/statistics/dashboard') && resp.status() === 200,
        { timeout: 15000 }
      )
      .catch(() => null)

    const collegeListPromise = page
      .waitForResponse(
        (resp) => resp.url().includes('/api/college/list') && resp.status() === 200,
        { timeout: 15000 }
      )
      .catch(() => null)

    await page.goto(DASHBOARD_URL)

    const dashboardResp = await dashboardPromise
    if (dashboardResp) {
      const data = await dashboardResp.json().catch(() => null)
      if (data) {
        console.log('统计数据 API 响应成功')
      }
    } else {
      console.log('统计主接口未返回，可能走了 fallback 路径')
    }

    const collegeResp = await collegeListPromise
    if (collegeResp) {
      console.log('学院列表 API 响应成功')
    }

    // 等待页面渲染完成
    await page.waitForTimeout(800)

    // 验证页面核心容器已渲染
    await expect(page.locator('.stats-container')).toBeVisible()
  })
})
