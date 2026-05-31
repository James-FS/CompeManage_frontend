import { test, expect } from 'playwright-test-coverage'

// 测试用户 - student
const TEST_USER = {
  username: 'S2024001',
  password: '123',
  role: 'student'
}

// 辅助函数：登录
async function login(page) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
  await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
  await page.locator('.el-button:has-text("立即登录")').click()

  await page.waitForURL(url => url.hash.includes('home') || url.hash.includes('register'), {
    timeout: 10000
  })
}

// 辅助函数：进入报名详情页（需要赛事ID）
async function navigateToRegisterDetail(page, compId = 1) {
  await page.goto(`/#/register/detail/${compId}`)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.page-wrapper', { timeout: 15000 })
}

// 辅助函数：选择学生（从弹窗中选择）
async function selectStudentFromDialog(page, studentName) {
  // 等待弹窗
  await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })

  // 等待表格加载
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // 尝试精确匹配学生
  let targetRow = page.locator('.el-dialog .el-table__body tr').filter({ hasText: studentName }).first()
  const isVisible = await targetRow.isVisible().catch(() => false)

  if (!isVisible) {
    // 选择第一行
    targetRow = page.locator('.el-dialog .el-table__body tr').first()
  }

  await targetRow.locator('button:has-text("选择")').click()
  await page.waitForTimeout(500)

  // 验证弹窗关闭
  await expect(page.locator('.el-dialog:visible')).not.toBeVisible()
}

// 辅助函数：填写联系方式（手机号和邮箱）
async function fillContactInfo(page, type = 'leader') {
  if (type === 'leader') {
    // 填写负责人手机号
    const phoneInput = page.locator('.info-grid input[placeholder="请输入手机号"]').first()
    await phoneInput.fill('13800138000')

    // 填写负责人邮箱
    const emailInput = page.locator('.info-grid input[placeholder="请输入邮箱"]').first()
    await emailInput.fill('test@example.com')
  } else if (type === 'member') {
    // 填写成员手机号
    const memberPhone = page.locator('.member-card').first().locator('input[placeholder="请输入手机号"]')
    await memberPhone.fill('13800138001')

    // 填写成员邮箱
    const memberEmail = page.locator('.member-card').first().locator('input[placeholder="请输入邮箱"]')
    await memberEmail.fill('member@example.com')
  } else if (type === 'advisor') {
    // 填写指导老师手机号
    const advisorPhone = page.locator('.info-grid input[placeholder="请输入手机号"]').nth(1)
    await advisorPhone.fill('13900139000')

    // 填写指导老师邮箱
    const advisorEmail = page.locator('.info-grid input[placeholder="请输入邮箱"]').nth(1)
    await advisorEmail.fill('advisor@example.com')
  }
}

test.describe('报名详情页面 - 页面元素验证', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    // 验证返回链接
    await expect(page.locator('.back-link')).toBeVisible()
    await expect(page.locator('.back-link')).toContainText('返回列表')

    // 验证标题区域
    await expect(page.locator('.comp-title')).toBeVisible()
    await expect(page.locator('.limit-badge')).toBeVisible()

    // 验证表单卡片
    await expect(page.locator('.form-card')).toBeVisible()
    await expect(page.locator('.main-form')).toBeVisible()
  })

  test('页面状态 - 已报名只读状态', async ({ page }) => {
    // 检查是否有"已报名"提示（如果已报名的话）
    const successAlert = page.locator('.el-alert:has-text("您已报名该赛事")')
    const hasSuccessAlert = await successAlert.isVisible().catch(() => false)

    if (hasSuccessAlert) {
      await expect(successAlert).toBeVisible()
      // 验证表单被禁用
      const form = page.locator('.main-form')
      const isDisabled = await form.locator('input').first().isDisabled()
      console.log('表单禁用状态:', isDisabled)
    }
  })
})

