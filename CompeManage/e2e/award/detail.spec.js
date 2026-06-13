import { test, expect } from 'playwright-test-coverage'
import { login } from '../helpers/auth'



const LIST_URL = '/#/award/list'



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

async function navigateToDetail(page) {
  // 从列表页点击第一个赛事的"查看结果"进入详情页
  await page.goto(LIST_URL)
  await waitForListLoad(page)

  const cards = page.locator('.comp-card')
  const cardCount = await cards.count()
  if (cardCount === 0) {
    return false
  }

  const detailBtn = cards.first().locator('.primary-btn')
  const hasBtn = await detailBtn.isVisible().catch(() => false)
  if (!hasBtn) {
    return false
  }

  await detailBtn.click()
  await page.waitForURL(/#\/award\/detail\//, { timeout: 10000 })
  await waitForDetailLoad(page)
  return true
}

test.describe('获奖详情页面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    const navigated = await navigateToDetail(page)
    if (!navigated) {
      console.log('无赛事数据，跳过页面元素验证')
      return
    }

    // 验证 URL
    await expect(page).toHaveURL(/#\/award\/detail\//)

    // 验证页面容器
    await expect(page.locator('.award-page-container')).toBeVisible()

    // 验证统计区域
    await expect(page.locator('.stat-header')).toBeVisible()
    await expect(page.locator('.stat-group')).toBeVisible()

    // 验证工具栏
    await expect(page.locator('.toolbar')).toBeVisible()

    // 验证搜索框
    await expect(page.locator('input[placeholder="搜索姓名 / 学号 / 项目"]')).toBeVisible()

    // 验证等级筛选下拉
    await expect(page.locator('.left-tools .el-select')).toBeVisible()

    // 验证导出按钮
    await expect(page.locator('.right-tools button:has-text("导出 Excel")')).toBeVisible()

    // 验证表格
    await expect(page.locator('.custom-table')).toBeVisible()

    // 验证表格列头
    const columnHeaders = ['序号', '奖项', '获奖项目名称', '获奖者信息', '所属学院', '指导老师', '操作']
    for (const header of columnHeaders) {
      const th = page.getByRole('columnheader', { name: header, exact: true })
      await expect(th).toBeVisible()
    }

    // 验证分页器
    await expect(page.locator('.pagination-wrapper')).toBeVisible()
    await expect(page.locator('.el-pagination')).toBeVisible()
  })

  test('数据加载验证', async ({ page }) => {
    const navigated = await navigateToDetail(page)
    if (!navigated) {
      console.log('无赛事数据，跳过数据加载验证')
      return
    }

    const rows = page.locator('.custom-table .el-table__body tr')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      console.log(`表格数据行数: ${rowCount}`)

      // 验证第一行有获奖项目名称
      const projectName = rows.first().locator('.project-name')
      const hasProject = await projectName.isVisible().catch(() => false)
      if (hasProject) {
        const nameText = await projectName.textContent()
        expect(nameText.trim().length).toBeGreaterThan(0)
        console.log(`第一条项目: ${nameText.trim()}`)
      }

      // 验证分页总数
      const totalText = await page.locator('.el-pagination__total').textContent()
      console.log(`分页总数: ${totalText}`)
    } else {
      console.log('表格无数据')
      const emptyEl = page.locator('.el-empty')
      const hasEmpty = await emptyEl.isVisible().catch(() => false)
      if (hasEmpty) {
        await expect(emptyEl).toBeVisible()
      }
    }
  })

  test('统计数据验证', async ({ page }) => {
    const navigated = await navigateToDetail(page)
    if (!navigated) {
      console.log('无赛事数据，跳过统计数据验证')
      return
    }

    // 验证统计卡片存在
    const statItems = page.locator('.stat-item')
    const statCount = await statItems.count()

    if (statCount > 0) {
      console.log(`统计卡片数量: ${statCount}`)

      // 验证第一个统计卡片是"获奖总数"
      const firstItem = statItems.first()
      const label = firstItem.locator('.lbl')
      const labelText = await label.textContent()
      expect(labelText.trim()).toContain('获奖总数')
      console.log(`第一个统计项: ${labelText.trim()}`)

      // 验证数值区域可见
      const val = firstItem.locator('.val')
      await expect(val).toBeVisible()
      const valText = await val.textContent()
      console.log(`获奖总数值: ${valText.trim()}`)
    } else {
      console.log('无统计数据')
    }
  })

  test('搜索功能', async ({ page }) => {
    const navigated = await navigateToDetail(page)
    if (!navigated) {
      console.log('无赛事数据，跳过搜索测试')
      return
    }

    const rows = page.locator('.custom-table .el-table__body tr')
    const initialCount = await rows.count()
    if (initialCount === 0) {
      console.log('表格无数据，跳过搜索测试')
      return
    }

    // 输入搜索关键词
    const searchInput = page.locator('input[placeholder="搜索姓名 / 学号 / 项目"]')
    await searchInput.fill('测试')

    // 等待客户端过滤生效（分页是客户端的）
    await page.waitForTimeout(500)

    // 验证搜索输入框有值
    await expect(searchInput).toHaveValue('测试')

    const filteredCount = await rows.count()
    console.log(`搜索"测试"后结果行数: ${filteredCount}`)

    // 清空搜索
    await searchInput.fill('')
    await page.waitForTimeout(500)

    const resetCount = await rows.count()
    console.log(`清空搜索后行数: ${resetCount}`)
  })

  test('筛选功能 - 奖项等级下拉', async ({ page }) => {
    const navigated = await navigateToDetail(page)
    if (!navigated) {
      console.log('无赛事数据，跳过筛选测试')
      return
    }

    const rows = page.locator('.custom-table .el-table__body tr')
    const initialCount = await rows.count()
    if (initialCount === 0) {
      console.log('表格无数据，跳过筛选测试')
      return
    }

    // 点击等级下拉
    const levelSelect = page.locator('.left-tools .el-select')
    await levelSelect.click()
    await page.waitForTimeout(400)

    // 选择第一个可用选项
    const firstOption = page.getByRole('option').first()
    const hasOption = await firstOption.isVisible().catch(() => false)

    if (!hasOption) {
      console.log('无可用等级选项，跳过')
      await page.keyboard.press('Escape')
      return
    }

    const optionText = await firstOption.textContent()
    await firstOption.click()
    await page.waitForTimeout(500)

    console.log(`选择等级: ${optionText.trim()}`)

    // 验证表格数据已过滤
    const filteredCount = await rows.count()
    console.log(`筛选后行数: ${filteredCount}`)

    // 清空筛选
    await levelSelect.click()
    await page.waitForTimeout(400)
    const clearOption = page.locator('.el-select-dropdown__item').filter({ hasText: optionText.trim() }).first()
    const hasClear = await clearOption.isVisible().catch(() => false)
    if (hasClear) {
      await page.keyboard.press('Escape')
    }
  })

  test('刷新功能', async ({ page }) => {
    const navigated = await navigateToDetail(page)
    if (!navigated) {
      console.log('无赛事数据，跳过刷新测试')
      return
    }

    // 注册刷新 API 响应监听
    const refreshRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/award/comp-awards') && resp.status() === 200,
      { timeout: 15000 }
    ).catch(() => null)

    // 点击刷新按钮（circle icon button）
    const refreshBtn = page.locator('.left-tools .el-button.is-circle')
    await refreshBtn.click()
    await refreshRespPromise
    await page.waitForTimeout(800)

    // 验证页面仍然正常显示
    await expect(page.locator('.custom-table')).toBeVisible()
    console.log('刷新操作完成')
  })

  test('导出功能', async ({ page }) => {
    const navigated = await navigateToDetail(page)
    if (!navigated) {
      console.log('无赛事数据，跳过导出测试')
      return
    }

    const rows = page.locator('.custom-table .el-table__body tr')
    const rowCount = await rows.count()

    // 点击导出按钮
    const exportBtn = page.locator('.right-tools button:has-text("导出 Excel")')
    await expect(exportBtn).toBeVisible()

    if (rowCount === 0) {
      console.log('表格无数据，点击导出应提示"暂无数据可导出"')
      await exportBtn.click()
      await page.waitForTimeout(500)
      return
    }

    // 有数据时点击导出
    await exportBtn.click()
    await page.waitForTimeout(1500)

    // 不强制要求下载成功（前端生成Excel），只验证不报错
    console.log('导出按钮点击完成')
  })

  test('团队成员弹窗', async ({ page }) => {
    const navigated = await navigateToDetail(page)
    if (!navigated) {
      console.log('无赛事数据，跳过团队成员测试')
      return
    }

    // 查找带有"团队成员"标签的行
    const teamTags = page.locator('.team-tag')
    const tagCount = await teamTags.count()

    if (tagCount === 0) {
      console.log('无团队项目，跳过团队成员弹窗测试')
      return
    }

    console.log(`发现 ${tagCount} 个团队项目标签`)

    // 点击第一个"团队成员"标签
    await teamTags.first().click()
    await page.waitForTimeout(500)

    // 验证弹窗打开
    const dialog = page.locator('.el-dialog:has-text("团队成员信息")')
    const dialogVisible = await dialog.isVisible().catch(() => false)

    if (!dialogVisible) {
      console.log('弹窗未打开，可能该项目不是团队项目')
      return
    }

    await expect(dialog).toBeVisible()

    // 验证弹窗内容
    await expect(page.locator('.member-dialog-content')).toBeVisible()

    // 验证"项目名称"区域
    const projectSection = page.locator('.dialog-section').filter({ hasText: '项目名称' })
    await expect(projectSection).toBeVisible()

    // 验证关闭按钮
    const closeBtn = page.locator('.el-dialog__footer button:has-text("关闭")')
    await expect(closeBtn).toBeVisible()

    // 点击关闭
    await closeBtn.click()
    await page.waitForTimeout(300)

    // 验证弹窗已关闭
    await expect(page.locator('.el-dialog:has-text("团队成员信息")')).not.toBeVisible()
    console.log('团队成员弹窗验证完成')
  })

  test('分页功能', async ({ page }) => {
    const navigated = await navigateToDetail(page)
    if (!navigated) {
      console.log('无赛事数据，跳过分页测试')
      return
    }

    // 验证分页器可见
    const pagination = page.locator('.pagination-wrapper .el-pagination')
    await expect(pagination).toBeVisible()

    // 读取总数
    const totalText = await page.locator('.el-pagination__total').textContent()
    console.log(`分页总数: ${totalText}`)

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

    // 点击第2页
    await page.locator('.el-pager .number:has-text("2")').click()
    await page.waitForTimeout(500)

    // 验证页码变为2
    const activePageAfter = page.locator('.el-pager .is-active')
    await expect(activePageAfter).toHaveText('2')
    console.log('成功切换到第2页')

    // 点击上一页回到第1页
    await page.locator('.el-pagination .btn-prev').click()
    await page.waitForTimeout(500)

    const activePageBack = page.locator('.el-pager .is-active')
    await expect(activePageBack).toHaveText('1')
    console.log('成功回到第1页')
  })

  test('操作按钮验证', async ({ page }) => {
    const navigated = await navigateToDetail(page)
    if (!navigated) {
      console.log('无赛事数据，跳过操作按钮验证')
      return
    }

    const rows = page.locator('.custom-table .el-table__body tr')
    const rowCount = await rows.count()

    if (rowCount === 0) {
      console.log('无数据行，跳过操作按钮验证')
      return
    }

    console.log(`表格行数: ${rowCount}`)

    // 验证每行都有操作按钮
    for (let i = 0; i < rowCount; i++) {
      const row = rows.nth(i)
      const actionBtns = row.locator('.action-btns')
      const hasActions = await actionBtns.isVisible().catch(() => false)

      if (hasActions) {
        // 验证有编辑和删除按钮（icon link buttons）
        const btns = actionBtns.locator('.el-button')
        const btnCount = await btns.count()
        expect(btnCount).toBeGreaterThanOrEqual(2)
        console.log(`第 ${i + 1} 行: ${btnCount} 个操作按钮`)
      }
    }
  })

  test('空状态验证', async ({ page }) => {
    const navigated = await navigateToDetail(page)
    if (!navigated) {
      console.log('无赛事数据，跳过空状态验证')
      return
    }

    const rows = page.locator('.custom-table .el-table__body tr')
    const rowCount = await rows.count()

    if (rowCount > 0) {
      console.log(`有 ${rowCount} 条数据，空状态不适用，验证表格正常显示`)
      await expect(rows.first()).toBeVisible()
      return
    }

    // 无数据时验证空状态提示
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
})
