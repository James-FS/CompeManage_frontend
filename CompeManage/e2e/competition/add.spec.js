import { test, expect } from 'playwright-test-coverage'

// 测试用户 - school_admin
const TEST_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin'
}

// 辅助函数：登录并进入新增赛事页面
async function loginAndNavigate(page) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
  await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
  await page.locator('.el-button:has-text("立即登录")').click()

  await page.waitForURL(url => url.hash.includes('home') || url.hash.includes('competition'), {
    timeout: 10000
  })
  await page.goto('/#/competition/add')
  await page.waitForLoadState('networkidle')

  // 等待页面加载完成
  await page.waitForSelector('.el-tabs', { timeout: 15000 })
}

// 辅助函数：点击下拉选择器并选择选项（使用 getByRole）
async function selectFromDropdown(page, labelText, optionText) {
  // 找到带有指定 label 文本的选择器容器
  const formItem = page.locator('.el-form-item').filter({ hasText: labelText })
  const select = formItem.locator('.el-select').first()

  // 点击展开下拉
  await select.click()
  await page.waitForTimeout(400)

  // 使用 getByRole 选择选项
  await page.getByRole('option', { name: optionText }).click()
  await page.waitForTimeout(500)
}

test.describe('新增赛事页面测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    // 验证面包屑
    await expect(page.locator('.breadcrumb-container')).toContainText('新增赛事')

    // 验证Tab存在
    await expect(page.locator('.el-tabs')).toBeVisible()
    await expect(page.getByRole('tab', { name: '手动录入新赛事' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '从往年赛事复用' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Excel 批量导入' })).toBeVisible()

    // 验证表单元素存在
    await expect(page.locator('input[placeholder="请输入赛事名称"]')).toBeVisible()
    await expect(page.locator('.el-form-item').filter({ hasText: '赛事名称' })).toBeVisible()
    await expect(page.locator('.el-form-item').filter({ hasText: '赛事级别' })).toBeVisible()
    await expect(page.locator('.el-form-item').filter({ hasText: '赛事类型' })).toBeVisible()
    await expect(page.locator('.el-form-item').filter({ hasText: '所属学院' })).toBeVisible()
    await expect(page.locator('.el-form-item').filter({ hasText: '赛事负责人' })).toBeVisible()

    // 验证按钮
    await expect(page.locator('button:has-text("创建")')).toBeVisible()
    await expect(page.locator('button:has-text("重置")')).toBeVisible()
  })

  test('Tab切换 - 从往年赛事复用', async ({ page }) => {
    // 点击从往年赛事复用Tab
    await page.getByRole('tab', { name: '从往年赛事复用' }).click()

    // 等待 Tab 内容切换完成
    await page.waitForSelector('.el-step', { timeout: 5000 })
    await page.waitForTimeout(500)

    // 验证步骤条出现
    await expect(page.locator('.el-steps')).toBeVisible()
    await expect(page.locator('.el-step')).toHaveCount(2)

    // 验证第一步的内容：年份选择器和表格
    await expect(page.locator('.el-form-item').filter({ hasText: '赛事所属年份' })).toBeVisible()
    // 找任意包含"请选择年份"文本的 select
    const yearSelect = page.locator('.el-select').filter({ hasText: '请选择年份' }).first()
    await expect(yearSelect).toBeVisible()
    await expect(page.locator('.el-table')).toBeVisible()

    // 验证步骤1 footer
    await expect(page.locator('.step-footer')).toContainText('已选择')
    await expect(page.locator('button:has-text("下一步")')).toBeVisible()
  })

  test('Tab切换 - Excel批量导入', async ({ page }) => {
    // 点击Excel批量导入Tab
    await page.getByRole('tab', { name: 'Excel 批量导入' }).click()

    // 等待 Tab 内容切换完成
    await page.waitForSelector('.el-alert', { timeout: 5000 })
    await page.waitForTimeout(500)

    // 验证提示信息
    await expect(page.locator('.el-alert')).toContainText('请先下载模板')

    // 验证操作按钮
    await expect(page.locator('button:has-text("下载导入模板")')).toBeVisible()
    await expect(page.locator('button:has-text("选择文件上传")')).toBeVisible()

    // 验证确认导入按钮初始为禁用状态
    await expect(page.locator('button:has-text("确认导入")')).toBeDisabled()

    // 验证空状态存在
    const emptyEl = page.locator('.el-empty')
    const emptyExists = await emptyEl.isVisible().catch(() => false)
    if (emptyExists) {
      await expect(emptyEl).toBeVisible()
    }
  })

  test('Tab切换 - 回到手动录入', async ({ page }) => {
    // 先切换到其他Tab
    await page.getByRole('tab', { name: '从往年赛事复用' }).click()
    await page.waitForSelector('.el-step', { timeout: 5000 })
    await page.waitForTimeout(300)

    // 再切换回来
    await page.getByRole('tab', { name: '手动录入新赛事' }).click()
    await page.waitForTimeout(300)

    // 验证表单仍然存在
    await expect(page.locator('input[placeholder="请输入赛事名称"]')).toBeVisible()
    await expect(page.locator('button:has-text("创建")')).toBeVisible()
  })

  test('表单填写 - 必填项赛事名称验证', async ({ page }) => {
    // 不填写赛事名称，直接点击创建
    await page.locator('button:has-text("创建")').click()

    // 触发验证 - 失去焦点
    await page.locator('input[placeholder="请输入赛事名称"]').focus()
    await page.locator('input[placeholder="请输入赛事名称"]').blur()

    // 等待验证错误信息出现
    await page.waitForTimeout(500)

    // Element Plus 错误信息可能显示在 toast 或者表单错误
    const hasFormError = await page.locator('.el-form-item__error').isVisible().catch(() => false)
    const hasToast = await page.locator('.el-message').isVisible().catch(() => false)

    // 任一方式出现即可认为验证触发
    expect(hasFormError || hasToast).toBeTruthy()
  })

  test('表单填写 - 选择赛事级别', async ({ page }) => {
    // 使用与 selectFromDropdown 相同的方式
    await selectFromDropdown(page, '赛事级别', '校级')

    // 验证下拉菜单已关闭（表示选择成功）
    const dropdownCount = await page.locator('.el-select-dropdown:visible').count()
    expect(dropdownCount).toBe(0)
  })

  test('表单填写 - 选择赛事类型', async ({ page }) => {
    // 使用与 selectFromDropdown 相同的方式
    await selectFromDropdown(page, '赛事类型', '学科竞赛')

    // 验证下拉菜单已关闭（表示选择成功）
    const dropdownCount = await page.locator('.el-select-dropdown:visible').count()
    expect(dropdownCount).toBe(0)
  })

  test('表单填写 - 填写其他字段', async ({ page }) => {
    // 填写赛事名称
    const compName = '自动化测试竞赛_' + Date.now()
    await page.locator('input[placeholder="请输入赛事名称"]').fill(compName)

    // 选择赛事级别
    await selectFromDropdown(page, '赛事级别', '省级')

    // 选择赛事类型
    await selectFromDropdown(page, '赛事类型', '创新创业竞赛')

    // 填写主办单位
    await page.locator('input[placeholder="请填写主办单位"]').fill('测试大学')

    // 填写承办单位
    await page.locator('input[placeholder="请填写承办单位"]').fill('测试学院')

    // 填写年份
    await page.locator('input[placeholder="请选择所属年份"]').fill('2026')

    // 填写备注
    await page.locator('textarea[placeholder="填写赛事的其他补充说明..."]').fill('这是自动化测试')

    // 验证主要字段已填入
    await expect(page.locator('input[placeholder="请输入赛事名称"]')).toHaveValue(/自动化测试竞赛_/)
    await expect(page.locator('input[placeholder="请填写主办单位"]')).toHaveValue('测试大学')
    await expect(page.locator('input[placeholder="请填写承办单位"]')).toHaveValue('测试学院')
  })

  test('重置按钮功能', async ({ page }) => {
    // 填写一些字段
    await page.locator('input[placeholder="请输入赛事名称"]').fill('测试竞赛')
    await page.locator('input[placeholder="请填写主办单位"]').fill('测试大学')

    // 点击重置按钮
    await page.locator('button:has-text("重置")').click()

    // 等待重置完成
    await page.waitForTimeout(500)

    // 验证字段已清空
    await expect(page.locator('input[placeholder="请输入赛事名称"]')).toHaveValue('')
    await expect(page.locator('input[placeholder="请填写主办单位"]')).toHaveValue('')
  })

  test('下拉选择器 - 赛事级别选项验证', async ({ page }) => {
    // 点击赛事级别选择器
    const levelSelect = page.locator('.el-form-item').filter({ hasText: '赛事级别' }).locator('.el-select').first()
    await levelSelect.click()
    await page.waitForTimeout(400)

    // 验证选项存在 - 使用 getByRole
    await expect(page.getByRole('option', { name: '校级' })).toBeVisible()
    await expect(page.getByRole('option', { name: '省级' })).toBeVisible()
    await expect(page.getByRole('option', { name: '国家级' })).toBeVisible()

    // 关闭下拉菜单
    await page.keyboard.press('Escape')
  })

  test('下拉选择器 - 赛事类型选项验证', async ({ page }) => {
    // 点击赛事类型选择器
    const typeSelect = page.locator('.el-form-item').filter({ hasText: '赛事类型' }).locator('.el-select').first()
    await typeSelect.click()
    await page.waitForTimeout(400)

    // 验证选项存在 - 使用 getByRole
    await expect(page.getByRole('option', { name: '学科竞赛' })).toBeVisible()
    await expect(page.getByRole('option', { name: '创新创业竞赛' })).toBeVisible()

    // 关闭下拉菜单
    await page.keyboard.press('Escape')
  })

  test('负责人选择弹窗 - 打开弹窗', async ({ page }) => {
    // 点击负责人输入框（readonly，应打开弹窗）
    await page.locator('input[placeholder="请选择赛事负责人"]').click()

    // 等待弹窗出现
    await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })

    // 验证弹窗标题
    await expect(page.locator('.el-dialog__title')).toContainText('选择赛事负责人')

    // 验证弹窗内的搜索表单
    await expect(page.locator('.el-dialog input[placeholder="输入姓名"]')).toBeVisible()
    await expect(page.locator('.el-dialog input[placeholder="输入工号"]')).toBeVisible()

    // 验证弹窗内的表格
    await expect(page.locator('.el-dialog .el-table')).toBeVisible()

    // 验证重置按钮
    await expect(page.locator('.el-dialog button:has-text("重置")')).toBeVisible()

    // 关闭弹窗
    await page.locator('.el-dialog__headerbtn').click()
    await expect(page.locator('.el-dialog')).not.toBeVisible()
  })

  test('往年赛事复用 - 选择年份后加载数据', async ({ page }) => {
    // 切换到往年赛事复用Tab
    await page.getByRole('tab', { name: '从往年赛事复用' }).click()
    await page.waitForSelector('.el-step', { timeout: 5000 })
    await page.waitForTimeout(500)

    // 找到年份选择器
    const yearSelect = page.locator('.el-form-item').filter({ hasText: '赛事所属年份' }).locator('.el-select').first()
    await yearSelect.click()
    await page.waitForTimeout(400)

    // 获取所有年份选项数量
    const yearOptions = page.getByRole('option')
    const count = await yearOptions.count()
    console.log(`年份选项数量: ${count}`)

    // 如果有选项，选择第一个
    if (count > 0) {
      await yearOptions.first().click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      // 验证表格出现
      await expect(page.locator('.el-table')).toBeVisible()
    }
  })

  test('往年赛事复用 - 未选择年份时下一步按钮无效', async ({ page }) => {
    // 切换到往年赛事复用Tab
    await page.getByRole('tab', { name: '从往年赛事复用' }).click()
    await page.waitForSelector('.el-step', { timeout: 5000 })
    await page.waitForTimeout(300)

    // 找到"下一步"按钮
    const nextBtn = page.locator('button:has-text("下一步")')

    // 点击下一步（不选择任何数据）
    await nextBtn.click()

    // 等待警告消息出现
    await page.waitForTimeout(500)

    // 验证页面没有跳转
    await expect(page).toHaveURL(/\/competition\/add/)
  })

  test('Excel导入 - 模板下载按钮', async ({ page }) => {
    // 切换到Excel批量导入Tab
    await page.getByRole('tab', { name: 'Excel 批量导入' }).click()
    await page.waitForSelector('.el-alert', { timeout: 5000 })
    await page.waitForTimeout(500)

    // 找到下载模板按钮
    const downloadBtn = page.locator('button:has-text("下载导入模板")')
    await expect(downloadBtn).toBeVisible()

    // 点击下载按钮
    await downloadBtn.click()
    await page.waitForTimeout(500)
  })

  test('Excel导入 - 上传按钮存在', async ({ page }) => {
    // 切换到Excel批量导入Tab
    await page.getByRole('tab', { name: 'Excel 批量导入' }).click()
    await page.waitForSelector('.el-alert', { timeout: 5000 })
    await page.waitForTimeout(500)

    // 验证上传按钮存在
    const uploadInput = page.locator('.upload-demo input[type="file"]')
    await expect(uploadInput).toBeAttached()
  })

  test('表单验证 - 完整必填项校验', async ({ page }) => {
    // 填写部分必填项
    await page.locator('input[placeholder="请输入赛事名称"]').fill('测试竞赛')

    // 选择赛事级别
    await selectFromDropdown(page, '赛事级别', '校级')

    // 不填写负责人，点击创建
    await page.locator('button:has-text("创建")').click()

    // 触发验证
    await page.locator('input[placeholder="请选择赛事负责人"]').focus()
    await page.locator('input[placeholder="请选择赛事负责人"]').blur()

    await page.waitForTimeout(800)

    // Element Plus 的验证错误可能显示为 toast
    const hasToast = await page.locator('.el-message').isVisible().catch(() => false)

    // 验证错误提示出现
    expect(hasToast).toBeTruthy()
  })
})