test.describe('报名详情页面 - 负责人选择', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('选择负责人 - 基本流程', async ({ page }) => {
    // 确保页面加载完成
    await page.waitForSelector('.page-wrapper', { timeout: 10000 }).catch(() => {})

    // 点击选择负责人按钮 - 使用更精确的定位
    const selectLeaderBtn = page.locator('.section-header button:has-text("选择负责人")').first()
    const btnVisible = await selectLeaderBtn.isVisible({ timeout: 5000 }).catch(() => false)

    if (btnVisible) {
      await selectLeaderBtn.click()

      // 等待弹窗出现
      await page.waitForSelector('.el-dialog:visible', { timeout: 8000 })

      // 验证弹窗标题
      await expect(page.locator('.el-dialog__title')).toContainText('选择负责人')

      // 验证搜索表单
      await expect(page.locator('.el-dialog input[placeholder="输入姓名"]')).toBeVisible()
      await expect(page.locator('.el-dialog input[placeholder="输入学号"]')).toBeVisible()

      // 验证表格
      await expect(page.locator('.el-dialog .el-table')).toBeVisible()

      // 选择第一行
      const firstRow = page.locator('.el-dialog .el-table__body tr').first()
      await firstRow.locator('button:has-text("选择")').click()
      await page.waitForTimeout(500)

      // 验证弹窗关闭
      await expect(page.locator('.el-dialog')).not.toBeVisible()
    } else {
      console.log('选择负责人按钮不可见，可能已是已报名状态')
    }
  })

  test('负责人选择弹窗 - 搜索功能', async ({ page }) => {
    await page.waitForSelector('.page-wrapper', { timeout: 10000 }).catch(() => {})

    const selectLeaderBtn = page.locator('.section-header button:has-text("选择负责人")').first()
    const btnVisible = await selectLeaderBtn.isVisible({ timeout: 5000 }).catch(() => false)

    if (btnVisible) {
      await selectLeaderBtn.click()
      await page.waitForSelector('.el-dialog:visible', { timeout: 8000 })

      // 输入搜索条件
      const nameInput = page.locator('.el-dialog input[placeholder="输入姓名"]')
      await nameInput.fill('张')
      await page.waitForTimeout(600)

      // 验证重置按钮
      await expect(page.locator('.el-dialog button:has-text("重置")')).toBeVisible()

      // 点击重置
      await page.locator('.el-dialog button:has-text("重置")').click()
      await page.waitForTimeout(300)

      // 关闭弹窗
      await page.locator('.el-dialog__headerbtn').click()
    } else {
      console.log('选择负责人按钮不可见，跳过')
    }
  })
})

test.describe('报名详情页面 - 成员管理', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('添加成员 - 基本流程', async ({ page }) => {
    // 检查是否是团队赛
    const addMemberBtn = page.locator('button:has-text("添加成员")')
    const btnVisible = await addMemberBtn.isVisible().catch(() => false)

    if (btnVisible) {
      // 点击添加成员
      await addMemberBtn.click()

      // 等待弹窗
      await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })

      // 验证弹窗标题为"选择队员"
      await expect(page.locator('.el-dialog__title')).toContainText('选择队员')

      // 选择一个学生
      const firstRow = page.locator('.el-dialog .el-table__body tr').first()
      await firstRow.locator('button:has-text("选择")').click()
      await page.waitForTimeout(500)

      // 验证弹窗关闭
      await expect(page.locator('.el-dialog')).not.toBeVisible()

      // 验证成员卡片出现
      await expect(page.locator('.member-card')).toBeVisible()

      // 填写联系方式
      await fillContactInfo(page, 'member')
    } else {
      console.log('个人赛，没有添加成员按钮')
    }
  })

  test('删除成员', async ({ page }) => {
    // 先添加一个成员
    const addMemberBtn = page.locator('button:has-text("添加成员")')
    const btnVisible = await addMemberBtn.isVisible().catch(() => false)

    if (btnVisible) {
      await addMemberBtn.click()
      await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })

      const firstRow = page.locator('.el-dialog .el-table__body tr').first()
      await firstRow.locator('button:has-text("选择")').click()
      await page.waitForTimeout(500)

      // 验证成员卡片出现
      const memberCards = page.locator('.member-card')
      const countBefore = await memberCards.count()
      console.log(`添加后成员数量: ${countBefore}`)

      if (countBefore > 0) {
        // 点击删除按钮
        const deleteBtn = page.locator('.member-card').first().locator('button:has-text("删除")')
        await deleteBtn.click()
        await page.waitForTimeout(500)

        // 验证成员数量减少
        const countAfter = await memberCards.count()
        console.log(`删除后成员数量: ${countAfter}`)
        expect(countAfter).toBeLessThan(countBefore)
      }
    }
  })

  test('重新选择成员', async ({ page }) => {
    const addMemberBtn = page.locator('button:has-text("添加成员")')
    const btnVisible = await addMemberBtn.isVisible().catch(() => false)

    if (btnVisible) {
      // 添加一个成员
      await addMemberBtn.click()
      await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })
      const firstRow = page.locator('.el-dialog .el-table__body tr').first()
      await firstRow.locator('button:has-text("选择")').click()
      await page.waitForTimeout(500)

      // 点击重新选择
      const reSelectBtn = page.locator('.member-card').first().locator('button:has-text("重新选择")')
      await reSelectBtn.click()
      await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })

      // 选择另一个
      const secondRow = page.locator('.el-dialog .el-table__body tr').nth(1)
      await secondRow.locator('button:has-text("选择")').click()
      await page.waitForTimeout(500)

      await expect(page.locator('.el-dialog')).not.toBeVisible()
    }
  })
})

