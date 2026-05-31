import { test, expect } from 'playwright-test-coverage'

const ADMIN_USER = { username: 'T2023001', password: '123', role: 'school_admin' }
const STUDENT_USER = { username: 'S2024001', password: '123' }

const COMP_NAME = `E2E报名审核测试_${Date.now()}`
const REJECT_REASON = 'E2E自动化测试驳回原因：材料不完整，请补充后重新提交。'

// 存储测试数据（在 beforeAll 中赋值）
let compId = null
let teamName = `审核测试队伍_${Date.now()}`

// ==================== 辅助函数 ====================

async function login(page, user) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[placeholder="请输入用户名"]', user.username)
  await page.fill('input[placeholder="请输入密码"]', user.password)
  await page.locator('.el-button:has-text("立即登录")').click()
  await page.waitForURL((url) => url.hash.includes('home'), { timeout: 10000 })
}

async function getAuthToken(page) {
  return await page.evaluate(() => localStorage.getItem('token'))
}

async function apiRequest(page, method, url, token, data = null) {
  const options = { headers: { Authorization: `Bearer ${token}` } }
  if (data) {
    options.data = data
  }
  return await page.request[method](`http://localhost:8080${url}`, options)
}

async function selectElOption(page, formFieldLabel, optionText) {
  const formItem = page.locator('.el-form-item').filter({ hasText: formFieldLabel })
  const select = formItem.locator('.el-select')
  await select.click()
  const targetOption = page.getByRole('option', { name: optionText })
  await targetOption.waitFor({ state: 'visible', timeout: 5000 })
  await targetOption.click()
  await page.waitForTimeout(300)
}

async function selectManager(page) {
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

  const firstRow = managerDialog.locator('.el-table__body tr').first()
  await expect(firstRow).toBeVisible({ timeout: 5000 })
  await firstRow.locator('button:has-text("选择")').click()

  await expect(managerDialog).not.toBeVisible({ timeout: 5000 })
}

// 创建测试赛事（通过 UI）
async function createTestCompetition(page) {
  return createCompetitionWithName(page, COMP_NAME)
}

// 通过 UI 创建指定名称的赛事
async function createCompetitionWithName(page, compName) {
  await page.goto('/#/competition/list')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  await page.locator('button:has-text("新增赛事")').click()
  await page.waitForURL(/\/competition\/add/)
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.el-tabs', { timeout: 15000 })

  await page.fill('input[placeholder="请输入赛事名称"]', compName)
  await selectElOption(page, '赛事级别', '校级')
  await selectElOption(page, '赛事类型', '学科竞赛')
  await page.fill('input[placeholder="请填写主办单位"]', 'E2E测试主办方')
  await page.fill('input[placeholder="请填写承办单位"]', 'E2E测试承办方')

  const collegeSelect = page
    .locator('.el-form-item')
    .filter({ hasText: '所属学院' })
    .locator('.el-select')
  await collegeSelect.click()
  const firstCollegeOption = page.getByRole('option').first()
  await firstCollegeOption.waitFor({ state: 'visible', timeout: 5000 })
  await firstCollegeOption.click()
  await page.waitForTimeout(300)

  await selectManager(page)

  const yearInput = page.getByRole('textbox', { name: '所属年份' })
  await yearInput.fill('2026')

  const createRespPromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/comp/create') && resp.request().method() === 'POST',
    { timeout: 15000 }
  )

  await page.locator('button:has-text("创建")').first().click()

  const createResp = await createRespPromise
  const createData = await createResp.json()
  console.log(`赛事 "${compName}" 创建响应:`, JSON.stringify(createData))
  const id = createData.data?.data?.id || createData.data?.id || createData.data?.ID
  console.log(`新赛事创建成功: "${compName}", ID: ${id}`)
  expect(id).toBeDefined()

  await page.waitForURL(/\/competition\/list/, { timeout: 10000 })
  await page.waitForTimeout(500)

  return id
}

// 保存报名配置（后端要求赛事配置完成后才能报名）
async function saveRegConfig(page, token, competitionId) {
  const now = new Date()
  const regStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const regEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const response = await apiRequest(page, 'post', '/api/reg/config', token, {
    comp_id: competitionId,
    participant_type: 1,
    min_team_member: 1,
    max_team_member: 1,
    reg_start_time: regStart,
    reg_end_time: regEnd,
    submit_start_time: null,
    submit_end_time: null,
    grade_requirement: [1, 2, 3, 4],
    need_advisor: 1,
    need_attachment: 0,
    need_reg_audit: 1,
    award_hierarchy: ['一等奖', '二等奖', '三等奖'],
    track: [],
  })

  const data = await response.json()
  console.log('报名配置响应:', data)
  return data
}

