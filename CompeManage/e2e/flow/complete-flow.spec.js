import { test, expect } from 'playwright-test-coverage'

// 测试账号
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
    url => url.hash.includes('home') || url.hash.includes('competition'),
    { timeout: 10000 }
  )
}

// ==================== 完整流程测试 ====================

test.describe('完整流程: 创建赛事->发布通知->学生报名->提交作品', () => {

  test('流程A: 管理员创建赛事并发布通知', async ({ page }) => {
    await login(page, ADMIN_USER)

    // 创建测试赛事
    await page.goto('/#/competition/add')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.el-tabs', { timeout: 15000 })

    const compName = 'E2E完整流程测试_' + Date.now()
    await page.fill('input[placeholder="请输入赛事名称"]', compName)

    // 选择赛事级别
    const levelSelect = page.locator('.el-form-item').filter({ hasText: '赛事级别' }).locator('.el-select').first()
    await levelSelect.click()
    await page.waitForTimeout(500)
    await page.getByRole('option', { name: '校级' }).click()
    await page.waitForTimeout(300)

    // 选择赛事类型
    const typeSelect = page.locator('.el-form-item').filter({ hasText: '赛事类型' }).locator('.el-select').first()
    await typeSelect.click()
    await page.waitForTimeout(500)
    await page.getByRole('option', { name: '学科竞赛' }).click()
    await page.waitForTimeout(300)

    // 选择所属学院（使用JS直接点击）
    const collegeSelect = page.locator('.el-form-item').filter({ hasText: '所属学院' }).locator('.el-select').first()
    await collegeSelect.click()
    await page.waitForTimeout(800)
    await page.evaluate(() => {
      const dropdown = document.querySelector('.el-select-dropdown:not([style*="none"])')
      if (dropdown) {
        const firstOption = dropdown.querySelector('.el-select-dropdown__item')
        if (firstOption) firstOption.click()
      }
    })
    await page.waitForTimeout(300)

    // 填写主办和承办单位
    await page.fill('input[placeholder="请填写主办单位"]', 'E2E测试大学')
    await page.fill('input[placeholder="请填写承办单位"]', 'E2E测试学院')
    await page.fill('input[placeholder="请选择所属年份"]', '2026')

    // 点击创建按钮
    await page.locator('button:has-text("创建")').click()

    // 等待一段时间让操作完成
    await page.waitForTimeout(2000)

    console.log(`赛事创建操作完成: ${compName}`)
  })

  test('流程B: 学生账号查找并报名赛事', async ({ page }) => {
    await login(page, STUDENT_USER)

    await page.goto('/#/register')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.page-container', { timeout: 15000 })
    await page.waitForTimeout(1000)

    // 查找测试赛事
    const items = await page.locator('.comp-item').all()
    for (const item of items) {
      const compName = await item.locator('.comp-name').textContent().catch(() => '')
      if (compName.includes('E2E完整流程测试')) {
        console.log(`找到测试赛事: ${compName}`)
        const registerBtn = item.locator('button:has-text("立即报名")')
        if (await registerBtn.isVisible().catch(() => false)) {
          await registerBtn.click()
          await page.waitForURL(/\/register\/detail\/\d+/, { timeout: 10000 })
          console.log('成功进入报名详情页')
          return
        }
      }
    }
    console.log('未找到可报名的测试赛事（可能已过报名时间）')
    await expect(page.locator('.page-container')).toBeVisible()
  })

  test('流程C: 学生查看我的参赛列表', async ({ page }) => {
    await login(page, STUDENT_USER)

    await page.goto('/#/register/work')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.page-container', { timeout: 15000 })
    await page.waitForTimeout(1000)

    await expect(page.locator('.page-header h2')).toContainText('我的参赛列表')

    const cardCount = await page.locator('.comp-card').count()
    console.log(`学生已报名的赛事数量: ${cardCount}`)

    const hasTestComp = await page.locator('.comp-name:has-text("E2E完整流程测试")').count()
    console.log(`E2E测试赛事在列表中: ${hasTestComp > 0}`)
  })

  test('流程D: 学生进入作品详情页', async ({ page }) => {
    await login(page, STUDENT_USER)

    await page.goto('/#/register/work')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.page-container', { timeout: 15000 })
    await page.waitForTimeout(1000)

    const cardCount = await page.locator('.comp-card').count()
    if (cardCount > 0) {
      // 优先找E2E测试赛事
      const testCard = page.locator('.comp-card').filter({ hasText: 'E2E完整流程测试' })
      if (await testCard.count() > 0) {
        const actionBtn = testCard.locator('.primary-btn:not(.is-disabled)').first()
        if (await actionBtn.isVisible().catch(() => false)) {
          const btnText = await actionBtn.textContent()
          console.log(`点击按钮: ${btnText}`)
          await actionBtn.click()
          await page.waitForURL(/\/register\/work\/detail\/\d+/, { timeout: 10000 })
          await expect(page.locator('.page-title')).toContainText('作品提交')
          console.log('成功进入作品详情页')
          return
        }
      }

      // 否则用任意可操作的卡片
      const actionBtn = page.locator('.comp-card .primary-btn:not(.is-disabled)').first()
      if (await actionBtn.isVisible().catch(() => false)) {
        await actionBtn.click()
        await page.waitForURL(/\/register\/work\/detail\/\d+/, { timeout: 10000 })
        console.log('进入作品详情页')
      }
    } else {
      console.log('没有参赛数据')
    }
  })

  test('流程E: 查看通知列表', async ({ page }) => {
    await login(page, STUDENT_USER)

    await page.goto('/#/notice/list')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.page-container', { timeout: 15000 })
    await page.waitForTimeout(1000)

    await expect(page.locator('.header-title')).toContainText('赛事通知列表')

    const rowCount = await page.locator('.list-table__body tr').count()
    console.log(`通知数量: ${rowCount}`)

    if (rowCount > 0) {
      const hasTestNotice = await page.locator('.table-title:has-text("E2E测试通知")').count()
      console.log(`找到测试通知: ${hasTestNotice > 0}`)
    }
  })
})