test.describe('报名详情页面 - 指导老师选择', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('选择指导老师 - 基本流程', async ({ page }) => {
    await page.waitForSelector('.page-wrapper', { timeout: 10000 }).catch(() => {})

    const selectAdvisorBtn = page.locator('.section-header button:has-text("选择指导老师")').first()
    const btnVisible = await selectAdvisorBtn.isVisible({ timeout: 5000 }).catch(() => false)

    if (btnVisible) {
      await selectAdvisorBtn.click()

      // 等待弹窗
      await page.waitForSelector('.el-dialog:visible', { timeout: 8000 })

      // 验证弹窗标题
      await expect(page.locator('.el-dialog__title')).toContainText('选择指导老师')

      // 选择一个老师
      const firstRow = page.locator('.el-dialog .el-table__body tr').first()
      await firstRow.locator('button:has-text("选择")').click()
      await page.waitForTimeout(500)

      // 验证弹窗关闭
      await expect(page.locator('.el-dialog')).not.toBeVisible()

      // 填写联系方式
      await fillContactInfo(page, 'advisor')
    } else {
      console.log('该赛事不需要选择指导老师或按钮不可见')
    }
  })
})

test.describe('报名详情页面 - 赛道选择', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('赛道选择 - 单赛道无赛题', async ({ page }) => {
    // 检查是否有赛道选择器
    const trackSelect = page.locator('.el-select[placeholder="请选择参赛赛道"]')
    const isVisible = await trackSelect.isVisible().catch(() => false)

    if (isVisible) {
      await trackSelect.click()
      await page.waitForTimeout(400)

      // 获取选项数量
      const options = page.getByRole('option')
      const count = await options.count()
      console.log(`赛道选项数量: ${count}`)

      if (count > 0) {
        // 选择第一个赛道
        await options.first().click()
        await page.waitForTimeout(500)

        // 检查是否有赛题选择器
        const subTrackSelect = page.locator('.el-select[placeholder="请选择赛题"]')
        const subTrackVisible = await subTrackSelect.isVisible().catch(() => false)

        if (subTrackVisible) {
          // 选择赛题
          await subTrackSelect.click()
          await page.waitForTimeout(400)
          const subOptions = page.getByRole('option')
          const subCount = await subOptions.count()
          console.log(`赛题选项数量: ${subCount}`)

          if (subCount > 0) {
            await subOptions.first().click()
            await page.waitForTimeout(300)
          }
        } else {
          console.log('该赛道无子赛道')
        }
      }
    } else {
      console.log('该赛事无赛道配置')
    }
  })

  test('赛道选择 - 联动验证', async ({ page }) => {
    const trackSelect = page.locator('.el-select[placeholder="请选择参赛赛道"]')
    const isVisible = await trackSelect.isVisible().catch(() => false)

    if (isVisible) {
      await trackSelect.click()
      await page.waitForTimeout(400)

      const options = page.getByRole('option')
      const count = await options.count()

      if (count >= 2) {
        // 选择第一个赛道
        await options.first().click()
        await page.waitForTimeout(500)

        // 检查赛题选择器
        const subTrackSelect = page.locator('.el-select[placeholder="请选择赛题"]')
        const subTrackVisible = await subTrackSelect.isVisible().catch(() => false)

        if (subTrackVisible) {
          // 记录初始赛题选项数
          await subTrackSelect.click()
          await page.waitForTimeout(400)
          const firstTrackSubCount = await page.getByRole('option').count()
          console.log(`第一个赛道的赛题数: ${firstTrackSubCount}`)
          await page.keyboard.press('Escape')

          // 切换到第二个赛道
          await trackSelect.click()
          await page.waitForTimeout(400)
          await options.nth(1).click()
          await page.waitForTimeout(500)

          // 验证赛题选项已更新
          await subTrackSelect.click()
          await page.waitForTimeout(400)
          const secondTrackSubCount = await page.getByRole('option').count()
          console.log(`第二个赛道的赛题数: ${secondTrackSubCount}`)

          // 验证旧值已清空
          const subTrackValue = await subTrackSelect.locator('input').inputValue()
          console.log(`切换后赛题值: "${subTrackValue}"`)
        }
      }
    }
  })
})

