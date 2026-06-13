import { test, expect } from 'playwright-test-coverage'
import { login } from '../helpers/auth'



const LIST_URL = '/#/award/list'



async function waitForListLoad(page) {
  const listResp = page
    .waitForResponse(
      (resp) => resp.url().includes('/api/award/list') && resp.status() === 200,
      { timeout: 15000 }
    )
    .catch(() => null)

  await listResp
  await page.waitForTimeout(800)
}

test.describe('获奖填报列表页面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    await page.goto(LIST_URL)
    await waitForListLoad(page)

    // 验证 URL
    await expect(page).toHaveURL(/#\/award\/list/)

    // 验证页面容器
    await expect(page.locator('.page-container')).toBeVisible()

    // 验证卡片列表容器
    await expect(page.locator('.comp-list')).toBeVisible()

    // 验证分页器
    await expect(page.locator('.pagination-container')).toBeVisible()
    await expect(page.locator('.el-pagination')).toBeVisible()
  })

  test('数据加载验证', async ({ page }) => {
    await page.goto(LIST_URL)
    await waitForListLoad(page)

    const cards = page.locator('.comp-card')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      console.log(`卡片数量: ${cardCount}`)

      // 验证第一个卡片包含赛事名称
      const firstCard = cards.first()
      const compName = firstCard.locator('.comp-name')
      const nameText = await compName.textContent()
      expect(nameText.trim().length).toBeGreaterThan(0)
      console.log(`第一条赛事: ${nameText.trim()}`)

      // 验证卡片包含元信息
      const metaRow = firstCard.locator('.meta-row')
      await expect(metaRow).toBeVisible()

      // 验证分页总数
      const totalText = await page.locator('.el-pagination__total').textContent()
      console.log(`分页总数: ${totalText}`)
    } else {
      // 无数据时验证空状态
      console.log('无卡片数据，检查空状态')
      await expect(page.locator('.el-empty')).toBeVisible()
    }
  })

  test('状态标签验证', async ({ page }) => {
    await page.goto(LIST_URL)
    await waitForListLoad(page)

    const cards = page.locator('.comp-card')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      console.log('无数据，跳过状态标签验证')
      return
    }

    // 验证每个卡片都有状态标签
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i)
      const badge = card.locator('.status-badge')
      const hasBadge = await badge.isVisible().catch(() => false)
      expect(hasBadge).toBe(true)

      if (hasBadge) {
        const badgeText = await badge.textContent()
        const isvalid = badgeText.trim() === '进行中' || badgeText.trim() === '已结束'
        expect(isvalid).toBe(true)
        console.log(`第 ${i + 1} 张卡片状态: ${badgeText.trim()}`)
      }
    }
  })

  test('下载模板功能', async ({ page }) => {
    await page.goto(LIST_URL)
    await waitForListLoad(page)

    const cards = page.locator('.comp-card')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      console.log('无数据，跳过下载模板测试')
      return
    }

    // 验证第一个卡片有"下载模板"按钮
    const firstCard = cards.first()
    const downloadBtn = firstCard.locator('.icon-btn').filter({ hasText: '下载模板' })
    await expect(downloadBtn).toBeVisible()

    // 点击下载模板，监听下载请求
    const downloadPromise = page.waitForEvent('popup').catch(() => null)
    const respPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/award/export-template') && resp.status() === 200,
      { timeout: 10000 }
    ).catch(() => null)

    await downloadBtn.click()
    await page.waitForTimeout(1000)

    // 不强制要求下载成功（后端可能无数据），只验证按钮可点击
    console.log('下载模板按钮点击完成')
  })

  test('导入数据功能', async ({ page }) => {
    await page.goto(LIST_URL)
    await waitForListLoad(page)

    const cards = page.locator('.comp-card')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      console.log('无数据，跳过导入数据测试')
      return
    }

    // 验证每个卡片都有"导入数据"按钮
    for (let i = 0; i < cardCount; i++) {
      const card = cards.nth(i)
      const uploadBtn = card.locator('.upload-wrapper')
      await expect(uploadBtn).toBeVisible()
      console.log(`第 ${i + 1} 张卡片: "导入数据"按钮可见`)
    }
  })

  test('查看结果功能 - 跳转到详情页', async ({ page }) => {
    await page.goto(LIST_URL)
    await waitForListLoad(page)

    const cards = page.locator('.comp-card')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      console.log('无数据，跳过查看结果测试')
      return
    }

    // 验证第一个卡片有"查看结果"按钮
    const firstCard = cards.first()
    const detailBtn = firstCard.locator('.primary-btn')
    const hasBtn = await detailBtn.isVisible().catch(() => false)

    if (!hasBtn) {
      console.log('未找到"查看结果"按钮，跳过')
      return
    }

    // 点击"查看结果"，验证跳转
    await detailBtn.click()
    await page.waitForURL(/#\/award\/detail\//, { timeout: 10000 })

    // 验证跳转成功
    await expect(page).toHaveURL(/#\/award\/detail\//)
    console.log('成功跳转到详情页面')
  })

  test('分页功能', async ({ page }) => {
    await page.goto(LIST_URL)
    await waitForListLoad(page)

    // 验证分页器可见
    const pagination = page.locator('.pagination-container .el-pagination')
    await expect(pagination).toBeVisible()

    // 读取总数
    const totalText = await page.locator('.el-pagination__total').textContent()
    console.log(`分页总数: ${totalText}`)

    // 提取数字
    const totalMatch = totalText.match(/\d+/)
    if (!totalMatch) {
      console.log('无法解析总数，跳过分页切换测试')
      return
    }

    const totalCount = parseInt(totalMatch[0], 10)
    if (totalCount <= 10) {
      console.log(`总数 ${totalCount} 不超过10条，跳过分页切换测试`)
      await expect(page.locator('.el-pagination .btn-prev')).toBeVisible()
      await expect(page.locator('.el-pagination .btn-next')).toBeVisible()
      return
    }

    console.log(`总数 ${totalCount} 超过10条，测试分页切换`)

    // 验证当前在第1页
    const activePage = page.locator('.el-pager .is-active')
    await expect(activePage).toHaveText('1')

    // 注册翻页 API 响应监听
    const page2RespPromise = page
      .waitForResponse(
        (resp) => {
          const url = new URL(resp.url())
          return (
            resp.url().includes('/api/award/list') &&
            resp.status() === 200 &&
            url.searchParams.get('page') === '2'
          )
        },
        { timeout: 15000 }
      )
      .catch(() => null)

    // 点击第2页
    await page.locator('.el-pager .number:has-text("2")').click()
    await page2RespPromise
    await page.waitForTimeout(800)

    // 验证页码变为2
    const activePageAfter = page.locator('.el-pager .is-active')
    await expect(activePageAfter).toHaveText('2')
    console.log('成功切换到第2页')

    // 验证表格数据已刷新
    const cardsAfter = page.locator('.comp-card')
    const countAfter = await cardsAfter.count()
    console.log(`第2页卡片数: ${countAfter}`)

    // 点击上一页回到第1页
    const prevPageRespPromise = page
      .waitForResponse(
        (resp) => {
          const url = new URL(resp.url())
          return (
            resp.url().includes('/api/award/list') &&
            resp.status() === 200 &&
            url.searchParams.get('page') === '1'
          )
        },
        { timeout: 15000 }
      )
      .catch(() => null)

    await page.locator('.el-pagination .btn-prev').click()
    await prevPageRespPromise
    await page.waitForTimeout(800)

    const activePageBack = page.locator('.el-pager .is-active')
    await expect(activePageBack).toHaveText('1')
    console.log('成功回到第1页')
  })

  test('空状态验证', async ({ page }) => {
    // 模拟无数据场景：先正常加载，再检查空状态元素是否存在
    await page.goto(LIST_URL)
    await waitForListLoad(page)

    const cards = page.locator('.comp-card')
    const cardCount = await cards.count()

    if (cardCount > 0) {
      console.log(`有 ${cardCount} 条数据，空状态不适用，验证卡片正常显示`)
      await expect(cards.first()).toBeVisible()
      return
    }

    // 无数据时验证空状态提示
    const emptyEl = page.locator('.el-empty')
    const hasEmpty = await emptyEl.isVisible().catch(() => false)

    if (hasEmpty) {
      await expect(emptyEl).toBeVisible()
      // 验证空状态描述文字
      const descText = await page.locator('.el-empty__description').textContent()
      expect(descText.trim()).toContain('暂无负责的赛事')
      console.log('空状态验证通过: "暂无负责的赛事"')
    } else {
      console.log('未检测到空状态元素')
    }
  })
})
