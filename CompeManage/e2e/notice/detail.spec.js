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

// 辅助函数：选择 Element Plus 下拉选项
async function selectElOption(page, formFieldLabel, optionText) {
  const formItem = page.locator('.el-form-item').filter({ hasText: formFieldLabel })
  const select = formItem.locator('.el-select')
  await select.click()
  const targetOption = page.getByRole('option', { name: optionText })
  await targetOption.waitFor({ state: 'visible', timeout: 5000 })
  await targetOption.click()
  await page.waitForTimeout(300)
}

// 辅助函数：选择赛事负责人
async function selectManager(page) {
  const managerRespPromise = page.waitForResponse(
    resp => resp.url().includes('/api/comp/manager/list') && resp.status() === 200,
    { timeout: 10000 }
  )
  await page.locator('.manager-input input').click()
  await expect(page.locator('.el-dialog:has-text("选择赛事负责人")')).toBeVisible({ timeout: 10000 })
  await managerRespPromise
  await page.waitForTimeout(800)
  await page.locator('.el-dialog .el-table__body tr').first().locator('button:has-text("选择")').click()
  await page.waitForTimeout(500)
}

// 辅助函数：创建赛事并进入通知管理页
async function createCompetitionAndGoToNoticeDetail(page) {
  const compName = `E2E通知管理测试_${Date.now()}`

  // 创建赛事
  await page.goto('/#/competition/list')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  await page.locator('button:has-text("新增赛事")').click()
  await page.waitForURL(/\/competition\/add/)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.el-tabs', { timeout: 15000 })

  await page.fill('input[placeholder="请输入赛事名称"]', compName)
  await selectElOption(page, '赛事级别', '校级')
  await page.fill('input[placeholder="请填写主办单位"]', '测试主办方')

  const collegeSelect = page.locator('.el-form-item').filter({ hasText: '所属学院' }).locator('.el-select')
  await collegeSelect.click()
  await page.getByRole('option').first().waitFor({ state: 'visible', timeout: 5000 })
  await page.getByRole('option').first().click()
  await page.waitForTimeout(300)

  await selectManager(page)
  await page.getByRole('textbox', { name: '所属年份' }).fill('2026')

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
  await page.goto(`/#/notice/detail/${compId}`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.notice-list-container', { timeout: 15000 })

  return { compId, compName }
}

// 辅助函数：在通知管理页创建并发布一条通知
async function createAndPublishNotice(page, noticeTitle) {
  const title = noticeTitle || `测试通知_${Date.now()}`

  await page.locator('button:has-text("发布新通知")').click()
  await page.waitForURL(/\/notice\/edit\/0/, { timeout: 10000 })
  await page.waitForLoadState('networkidle')

  await page.fill('input[placeholder="在此输入通知标题"]', title)
  await page.fill('textarea[placeholder="在此撰写通知正文..."]', 'E2E 测试正文内容')

  const createNoticePromise = page.waitForResponse(
    resp => resp.url().includes('/api/notice/comp/create') && resp.request().method() === 'POST',
    { timeout: 15000 }
  )
  const publishNoticePromise = page.waitForResponse(
    resp => resp.url().includes('/api/notice/') && resp.url().includes('/publish'),
    { timeout: 15000 }
  )

  await page.locator('button:has-text("确认发布")').click()
  await createNoticePromise
  await publishNoticePromise

  await page.waitForURL(new RegExp(`#/notice/detail/\\d+`), { timeout: 10000 })
  await page.goto(page.url())
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  return title
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
    // 创建赛事并进入通知管理页（确保有数据）
    await createCompetitionAndGoToNoticeDetail(page)
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

    // 确保有数据
    await createAndPublishNotice(page, '表格列验证通知')

    // 检查表格是否有数据
    const hasEmpty = await page.locator('.el-empty').isVisible().catch(() => false)
    const rowCount = await page.locator('.el-table__body tr').count()

    console.log(`行数: ${rowCount}, 空状态: ${hasEmpty}`)
    expect(rowCount).toBeGreaterThan(0)

    // 验证表头
    const headerCells = page.locator('.el-table__header th')
    const headerCount = await headerCells.count()
    expect(headerCount).toBeGreaterThan(0)
    console.log(`表头列数: ${headerCount}`)
  })
})