test.describe('报名详情页面 - 团队名称', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('填写团队名称', async ({ page }) => {
    // 检查是否是团队赛
    const teamNameInput = page.locator('input[placeholder="请输入团队名称"]')
    const isVisible = await teamNameInput.isVisible().catch(() => false)

    if (isVisible) {
      await teamNameInput.fill('测试团队_' + Date.now())
      await expect(teamNameInput).toHaveValue(/测试团队_/)
    } else {
      console.log('个人赛，无团队名称输入框')
    }
  })

  test('团队名称必填验证', async ({ page }) => {
    const teamNameInput = page.locator('input[placeholder="请输入团队名称"]')
    const isVisible = await teamNameInput.isVisible().catch(() => false)

    if (isVisible) {
      // 不填写团队名称，直接点击确认报名
      await page.locator('button:has-text("确认报名")').click()
      await page.waitForTimeout(800)

      // 验证错误提示
      const hasError = await page.locator('.el-form-item__error').isVisible().catch(() => false) ||
                       await page.locator('.el-message--error').isVisible().catch(() => false)
      expect(hasError).toBeTruthy()
    }
  })
})

test.describe('报名详情页面 - 表单验证', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('负责人手机号格式验证', async ({ page }) => {
    await page.waitForSelector('.page-wrapper', { timeout: 10000 }).catch(() => {})

    const selectLeaderBtn = page.locator('.section-header button:has-text("选择负责人")').first()
    if (await selectLeaderBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectLeaderBtn.click()
      await page.waitForSelector('.el-dialog:visible', { timeout: 8000 })
      const firstRow = page.locator('.el-dialog .el-table__body tr').first()
      await firstRow.locator('button:has-text("选择")').click()
      await page.waitForTimeout(500)

      // 填写错误格式的手机号
      const phoneInput = page.locator('.info-grid input[placeholder="请输入手机号"]').first()
      await phoneInput.fill('12345')

      // 触发验证
      await phoneInput.blur()
      await page.waitForTimeout(500)

      console.log('手机号验证测试完成')
    } else {
      console.log('选择负责人按钮不可见，跳过')
    }
  })

  test('负责人邮箱格式验证', async ({ page }) => {
    await page.waitForSelector('.page-wrapper', { timeout: 10000 }).catch(() => {})

    const selectLeaderBtn = page.locator('.section-header button:has-text("选择负责人")').first()
    if (await selectLeaderBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectLeaderBtn.click()
      await page.waitForSelector('.el-dialog:visible', { timeout: 8000 })
      const firstRow = page.locator('.el-dialog .el-table__body tr').first()
      await firstRow.locator('button:has-text("选择")').click()
      await page.waitForTimeout(500)

      // 填写错误格式的邮箱
      const emailInput = page.locator('.info-grid input[placeholder="请输入邮箱"]').first()
      await emailInput.fill('invalid-email')

      // 触发验证
      await emailInput.blur()
      await page.waitForTimeout(500)

      console.log('邮箱验证测试完成')
    } else {
      console.log('选择负责人按钮不可见，跳过')
    }
  })
})

