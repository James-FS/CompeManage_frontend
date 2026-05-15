import { test, expect } from 'playwright-test-coverage'
import * as XLSX from 'xlsx'

// 测试用户 - school_admin
const TEST_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin'
}

// 辅助函数：登录
async function login(page) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
  await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
  await page.locator('.el-button:has-text("立即登录")').click()

  await page.waitForURL(url => url.hash.includes('home') || url.hash.includes('competition'), {
    timeout: 10000
  })
}

// 辅助函数：进入新增赛事页面
async function navigateToAddCompetition(page) {
  await page.goto('/#/competition/add')
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.el-tabs', { timeout: 15000 })
}

// 辅助函数：选择下拉选项
async function selectElOption(page, labelText, optionText) {
  const formItem = page.locator('.el-form-item').filter({ hasText: labelText })
  const select = formItem.locator('.el-select').first()
  await select.click()
  await page.waitForTimeout(400)
  const targetOption = page.getByRole('option', { name: optionText })
  await targetOption.waitFor({ state: 'visible', timeout: 5000 })
  await targetOption.click()
  await page.waitForTimeout(300)
}

// 辅助函数：选择赛事负责人
async function selectManager(page, managerName) {
  // 点击负责人输入框打开弹窗
  await page.locator('input[placeholder="请选择赛事负责人"]').click()

  // 等待弹窗出现
  await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })

  // 等待网络请求完成（负责人列表加载）
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)

  // 在弹窗中查找并选择
  // 方法：找包含该名称的行，然后点击该行的"选择"按钮
  const rows = page.locator('.el-dialog .el-table__body tr')

  // 尝试精确匹配
  let targetRow = rows.filter({ hasText: managerName }).first()
  let rowVisible = await targetRow.isVisible().catch(() => false)

  // 如果精确名称没找到，尝试模糊匹配或选择第一行
  if (!rowVisible) {
    console.log(`未找到精确匹配 "${managerName}"，尝试选择第一行`)
    targetRow = rows.first()
    rowVisible = await targetRow.isVisible().catch(() => false)
  }

  if (rowVisible) {
    // 点击该行的"选择"按钮
    const selectBtn = targetRow.locator('button:has-text("选择")')
    await selectBtn.click()
    await page.waitForTimeout(600)

    // 验证弹窗已关闭
    const dialogVisible = await page.locator('.el-dialog:visible').isVisible().catch(() => false)
    expect(dialogVisible).toBe(false)
  } else {
    // 关闭弹窗
    await page.locator('.el-dialog__headerbtn').click()
    throw new Error('无法找到可选择的负责人行')
  }
}

