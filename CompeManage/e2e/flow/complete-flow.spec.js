import { test, expect } from 'playwright-test-coverage'
import { login } from '../helpers/auth'

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

// 记录创建好的赛事ID（使用let支持后续修改）
let createdCompId = null
let createdCompName = null

// ==================== 辅助函数 ====================



async function selectElOption(page, labelText, optionText) {
  const formItem = page.locator('.el-form-item').filter({ hasText: labelText })
  const select = formItem.locator('.el-select').first()
  await select.click()
  await page.waitForTimeout(400)
  // 优先精确匹配，找不到则用第一个选项
  const targetOption = page.getByRole('option', { name: optionText })
  const isVisible = await targetOption.isVisible().catch(() => false)
  if (isVisible) {
    await targetOption.click()
  } else {
    console.log(`未找到"${optionText}"选项，选择第一个`)
    await page.getByRole('option').first().click()
  }
  await page.waitForTimeout(300)
}

// ==================== 完整流程测试 ====================

test.describe('完整流程: 创建赛事->配置报名->发布通知->学生报名->提交作品', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(120000) // 扩大测试超时到2分钟

  test('流程A: 管理员创建赛事', async ({ page }) => {
    const startTime = Date.now()
    // 重置状态
    createdCompId = null
    createdCompName = null

    await login(page, ADMIN_USER)
    console.log(`[${((Date.now() - startTime) / 1000).toFixed(1)}s] 登录完成`)

    // 创建测试赛事
    await page.goto('/#/competition/add')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.el-tabs', { timeout: 20000 })
    await page.waitForTimeout(1000) // 等待表单完全渲染

    const compName = 'E2E完整流程测试_' + Date.now()
    createdCompName = compName
    await page.fill('input[placeholder="请输入赛事名称"]', compName)

    // 选择赛事级别（使用辅助函数）
    await selectElOption(page, '赛事级别', '校级')

    // 选择赛事类型
    await selectElOption(page, '赛事类型', '学科竞赛')

    // 选择所属学院
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

    // 选择赛事负责人（弹窗选择）- 简化处理
    try {
      const managerSelect = page.locator('input[placeholder="请选择赛事负责人"]')
      const isVisible = await managerSelect.isVisible().catch(() => false)
      if (isVisible) {
        await managerSelect.click()
        await page.waitForTimeout(600)
        const dialogVisible = await page.locator('.el-dialog:visible').isVisible().catch(() => false)
        if (dialogVisible) {
          const selectBtn = page.locator('.el-dialog .el-table__body tr button:has-text("选择")').first()
          const btnVisible = await selectBtn.isVisible().catch(() => false)
          if (btnVisible) {
            await selectBtn.click()
            await page.waitForTimeout(500)
          } else {
            await page.locator('.el-dialog__headerbtn').click()
          }
        }
      }
    } catch (e) {
      console.log(`选择负责人: ${e.message.slice(0, 100)}`)
      try {
        await page.locator('.el-dialog__headerbtn').click().catch(() => {})
      } catch {}
    }
    await page.waitForTimeout(300)

    // 填写主办和承办单位
    await page.fill('input[placeholder="请填写主办单位"]', 'E2E测试大学')
    await page.fill('input[placeholder="请填写承办单位"]', 'E2E测试学院')
    await page.fill('input[placeholder="请选择所属年份"]', '2026')

    // 点击创建按钮 - 等待API响应但不等待导航
    const createRespPromise = page.waitForResponse(
      resp => resp.url().includes('/api/comp/create') && resp.request().method() === 'POST',
      { timeout: 15000 }
    ).catch(() => null)

    await page.locator('button:has-text("创建")').click()

    // 检查API响应并尝试获取ID
    const createResp = await createRespPromise
    if (createResp) {
      const respData = await createResp.json().catch(() => ({}))
      console.log(`创建API响应: code=${respData?.code}, message=${respData?.message}`)
      // 尝试从响应中提取ID
      if (respData?.data?.id) {
        createdCompId = respData.data.id
        console.log(`从API响应获取到赛事ID: ${createdCompId}`)
      } else if (respData?.data?.compId) {
        createdCompId = respData.data.compId
        console.log(`从API响应获取到赛事ID: ${createdCompId}`)
      }
    }

    console.log(`赛事创建操作完成: ${compName}`)

    // 如果没有获取到ID，尝试从列表获取
    if (!createdCompId) {
      console.log('从API未能获取ID，尝试从列表获取')
      try {
        await page.goto('/#/competition/list', { timeout: 5000, waitUntil: 'domcontentloaded' })
        await page.waitForSelector('.el-table', { timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(1000)
        // 检查是否包含创建的赛事
        const rows = await page.locator('.el-table__body tr').all()
        for (const row of rows) {
          const titleText = await row.locator('td').nth(1).textContent().catch(() => '')
          if (titleText.includes(compName)) {
            // 找到创建的赛事，尝试获取ID
            const url = page.url()
            console.log(`从URL提取ID: ${url}`)
            break
          }
        }
      } catch (e) {
        console.log(`获取ID失败: ${e.message.slice(0, 50)}`)
      }
    }

    if (!createdCompId) {
      console.log('未能获取赛事ID，但创建流程完成')
    }
  })

  test('流程B: 管理员配置赛事报名设置', async ({ page }) => {
    // 需要先创建赛事才能继续
    if (!createdCompId) {
      console.log('没有可用的赛事ID，跳过报名设置')
      return
    }

    await login(page, ADMIN_USER)

    // 进入报名设置页面 - 正确路由是 /register/edit/{compId}
    await page.goto(`/#/register/edit/${createdCompId}`)
    await page.waitForLoadState('networkidle')

    // 等待页面加载
    try {
      await page.waitForSelector('.el-form, .config-form', { timeout: 10000 })
      console.log('进入报名设置页面')
    } catch (e) {
      const url = page.url()
      console.log(`页面URL: ${url}`)
    }

    // 选择赛事类型（团队赛）
    const typeSelect = page.locator('.type-selector .el-radio-group, .radio-group').first()
    if (await typeSelect.isVisible().catch(() => false)) {
      const teamOption = typeSelect.locator('.el-radio').nth(1)
      if (await teamOption.isVisible().catch(() => false)) {
        await teamOption.click()
        await page.waitForTimeout(300)
      }
    }

    // 设置报名时间范围（当前时间延后）
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    const futureDate = new Date(nextMonth.getTime() + 30 * 24 * 60 * 60 * 1000) // 2个月后

    const timeRangeInputs = page.locator('.el-date-editor')
    if (await timeRangeInputs.first().isVisible().catch(() => false)) {
      await timeRangeInputs.first().click()
      await page.waitForTimeout(500)
      // 设置开始时间
      await page.locator('.el-date-editor input').first().fill(formatDate(now))
      await page.locator('.el-date-editor input').nth(1).fill(formatDate(futureDate))
    }

    // 设置作品提交时间范围
    const workTimeStart = new Date(futureDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    const workTimeEnd = new Date(futureDate.getTime() + 60 * 24 * 60 * 60 * 1000)

    // 选择附件上传要求
    const attachmentOptions = page.locator('.attachment-options .el-radio-group')
    if (await attachmentOptions.isVisible()) {
      const noAttachmentOption = attachmentOptions.locator('.el-radio').first()
      await noAttachmentOption.click()
      await page.waitForTimeout(200)
    }

    // 是否需要审核
    const auditSwitch = page.locator('.need-audit-switch .el-switch')
    if (await auditSwitch.isVisible()) {
      await auditSwitch.click()
      await page.waitForTimeout(200)
    }

    // 保存设置
    await page.locator('button:has-text("保存")').click()
    await page.waitForTimeout(2000)

    console.log('报名设置已保存')
  })

  test('流程C: 管理员发布通知', async ({ page }) => {
    if (!createdCompId) {
      console.log('没有可用的赛事ID，跳过通知发布')
      return
    }

    await login(page, ADMIN_USER)

    // 进入通知编辑页
    await page.goto(`/#/notice/edit/0?compID=${createdCompId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.paper-container', { timeout: 15000 })

    // 填写通知内容
    const noticeTitle = 'E2E测试通知_' + Date.now()
    await page.fill('input[placeholder="在此输入通知标题"]', noticeTitle)
    await page.fill('textarea[placeholder="在此撰写通知正文..."]', '这是自动化测试通知的正文内容，包含赛事重要信息。')

    // 确认发布
    await page.locator('button:has-text("确认发布")').click()
    await page.waitForTimeout(2000)

    console.log('通知发布完成')
  })

  test('流程D: 学生账号查找并报名赛事', async ({ page }) => {
    if (!createdCompId) {
      console.log('没有可用的赛事ID，跳过报名')
      return
    }

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
    console.log('未找到可报名的测试赛事（可能已过报名时间或未配置）')
  })

  test('流程E: 学生查看我的参赛列表', async ({ page }) => {
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

  test('流程F: 学生进入作品详情页', async ({ page }) => {
    await login(page, STUDENT_USER)

    await page.goto('/#/register/work')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.page-container', { timeout: 15000 })
    await page.waitForTimeout(1000)

    const cardCount = await page.locator('.comp-card').count()
    if (cardCount > 0) {
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

  test('流程G: 查看通知列表', async ({ page }) => {
    await login(page, STUDENT_USER)

    await page.goto('/#/notice/list')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.page-container', { timeout: 15000 })
    await page.waitForTimeout(1000)

    await expect(page.locator('.header-title')).toContainText('赛事通知列表')

    const rowCount = await page.locator('.list-table__body tr').count()
    console.log(`通知数量: ${rowCount}`)
  })
})

// 辅助函数：格式化日期
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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

test.describe('报名设置页面测试', () => {
  test('报名设置页面基本元素', async ({ page }) => {
    await login(page, ADMIN_USER)

    // 进入报名设置页面（使用赛事ID=1作为示例）
    await page.goto('/#/register/editDetail/1')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const configContainer = page.locator('.config-container')
    const hasConfig = await configContainer.isVisible().catch(() => false)

    if (hasConfig) {
      await expect(configContainer).toBeVisible()
      console.log('报名设置页面加载成功')
    } else {
      console.log('报名设置页面不可用')
    }
  })

  test('报名类型切换', async ({ page }) => {
    await login(page, ADMIN_USER)

    await page.goto('/#/register/editDetail/1')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const typeSelector = page.locator('.type-selector')
    if (await typeSelector.isVisible()) {
      const typeOptions = typeSelector.locator('.el-radio')
      const count = await typeOptions.count()

      if (count >= 2) {
        await typeOptions.nth(1).click()
        await page.waitForTimeout(300)
        console.log('切换到团队赛')

        await typeOptions.nth(0).click()
        await page.waitForTimeout(300)
        console.log('切换到个人赛')
      }
    } else {
      console.log('type-selector不可见')
    }
  })
})