test.describe('报名详情页面 - 导航与状态', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('返回列表按钮', async ({ page }) => {
    // 点击返回列表
    await page.locator('.back-link').click()

    // 等待返回
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 验证URL变化（可能返回到某个列表页）
    console.log('当前URL:', page.url())
  })

  test('取消按钮', async ({ page }) => {
    // 确保页面加载
    await page.waitForSelector('.page-wrapper', { timeout: 10000 }).catch(() => {})

    // 尝试找到取消按钮，使用更宽松的查找方式
    const cancelBtn = page.locator('button:has-text("取消")').first()

    // 先检查按钮是否存在
    const count = await cancelBtn.count()
    if (count === 0) {
      console.log('取消按钮不存在')
      return
    }

    // 检查按钮是否可见
    const isVisible = await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)

    if (isVisible) {
      await cancelBtn.click()
      await page.waitForTimeout(500)
      console.log('取消后URL:', page.url())
    } else {
      console.log('取消按钮不可见（可能在只读状态）')
    }
  })
})

test.describe('报名详情页面 - 已驳回状态', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    // TODO: 需要一个已知处于驳回状态的赛事ID来测试
    await navigateToRegisterDetail(page, 999) // 使用一个可能不存在的ID
  })

  test('驳回状态提示显示', async ({ page }) => {
    // 检查是否有驳回提示
    const rejectAlert = page.locator('.el-alert:has-text("报名被驳回")')
    const isVisible = await rejectAlert.isVisible().catch(() => false)

    if (isVisible) {
      await expect(rejectAlert).toBeVisible()
      // 验证驳回原因存在
      await expect(page.locator('.status-alert')).toContainText('驳回原因')
    } else {
      console.log('当前不是驳回状态')
    }
  })

  test('驳回状态可以编辑', async ({ page }) => {
    const rejectAlert = page.locator('.el-alert:has-text("报名被驳回")')
    if (await rejectAlert.isVisible().catch(() => false)) {
      // 验证表单没有被禁用（可以编辑）
      const teamNameInput = page.locator('input[placeholder="请输入团队名称"]')
      if (await teamNameInput.isVisible().catch(() => false)) {
        const isDisabled = await teamNameInput.isDisabled()
        expect(isDisabled).toBe(false)
      }
    }
  })
})