test.describe('赛事通知管理页 - 操作按钮', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // 创建赛事并进入通知管理页
    await createCompetitionAndGoToNoticeDetail(page)
  })

  test('发布新通知按钮可点击', async ({ page }) => {
    const createBtn = page.locator('button:has-text("发布新通知")')
    await expect(createBtn).toBeVisible()

    // 点击后应跳转到编辑页
    await createBtn.click()
    await page.waitForURL(/\/notice\/edit\/\d+/, { timeout: 10000 })
    console.log('成功进入通知编辑页')
  })

  test('创建通知后表格数据验证', async ({ page }) => {
    // 创建一条通知
    await createAndPublishNotice(page, '操作按钮测试通知')

    // 验证表格有数据
    const hasEmpty = await page.locator('.el-empty').isVisible().catch(() => false)
    const rowCount = await page.locator('.el-table__body tr').count()

    console.log(`行数: ${rowCount}, 空状态: ${hasEmpty}`)
    expect(rowCount).toBeGreaterThan(0)
  })

  test('点击通知标题进入编辑', async ({ page }) => {
    // 先创建通知
    const noticeTitle = await createAndPublishNotice(page, '点击标题测试')

    // 点击通知标题
    const noticeRow = page.locator('.el-table__body tr').filter({ hasText: noticeTitle })
    await noticeRow.locator('.table-title').click()

    await page.waitForURL(/\/notice\/edit\/\d+/, { timeout: 10000 })
    console.log('点击标题进入编辑页')
  })
})

test.describe('赛事通知管理页 - 编辑功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // 创建赛事并进入通知管理页
    await createCompetitionAndGoToNoticeDetail(page)
  })

  test('编辑按钮可点击并跳转', async ({ page }) => {
    // 先创建通知
    const noticeTitle = await createAndPublishNotice(page, '编辑按钮测试')

    // 点击编辑按钮
    const noticeRow = page.locator('.el-table__body tr').filter({ hasText: noticeTitle })
    const editBtn = noticeRow.locator('button:has-text("编辑")')
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    await page.waitForURL(/\/notice\/edit\/\d+/, { timeout: 10000 })
    console.log('成功进入编辑页')
  })
})

test.describe('赛事通知管理页 - 发布/撤回功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // 创建赛事并进入通知管理页
    await createCompetitionAndGoToNoticeDetail(page)
  })

  test('发布按钮可点击', async ({ page }) => {
    // 先创建通知
    const noticeTitle = await createAndPublishNotice(page, '发布按钮测试')

    // 验证发布/撤回按钮可见
    const noticeRow = page.locator('.el-table__body tr').filter({ hasText: noticeTitle })
    const publishBtn = noticeRow.locator('button:has-text("发布")')
    const withdrawBtn = noticeRow.locator('button:has-text("撤回")')

    const hasPublish = await publishBtn.isVisible().catch(() => false)
    const hasWithdraw = await withdrawBtn.isVisible().catch(() => false)

    console.log(`发布按钮: ${hasPublish}, 撤回按钮: ${hasWithdraw}`)
    expect(hasPublish || hasWithdraw).toBeTruthy()
  })
})

test.describe('赛事通知管理页 - 删除功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // 创建赛事并进入通知管理页
    await createCompetitionAndGoToNoticeDetail(page)
  })

  test('删除按钮可点击并弹出确认', async ({ page }) => {
    // 先创建通知
    const noticeTitle = await createAndPublishNotice(page, '删除按钮测试')

    // 点击删除按钮
    const noticeRow = page.locator('.el-table__body tr').filter({ hasText: noticeTitle })
    const deleteBtn = noticeRow.locator('button:has-text("删除")')
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // 等待确认对话框出现
    await page.waitForSelector('.el-message-box', { timeout: 5000 })
    await expect(page.locator('.el-message-box__title')).toContainText('删除确认')
    console.log('删除确认对话框已显示')

    // 点击取消 - 使用button text匹配
    const cancelBtn = page.getByRole('button', { name: '取消' }).or(page.getByRole('button', { name: '取 消' }))
    await cancelBtn.click({ timeout: 5000 }).catch(async () => {
      // fallback: 找取消按钮
      const btns = await page.locator('.el-message-box__btns button').all()
      for (const btn of btns) {
        const text = await btn.textContent()
        if (text.includes('取消')) {
          await btn.click()
          break
        }
      }
    })
    await page.waitForTimeout(300)
    console.log('删除确认对话框正常')
  })
})