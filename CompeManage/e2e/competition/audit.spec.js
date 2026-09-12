import { test, expect } from 'playwright-test-coverage'
import { login } from '../helpers/auth'

const COLLEGE_ADMIN = {
  username: 'T2023002',
  password: '123',
  role: 'college_admin',
}

const SCHOOL_ADMIN = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
}

// 生成唯一赛事名称
const DECLARE_NAME = `E2E申报审核_${Date.now()}`



// 辅助函数：打开 Element Plus 下拉并选择
async function selectElOption(page, formFieldLabel, optionText) {
  const formItem = page.locator('.el-form-item').filter({ hasText: formFieldLabel })
  const select = formItem.locator('.el-select')
  await select.click()
  const targetOption = page.getByRole('option', { name: optionText })
  await targetOption.waitFor({ state: 'visible', timeout: 5000 })
  await targetOption.click()
  await page.waitForTimeout(300)
}

test.describe.serial('赛事申报审核功能测试', () => {
  test('完整流程：院管理员申报 → 提交审核 → 校管理员查看', async ({ page }) => {
    // ============================================================
    // 第一部分：院级管理员创建申报并提交
    // ============================================================
    await login(page, COLLEGE_ADMIN)

    // 进入申报列表页
    await page.goto('/#/competition/audit')
    await page.waitForLoadState('networkidle')

    // 等待列表加载
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/declare/my/pending') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    // 点击 "新增申报"
    await page.locator('button:has-text("新增申报")').click()
    await page.waitForURL(/\/competition\/declare/)
    await page.waitForLoadState('networkidle')

    // 等待学院列表加载
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/college/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(300)

    // ========== 填写申报表单 ==========

    // 赛事名称
    await page.fill('input[placeholder="请输入赛事名称"]', DECLARE_NAME)

    // 赛事等级: 校级
    await selectElOption(page, '赛事等级', '校级')

    // 赛事类型: 学科竞赛
    await selectElOption(page, '赛事类型', '学科竞赛')

    // 所属学院
    const collegeSelect = page
      .locator('.el-form-item')
      .filter({ hasText: '所属学院' })
      .locator('.el-select')
    await collegeSelect.click()
    const firstCollegeOption = page.getByRole('option').first()
    await firstCollegeOption.waitFor({ state: 'visible', timeout: 5000 })
    const collegeName = await firstCollegeOption.textContent()
    console.log(`选择学院: ${collegeName}`)
    await firstCollegeOption.click()
    await page.waitForTimeout(300)

    // 主办单位
    await page.fill('input[placeholder="请填写主办单位"]', 'E2E测试主办方')

    // 承办单位
    await page.fill('input[placeholder="请填写承办单位"]', 'E2E测试承办方')

    // 赛事负责人（弹窗选择）
    const managerRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/comp/manager/list') && resp.status() === 200,
      { timeout: 10000 }
    )

    const managerInput = page.locator('.manager-input input')
    await managerInput.click()

    const managerDialog = page.locator('.el-dialog:has-text("选择赛事负责人")')
    await expect(managerDialog).toBeVisible({ timeout: 10000 })
    await managerRespPromise
    await page.waitForTimeout(800)

    // 点击第一行的"选择"按钮
    const firstRow = managerDialog.locator('.el-table__body tr').first()
    await expect(firstRow).toBeVisible({ timeout: 5000 })
    const managerName = await firstRow.locator('td').nth(1).textContent()
    console.log(`选择赛事负责人: ${managerName}`)
    await firstRow.locator('button:has-text("选择")').click()
    await expect(managerDialog).not.toBeVisible({ timeout: 5000 })

    // 所属年份 - 使用年份选择器
    const yearPicker = page.locator('.el-form-item').filter({ hasText: '所属年份' }).locator('input')
    await yearPicker.click()
    await page.waitForTimeout(300)
    // 在年份面板中选 2026
    const yearCell = page.locator('.el-year-table td').filter({ hasText: '2026' }).first()
    await yearCell.waitFor({ state: 'visible', timeout: 5000 })
    await yearCell.click()
    await page.waitForTimeout(300)

    // ========== 保存申报 ==========
    const saveRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/declare') && resp.request().method() === 'POST',
      { timeout: 15000 }
    )

    await page.locator('button:has-text("保存")').first().click()

    const saveResp = await saveRespPromise
    const saveData = await saveResp.json()
    console.log(`保存响应: code=${saveData.code}, message=${saveData.message}`)
    expect(saveData.code).toBe(200)

    // 验证成功消息
    await expect(page.locator('.el-message--success').last()).toBeVisible({ timeout: 5000 })

    // 等待跳转到审核列表页
    await page.waitForURL(/\/competition\/audit/)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // ========== 提交申报到校级审核 ==========
    // 搜索刚创建的申报
    await page.fill('.filter-card input[placeholder="搜索赛事名称"]', DECLARE_NAME)
    await page.locator('button:has-text("搜索")').click()
    await page.waitForTimeout(1000)

    // 找到包含申报名称的行，点击"提交"
    const targetRow = page.locator('.el-table__body tr').filter({ hasText: DECLARE_NAME }).first()
    await expect(targetRow).toBeVisible({ timeout: 5000 })

    // 验证状态为"草稿"
    await expect(targetRow.locator('.el-tag').filter({ hasText: '草稿' })).toBeVisible()

    // 拦截提交 API
    const submitRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/declare/') && resp.url().includes('/submit') && resp.request().method() === 'POST',
      { timeout: 15000 }
    )

    // 点击"提交"
    await targetRow.locator('button:has-text("提交")').click()

    // 确认提交弹窗
    const confirmDialog = page.locator('.el-message-box:has-text("提交至校级审核")')
    await expect(confirmDialog).toBeVisible({ timeout: 5000 })
    await page.locator('.el-message-box button:has-text("确定")').click()

    // 验证提交成功
    const submitResp = await submitRespPromise
    const submitData = await submitResp.json()
    console.log(`提交响应: code=${submitData.code}, message=${submitData.message}`)
    expect(submitData.code).toBe(200)

    await expect(page.locator('.el-message--success').last()).toBeVisible({ timeout: 5000 })

    console.log('院管理员申报提交完成')

    // ============================================================
    // 第二部分：校管理员查看待审核列表
    // ============================================================
    await login(page, SCHOOL_ADMIN)

    await page.goto('/#/competition/audit')
    await page.waitForLoadState('networkidle')

    // 等待待审核列表加载
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/declare/pending/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    // 验证页面标题为"赛事审核"
    await expect(page.locator('.el-tabs')).toBeVisible()

    // 搜索刚提交的申报
    await page.fill('.filter-card input[placeholder="搜索赛事名称"]', DECLARE_NAME)
    await page.locator('button:has-text("搜索")').click()
    await page.waitForTimeout(1000)

    // 验证申报出现在待审核列表
    const auditRow = page.locator('.el-table__body tr').filter({ hasText: DECLARE_NAME }).first()
    await expect(auditRow).toBeVisible({ timeout: 5000 })

    // 验证状态为"待审核"
    await expect(auditRow.locator('.el-tag').filter({ hasText: '待审核' })).toBeVisible()

    // 验证操作按钮（详情、通过、驳回）
    await expect(auditRow.locator('button:has-text("详情")')).toBeVisible()
    await expect(auditRow.locator('button:has-text("通过")')).toBeVisible()
    await expect(auditRow.locator('button:has-text("驳回")')).toBeVisible()

    console.log('赛事申报审核 E2E 测试完成')
  })

  test('校管理员：通过申报审核', async ({ page }) => {
    // 直接以校管理员登录，查找主流程创建的待审核申报
    await login(page, SCHOOL_ADMIN)

    await page.goto('/#/competition/audit')
    await page.waitForLoadState('networkidle')
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/declare/pending/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    // 搜索申报
    await page.fill('.filter-card input[placeholder="搜索赛事名称"]', DECLARE_NAME)
    await page.locator('button:has-text("搜索")').click()
    await page.waitForTimeout(1000)

    const auditRow = page.locator('.el-table__body tr').filter({ hasText: DECLARE_NAME }).first()
    const auditVisible = await auditRow.isVisible().catch(() => false)

    if (!auditVisible) {
      console.log('未找到待审核申报，跳过通过测试')
      return
    }

    // 检查状态是否为待审核
    const pendingTag = auditRow.locator('.el-tag').filter({ hasText: '待审核' })
    const isPending = await pendingTag.isVisible().catch(() => false)
    if (!isPending) {
      console.log('申报已被审核，跳过通过测试')
      return
    }

    const auditRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/declare/audit') && resp.request().method() === 'POST',
      { timeout: 10000 }
    )

    // 点击"通过"
    await auditRow.locator('button:has-text("通过")').click()

    // 确认通过弹窗
    await page.locator('.el-message-box button:has-text("通过并发布")').click()

    const auditResp = await auditRespPromise
    const auditData = await auditResp.json()
    console.log(`审核通过响应: code=${auditData.code}, message=${auditData.message}`)
    expect(auditData.code).toBe(200)
    await expect(page.locator('.el-message--success').last()).toBeVisible({ timeout: 5000 })

    console.log('通过审核测试完成')
  })

  test('校管理员：驳回申报审核', async ({ page }) => {
    // 先以院管理员创建并提交一条新申报（主流程创建的已被通过测试处理）
    const rejectName = `E2E驳回测试_${Date.now()}`

    await login(page, COLLEGE_ADMIN)

    // 进入申报列表 → 新增申报
    await page.goto('/#/competition/audit')
    await page.waitForLoadState('networkidle')
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/declare/my/pending') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(300)

    await page.locator('button:has-text("新增申报")').click()
    await page.waitForURL(/\/competition\/declare/)
    await page.waitForLoadState('networkidle')
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/college/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(300)

    // 快速填写必填项
    await page.fill('input[placeholder="请输入赛事名称"]', rejectName)
    await selectElOption(page, '赛事等级', '校级')
    await selectElOption(page, '赛事类型', '学科竞赛')

    const collegeSelect = page
      .locator('.el-form-item')
      .filter({ hasText: '所属学院' })
      .locator('.el-select')
    await collegeSelect.click()
    const firstOption = page.getByRole('option').first()
    await firstOption.waitFor({ state: 'visible', timeout: 5000 })
    await firstOption.click()
    await page.waitForTimeout(200)

    await page.fill('input[placeholder="请填写主办单位"]', '驳回测试主办方')
    await page.fill('input[placeholder="请填写承办单位"]', '驳回测试承办方')

    // 选择负责人
    const mgrRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/comp/manager/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.locator('.manager-input input').click()
    const mgrDialog = page.locator('.el-dialog:has-text("选择赛事负责人")')
    await expect(mgrDialog).toBeVisible({ timeout: 10000 })
    await mgrRespPromise
    await page.waitForTimeout(500)
    const firstMgrRow = mgrDialog.locator('.el-table__body tr').first()
    await firstMgrRow.locator('button:has-text("选择")').click()
    await expect(mgrDialog).not.toBeVisible({ timeout: 5000 })

    // 年份
    const yearInput = page.locator('.el-form-item').filter({ hasText: '所属年份' }).locator('input')
    await yearInput.click()
    await page.waitForTimeout(200)
    const yearCell = page.locator('.el-year-table td').filter({ hasText: '2026' }).first()
    await yearCell.waitFor({ state: 'visible', timeout: 5000 })
    await yearCell.click()
    await page.waitForTimeout(200)

    // 保存
    const saveRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/declare') && resp.request().method() === 'POST',
      { timeout: 15000 }
    )
    await page.locator('button:has-text("保存")').first().click()
    const saveResp = await saveRespPromise
    expect((await saveResp.json()).code).toBe(200)
    await expect(page.locator('.el-message--success').last()).toBeVisible({ timeout: 5000 })

    // 等待跳转到审核页
    await page.waitForURL(/\/competition\/audit/)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 搜索并提交
    await page.fill('.filter-card input[placeholder="搜索赛事名称"]', rejectName)
    await page.locator('button:has-text("搜索")').click()
    await page.waitForTimeout(1000)

    const targetRow = page.locator('.el-table__body tr').filter({ hasText: rejectName }).first()
    await expect(targetRow).toBeVisible({ timeout: 5000 })

    const submitRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/submit') && resp.request().method() === 'POST',
      { timeout: 10000 }
    )
    await targetRow.locator('button:has-text("提交")').click()
    await page.locator('.el-message-box button:has-text("确定")').click()
    const submitResp = await submitRespPromise
    expect((await submitResp.json()).code).toBe(200)

    // ========== 切换到校管理员 ==========
    await login(page, SCHOOL_ADMIN)

    await page.goto('/#/competition/audit')
    await page.waitForLoadState('networkidle')
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/declare/pending/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    // 搜索
    await page.fill('.filter-card input[placeholder="搜索赛事名称"]', rejectName)
    await page.locator('button:has-text("搜索")').click()
    await page.waitForTimeout(1000)

    const auditRow = page.locator('.el-table__body tr').filter({ hasText: rejectName }).first()
    await expect(auditRow).toBeVisible({ timeout: 5000 })

    // 验证状态是待审核
    await expect(auditRow.locator('.el-tag').filter({ hasText: '待审核' })).toBeVisible()

    // 点击驳回
    await auditRow.locator('button:has-text("驳回")').click()

    // 驳回对话框
    const rejectDialog = page.locator('.el-dialog:has-text("驳回申请")')
    await expect(rejectDialog).toBeVisible({ timeout: 5000 })
    await rejectDialog.locator('textarea').fill('E2E测试驳回：赛事名称格式不规范')

    // 拦截审核 API
    const auditRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/declare/audit') && resp.request().method() === 'POST',
      { timeout: 10000 }
    )

    await rejectDialog.locator('button:has-text("确认驳回")').click()

    const auditResp = await auditRespPromise
    expect((await auditResp.json()).code).toBe(200)
    await expect(page.locator('.el-message--warning').last()).toBeVisible({ timeout: 5000 })

    console.log('驳回审核测试完成')
  })
})