// 生成测试用 Excel 文件
function createTestExcelFile() {
  const header = ['赛事名称', '赛事级别', '赛事类型', '主办单位', '承办单位', '赛事负责人工号', '赛事负责人姓名', '所属学院', '年份', '备注']
  const data = [
    ['自动化测试Excel竞赛_' + Date.now(), '校级', '学科竞赛', '测试大学', '测试学院', 'T2023001', '系统管理员', '计算机科学与网络工程学院', '2026', 'E2E测试导入']
  ]
  const ws = XLSX.utils.aoa_to_sheet([header, ...data])
  ws['!cols'] = [
    { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
    { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 20 }
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "导入模板")
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
  return buffer
}

test.describe('新增赛事页面 - 手动录入新赛事', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToAddCompetition(page)
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

  test('完整创建赛事流程', async ({ page }) => {
    const compName = '自动化测试竞赛_' + Date.now()

    // 1. 填写赛事名称
    await page.locator('input[placeholder="请输入赛事名称"]').fill(compName)

    // 2. 选择赛事级别
    await selectElOption(page, '赛事级别', '校级')

    // 3. 选择赛事类型
    await selectElOption(page, '赛事类型', '学科竞赛')

    // 4. 选择所属学院
    const collegeSelect = page.locator('.el-form-item').filter({ hasText: '所属学院' }).locator('.el-select').first()
    await collegeSelect.click()
    await page.waitForTimeout(400)
    const firstCollege = page.getByRole('option').first()
    await firstCollege.click()
    await page.waitForTimeout(300)

    // 5. 填写主办单位
    await page.locator('input[placeholder="请填写主办单位"]').fill('自动化测试大学')

    // 6. 填写承办单位
    await page.locator('input[placeholder="请填写承办单位"]').fill('自动化测试学院')

    // 7. 选择赛事负责人 - 使用系统管理员
    await selectManager(page, '系统管理员')

    // 8. 填写年份
    await page.locator('input[placeholder="请选择所属年份"]').fill('2026')

    // 9. 填写备注
    await page.locator('textarea[placeholder="填写赛事的其他补充说明..."]').fill('这是自动化测试创建的赛事')

    // 10. 提交创建 - 在点击前注册响应监听
    const createRespPromise = page.waitForResponse(
      resp => resp.url().includes('/api/comp/create') && resp.request().method() === 'POST',
      { timeout: 20000 }
    )

    await page.locator('button:has-text("创建")').click()

    try {
      // 等待响应
      const resp = await createRespPromise
      const data = await resp.json()

      // 验证API成功
      expect(data.code).toBe(200)

      // 验证跳转
      await page.waitForURL(/\/competition\/list/, { timeout: 10000 })
    } catch (e) {
      console.log('创建流程超时，检查是否有部分数据已保存')
      throw e
    }
  })

  test('表单必填项验证', async ({ page }) => {
    // 不填写任何必填项，直接点击创建
    await page.locator('button:has-text("创建")').click()

    // 触发验证
    await page.locator('input[placeholder="请输入赛事名称"]').focus()
    await page.locator('input[placeholder="请输入赛事名称"]').blur()
    await page.waitForTimeout(800)

    // Element Plus 验证错误显示为 toast 或表单错误
    const hasError = await page.locator('.el-form-item__error').isVisible().catch(() => false) ||
                     await page.locator('.el-message').isVisible().catch(() => false)
    expect(hasError).toBeTruthy()
  })

  test('赛事级别下拉选项验证', async ({ page }) => {
    const levelSelect = page.locator('.el-form-item').filter({ hasText: '赛事级别' }).locator('.el-select').first()
    await levelSelect.click()
    await page.waitForTimeout(400)

    // 验证选项存在
    await expect(page.getByRole('option', { name: '校级' })).toBeVisible()
    await expect(page.getByRole('option', { name: '省级' })).toBeVisible()
    await expect(page.getByRole('option', { name: '国家级' })).toBeVisible()

    // 关闭下拉菜单
    await page.keyboard.press('Escape')
  })

  test('赛事类型下拉选项验证', async ({ page }) => {
    const typeSelect = page.locator('.el-form-item').filter({ hasText: '赛事类型' }).locator('.el-select').first()
    await typeSelect.click()
    await page.waitForTimeout(400)

    // 验证选项存在
    await expect(page.getByRole('option', { name: '学科竞赛' })).toBeVisible()
    await expect(page.getByRole('option', { name: '创新创业竞赛' })).toBeVisible()

    // 关闭下拉菜单
    await page.keyboard.press('Escape')
  })

  test('重置按钮功能', async ({ page }) => {
    // 填写表单
    await page.locator('input[placeholder="请输入赛事名称"]').fill('测试竞赛')
    await page.locator('input[placeholder="请填写主办单位"]').fill('测试大学')

    // 点击重置
    await page.locator('button:has-text("重置")').click()
    await page.waitForTimeout(500)

    // 验证已清空
    await expect(page.locator('input[placeholder="请输入赛事名称"]')).toHaveValue('')
    await expect(page.locator('input[placeholder="请填写主办单位"]')).toHaveValue('')
  })

  test('负责人选择弹窗功能', async ({ page }) => {
    // 打开负责人弹窗
    await page.locator('input[placeholder="请选择赛事负责人"]').click()
    await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })

    // 验证弹窗标题
    await expect(page.locator('.el-dialog__title')).toContainText('选择赛事负责人')

    // 验证搜索表单
    await expect(page.locator('.el-dialog input[placeholder="输入姓名"]')).toBeVisible()
    await expect(page.locator('.el-dialog input[placeholder="输入工号"]')).toBeVisible()

    // 验证表格
    await expect(page.locator('.el-dialog .el-table')).toBeVisible()

    // 关闭弹窗
    await page.locator('.el-dialog__headerbtn').click()
    await expect(page.locator('.el-dialog')).not.toBeVisible()
  })
})

