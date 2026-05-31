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

async function navigateToNoticeDetail(page, compId) {
  await page.goto(`/#/notice/detail/${compId}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
}

test.describe('通知详情页面 - 基本功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('进入通知管理页验证页面结构', async ({ page }) => {
    // 创建赛事后进入通知管理页
    await page.goto('/#/competition/list')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    await page.locator('button:has-text("新增赛事")').click()
    await page.waitForURL(/\/competition\/add/)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.el-tabs', { timeout: 15000 })

    const compName = `通知详情测试_${Date.now()}`
    await page.fill('input[placeholder="请输入赛事名称"]', compName)

    // 选择赛事级别
    const levelSelect = page.locator('.el-form-item').filter({ hasText: '赛事级别' }).locator('.el-select')
    await levelSelect.click()
    await page.waitForTimeout(300)
    await page.getByRole('option').first().click()
    await page.waitForTimeout(300)

    // 填写主办单位
    await page.fill('input[placeholder="请填写主办单位"]', '测试主办方')

    // 选择学院
    const collegeSelect = page.locator('.el-form-item').filter({ hasText: '所属学院' }).locator('.el-select')
    await collegeSelect.click()
    await page.waitForTimeout(300)
    await page.getByRole('option').first().click()
    await page.waitForTimeout(300)

    // 选择赛事负责人
    const managerRespPromise = page.waitForResponse(
      resp => resp.url().includes('/api/comp/manager/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.locator('.manager-input input').click()
    await page.waitForSelector('.el-dialog:visible', { timeout: 10000 })
    await managerRespPromise
    await page.waitForTimeout(800)
    await page.locator('.el-dialog .el-table__body tr').first().locator('button:has-text("选择")').click()
    await page.waitForTimeout(500)

    // 填写年份
    await page.getByRole('textbox', { name: '所属年份' }).fill('2026')

    // 创建赛事
    const createRespPromise = page.waitForResponse(
      resp => resp.url().includes('/api/comp/create') && resp.request().method() === 'POST',
      { timeout: 15000 }
    )
    await page.locator('button:has-text("创建")').first().click()
    const createResp = await createRespPromise
    const createData = await createResp.json()
    const compId = createData.data?.data?.id || createData.data?.id

    await page.waitForURL(/\/competition\/list/, { timeout: 10000 })
    await page.waitForTimeout(500)

    // 进入通知管理页
    await navigateToNoticeDetail(page, compId)

    // 验证页面标题
    await expect(page.locator('.toolbar-title')).toContainText('通知公告管理')

    // 验证发布新通知按钮
    await expect(page.locator('button:has-text("发布新通知")')).toBeVisible()

    // 验证表格
    await expect(page.locator('.el-table')).toBeVisible()

    console.log('通知详情页验证完成')
  })
})

test.describe('通知详情页面 - 页面结构验证', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('验证通知公告管理页面元素', async ({ page }) => {
    // 进入通知管理页
    await page.goto('/#/notice/detail/1')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 验证页面标题
    await expect(page.locator('.toolbar-title')).toContainText('通知公告管理')

    // 验证发布新通知按钮
    await expect(page.locator('button:has-text("发布新通知")')).toBeVisible()

    // 验证表格存在
    await expect(page.locator('.el-table')).toBeVisible()
  })
})

test.describe('通知详情页面 - 返回功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('通知管理页返回按钮', async ({ page }) => {
    // 进入通知管理页
    await page.goto('/#/notice/detail/1')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 点击发布新通知进入编辑页
    await page.locator('button:has-text("发布新通知")').click()
    await page.waitForURL(/\/notice\/edit\/0/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // 验证编辑页标题
    await expect(page.locator('.main-title')).toContainText('发布赛事通知')

    // 点击返回
    await page.locator('.back-area').click()
    await page.waitForTimeout(1000)

    console.log('返回功能验证完成')
  })
})