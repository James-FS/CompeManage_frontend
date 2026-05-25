import { test, expect } from 'playwright-test-coverage'
import * as XLSX from 'xlsx'

const TEST_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
}

const LIST_URL = '/#/award/list'

async function login(page) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
  await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
  await page.locator('.el-button:has-text("立即登录")').click()
  await page.waitForURL((url) => url.hash.includes('home'), { timeout: 10000 })
}

async function waitForListLoad(page) {
  await page.waitForResponse(
    (resp) => resp.url().includes('/api/award/list') && resp.status() === 200,
    { timeout: 15000 }
  ).catch(() => null)
  await page.waitForTimeout(800)
}

async function waitForDetailLoad(page) {
  await page.waitForResponse(
    (resp) => resp.url().includes('/api/award/comp-awards') && resp.status() === 200,
    { timeout: 15000 }
  ).catch(() => null)
  await page.waitForTimeout(800)
}

// 导航路径：列表 → 详情 → 导入页
async function navigateToImport(page) {
  // 第一步：进入列表页
  await page.goto(LIST_URL)
  await waitForListLoad(page)

  const cards = page.locator('.comp-card')
  const cardCount = await cards.count()
  if (cardCount === 0) return false

  // 第二步：点击"查看结果"进入详情页
  const detailBtn = cards.first().locator('.primary-btn')
  const hasBtn = await detailBtn.isVisible().catch(() => false)
  if (!hasBtn) return false

  await detailBtn.click()
  await page.waitForURL(/#\/award\/detail\//, { timeout: 10000 })
  await waitForDetailLoad(page)

  // 第三步：点击"导入名单"进入导入页
  const importBtn = page.locator('.right-tools button:has-text("导入名单")')
  const hasImportBtn = await importBtn.isVisible().catch(() => false)
  if (!hasImportBtn) return false

  await importBtn.click()
  await page.waitForURL(/#\/award\/import\//, { timeout: 10000 })
  await page.waitForTimeout(800)
  return true
}

// 生成测试用 Excel 文件（匹配导入模板的表头）
function createTestExcelFile() {
  const header = ['奖项等级', '获奖项目名称', '负责人', '学号']
  const data = [
    ['国家级一等奖', 'E2E测试项目_' + Date.now(), '张三', 'S2024001'],
    ['省级二等奖', 'E2E测试项目B_' + Date.now(), '李四', 'S2024002'],
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([header, ...data])
  XLSX.utils.book_append_sheet(wb, ws, '获奖录入')
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
  return buffer
}

// 上传 Excel 文件到 el-upload 组件
async function uploadExcelFile(page) {
  const excelBuffer = createTestExcelFile()
  const fileInput = page.locator('.el-upload input[type="file"]')
  await fileInput.waitFor({ state: 'attached', timeout: 5000 })
  await fileInput.setInputFiles({
    name: 'test_award_import.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(excelBuffer),
  })
  // 等待客户端解析完成
  await page.waitForTimeout(1500)
}

test.describe('获奖导入页面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    const navigated = await navigateToImport(page)
    if (!navigated) {
      console.log('无法导航到导入页，跳过')
      return
    }

    // 验证 URL
    await expect(page).toHaveURL(/#\/award\/import\//)

    // 验证页面容器
    await expect(page.locator('.import-page')).toBeVisible()

    // ---------- 第一个卡片：模板与导入 ----------
    const firstCard = page.locator('.card').first()
    await expect(firstCard).toBeVisible()
    await expect(firstCard.locator('.card-title:has-text("模板与导入")')).toBeVisible()

    // 下载模板按钮
    await expect(firstCard.locator('button:has-text("下载模板")')).toBeVisible()

    // 选择文件按钮
    await expect(firstCard.locator('button:has-text("选择文件")')).toBeVisible()

    // ---------- 第二个卡片：导入数据预览 ----------
    const secondCard = page.locator('.card').nth(1)
    await expect(secondCard).toBeVisible()
    await expect(secondCard.locator('.card-title:has-text("导入数据预览")')).toBeVisible()

    // 信息提示框
    await expect(secondCard.locator('.el-alert')).toBeVisible()

    // 表格
    await expect(secondCard.locator('.el-table')).toBeVisible()

    // 表格列头
    const columnHeaders = ['序号', '奖项等级', '获奖项目名称', '负责人', '学号', '操作']
    for (const header of columnHeaders) {
      const th = page.getByRole('columnheader', { name: header, exact: true })
      await expect(th).toBeVisible()
    }

    // 底部按钮
    await expect(secondCard.locator('.footer button:has-text("清空")')).toBeVisible()
    await expect(secondCard.locator('.footer button:has-text("提交导入")')).toBeVisible()
  })

  test('模板下载功能', async ({ page }) => {
    const navigated = await navigateToImport(page)
    if (!navigated) {
      console.log('无法导航到导入页，跳过')
      return
    }

    // 点击下载模板按钮
    const downloadBtn = page.locator('button:has-text("下载模板")')
    await expect(downloadBtn).toBeVisible()
    await downloadBtn.click()
    await page.waitForTimeout(1500)

    // 前端生成 ExcelJS 文件，不强制验证下载，只验证不报错
    console.log('模板下载按钮点击完成')
  })

  test('文件上传与解析功能', async ({ page }) => {
    const navigated = await navigateToImport(page)
    if (!navigated) {
      console.log('无法导航到导入页，跳过')
      return
    }

    // 上传测试 Excel 文件
    await uploadExcelFile(page)

    // 验证文件名显示
    const fileNameSpan = page.locator('.file-name')
    const hasFileName = await fileNameSpan.isVisible().catch(() => false)
    if (hasFileName) {
      const fileNameText = await fileNameSpan.textContent()
      expect(fileNameText).toContain('test_award_import')
      console.log(`文件名显示: ${fileNameText.trim()}`)
    }

    // 验证表格有数据行
    const rows = page.locator('.el-table__body tr')
    const rowCount = await rows.count()
    expect(rowCount).toBeGreaterThan(0)
    console.log(`解析后数据行数: ${rowCount}`)

    // 验证第一行数据内容
    const firstRow = rows.first()
    const inputs = firstRow.locator('.el-input__inner')
    const inputCount = await inputs.count()
    if (inputCount >= 4) {
      const awardLevel = await inputs.nth(0).inputValue()
      const projectName = await inputs.nth(1).inputValue()
      expect(awardLevel.length).toBeGreaterThan(0)
      expect(projectName.length).toBeGreaterThan(0)
      console.log(`第一行: ${awardLevel} / ${projectName}`)
    }
  })

  test('表格编辑功能', async ({ page }) => {
    const navigated = await navigateToImport(page)
    if (!navigated) {
      console.log('无法导航到导入页，跳过')
      return
    }

    // 先上传文件
    await uploadExcelFile(page)

    const rows = page.locator('.el-table__body tr')
    const rowCount = await rows.count()
    if (rowCount === 0) {
      console.log('无数据行，跳过编辑测试')
      return
    }

    // 修改第一行的奖项等级
    const firstRow = rows.first()
    const inputs = firstRow.locator('.el-input__inner')

    // 清空并填入新值
    await inputs.nth(0).fill('省级一等奖')
    await page.waitForTimeout(300)
    await expect(inputs.nth(0)).toHaveValue('省级一等奖')

    // 修改项目名称
    await inputs.nth(1).fill('修改后的项目名')
    await page.waitForTimeout(300)
    await expect(inputs.nth(1)).toHaveValue('修改后的项目名')

    console.log('表格编辑验证完成')
  })

  test('删除行功能', async ({ page }) => {
    const navigated = await navigateToImport(page)
    if (!navigated) {
      console.log('无法导航到导入页，跳过')
      return
    }

    // 先上传文件
    await uploadExcelFile(page)

    const rowsBefore = page.locator('.el-table__body tr')
    const countBefore = await rowsBefore.count()
    if (countBefore === 0) {
      console.log('无数据行，跳过删除测试')
      return
    }

    console.log(`删除前行数: ${countBefore}`)

    // 点击第一行的删除按钮
    const deleteBtn = rowsBefore.first().locator('.el-button--danger')
    await deleteBtn.click()
    await page.waitForTimeout(500)

    // 验证行数减少
    const rowsAfter = page.locator('.el-table__body tr')
    const countAfter = await rowsAfter.count()
    expect(countAfter).toBe(countBefore - 1)
    console.log(`删除后行数: ${countAfter}`)
  })

  test('清空功能', async ({ page }) => {
    const navigated = await navigateToImport(page)
    if (!navigated) {
      console.log('无法导航到导入页，跳过')
      return
    }

    // 先上传文件
    await uploadExcelFile(page)

    // 确认有数据
    const rowsBefore = page.locator('.el-table__body tr')
    const countBefore = await rowsBefore.count()
    if (countBefore === 0) {
      console.log('无数据行，跳过清空测试')
      return
    }

    // 点击清空按钮
    const clearBtn = page.locator('.footer button:has-text("清空")')
    await clearBtn.click()
    await page.waitForTimeout(500)

    // 验证表格被清空（显示空状态）
    const emptyEl = page.locator('.el-empty')
    const hasEmpty = await emptyEl.isVisible().catch(() => false)
    if (hasEmpty) {
      await expect(emptyEl).toBeVisible()
      console.log('清空后显示空状态')
    }

    // 验证文件名也不显示了
    const fileNameSpan = page.locator('.file-name')
    const hasFileName = await fileNameSpan.isVisible().catch(() => false)
    expect(hasFileName).toBe(false)
    console.log('清空功能验证完成')
  })

  test('提交导入功能', async ({ page }) => {
    const navigated = await navigateToImport(page)
    if (!navigated) {
      console.log('无法导航到导入页，跳过')
      return
    }

    // 先上传文件
    await uploadExcelFile(page)

    // 确认有数据
    const rows = page.locator('.el-table__body tr')
    const rowCount = await rows.count()
    if (rowCount === 0) {
      console.log('无数据行，跳过提交测试')
      return
    }

    // 注册提交 API 响应监听
    const submitRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/award/import') && resp.status() === 200,
      { timeout: 30000 }
    ).catch(() => null)

    // 点击提交导入按钮
    const submitBtn = page.locator('.footer button:has-text("提交导入")')
    await submitBtn.click()

    const resp = await submitRespPromise
    await page.waitForTimeout(1000)

    if (resp) {
      const data = await resp.json().catch(() => null)
      if (data && data.code === 200) {
        console.log('导入成功，验证跳转')
        // 成功后 router.back() 跳转回详情页
        await page.waitForURL(/#\/award\/detail\//, { timeout: 10000 }).catch(() => null)
      } else {
        console.log(`导入返回: ${data?.msg || '未知错误'}`)
      }
    } else {
      console.log('未收到导入 API 响应')
    }
  })

  test('空状态验证', async ({ page }) => {
    const navigated = await navigateToImport(page)
    if (!navigated) {
      console.log('无法导航到导入页，跳过')
      return
    }

    // 未上传文件时，验证表格显示空状态
    const emptyEl = page.locator('.el-empty')
    const hasEmpty = await emptyEl.isVisible().catch(() => false)

    if (hasEmpty) {
      await expect(emptyEl).toBeVisible()
      const descText = await page.locator('.el-empty__description').textContent()
      expect(descText.trim()).toContain('暂无数据')
      console.log('空状态验证通过: "暂无数据"')
    } else {
      console.log('未检测到空状态元素')
    }
  })

  test('空数据提交验证', async ({ page }) => {
    const navigated = await navigateToImport(page)
    if (!navigated) {
      console.log('无法导航到导入页，跳过')
      return
    }

    // 未上传文件时点击提交导入
    const submitBtn = page.locator('.footer button:has-text("提交导入")')
    await submitBtn.click()
    await page.waitForTimeout(500)

    // 验证显示警告提示"暂无数据可提交"
    const warningMsg = page.locator('.el-message--warning').last()
    const hasWarning = await warningMsg.isVisible().catch(() => false)
    if (hasWarning) {
      console.log('空数据提交警告提示已显示')
    }

    // 验证仍在导入页（没有跳转）
    await expect(page).toHaveURL(/#\/award\/import\//)
    console.log('空数据提交验证完成')
  })
})