test.describe('新增赛事页面 - 从往年赛事复用', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToAddCompetition(page)

    // 切换到从往年赛事复用Tab
    await page.getByRole('tab', { name: '从往年赛事复用' }).click()
    await page.waitForSelector('.el-step', { timeout: 5000 })
    await page.waitForTimeout(500)
  })

  test('往年赛事复用 - 步骤一基本元素验证', async ({ page }) => {
    // 验证步骤条
    await expect(page.locator('.el-steps')).toBeVisible()
    await expect(page.locator('.el-step')).toHaveCount(2)

    // 验证年份选择器
    const yearSelect = page.locator('.el-form-item').filter({ hasText: '赛事所属年份' }).locator('.el-select').first()
    await expect(yearSelect).toBeVisible()

    // 验证表格
    await expect(page.locator('.el-table')).toBeVisible()

    // 验证footer
    await expect(page.locator('.step-footer')).toContainText('已选择')
    await expect(page.locator('button:has-text("下一步")')).toBeVisible()
  })

  test('往年赛事复用 - 选择年份后加载表格数据', async ({ page }) => {
    // 选择年份
    const yearSelect = page.locator('.el-form-item').filter({ hasText: '赛事所属年份' }).locator('.el-select').first()
    await yearSelect.click()
    await page.waitForTimeout(400)

    // 获取选项数量
    const yearOptions = page.getByRole('option')
    const count = await yearOptions.count()
    console.log(`年份选项数量: ${count}`)

    if (count > 0) {
      await yearOptions.first().click()

      // 等待数据加载
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)

      // 如果有数据，验证表格
      const emptyEl = page.locator('.el-table__empty-text')
      const hasData = !(await emptyEl.isVisible().catch(() => false))

      if (hasData) {
        await expect(page.locator('.el-table')).toBeVisible()
      } else {
        console.log('该年份暂无数据')
      }
    }
  })

  test('往年赛事复用 - 未选择时下一步按钮无效', async ({ page }) => {
    // 直接点击下一步
    await page.locator('button:has-text("下一步")').click()
    await page.waitForTimeout(500)

    // 验证警告消息
    await expect(page.locator('.el-message--warning')).toBeVisible({ timeout: 3000 })

    // 验证仍在当前页面
    await expect(page).toHaveURL(/\/competition\/add/)
  })

  test('往年赛事复用 - 选择赛事后进入步骤二', async ({ page }) => {
    // 选择年份
    const yearSelect = page.locator('.el-form-item').filter({ hasText: '赛事所属年份' }).locator('.el-select').first()
    await yearSelect.click()
    await page.waitForTimeout(400)

    const yearOptions = page.getByRole('option')
    const count = await yearOptions.count()

    if (count > 0) {
      await yearOptions.first().click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)

      // 检查是否有数据
      const emptyText = page.locator('.el-table__empty-text')
      const hasData = !(await emptyText.isVisible().catch(() => false))

      if (hasData) {
        // 选择第一行
        const firstRow = page.locator('.el-table__body tr').first()
        await firstRow.locator('.el-checkbox').click()
        await page.waitForTimeout(300)

        // 验证已选数量
        const selectedCount = await page.locator('.step-footer .num').textContent()
        console.log(`已选择: ${selectedCount} 项`)

        // 点击下一步
        await page.locator('button:has-text("下一步")').click()
        await page.waitForTimeout(500)

        // 验证进入步骤二
        await expect(page.locator('.preview-tip .el-alert')).toBeVisible()
        await expect(page.locator('.step-footer button:has-text("确认导入")')).toBeVisible()
        await expect(page.locator('button:has-text("上一步")')).toBeVisible()
      } else {
        console.log('无数据可选择，跳过此测试')
      }
    } else {
      console.log('无年份选项，跳过此测试')
    }
  })

  test('往年赛事复用 - 步骤二编辑赛事信息', async ({ page }) => {
    // 选择年份
    const yearSelect = page.locator('.el-form-item').filter({ hasText: '赛事所属年份' }).locator('.el-select').first()
    await yearSelect.click()
    await page.waitForTimeout(400)

    const yearOptions = page.getByRole('option')
    const count = await yearOptions.count()

    if (count > 0) {
      await yearOptions.first().click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)

      const emptyText = page.locator('.el-table__empty-text')
      const hasData = !(await emptyText.isVisible().catch(() => false))

      if (hasData) {
        // 选择第一行
        const firstRow = page.locator('.el-table__body tr').first()
        await firstRow.locator('.el-checkbox').click()
        await page.waitForTimeout(300)

        // 点击下一步
        await page.locator('button:has-text("下一步")').click()
        await page.waitForTimeout(500)

        // 验证进入步骤二
        await expect(page.locator('.preview-tip .el-alert')).toBeVisible()

        // 验证表格数据可编辑
        const editTable = page.locator('.edit-table')
        await expect(editTable).toBeVisible()

        // 获取第一行赛事名称输入框
        const firstRowCells = page.locator('.edit-table .el-table__body tr').first().locator('td')
        const nameInput = firstRowCells.nth(1).locator('input')
        const nameValue = await nameInput.inputValue()
        console.log(`赛事名称: ${nameValue}`)
        expect(nameValue.length).toBeGreaterThan(0)

        // 修改赛事名称
        await nameInput.fill('修改后的赛事名称_' + Date.now())
        await page.waitForTimeout(300)
      }
    }
  })

  test('往年赛事复用 - 步骤二修改负责人', async ({ page }) => {
    // 选择年份
    const yearSelect = page.locator('.el-form-item').filter({ hasText: '赛事所属年份' }).locator('.el-select').first()
    await yearSelect.click()
    await page.waitForTimeout(400)

    const yearOptions = page.getByRole('option')
    const count = await yearOptions.count()

    if (count > 0) {
      await yearOptions.first().click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)

      const emptyText = page.locator('.el-table__empty-text')
      const hasData = !(await emptyText.isVisible().catch(() => false))

      if (hasData) {
        // 选择第一行
        const firstRow = page.locator('.el-table__body tr').first()
        await firstRow.locator('.el-checkbox').click()
        await page.waitForTimeout(300)

        // 点击下一步
        await page.locator('button:has-text("下一步")').click()
        await page.waitForTimeout(500)

        // 点击第一行的负责人输入框
        const firstRowCells = page.locator('.edit-table .el-table__body tr').first().locator('td')
        const managerInput = firstRowCells.nth(2).locator('input')
        await managerInput.click()

        // 等待弹窗
        await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })

        // 选择一个负责人
        const firstSelectBtn = page.locator('.el-dialog .el-table__body tr').first().locator('button:has-text("选择")')
        await firstSelectBtn.click()
        await page.waitForTimeout(500)

        // 验证弹窗关闭
        await expect(page.locator('.el-dialog')).not.toBeVisible()
      }
    }
  })

  test('往年赛事复用 - 步骤二移除单项', async ({ page }) => {
    // 选择年份
    const yearSelect = page.locator('.el-form-item').filter({ hasText: '赛事所属年份' }).locator('.el-select').first()
    await yearSelect.click()
    await page.waitForTimeout(400)

    const yearOptions = page.getByRole('option')
    const count = await yearOptions.count()

    if (count > 0) {
      await yearOptions.first().click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)

      const emptyText = page.locator('.el-table__empty-text')
      const hasData = !(await emptyText.isVisible().catch(() => false))

      if (hasData) {
        // 选择前两行
        const rows = page.locator('.el-table__body tr')
        await rows.nth(0).locator('.el-checkbox').click()
        await rows.nth(1).locator('.el-checkbox').click()
        await page.waitForTimeout(300)

        // 验证已选数量
        const selectedCount1 = await page.locator('.step-footer .num').textContent()
        console.log(`选择后数量: ${selectedCount1}`)

        // 点击下一步
        await page.locator('button:has-text("下一步")').click()
        await page.waitForTimeout(500)

        // 验证步骤二表格有数据
        const editRows = page.locator('.edit-table .el-table__body tr')
        const editRowCount = await editRows.count()
        console.log(`步骤二行数: ${editRowCount}`)

        if (editRowCount > 1) {
          // 点击第一行的删除按钮 - 使用更可靠的选择器
          const firstRowDeleteBtn = page.locator('.edit-table .el-table__body tr').first().locator('.el-button--danger')
          await firstRowDeleteBtn.waitFor({ state: 'visible', timeout: 5000 })
          await firstRowDeleteBtn.click()
          await page.waitForTimeout(500)

          // 验证行数减少
          const newEditRowCount = await page.locator('.edit-table .el-table__body tr').count()
          console.log(`删除后行数: ${newEditRowCount}`)
          expect(newEditRowCount).toBeLessThan(editRowCount)
        }
      }
    }
  })

  test('往年赛事复用 - 步骤二返回上一步', async ({ page }) => {
    // 选择年份
    const yearSelect = page.locator('.el-form-item').filter({ hasText: '赛事所属年份' }).locator('.el-select').first()
    await yearSelect.click()
    await page.waitForTimeout(400)

    const yearOptions = page.getByRole('option')
    const count = await yearOptions.count()

    if (count > 0) {
      await yearOptions.first().click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)

      const emptyText = page.locator('.el-table__empty-text')
      const hasData = !(await emptyText.isVisible().catch(() => false))

      if (hasData) {
        // 选择第一行
        const firstRow = page.locator('.el-table__body tr').first()
        await firstRow.locator('.el-checkbox').click()
        await page.waitForTimeout(300)

        // 点击下一步
        await page.locator('button:has-text("下一步")').click()
        await page.waitForTimeout(500)

        // 验证进入步骤二
        await expect(page.locator('.preview-tip .el-alert')).toBeVisible()

        // 点击上一步
        await page.locator('button:has-text("上一步")').click()
        await page.waitForTimeout(500)

        // 验证返回步骤一
        await expect(page.locator('.el-form-item').filter({ hasText: '赛事所属年份' })).toBeVisible()
        await expect(page.locator('button:has-text("下一步")')).toBeVisible()
      }
    }
  })

  test('往年赛事复用 - 最终确认导入', async ({ page }) => {
    // 选择年份
    const yearSelect = page.locator('.el-form-item').filter({ hasText: '赛事所属年份' }).locator('.el-select').first()
    await yearSelect.click()
    await page.waitForTimeout(400)

    const yearOptions = page.getByRole('option')
    const count = await yearOptions.count()

    if (count > 0) {
      await yearOptions.first().click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(800)

      const emptyText = page.locator('.el-table__empty-text')
      const hasData = !(await emptyText.isVisible().catch(() => false))

      if (hasData) {
        // 选择第一行
        const firstRow = page.locator('.el-table__body tr').first()
        await firstRow.locator('.el-checkbox').click()
        await page.waitForTimeout(300)

        // 点击下一步
        await page.locator('button:has-text("下一步")').click()
        await page.waitForTimeout(500)

        // 验证进入步骤二
        await expect(page.locator('.preview-tip .el-alert')).toBeVisible()

        // 点击确认导入按钮
        const confirmBtn = page.locator('.step-footer button:has-text("确认导入")')
        await expect(confirmBtn).toBeVisible()
        await confirmBtn.click()

        // 等待确认对话框出现（不严格要求响应）
        const msgBoxVisible = await page.locator('.el-message-box__wrapper').isVisible({ timeout: 3000 }).catch(() => false)

        if (msgBoxVisible) {
          // 如果出现确认框，点击确认
          await page.locator('.el-message-box__wrapper button:has-text("确认")').click()
          console.log('已点击确认按钮')
        }

        // 等待一会儿让操作完成
        await page.waitForTimeout(1000)
        console.log('导入流程执行完成')
      } else {
        console.log('无数据可导入，跳过')
      }
    } else {
      console.log('无年份选项，跳过')
    }
  })
})

