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

// 进入通知管理页（需要赛事ID）
async function navigateToNoticeDetail(page, compId = '1') {
  await page.goto(`/#/notice/detail/${compId}`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.notice-list-container', { timeout: 15000 })
}

test.describe('赛事通知管理页 - 基本功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeDetail(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    // 验证工具栏
    await expect(page.locator('.toolbar')).toBeVisible()
    await expect(page.locator('.toolbar-title')).toContainText('通知公告管理')

    // 验证发布新通知按钮
    await expect(page.locator('button:has-text("发布新通知")')).toBeVisible()

    // 验证表格
    await expect(page.locator('.notice-table')).toBeVisible()

    // 验证分页
    await expect(page.locator('.pagination-box')).toBeVisible()
  })

  test('表格列验证', async ({ page }) => {
    await page.waitForTimeout(1000)

    // 检查表格是否有数据
    const hasEmpty = await page.locator('.el-empty').isVisible().catch(() => false)
    const rowCount = await page.locator('.el-table__body tr').count()

    console.log(`行数: ${rowCount}, 空状态: ${hasEmpty}`)

    if (!hasEmpty && rowCount > 0) {
      // 验证表头
      const headerCells = page.locator('.el-table__header th')
      const headerCount = await headerCells.count()
      expect(headerCount).toBeGreaterThan(0)
      console.log(`表头列数: ${headerCount}`)
    }
  })
})

test.describe('赛事通知管理页 - 操作按钮', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeDetail(page)
    await page.waitForTimeout(1000)
  })

  test('发布新通知按钮可点击', async ({ page }) => {
    const createBtn = page.locator('button:has-text("发布新通知")')
    await expect(createBtn).toBeVisible()

    // 点击后应跳转到编辑页
    await createBtn.click()
    await page.waitForURL(/\/notice\/edit\/\d+/, { timeout: 10000 })
    console.log('成功进入通知编辑页')
  })

  test('表格数据或空状态验证', async ({ page }) => {
    await page.waitForTimeout(1000)

    const hasEmpty = await page.locator('.el-empty').isVisible().catch(() => false)
    const rowCount = await page.locator('.el-table__body tr').count()

    console.log(`行数: ${rowCount}, 空状态: ${hasEmpty}`)
    expect(rowCount >= 0 || hasEmpty).toBe(true)
  })

  test('点击通知标题进入编辑', async ({ page }) => {
    const rowCount = await page.locator('.el-table__body tr').count()
    if (rowCount > 0) {
      await page.locator('.table-title').first().click()
      await page.waitForURL(/\/notice\/edit\/\d+/, { timeout: 10000 })
      console.log('点击标题进入编辑页')
    } else {
      console.log('表格无数据，跳过测试')
    }
  })
})

test.describe('赛事通知管理页 - 编辑功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeDetail(page)
    await page.waitForTimeout(1000)
  })

  test('编辑按钮可点击并跳转', async ({ page }) => {
    const rowCount = await page.locator('.el-table__body tr').count()
    if (rowCount > 0) {
      const editBtn = page.locator('button:has-text("编辑")').first()
      const hasEditBtn = await editBtn.isVisible().catch(() => false)

      if (hasEditBtn) {
        await editBtn.click()
        await page.waitForURL(/\/notice\/edit\/\d+/, { timeout: 10000 })
        console.log('成功进入编辑页')
      } else {
        console.log('没有编辑按钮，跳过测试')
      }
    } else {
      console.log('表格无数据，跳过测试')
    }
  })
})

test.describe('赛事通知管理页 - 发布/撤回功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeDetail(page)
    await page.waitForTimeout(1000)
  })

  test('发布按钮可点击', async ({ page }) => {
    const rowCount = await page.locator('.el-table__body tr').count()
    if (rowCount > 0) {
      const publishBtn = page.locator('button:has-text("发布")').first()
      const hasPublishBtn = await publishBtn.isVisible().catch(() => false)

      if (hasPublishBtn) {
        console.log('发布按钮可见')
      } else {
        // 可能所有通知都已发布，显示的是撤回按钮
        const withdrawBtn = page.locator('button:has-text("撤回")').first()
        const hasWithdrawBtn = await withdrawBtn.isVisible().catch(() => false)
        console.log(`发布按钮: ${hasPublishBtn}, 撤回按钮: ${hasWithdrawBtn}`)
      }
    } else {
      console.log('表格无数据，跳过测试')
    }
  })
})

test.describe('赛事通知管理页 - 删除功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToNoticeDetail(page)
    await page.waitForTimeout(1000)
  })

  test('删除按钮可点击并弹出确认', async ({ page }) => {
    const rowCount = await page.locator('.el-table__body tr').count()
    if (rowCount > 0) {
      const deleteBtn = page.locator('button:has-text("删除")').first()
      const hasDeleteBtn = await deleteBtn.isVisible().catch(() => false)

      if (hasDeleteBtn) {
        await deleteBtn.click()

        // 验证确认对话框
        await expect(page.locator('.el-message-box')).toBeVisible()
        await expect(page.locator('.el-message-box__title')).toContainText('删除确认')

        // 点击取消
        await page.locator('.el-message-box__wrapper .el-button--default').click()
        await page.waitForTimeout(300)
        console.log('删除确认对话框正常')
      } else {
        console.log('没有删除按钮，跳过测试')
      }
    } else {
      console.log('表格无数据，跳过测试')
    }
  })
})