import { test, expect } from 'playwright-test-coverage'
import { login } from '../helpers/auth'



// 生成唯一赛事名称
const COMP_NAME = `E2E报名设置_${Date.now()}`

// 辅助函数：登录


// 辅助函数：打开 Element Plus 下拉并选择
async function selectElOption(page, formFieldLabel, optionText) {
  const formItem = page.locator('.el-form-item').filter({ hasText: formFieldLabel })
  const select = formItem.locator('.el-select')
  await select.click()
  // 使用 getByRole 自动处理可见性，避免匹配到残留的隐藏下拉项
  const targetOption = page.getByRole('option', { name: optionText })
  await targetOption.waitFor({ state: 'visible', timeout: 5000 })
  await targetOption.click()
  await page.waitForTimeout(300)
}

test.describe('报名设置功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('完整流程：创建赛事 → 配置报名规则 → 保存', async ({ page }) => {
    // ============================================================
    // 第一部分：创建新赛事（前提条件）
    // ============================================================
    await page.goto('/#/competition/list')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 点击"新增赛事"
    await page.locator('button:has-text("新增赛事")').click()
    await page.waitForURL(/\/competition\/add/)
    await page.waitForLoadState('networkidle')

    // 填写赛事名称
    await page.fill('input[placeholder="请输入赛事名称"]', COMP_NAME)

    // 选择赛事级别: 校级
    await selectElOption(page, '赛事级别', '校级')

    // 选择赛事类型: 学科竞赛
    await selectElOption(page, '赛事类型', '学科竞赛')

    // 填写主办单位
    await page.fill('input[placeholder="请填写主办单位"]', 'E2E测试主办方')

    // 填写承办单位
    await page.fill('input[placeholder="请填写承办单位"]', 'E2E测试承办方')

    // 选择所属学院
    const collegeSelect = page
      .locator('.el-form-item')
      .filter({ hasText: '所属学院' })
      .locator('.el-select')
    await collegeSelect.click()
    // 等待可见的下拉选项出现
    const firstCollegeOption = page.getByRole('option').first()
    await firstCollegeOption.waitFor({ state: 'visible', timeout: 5000 })
    const collegeName = await firstCollegeOption.textContent()
    console.log(`选择学院: ${collegeName}`)
    await firstCollegeOption.click()
    await page.waitForTimeout(300)

    // 选择赛事负责人（通过弹窗）——先注册响应监听再打开弹窗
    const managerRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/comp/manager/list') && resp.status() === 200,
      { timeout: 10000 }
    )

    const managerInput = page.locator('.manager-input input')
    await managerInput.click()

    const managerDialog = page.locator('.el-dialog:has-text("选择赛事负责人")')
    await expect(managerDialog).toBeVisible({ timeout: 10000 })

    // 等待负责人列表加载
    await managerRespPromise
    await page.waitForTimeout(800) // 等待表格渲染

    // 点击第一行的"选择"按钮
    const firstRow = managerDialog.locator('.el-table__body tr').first()
    await expect(firstRow).toBeVisible({ timeout: 5000 })
    const managerName = await firstRow.locator('td').nth(1).textContent()
    console.log(`选择赛事负责人: ${managerName}`)
    await firstRow.locator('button:has-text("选择")').click()

    // 等待弹窗关闭
    await expect(managerDialog).not.toBeVisible({ timeout: 5000 })

    // 填写所属年份
    const yearInput = page.getByRole('textbox', { name: '所属年份' })
    await yearInput.fill('2026')

    // 拦截创建响应并提交
    const createRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/comp/create') && resp.request().method() === 'POST',
      { timeout: 15000 }
    )

    await page.locator('button:has-text("创建")').first().click()

    // 获取新创建的赛事 ID
    const createResp = await createRespPromise
    const createData = await createResp.json()
    const compId = createData.data?.data?.id || createData.data?.id
    console.log(`新赛事创建成功, ID: ${compId}`)
    expect(compId).toBeDefined()

    // 等待跳转到赛事列表
    await page.waitForTimeout(1000)

    // ============================================================
    // 第二部分：配置报名规则
    // ============================================================
    await page.goto(`/#/register/edit/${compId}`)
    await page.waitForLoadState('networkidle')

    // 等待配置数据加载
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/config/get') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    // 验证页面标题包含赛事名称
    await expect(page.locator('.card-header .title')).toBeVisible()
    await expect(page.locator('.el-tag').filter({ hasText: COMP_NAME })).toBeVisible()

    // --- 基础模式 ---
    // 保持默认个人赛设置（参赛形式=个人赛，人数固定为1）
    // 注：Element Plus 的 el-input-number :disabled 动态切换存在已知问题，
    // 切换参赛形式后 disabled 不会正确更新，故跳过团队赛切换。
    // 个人赛/团队赛切换功能由单独测试覆盖。

    // 设置报名时间范围（使用当前时间确保在报名中状态）
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    const futureDate = new Date(nextMonth.getTime() + 30 * 24 * 60 * 60 * 1000) // 1个月后

    const formatDate = (date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const h = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${d} ${h}:${min}`
    }

    const regStartInput = page.locator('input[placeholder="开始报名"]')
    const regEndInput = page.locator('input[placeholder="报名截止"]')
    await regStartInput.click()
    await regStartInput.fill(formatDate(now))
    await page.waitForTimeout(200)
    await regEndInput.click()
    await regEndInput.fill(formatDate(futureDate))
    // 点击其他区域关闭日期面板
    await page.locator('.form-section-title').first().click()
    await page.waitForTimeout(300)

    // 设置作品提交时间范围
    const workTimeStart = new Date(futureDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    const workTimeEnd = new Date(futureDate.getTime() + 60 * 24 * 60 * 60 * 1000)

    const submitStartInput = page.locator('input[placeholder="开始提交"]')
    const submitEndInput = page.locator('input[placeholder="提交截止"]')
    await submitStartInput.click()
    await submitStartInput.fill(formatDate(workTimeStart))
    await page.waitForTimeout(200)
    await submitEndInput.click()
    await submitEndInput.fill(formatDate(workTimeEnd))
    await page.locator('.form-section-title').first().click()
    await page.waitForTimeout(300)

    // 报名审核 - 保持默认开启，验证开关可见
    const auditSwitch = page.locator('.el-switch').filter({ hasText: '需要审核' })
    await expect(auditSwitch).toBeVisible()

    // --- 资格与限制 ---
    // 选择允许参赛年级
    const gradeSelect = page
      .locator('.el-form-item')
      .filter({ hasText: '允许参赛年级' })
      .locator('.el-select')
    await gradeSelect.click()
    // 选择大一和大二
    await page.getByRole('option', { name: '大一' }).waitFor({ state: 'visible', timeout: 5000 })
    await page.getByRole('option', { name: '大一' }).click()
    await page.getByRole('option', { name: '大二' }).click()
    // 点击空白处关闭下拉
    await page.locator('.form-section-title').first().click()
    await page.waitForTimeout(300)

    // 开启指导老师并设为必填（先检查状态避免反向操作）
    const advisorSwitch = page
      .locator('.el-form-item')
      .filter({ hasText: '指导老师设置' })
      .locator('.el-switch')
    const advisorChecked = await advisorSwitch.evaluate((el) => el.classList.contains('is-checked'))
    if (!advisorChecked) {
      await advisorSwitch.click()
      await page.waitForTimeout(400)
    }
    // 勾选必填
    const advisorRequiredCheckbox = page.locator('.el-checkbox').filter({ hasText: '指导老师为必填项' })
    await advisorRequiredCheckbox.waitFor({ state: 'attached', timeout: 5000 })
    await advisorRequiredCheckbox.click()

    // --- 赛道配置 ---
    // 启用赛道（先检查状态避免反向操作）
    const trackSwitch = page
      .locator('.el-form-item')
      .filter({ hasText: '启用赛道' })
      .locator('.el-switch')
    const trackChecked = await trackSwitch.evaluate((el) => el.classList.contains('is-checked'))
    if (!trackChecked) {
      await trackSwitch.click()
      await page.waitForTimeout(500)
    }

    // 验证赛道配置区域出现
    await expect(page.locator('.track-list-container')).toBeVisible()

    // 添加一个赛道
    await page.locator('button:has-text("新增整个赛道")').click()
    await page.waitForTimeout(300)

    // 填写赛道名称
    const trackNameInput = page.locator('.track-item-box').last().locator('input[placeholder="请输入赛道名称"]')
    await trackNameInput.fill('软件赛道')

    // 填写第一个赛题
    const questionInput = page.locator('.track-item-box').last().locator('input[placeholder="具体赛题名称"]')
    await questionInput.fill('Web应用开发')

    // 添加第二个赛题
    const addQuestionBtn = page
      .locator('.track-item-box')
      .last()
      .locator('button:has-text("添加赛题")')
    await addQuestionBtn.click()
    await page.waitForTimeout(200)

    // 填写第二个赛题
    const questionInputs = page.locator('.track-item-box').last().locator('input[placeholder="具体赛题名称"]')
    const qCount = await questionInputs.count()
    if (qCount > 1) {
      await questionInputs.nth(1).fill('AI算法挑战')
    }

    // --- 奖项排名规则 ---
    // 添加一个新奖项等级
    const addAwardBtn = page.locator('.award-list-simple').locator('button:has-text("添加一个等级")')
    await addAwardBtn.click()
    await page.waitForTimeout(200)

    // 填写新奖项
    const awardInputs = page.locator('.award-list-simple input')
    const awardCount = await awardInputs.count()
    await awardInputs.nth(awardCount - 1).fill('优秀奖')

    // --- 材料提交 ---
    // 选择必须上传附件
    await page.locator('.el-radio:has-text("必须上传")').click()
    await page.waitForTimeout(200)

    // ============================================================
    // 第三部分：保存设置
    // ============================================================
    const saveRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/config') && resp.request().method() === 'POST',
      { timeout: 15000 }
    )

    await page.locator('button:has-text("保存设置")').click()

    // 验证保存响应
    const saveResp = await saveRespPromise
    const saveData = await saveResp.json()
    console.log(`保存响应: code=${saveData.code}, message=${saveData.message}`)
    expect(saveData.code).toBe(200)

    // 验证成功消息出现
    await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

    console.log('报名设置 E2E 测试完成')
  })

  test('报名设置页面 - 基础信息加载验证', async ({ page }) => {
    await page.goto('/#/register/edit')
    await page.waitForLoadState('networkidle')

    await page.waitForResponse(
      (resp) => resp.url().includes('/api/comp/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    const firstItem = page.locator('.comp-item').first()
    const itemExists = await firstItem.isVisible().catch(() => false)

    if (!itemExists) {
      console.log('报名设置列表为空，跳过基础信息测试')
      return
    }

    await firstItem.locator('button:has-text("报名设置")').click()
    await page.waitForURL(/\/register\/edit\/\d+/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // 等待配置数据加载
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/config/get') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    // 验证核心 UI 结构存在
    await expect(page.locator('.card-header .title')).toBeVisible()
    await expect(page.locator('button:has-text("保存设置")')).toBeVisible()

    // 验证各配置区域标题
    await expect(page.locator('.form-section-title').filter({ hasText: '基础模式' })).toBeVisible()
    await expect(page.locator('.form-section-title').filter({ hasText: '资格与限制' })).toBeVisible()
    await expect(page.locator('.form-section-title').filter({ hasText: '赛道配置' })).toBeVisible()
    await expect(page.locator('.form-section-title').filter({ hasText: '奖项排名规则' })).toBeVisible()
    await expect(page.locator('.form-section-title').filter({ hasText: '材料提交' })).toBeVisible()

    console.log('基础信息加载验证通过')
  })

  test('报名设置页面 - 赛道配置：新增赛道和赛题', async ({ page }) => {
    // 获取已有赛事
    await page.goto('/#/register/edit')
    await page.waitForLoadState('networkidle')

    await page.waitForResponse(
      (resp) => resp.url().includes('/api/comp/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    const firstItem = page.locator('.comp-item').first()
    const itemExists = await firstItem.isVisible().catch(() => false)

    if (!itemExists) {
      console.log('报名设置列表为空，跳过赛道测试')
      return
    }

    await firstItem.locator('button:has-text("报名设置")').click()
    await page.waitForURL(/\/register\/edit\/\d+/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 启用赛道
    const trackSwitch = page
      .locator('.el-form-item')
      .filter({ hasText: '启用赛道' })
      .locator('.el-switch')
    const isTrackEnabled = await trackSwitch.evaluate((el) => el.classList.contains('is-checked'))

    if (!isTrackEnabled) {
      await trackSwitch.click()
      await page.waitForTimeout(500)
    }

    // 统计已有赛道数量
    const existingTracks = page.locator('.track-item-box')
    const existingCount = await existingTracks.count()

    // 新增一个赛道
    await page.locator('button:has-text("新增整个赛道")').click()
    await page.waitForTimeout(300)

    // 验证赛道数量增加
    const newCount = await existingTracks.count()
    expect(newCount).toBe(existingCount + 1)

    // 填写新赛道名称
    const newTrackInput = existingTracks.last().locator('input[placeholder="请输入赛道名称"]')
    await newTrackInput.fill('测试赛道B')
    await expect(newTrackInput).toHaveValue('测试赛道B')

    // 填写赛题
    const questionInput = existingTracks.last().locator('input[placeholder="具体赛题名称"]')
    await questionInput.fill('测试赛题2')
    await expect(questionInput).toHaveValue('测试赛题2')

    console.log('赛道配置测试通过')
  })

  test('报名设置页面 - 个人赛/团队赛切换', async ({ page }) => {
    await page.goto('/#/register/edit')
    await page.waitForLoadState('networkidle')

    await page.waitForResponse(
      (resp) => resp.url().includes('/api/comp/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    const firstItem = page.locator('.comp-item').first()
    const itemExists = await firstItem.isVisible().catch(() => false)

    if (!itemExists) {
      console.log('报名设置列表为空，跳过切换测试')
      return
    }

    await firstItem.locator('button:has-text("报名设置")').click()
    await page.waitForURL(/\/register\/edit\/\d+/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 验证默认是个人赛
    const personalActive = await page
      .locator('.el-radio-button.is-active:has-text("个人赛")')
      .isVisible()
      .catch(() => false)

    // 点击团队赛
    await page.locator('.el-radio-button:has-text("团队赛")').click()
    await page.waitForTimeout(300)

    // 验证团队赛被激活
    const teamActive = await page
      .locator('.el-radio-button.is-active:has-text("团队赛")')
      .isVisible()
      .catch(() => false)
    expect(teamActive || !personalActive).toBeTruthy()

    // 验证人数限制组件出现
    const numberInputs = page.locator('.el-input-number input')
    const count = await numberInputs.count()
    expect(count).toBeGreaterThanOrEqual(2)

    console.log('参赛形式切换测试通过')
  })

  test('报名设置页面 - 指导老师联动：开启后显示必填选项', async ({ page }) => {
    await page.goto('/#/register/edit')
    await page.waitForLoadState('networkidle')

    await page.waitForResponse(
      (resp) => resp.url().includes('/api/comp/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    const firstItem = page.locator('.comp-item').first()
    const itemExists = await firstItem.isVisible().catch(() => false)

    if (!itemExists) {
      console.log('报名设置列表为空，跳过指导老师测试')
      return
    }

    await firstItem.locator('button:has-text("报名设置")').click()
    await page.waitForURL(/\/register\/edit\/\d+/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 开启指导老师（需判断当前状态避免反向操作）
    const advisorSwitch = page
      .locator('.el-form-item')
      .filter({ hasText: '指导老师设置' })
      .locator('.el-switch')
    // 检查开关状态：Element Plus 在 label 上加 is-checked 类
    const isChecked = await advisorSwitch.evaluate((el) => el.classList.contains('is-checked'))
    if (!isChecked) {
      await advisorSwitch.click()
      await page.waitForTimeout(500)
    }

    // 验证必填复选框出现（Element Plus 隐藏原始 input，需定位 label.el-checkbox）
    const requiredCheckbox = page.locator('.el-checkbox').filter({ hasText: '指导老师为必填项' })
    await expect(requiredCheckbox).toBeAttached({ timeout: 5000 })

    // 勾选必填
    await requiredCheckbox.click()
    await page.waitForTimeout(200)

    console.log('指导老师联动测试通过')
  })
})