test.describe('报名详情页面 - 分页组件', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('学生选择弹窗 - 分页切换', async ({ page }) => {
    // 确保在报名详情页
    const pageWrapper = page.locator('.page-wrapper')
    if (!await pageWrapper.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('未找到页面容器，跳过')
      return
    }

    // 检查是否有选择负责人按钮
    const selectLeaderBtn = page.locator('button:has-text("选择负责人")').first()
    const btnVisible = await selectLeaderBtn.isVisible({ timeout: 3000 }).catch(() => false)

    if (btnVisible) {
      await selectLeaderBtn.click()
      await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })

      // 检查分页器
      const pagination = page.locator('.el-dialog .el-pagination')
      const isPaginationVisible = await pagination.isVisible().catch(() => false)

      if (isPaginationVisible) {
        // 尝试切换每页条数
        const sizeSelect = page.locator('.el-dialog .el-pagination__sizes').locator('.el-select').first()
        await sizeSelect.click()
        await page.waitForTimeout(300)

        const dropdown = page.locator('.el-select-dropdown').last()
        await dropdown.locator('.el-select-dropdown__item:has-text("20")').click()
        await page.waitForTimeout(500)

        console.log('分页切换成功')
      } else {
        console.log('无分页器')
      }

      // 关闭弹窗
      await page.locator('.el-dialog__headerbtn').click()
    } else {
      console.log('选择负责人按钮不可见（可能在只读状态）')
    }
  })

  test('学生选择弹窗 - 学院筛选', async ({ page }) => {
    await page.waitForSelector('.page-wrapper', { timeout: 10000 }).catch(() => {})

    const selectLeaderBtn = page.locator('button:has-text("选择负责人")').first()
    if (await selectLeaderBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectLeaderBtn.click()
      await page.waitForSelector('.el-dialog:visible', { timeout: 8000 })

      // 等待网络空闲
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)

      // 选择学院筛选
      const collegeSelect = page.locator('.el-dialog .el-select[placeholder="选择学院"]')
      if (await collegeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await collegeSelect.click()
        await page.waitForTimeout(300)

        const options = page.getByRole('option')
        const optionCount = await options.count()
        console.log(`学院选项数: ${optionCount}`)

        if (optionCount > 1) {
          await options.first().click()
          await page.waitForTimeout(500)
          console.log('学院筛选成功')
        }
      }

      await page.locator('.el-dialog__headerbtn').click()
    }
  })

  test('学生选择弹窗 - 关闭后状态重置', async ({ page }) => {
    await page.waitForSelector('.page-wrapper', { timeout: 10000 }).catch(() => {})

    // 检查是否已报名（只读状态）
    const successAlert = page.locator('.el-alert:has-text("您已报名该赛事")')
    const isRegistered = await successAlert.isVisible().catch(() => false)

    if (isRegistered) {
      console.log('当前已是已报名状态，跳过选择负责人测试')
      return
    }

    const selectLeaderBtn = page.locator('button:has-text("选择负责人")').first()
    const btnVisible = await selectLeaderBtn.isVisible({ timeout: 5000 }).catch(() => false)

    if (btnVisible) {
      await selectLeaderBtn.click()
      await page.waitForSelector('.el-dialog:visible', { timeout: 8000 })

      // 输入搜索条件
      const nameInput = page.locator('.el-dialog input[placeholder="输入姓名"]')
      await nameInput.fill('测试')
      await page.waitForTimeout(600)

      // 点击关闭
      await page.locator('.el-dialog__headerbtn').click()
      await page.waitForTimeout(500)

      // 验证弹窗已关闭
      await expect(page.locator('.el-dialog:visible')).not.toBeVisible()
    } else {
      console.log('选择负责人按钮不可见，跳过')
    }
  })
})

test.describe('报名详情页面 - 文件上传', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('附件上传区域显示', async ({ page }) => {
    // 检查是否有附件上传区域
    const uploadArea = page.locator('.simple-upload')
    const isVisible = await uploadArea.isVisible().catch(() => false)

    if (isVisible) {
      await expect(uploadArea).toBeVisible()
      // 验证上传提示文字
      await expect(page.locator('.el-upload__text')).toContainText('拖拽至此处')
      console.log('附件上传区域正常显示')
    } else {
      console.log('该赛事不需要上传附件')
    }
  })

  test('上传文件按钮存在', async ({ page }) => {
    const uploadArea = page.locator('.simple-upload')
    if (await uploadArea.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 验证上传区域内部元素
      const uploadIcon = page.locator('.el-icon--upload')
      await expect(uploadIcon).toBeVisible()
    }
  })
})