// 通过 API 提交报名
async function submitRegistrationViaApi(page, token, competitionId) {
  const response = await apiRequest(page, 'post', '/api/reg/submit', token, {
    comp_id: competitionId,
    team_name: teamName,
    leader: {
      name: '测试队长',
      stuID: 'S2024001',
      phone: '13800138000',
      email: 'test_leader@example.com',
      college: '计算机学院',
      is_leader: true,
    },
    members: [],
    attachment_url: '',
    advisor_info: {
      id: null,
      username: 'T2023001',
      name: '测试指导老师',
      phone: '13900139000',
      email: 'test_advisor@example.com',
      college: '计算机学院',
    },
    track: '',
  })

  const data = await response.json()
  console.log('报名提交响应:', data)
  return data
}

// 导航到审核列表页并等待数据加载
async function navigateToAuditList(page) {
  await page.goto('/#/register/audit')
  await page.waitForLoadState('networkidle')
  await page.waitForResponse(
    (resp) => resp.url().includes('/api/reg/list') && resp.status() === 200,
    { timeout: 10000 }
  )
  await page.waitForTimeout(500)
}

// 设置测试数据：创建赛事 + 提交报名
async function setupTestData(browser) {
  const page = await browser.newPage()

  // 1. 管理员登录并创建赛事
  await login(page, ADMIN_USER)
  const adminToken = await getAuthToken(page)
  const cId = await createTestCompetition(page)

  // 2. 保存报名配置
  await saveRegConfig(page, adminToken, cId)

  // 3. 学生登录并提交报名
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  })
  await page.fill('input[placeholder="请输入用户名"]', STUDENT_USER.username)
  await page.fill('input[placeholder="请输入密码"]', STUDENT_USER.password)
  await page.locator('.el-button:has-text("立即登录")').click()
  await page.waitForURL((url) => url.hash.includes('home'), { timeout: 10000 })

  const studentToken = await getAuthToken(page)
  await submitRegistrationViaApi(page, studentToken, cId)

  await page.close()
  return { compId: cId, teamName: teamName }
}

// ==================== 测试套件 ====================