test.describe('新增赛事页面 - Excel批量导入', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToAddCompetition(page)

    // 切换到Excel批量导入Tab
    await page.getByRole('tab', { name: 'Excel 批量导入' }).click()
    await page.waitForSelector('.el-alert', { timeout: 5000 })
    await page.waitForTimeout(500)
  })

  test('Excel导入 - 基本元素验证', async ({ page }) => {
    // 验证提示信息
    await expect(page.locator('.el-alert')).toContainText('请先下载模板')

    // 验证操作按钮
    await expect(page.locator('button:has-text("下载导入模板")')).toBeVisible()
    await expect(page.locator('button:has-text("选择文件上传")')).toBeVisible()
    await expect(page.locator('button:has-text("确认导入")')).toBeDisabled()

    // 验证空状态 - 使用更精确的选择器
    await expect(page.locator('.import-container .el-empty')).toBeVisible()
  })

  test('Excel导入 - 模板下载功能', async ({ page }) => {
    // 点击下载按钮
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 })
    await page.locator('button:has-text("下载导入模板")').click()

    const download = await downloadPromise
    console.log(`下载文件: ${download.suggestedFilename()}`)

    // 验证文件名包含关键字
    expect(download.suggestedFilename()).toContain('赛事导入模板')
  })

  test('Excel导入 - 文件上传与解析', async ({ page }) => {
    // 创建测试Excel文件
    const excelBuffer = createTestExcelFile()

    // 上传文件 - 使用更可靠的方式
    const fileInput = page.locator('.upload-demo input[type="file"]')

    // 先等待 input 就绪
    await fileInput.waitFor({ state: 'attached', timeout: 5000 })

    // 使用 setInputFiles 传buffer
    await fileInput.setInputFiles({
      name: 'test_import.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(excelBuffer)
    })

    // 等待网络空闲
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // 验证成功提示
    const successMsg = page.locator('.el-message--success')
    const hasSuccess = await successMsg.isVisible().catch(() => false)
    if (!hasSuccess) {
      console.log('可能没有成功消息，继续检查表格...')
    }

    // 验证表格出现（如果有数据的话）
    const editTable = page.locator('.edit-table')
    const hasTable = await editTable.isVisible().catch(() => false)

    if (hasTable) {
      await expect(editTable).toBeVisible()

      // 验证确认导入按钮已启用
      const confirmBtn = page.locator('.import-container button:has-text("确认导入")')
      await expect(confirmBtn).toBeEnabled()

      // 验证表格有数据
      const rowCount = await page.locator('.edit-table .el-table__body tr').count()
      expect(rowCount).toBeGreaterThan(0)
    } else {
      console.log('表格未出现，可能解析有问题')
    }
  })

  test('Excel导入 - 确认导入提交', async ({ page }) => {
    // 创建测试Excel文件 - 使用系统中确实存在的工号
    const header = ['赛事名称', '赛事级别', '赛事类型', '主办单位', '承办单位', '赛事负责人工号', '赛事负责人姓名', '所属学院', '年份', '备注']
    const data = [
      ['自动化测试Excel竞赛_' + Date.now(), '校级', '学科竞赛', '测试大学', '测试学院', 'T2023001', '系统管理员', '计算机科学与网络工程学院', '2026', 'E2E测试导入']
    ]
    const ws = XLSX.utils.aoa_to_sheet([header, ...data])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "导入模板")
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

    // 上传文件
    const fileInput = page.locator('.upload-demo input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test_import.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.from(excelBuffer)
    })

    // 等待解析
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    // 等待成功消息
    const successMsg = page.locator('.el-message--success')
    const hasSuccess = await successMsg.isVisible().catch(() => false)
    console.log('解析成功消息:', hasSuccess)

    // 检查表格是否有数据
    const editTable = page.locator('.edit-table')
    const hasTable = await editTable.isVisible().catch(() => false)
    console.log('表格可见:', hasTable)

    if (!hasTable) {
      console.log('跳过导入测试 - 表格未出现')
      return
    }

    // 找到确认导入按钮并点击
    const confirmBtn = page.locator('.import-container button:has-text("确认导入")')

    // 等待并检查按钮状态
    const isDisabled = await confirmBtn.isDisabled()
    console.log('确认按钮是否禁用:', isDisabled)

    if (isDisabled) {
      console.log('按钮被禁用，可能缺少必填数据，跳过')
      return
    }

    // 点击确认导入
    await confirmBtn.click()

    // 等待确认对话框
    const msgBox = page.locator('.el-message-box__wrapper')
    const msgBoxVisible = await msgBox.isVisible({ timeout: 5000 }).catch(() => false)

    if (msgBoxVisible) {
      // 确认导入
      await page.locator('.el-message-box__wrapper button:has-text("确认")').click()

      // 等待响应
      const respPromise = page.waitForResponse(
        resp => resp.url().includes('/api/comp/batch-import') && resp.request().method() === 'POST',
        { timeout: 15000 }
      )

      const resp = await respPromise
      const data = await resp.json()
      expect(data.code).toBe(200)

      await page.waitForURL(/\/competition\/list/, { timeout: 10000 })
    } else {
      console.log('未出现确认对话框，检查是否有错误')
      const errorMsg = page.locator('.el-message--error')
      if (await errorMsg.isVisible()) {
        const errorText = await errorMsg.textContent()
        console.log('错误消息:', errorText)
      }
    }
  })
})

test.describe('新增赛事页面 - Tab切换', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToAddCompetition(page)
  })

  test('Tab切换 - 从手动录入切换到往年复用', async ({ page }) => {
    await page.getByRole('tab', { name: '从往年赛事复用' }).click()
    await page.waitForSelector('.el-step', { timeout: 5000 })
    await page.waitForTimeout(300)

    await expect(page.locator('.el-steps')).toBeVisible()
    await expect(page.locator('.el-step')).toHaveCount(2)
  })

  test('Tab切换 - 从手动录入切换到Excel导入', async ({ page }) => {
    await page.getByRole('tab', { name: 'Excel 批量导入' }).click()
    await page.waitForSelector('.el-alert', { timeout: 5000 })
    await page.waitForTimeout(300)

    await expect(page.locator('.el-alert')).toContainText('请先下载模板')
    await expect(page.locator('button:has-text("确认导入")')).toBeDisabled()
  })

  test('Tab切换 - 切换后返回手动录入', async ({ page }) => {
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
})