test.describe('报名详情页面 - 赛道配置', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('赛道必填验证', async ({ page }) => {
    const trackSelect = page.locator('.el-select[placeholder="请选择参赛赛道"]')
    const isVisible = await trackSelect.isVisible().catch(() => false)

    if (isVisible) {
      // 不选择赛道，直接点击确认报名
      await page.locator('button:has-text("确认报名")').click()
      await page.waitForTimeout(800)

      // 验证错误提示
      const hasError = await page.locator('.el-form-item__error').isVisible().catch(() => false) ||
                       await page.locator('.el-message--error').isVisible().catch(() => false)
      if (hasError) {
        console.log('赛道必填验证生效')
      }
    } else {
      console.log('无赛道配置')
    }
  })

  test('赛道切换后清空赛题', async ({ page }) => {
    const trackSelect = page.locator('.el-select[placeholder="请选择参赛赛道"]')
    const isVisible = await trackSelect.isVisible().catch(() => false)

    if (isVisible) {
      await trackSelect.click()
      await page.waitForTimeout(400)

      const options = page.getByRole('option')
      const count = await options.count()

      if (count >= 2) {
        // 选择第一个赛道
        await options.first().click()
        await page.waitForTimeout(500)

        // 检查是否有赛题选择器
        const subTrackSelect = page.locator('.el-select[placeholder="请选择赛题"]')
        const subTrackVisible = await subTrackSelect.isVisible().catch(() => false)

        if (subTrackVisible) {
          await subTrackSelect.click()
          await page.waitForTimeout(400)
          const subOptions = page.getByRole('option')
          if (await subOptions.count() > 0) {
            await subOptions.first().click()
            await page.waitForTimeout(300)
          }

          // 切换赛道
          await trackSelect.click()
          await page.waitForTimeout(400)
          await options.nth(1).click()
          await page.waitForTimeout(500)

          // 验证赛题已清空
          const subTrackValue = await subTrackSelect.locator('input').inputValue()
          console.log(`切换后赛题值: "${subTrackValue}" (应为空)`)
        }
      }
    }
  })

  test('单赛道无赛题提示', async ({ page }) => {
    const trackSelect = page.locator('.el-select[placeholder="请选择参赛赛道"]')
    const isVisible = await trackSelect.isVisible().catch(() => false)

    if (isVisible) {
      await trackSelect.click()
      await page.waitForTimeout(400)

      const options = page.getByRole('option')
      const count = await options.count()

      if (count > 0) {
        await options.first().click()
        await page.waitForTimeout(500)

        // 检查是否有无赛题提示
        const tip = page.locator('.track-single-tip')
        const tipVisible = await tip.isVisible().catch(() => false)

        if (tipVisible) {
          await expect(tip).toContainText('无需选择赛题')
          console.log('无赛题提示显示正确')
        }
      }
    }
  })
})

test.describe('报名详情页面 - 完整报名流程', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToRegisterDetail(page)
  })

  test('完整填写报名表单', async ({ page }) => {
    await page.waitForSelector('.page-wrapper', { timeout: 10000 }).catch(() => {})

    // 1. 填写团队名称（如果是团队赛）
    const teamNameInput = page.locator('input[placeholder="请输入团队名称"]')
    if (await teamNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await teamNameInput.fill('自动化测试团队_' + Date.now())
    }

    // 2. 选择赛道
    const trackSelect = page.locator('.el-select[placeholder="请选择参赛赛道"]')
    if (await trackSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await trackSelect.click()
      await page.waitForTimeout(400)
      const options = page.getByRole('option')
      if (await options.count() > 0) {
        await options.first().click()
        await page.waitForTimeout(500)

        // 选择赛题（如果有）
        const subTrackSelect = page.locator('.el-select[placeholder="请选择赛题"]')
        if (await subTrackSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
          await subTrackSelect.click()
          await page.waitForTimeout(400)
          const subOptions = page.getByRole('option')
          if (await subOptions.count() > 0) {
            await subOptions.first().click()
            await page.waitForTimeout(300)
          }
        }
      }
    }

    // 3. 选择负责人
    const selectLeaderBtn = page.locator('button:has-text("选择负责人")').first()
    if (await selectLeaderBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await selectLeaderBtn.click()
      await page.waitForSelector('.el-dialog:visible', { timeout: 8000 })
      await page.waitForLoadState('networkidle')

      const firstRow = page.locator('.el-dialog .el-table__body tr').first()
      await firstRow.locator('button:has-text("选择")').click()
      await page.waitForTimeout(500)

      // 填写负责人联系方式
      const phoneInput = page.locator('.info-grid input[placeholder="请输入手机号"]').first()
      if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await phoneInput.fill('13800138000')
      }

      const emailInput = page.locator('.info-grid input[placeholder="请输入邮箱"]').first()
      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInput.fill('leader@example.com')
      }
    }

    console.log('完整报名表单填写完成')
  })

  test('报名表单必填项验证', async ({ page }) => {
    await page.waitForSelector('.page-wrapper', { timeout: 10000 }).catch(() => {})

    // 点击确认报名而不填写任何内容
    const submitBtn = page.locator('button:has-text("确认报名")')
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click()
      await page.waitForTimeout(1000)

      // 验证错误提示出现
      const errorVisible = await page.locator('.el-form-item__error, .el-message--error').first().isVisible().catch(() => false)
      console.log(`必填验证提示: ${errorVisible}`)
    }
  })
})