test.describe('报名审核 E2E 测试', () => {
  test.beforeAll(async ({ browser }) => {
    const data = await setupTestData(browser)
    compId = data.compId
    teamName = data.teamName
    console.log(`测试数据就绪: compId=${compId}, teamName=${teamName}`)
  })

  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_USER)
  })

  test('审核列表页 - 加载、筛选、快捷通过', async ({ page }) => {
    // ============================================================
    // 第一部分：验证审核列表页加载
    // ============================================================
    await navigateToAuditList(page)

    // 验证页面结构
    await expect(page.locator('.el-table')).toBeVisible()
    await expect(page.locator('.filter-card')).toBeVisible()

    // 验证测试报名数据出现在列表中（审核表不显示 team_name，用 comp_name 定位）
    const regRow = page.locator('.el-table__body tr').filter({ hasText: COMP_NAME }).first()
    await expect(regRow).toBeVisible({ timeout: 10000 })

    // 验证初始状态为"待审核"
    await expect(regRow.locator('.status-0')).toBeVisible()

    // ============================================================
    // 第二部分：筛选功能
    // ============================================================

    // 按赛事名称筛选
    await page.fill('input[placeholder="请输入赛事名称"]', COMP_NAME)
    await page.locator('button:has-text("搜索")').click()
    await page.waitForTimeout(500)

    // 验证筛选结果
    const filteredRow = page.locator('.el-table__body tr').filter({ hasText: COMP_NAME }).first()
    await expect(filteredRow).toBeVisible({ timeout: 5000 })

    // 重置筛选
    await page.locator('button:has-text("重置")').click()
    await page.waitForTimeout(500)

    // ============================================================
    // 第三部分：快捷通过
    // ============================================================

    // 重新定位到测试报名行
    const targetRow = page.locator('.el-table__body tr').filter({ hasText: COMP_NAME }).first()
    await expect(targetRow).toBeVisible({ timeout: 5000 })

    // 等待 API 响应
    const auditRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/audit') && resp.request().method() === 'PUT',
      { timeout: 10000 }
    )

    // 点击"通过"按钮
    await targetRow.locator('button:has-text("通过")').click()

    // 确认弹窗
    const confirmDialog = page.locator('.el-message-box').filter({ hasText: '确认直接通过' })
    await expect(confirmDialog).toBeVisible({ timeout: 5000 })
    await confirmDialog.locator('button:has-text("确定通过")').click()

    // 等待审核 API 返回
    const auditResp = await auditRespPromise
    const auditData = await auditResp.json()
    console.log(`快捷通过响应: code=${auditData.code}`)
    expect(auditData.code === 200 || auditData.code === 0).toBeTruthy()

    // 验证成功消息
    await expect(page.locator('.el-message--success').last()).toBeVisible({ timeout: 5000 })

    // 验证状态变更为"已通过"
    const updatedRow = page.locator('.el-table__body tr').filter({ hasText: COMP_NAME }).first()
    await expect(updatedRow.locator('.status-1')).toBeVisible({ timeout: 5000 })

    console.log('审核列表页测试完成')
  })

  test('详情页 - 查看、驳回、重新审核通过', async ({ page }) => {
    // 创建新赛事和报名（避免与 beforeAll 的报名冲突）
    const adminToken = await getAuthToken(page)
    const detailCompName = `E2E详情赛事_${Date.now()}`
    const detailCompId = await createCompetitionWithName(page, detailCompName)
    await saveRegConfig(page, adminToken, detailCompId)

    const studentPage = await page.context().browser().newPage()
    await login(studentPage, STUDENT_USER)
    const studentToken = await getAuthToken(studentPage)

    const reg2Resp = await apiRequest(studentPage, 'post', '/api/reg/submit', studentToken, {
      comp_id: detailCompId,
      team_name: `详情测试队伍_${Date.now()}`,
      leader: {
        name: '详情测试队长',
        stuID: 'S2024001',
        phone: '13800138001',
        email: 'detail_test@example.com',
        college: '计算机学院',
        is_leader: true,
      },
      members: [],
      attachment_url: '',
      advisor_info: {
        id: null,
        username: 'T2023001',
        name: '测试指导老师',
        phone: '13900139000',
        email: 'advisor@example.com',
        college: '计算机学院',
      },
      track: '',
    })
    const reg2Data = await reg2Resp.json()
    console.log('详情测试报名响应:', reg2Data)
    await studentPage.close()

    // ============================================================
    // 第一部分：进入详情页
    // ============================================================
    await navigateToAuditList(page)

    // 筛选到目标记录
    await page.fill('input[placeholder="请输入赛事名称"]', detailCompName)
    const searchRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.locator('button:has-text("搜索")').click()
    await searchRespPromise
    await page.waitForTimeout(500)

    // 找到待审核记录
    const targetRow = page.locator('.el-table__body tr').filter({ hasText: detailCompName }).first()
    await expect(targetRow).toBeVisible({ timeout: 10000 })

    // 点击"详情"进入详情页
    await targetRow.locator('button:has-text("详情")').click()
    await page.waitForURL(/\/register\/audit\/detail\//, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // 验证详情页内容
    await expect(page.locator('.page-title')).toContainText('报名详情审核')
    await expect(page.locator('.el-descriptions')).toBeVisible()

    // 验证操作按钮存在（待审核状态显示操作区）
    await expect(page.locator('button:has-text("驳回报名")')).toBeVisible()
    await expect(page.locator('button:has-text("通过审核")')).toBeVisible()

    // ============================================================
    // 第二部分：驳回操作
    // ============================================================

    // 点击"驳回报名"
    await page.locator('button:has-text("驳回报名")').click()

    // 验证驳回弹窗
    const rejectDialog = page.locator('.el-dialog:has-text("驳回申请")')
    await expect(rejectDialog).toBeVisible({ timeout: 5000 })

    // 填写驳回原因
    await rejectDialog.locator('textarea').fill(REJECT_REASON)

    // 拦截审核 API
    const rejectRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/audit') && resp.request().method() === 'PUT',
      { timeout: 10000 }
    )

    // 确认驳回
    await rejectDialog.locator('button:has-text("确认驳回")').click()

    // 等待 API 返回
    const rejectResp = await rejectRespPromise
    const rejectData = await rejectResp.json()
    console.log(`驳回响应: code=${rejectData.code}`)
    expect(rejectData.code === 200 || rejectData.code === 0).toBeTruthy()

    // 验证成功消息
    await expect(page.locator('.el-message--success').last()).toBeVisible({ timeout: 5000 })

    // 验证状态变更为"已驳回"
    await expect(page.locator('.el-tag--danger')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.el-tag--danger')).toContainText('已驳回')

    // 验证驳回原因显示
    await expect(page.locator('.reject-content')).toContainText(REJECT_REASON)

    // ============================================================
    // 第三部分：返回列表验证驳回状态
    // ============================================================
    await page.goto('/#/register/audit')
    await page.waitForLoadState('networkidle')
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    // 找到被驳回的记录（最新的一条）
    const rejectedRow = page.locator('.el-table__body tr').filter({ hasText: detailCompName }).first()
    await expect(rejectedRow).toBeVisible({ timeout: 15000 })

    // 验证状态为"已驳回"
    await expect(rejectedRow.locator('.status-2')).toBeVisible()

    console.log('详情页驳回测试完成')
  })

  test('批量操作 - 批量通过', async ({ page }) => {
    // 批量操作需要多条待审核记录，但同一学生不能重复报名同一赛事
    // 通过 UI 创建两个新赛事并分别报名
    const adminToken = await getAuthToken(page)
    const batchCompName1 = `E2E批量赛事1_${Date.now()}`
    const batchCompName2 = `E2E批量赛事2_${Date.now()}`

    // 用 UI 创建赛事 1
    const batchCompId1 = await createCompetitionWithName(page, batchCompName1)
    await saveRegConfig(page, adminToken, batchCompId1)

    // 用 UI 创建赛事 2
    const batchCompId2 = await createCompetitionWithName(page, batchCompName2)
    await saveRegConfig(page, adminToken, batchCompId2)

    // 学生报名两个赛事
    const studentPage = await page.context().browser().newPage()
    await login(studentPage, STUDENT_USER)
    const studentToken = await getAuthToken(studentPage)

    const reg1Resp = await apiRequest(studentPage, 'post', '/api/reg/submit', studentToken, {
      comp_id: batchCompId1,
      team_name: `批量队伍1_${Date.now()}`,
      leader: { name: '批量队长1', stuID: 'S2024001', phone: '13800138010', email: 'batch1@example.com', college: '计算机学院', is_leader: true },
      members: [],
      attachment_url: '',
      advisor_info: { id: null, username: 'T2023001', name: '测试指导老师', phone: '13900139000', email: 'adv@example.com', college: '计算机学院' },
      track: '',
    })
    const reg1Data = await reg1Resp.json()
    console.log('批量报名1响应:', reg1Data)

    const reg2Resp = await apiRequest(studentPage, 'post', '/api/reg/submit', studentToken, {
      comp_id: batchCompId2,
      team_name: `批量队伍2_${Date.now()}`,
      leader: { name: '批量队长2', stuID: 'S2024001', phone: '13800138011', email: 'batch2@example.com', college: '计算机学院', is_leader: true },
      members: [],
      attachment_url: '',
      advisor_info: { id: null, username: 'T2023001', name: '测试指导老师', phone: '13900139000', email: 'adv@example.com', college: '计算机学院' },
      track: '',
    })
    const reg2Data = await reg2Resp.json()
    console.log('批量报名2响应:', reg2Data)

    await studentPage.close()

    // ============================================================
    // 进入审核列表
    // ============================================================
    await navigateToAuditList(page)

    // 找到两条待审核记录（用批量赛事名筛选）
    const row1 = page.locator('.el-table__body tr').filter({ hasText: batchCompName1 }).first()
    const row2 = page.locator('.el-table__body tr').filter({ hasText: batchCompName2 }).first()
    await expect(row1).toBeVisible({ timeout: 10000 })
    await expect(row2).toBeVisible({ timeout: 5000 })

    // 勾选两条记录
    await row1.locator('.el-checkbox').click()
    await row2.locator('.el-checkbox').click()
    await page.waitForTimeout(300)

    // 验证已选数量
    await expect(page.locator('.action-bar .num')).toContainText('2')

    // ============================================================
    // 批量通过
    // ============================================================

    // 拦截批量审核 API（多条并行请求）
    const auditPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/audit') && resp.request().method() === 'PUT',
      { timeout: 10000 }
    )

    // 点击"批量通过"
    await page.locator('button:has-text("批量通过")').click()

    // 确认弹窗
    const batchConfirm = page.locator('.el-message-box').filter({ hasText: '确定要批量通过' })
    await expect(batchConfirm).toBeVisible({ timeout: 5000 })
    await batchConfirm.locator('button:has-text("确定")').click()

    // 等待审核请求完成
    const auditResp = await auditPromise
    const auditData = await auditResp.json()
    console.log(`批量通过响应: code=${auditData.code}`)

    // 验证成功消息
    await expect(page.locator('.el-message--success').last()).toBeVisible({ timeout: 5000 })

    // 等待列表刷新
    await page.waitForTimeout(1000)

    // 验证两条记录状态都变为"已通过"
    await page.waitForTimeout(1000)
    const updatedRow1 = page.locator('.el-table__body tr').filter({ hasText: batchCompName1 }).first()
    const updatedRow2 = page.locator('.el-table__body tr').filter({ hasText: batchCompName2 }).first()
    await expect(updatedRow1.locator('.status-1')).toBeVisible({ timeout: 5000 })
    await expect(updatedRow2.locator('.status-1')).toBeVisible({ timeout: 5000 })

    console.log('批量通过测试完成')
  })
})