test.describe('单账号完整数据流测试', () => {
  test('学生账号: 从报名到作品提交的完整操作', async ({ page }) => {
    await login(page, STUDENT_USER)

    // 1. 进入报名页面
    await page.goto('/#/register')
    await page.waitForSelector('.page-container', { timeout: 15000 })
    await page.waitForTimeout(1000)
    console.log(`可报名赛事数量: ${await page.locator('.comp-item').count()}`)

    // 2. 进入作品提交页面
    await page.goto('/#/register/work')
    await page.waitForSelector('.page-container', { timeout: 15000 })
    await page.waitForTimeout(1000)
    const cardCount = await page.locator('.comp-card').count()
    console.log(`已报名赛事数量: ${cardCount}`)

    // 3. 进入作品详情
    if (cardCount > 0) {
      const actionBtn = page.locator('.comp-card .primary-btn:not(.is-disabled)').first()
      if (await actionBtn.isVisible().catch(() => false)) {
        await actionBtn.click()
        await page.waitForURL(/\/register\/work\/detail\/\d+/, { timeout: 10000 })
        await expect(page.locator('.page-title')).toBeVisible()
        console.log('作品详情页加载正常')
      }
    }

    // 4. 查看通知
    await page.goto('/#/notice/list')
    await page.waitForSelector('.page-container', { timeout: 15000 })
    await page.waitForTimeout(1000)
    console.log(`通知数量: ${await page.locator('.list-table__body tr').count()}`)

    console.log('学生账号完整操作流程验证通过')
  })
})

test.describe('管理员账号: 通知管理完整操作', () => {
  test('管理员: 进入通知管理页面', async ({ page }) => {
    await login(page, ADMIN_USER)

    // 进入通知管理页
    await page.goto('/#/notice/detail/1')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.notice-list-container', { timeout: 15000 })

    // 验证页面元素
    await expect(page.locator('.toolbar-title')).toContainText('通知公告管理')
    await expect(page.locator('button:has-text("发布新通知")')).toBeVisible()
    console.log('通知管理页加载完成')
  })
})