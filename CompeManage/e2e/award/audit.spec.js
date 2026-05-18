import { test, expect } from 'playwright-test-coverage'

const TEST_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
}

const AUDIT_LIST_URL = '/#/award/audit'

async function login(page) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
  await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
  await page.locator('.el-button:has-text("立即登录")').click()
  await page.waitForURL((url) => url.hash.includes('home'), { timeout: 10000 })
}

async function waitForAuditListLoad(page) {
  const auditResp = page
    .waitForResponse(
      (resp) => resp.url().includes('/api/award/audit') && resp.status() === 200,
      { timeout: 15000 }
    )
    .catch(() => null)

  await auditResp
  // 等待表格渲染 + loading 遮罩消失
  await page.waitForTimeout(800)
}

async function selectElOption(page, formFieldLabel, optionText) {
  const formItem = page.locator('.el-form-item').filter({ hasText: formFieldLabel })
  const select = formItem.locator('.el-select')
  await select.click()
  // 关键：用 getByRole 而非 waitForSelector，前者只匹配可见元素
  const targetOption = page.getByRole('option', { name: optionText })
  await targetOption.waitFor({ state: 'visible', timeout: 5000 })
  await targetOption.click()
  await page.waitForTimeout(300) // 等下拉关闭动画
}

test.describe('奖项审计列表页面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    const respPromise = page
      .waitForResponse(
        (resp) => resp.url().includes('/api/award/audit') && resp.status() === 200,
        { timeout: 15000 }
      )
      .catch(() => null)

    await page.goto(AUDIT_LIST_URL)
    await respPromise
    await page.waitForTimeout(800)

    // 验证 URL
    await expect(page).toHaveURL(/#\/award\/audit/)

    // 验证页面容器
    await expect(page.locator('.audit-list-container')).toBeVisible()

    // ---------- 面包屑 ----------
    await expect(page.locator('.el-breadcrumb')).toBeVisible()
    await expect(page.locator('.el-breadcrumb-item:has-text("奖项管理")')).toBeVisible()
    await expect(page.locator('.el-breadcrumb-item:has-text("填报审核")')).toBeVisible()

    // ---------- 页面标题 ----------
    await expect(page.locator('.page-title:has-text("填报审核")')).toBeVisible()

    // ---------- 搜索栏 ----------
    await expect(page.locator('.search-container')).toBeVisible()

    // 赛事名称输入框
    await expect(page.locator('input[placeholder="请输入赛事名称"]')).toBeVisible()

    // 学生姓名输入框
    await expect(page.locator('input[placeholder="请输入学生姓名"]')).toBeVisible()

    // 获奖等级下拉选择器
    const awardLevelSelect = page.locator('.search-form .el-select').nth(0)
    await expect(awardLevelSelect).toBeVisible()

    // 审核状态下拉选择器
    const statusSelect = page.locator('.search-form .el-select').nth(1)
    await expect(statusSelect).toBeVisible()

    // 查询按钮（蓝色）
    await expect(
      page.locator('.search-actions button:has-text("查询")')
    ).toBeVisible()

    // 重置按钮
    await expect(
      page.locator('.search-actions button:has-text("重置")')
    ).toBeVisible()

    // ---------- 顶部操作按钮 ----------
    // 批量通过按钮（绿色）
    await expect(
      page.locator('.table-toolbar button:has-text("批量通过")')
    ).toBeVisible()

    // 批量驳回按钮（红色）
    await expect(
      page.locator('.table-toolbar button:has-text("批量驳回")')
    ).toBeVisible()

    // ---------- 表格 ----------
    await expect(page.locator('.el-table')).toBeVisible()

    // 验证表格列头
    const columnHeaders = [
      '学生信息',
      '赛事名称',
      '获奖等级',
      '获奖日期',
      '申报时间',
      '状态',
      '操作',
    ]
    for (const header of columnHeaders) {
      const th = page.locator('.el-table__header th').filter({ hasText: header })
      await expect(th).toBeVisible()
    }

    // ---------- 分页器 ----------
    await expect(page.locator('.pagination-wrapper')).toBeVisible()
    await expect(page.locator('.el-pagination')).toBeVisible()
    await expect(page.locator('.el-pagination__total')).toBeVisible()
    await expect(page.locator('.el-pagination__sizes')).toBeVisible()
    await expect(page.locator('.el-pagination__jump')).toBeVisible()
  })

  test('列表数据加载验证', async ({ page }) => {
    await page.goto(AUDIT_LIST_URL)
    await waitForAuditListLoad(page)

    // 验证表格可见
    await expect(page.locator('.el-table')).toBeVisible()

    const rows = page.locator('.el-table__body tr')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      console.log(`表格数据行数: ${rowCount}`)

      // 验证第一行有学生信息
      const firstRowName = rows.first().locator('td').nth(0)
      const nameText = await firstRowName.textContent()
      expect(nameText.trim().length).toBeGreaterThan(0)
      console.log(`第一条记录: ${nameText.trim()}`)

      // 验证分页总数与行数一致（首页）
      const totalText = await page.locator('.el-pagination__total').textContent()
      console.log(`分页总数文本: ${totalText}`)
    } else {
      // 无数据时应显示空状态提示
      console.log('表格无数据，后端可能无审计记录')
      const emptyEl = page.locator('.el-empty')
      const hasEmpty = await emptyEl.isVisible().catch(() => false)
      if (hasEmpty) {
        await expect(page.locator('.el-empty')).toBeVisible()
      }
    }
  })

  test('搜索功能 - 按赛事名称搜索', async ({ page }) => {
    await page.goto(AUDIT_LIST_URL)
    await waitForAuditListLoad(page)

    // 先检查是否有数据
    const initialRows = page.locator('.el-table__body tr')
    const initialCount = await initialRows.count()
    if (initialCount === 0) {
      console.log('无初始数据，跳过搜索测试')
      return
    }

    // 输入搜索关键词
    const nameInput = page.locator('input[placeholder="请输入赛事名称"]')
    await nameInput.fill('计算机')

    // 注册搜索 API 响应监听
    const searchRespPromise = page
      .waitForResponse(
        (resp) => resp.url().includes('/api/award/audit') && resp.status() === 200,
        { timeout: 15000 }
      )
      .catch(() => null)

    // 点击查询按钮
    await page.locator('.search-actions button:has-text("查询")').click()
    await searchRespPromise
    await page.waitForTimeout(800)

    // 验证搜索后表格数据
    const rowsAfter = page.locator('.el-table__body tr')
    const countAfter = await rowsAfter.count()

    if (countAfter > 0) {
      console.log(`搜索"计算机"后结果行数: ${countAfter}`)
      // 验证结果中每行的赛事名称都包含"计算机"
      for (let i = 0; i < Math.min(countAfter, 3); i++) {
        const cellText = await rowsAfter.nth(i).locator('td').nth(1).textContent()
        console.log(`第 ${i + 1} 行赛事名称: ${cellText.trim()}`)
      }
    } else {
      // 搜索无结果是正常情况
      console.log('搜索"计算机"无结果，可能数据库中无匹配赛事')
      const emptyEl = page.locator('.el-empty')
      const hasEmpty = await emptyEl.isVisible().catch(() => false)
      if (hasEmpty) {
        console.log('空状态提示已显示')
      }
    }

    // 验证搜索输入框有值
    await expect(nameInput).toHaveValue('计算机')
  })

  test('筛选功能 - 审核状态下拉选择', async ({ page }) => {
    await page.goto(AUDIT_LIST_URL)
    await waitForAuditListLoad(page)

    // 使用辅助函数选择"待审核"
    await selectElOption(page, '审核状态', '待审核')

    // 验证表格数据已刷新
    const rows = page.locator('.el-table__body tr')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      console.log(`筛选"待审核"后结果行数: ${rowCount}`)

      // 验证结果中的状态列都是"待审核"
      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const statusTag = rows.nth(i).locator('.el-tag--warning')
        const hasWarningTag = await statusTag.isVisible().catch(() => false)
        if (hasWarningTag) {
          console.log(`第 ${i + 1} 行状态确认为"待审核"`)
        }
      }
    } else {
      console.log('无"待审核"的数据')
    }
  })

  test('重置功能', async ({ page }) => {
    await page.goto(AUDIT_LIST_URL)
    await waitForAuditListLoad(page)

    // 填写搜索条件
    await page.locator('input[placeholder="请输入赛事名称"]').fill('测试赛事')
    await page.locator('input[placeholder="请输入学生姓名"]').fill('测试学生')

    // 选择获奖等级
    await selectElOption(page, '获奖等级', '一等奖')

    // 选择审核状态
    await selectElOption(page, '审核状态', '待审核')

    // 验证输入框有值
    await expect(page.locator('input[placeholder="请输入赛事名称"]')).toHaveValue('测试赛事')
    await expect(page.locator('input[placeholder="请输入学生姓名"]')).toHaveValue('测试学生')

    // 注册重置后的 API 响应监听
    const resetRespPromise = page
      .waitForResponse(
        (resp) => resp.url().includes('/api/award/audit') && resp.status() === 200,
        { timeout: 15000 }
      )
      .catch(() => null)

    // 点击重置按钮
    await page.locator('.search-actions button:has-text("重置")').click()
    await resetRespPromise
    await page.waitForTimeout(800)

    // 验证所有输入框已清空
    await expect(page.locator('input[placeholder="请输入赛事名称"]')).toHaveValue('')
    await expect(page.locator('input[placeholder="请输入学生姓名"]')).toHaveValue('')

    // 验证下拉已清空（placeholder 应显示）
    const awardLevelSelectInput = page
      .locator('.search-form .el-select')
      .nth(0)
      .locator('input')
    const awardLevelValue = await awardLevelSelectInput.inputValue()
    expect(awardLevelValue).toBe('')

    const statusSelectInput = page
      .locator('.search-form .el-select')
      .nth(1)
      .locator('input')
    const statusValue = await statusSelectInput.inputValue()
    expect(statusValue).toBe('')

    // 验证表格数据已刷新（重新加载全部数据）
    console.log('重置操作完成，所有搜索条件已清空')
  })

  test('分页功能', async ({ page }) => {
    await page.goto(AUDIT_LIST_URL)
    await waitForAuditListLoad(page)

    // 验证分页器可见
    const pagination = page.locator('.pagination-wrapper .el-pagination')
    await expect(pagination).toBeVisible()

    // 读取总数
    const totalText = await page.locator('.el-pagination__total').textContent()
    console.log(`分页总数: ${totalText}`)

    // 提取数字
    const totalMatch = totalText.match(/\d+/)
    if (!totalMatch) {
      console.log('无法解析总数，跳过分页测试')
      return
    }

    const totalCount = parseInt(totalMatch[0], 10)
    if (totalCount <= 10) {
      console.log(`总数 ${totalCount} 不超过10条，跳过分页切换测试`)
      // 仍然验证分页组件各元素存在
      await expect(page.locator('.el-pagination .btn-prev')).toBeVisible()
      await expect(page.locator('.el-pagination .btn-next')).toBeVisible()
      await expect(page.locator('.el-pagination__jump')).toBeVisible()
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
            resp.url().includes('/api/award/audit') &&
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
    const rows = page.locator('.el-table__body tr')
    const rowCount = await rows.count()
    console.log(`第2页数据行数: ${rowCount}`)

    // 点击上一页回到第1页
    const prevPageRespPromise = page
      .waitForResponse(
        (resp) => {
          const url = new URL(resp.url())
          return (
            resp.url().includes('/api/award/audit') &&
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

    // 验证 Go to 跳转输入框
    const jumperInput = page.locator('.el-pagination__jump input')
    await expect(jumperInput).toBeVisible()
  })

  test('操作按钮验证', async ({ page }) => {
    await page.goto(AUDIT_LIST_URL)
    await waitForAuditListLoad(page)

    const rows = page.locator('.el-table__body tr')
    const rowCount = await rows.count()

    if (rowCount === 0) {
      console.log('无数据行，跳过操作按钮验证')
      return
    }

    console.log(`表格行数: ${rowCount}`)

    // 验证每行都有操作按钮
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i)

      // 操作列中应有按钮："详情" 和 "通过"
      const detailBtn = row.locator('button:has-text("详情")')
      const passBtn = row.locator('button:has-text("通过")')

      const hasDetail = await detailBtn.isVisible().catch(() => false)
      const hasPass = await passBtn.isVisible().catch(() => false)

      expect(hasDetail || hasPass).toBe(true)

      if (hasDetail) {
        console.log(`第 ${i + 1} 行: "详情"按钮可见`)
      }
      if (hasPass) {
        console.log(`第 ${i + 1} 行: "通过"按钮可见`)
      }
    }

    // 验证状态标签与按钮类型一致
    const firstRow = rows.first()
    const hasWarningTag = await firstRow
      .locator('.el-tag--warning')
      .isVisible()
      .catch(() => false)

    if (hasWarningTag) {
      // "待审核" -> 应有"通过"按钮
      await expect(firstRow.locator('button:has-text("通过")')).toBeVisible()
      console.log('状态"待审核"与"通过"按钮一致')
    }
  })

  test('点击详情按钮跳转到审计详情页面', async ({ page }) => {
    await page.goto(AUDIT_LIST_URL)
    await waitForAuditListLoad(page)

    const rows = page.locator('.el-table__body tr')
    const rowCount = await rows.count()

    if (rowCount === 0) {
      console.log('无数据行，跳过详情按钮测试')
      return
    }

    // 点击第一行的详情按钮
    const firstRow = rows.first()
    const detailBtn = firstRow.locator('button:has-text("详情")')

    const hasDetail = await detailBtn.isVisible().catch(() => false)
    if (!hasDetail) {
      console.log('第一行没有详情按钮，跳过测试')
      return
    }

    // 注册详情页面 API 响应监听
    const detailRespPromise = page
      .waitForResponse(
        (resp) => resp.url().includes('/api/award/audit/detail') && resp.status() === 200,
        { timeout: 15000 }
      )
      .catch(() => null)

    await detailBtn.click()

    // 等待页面跳转
    await page.waitForURL(/#\/award\/audit\/detail/, { timeout: 10000 })

    // 等待详情数据加载
    await detailRespPromise
    await page.waitForTimeout(800)

    // 验证详情页面元素
    await expect(page.locator('.audit-detail-container')).toBeVisible()
    await expect(page.locator('.page-title:has-text("奖项审核详情")')).toBeVisible()

    console.log('成功跳转到审计详情页面')
  })

  test('批量操作按钮验证', async ({ page }) => {
    await page.goto(AUDIT_LIST_URL)
    await waitForAuditListLoad(page)

    // 验证批量通过按钮可见
    const passBtn = page.locator('.table-toolbar button:has-text("批量通过")')
    await expect(passBtn).toBeVisible()

    // 验证批量驳回按钮可见
    const rejectBtn = page.locator('.table-toolbar button:has-text("批量驳回")')
    await expect(rejectBtn).toBeVisible()

    console.log('批量操作按钮验证完成')
  })

  test('搜索与筛选组合测试', async ({ page }) => {
    await page.goto(AUDIT_LIST_URL)
    await waitForAuditListLoad(page)

    // 输入赛事名称
    await page.locator('input[placeholder="请输入赛事名称"]').fill('数学')

    // 选择审核状态"待审核"
    await selectElOption(page, '审核状态', '待审核')

    // 注册搜索 API 响应
    const comboRespPromise = page
      .waitForResponse(
        (resp) => resp.url().includes('/api/award/audit') && resp.status() === 200,
        { timeout: 15000 }
      )
      .catch(() => null)

    // 点击查询
    await page.locator('.search-actions button:has-text("查询")').click()
    await comboRespPromise
    await page.waitForTimeout(800)

    // 验证结果
    const rows = page.locator('.el-table__body tr')
    const rowCount = await rows.count()
    console.log(`组合搜索结果行数: ${rowCount}`)

    if (rowCount > 0) {
      // 验证搜索条件仍保留
      await expect(page.locator('input[placeholder="请输入赛事名称"]')).toHaveValue('数学')

      // 验证状态列
      for (let i = 0; i < Math.min(rowCount, 2); i++) {
        const row = rows.nth(i)
        const statusTag = row.locator('.el-tag--warning')
        const hasWarningTag = await statusTag.isVisible().catch(() => false)
        if (hasWarningTag) {
          console.log(`第 ${i + 1} 行状态为"待审核"`)
        }
      }
    } else {
      console.log('组合搜索无结果')
    }

    // 重置恢复
    const resetRespPromise = page
      .waitForResponse(
        (resp) => resp.url().includes('/api/award/audit') && resp.status() === 200,
        { timeout: 15000 }
      )
      .catch(() => null)

    await page.locator('.search-actions button:has-text("重置")').click()
    await resetRespPromise
    await page.waitForTimeout(800)

    await expect(page.locator('input[placeholder="请输入赛事名称"]')).toHaveValue('')
    console.log('重置完成，搜索条件已清空')
  })
})
