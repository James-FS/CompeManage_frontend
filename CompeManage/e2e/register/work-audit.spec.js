import { test, expect } from 'playwright-test-coverage'
import { login } from '../helpers/auth'

const ADMIN_USER = { username: 'T2023001', password: '123', role: 'school_admin' }
const STUDENT_USER = { username: 'S2024001', password: '123' }

// 每个测试用唯一赛事名，避免数据冲突
function uniqueCompName(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

// ==================== 辅助函数 ====================



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
  const id = createData.data?.data?.id || createData.data?.id || createData.data?.ID
  console.log(`赛事 "${compName}" 创建成功, ID: ${id}`)
  expect(id).toBeDefined()

  await page.waitForURL(/\/competition\/list/, { timeout: 10000 })
  await page.waitForTimeout(500)

  return id
}

// 保存报名配置（包含作品提交时间窗口）
async function saveRegConfig(page, token, competitionId) {
  const now = new Date()
  const regStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const regEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const submitStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const submitEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const response = await apiRequest(page, 'post', '/api/reg/config', token, {
    comp_id: competitionId,
    participant_type: 1,
    min_team_member: 1,
    max_team_member: 1,
    reg_start_time: regStart,
    reg_end_time: regEnd,
    submit_start_time: submitStart,
    submit_end_time: submitEnd,
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

// 学生提交报名
async function submitRegistration(page, token, competitionId, teamName) {
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

// 管理员审核通过报名
async function approveRegistration(page, token, regId) {
  const response = await apiRequest(page, 'put', '/api/reg/audit', token, {
    id: regId,
    status: 1,
  })
  const data = await response.json()
  console.log(`审核通过响应 (regId=${regId}):`, data)
  return data
}

// 学生提交作品
async function submitWork(page, token, regId) {
  const response = await apiRequest(page, 'put', '/api/reg/work-submit', token, {
    reg_id: regId,
    work_attachment_url: '/static/test_work/e2e_test_work.pdf',
  })
  const data = await response.json()
  console.log(`作品提交响应 (regId=${regId}):`, data)
  return data
}

// 获取报名列表（管理员视角，用于获取 reg_id）
async function getRegList(page, token, compName) {
  const response = await apiRequest(page, 'get', `/api/reg/list?page=1&pageSize=10&comp_name=${encodeURIComponent(compName)}`, token)
  const data = await response.json()
  return data
}

// 完整的测试数据准备流程：创建赛事 → 配置 → 报名 → 审核 → 提交作品
async function setupWorkAuditData(browser, compName, teamName) {
  const page = await browser.newPage()

  // 1. 管理员登录并创建赛事
  await login(page, ADMIN_USER)
  const adminToken = await getAuthToken(page)
  const compId = await createCompetitionWithName(page, compName)

  // 2. 保存报名配置（含作品提交时间窗口）
  await saveRegConfig(page, adminToken, compId)

  // 3. 学生登录并提交报名
  await page.evaluate(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  })
  await login(page, STUDENT_USER)

  const studentToken = await getAuthToken(page)
  const regResp = await submitRegistration(page, studentToken, compId, teamName)
  const regId = regResp.data?.id || regResp.data?.ID || regResp.data?.reg_id

  // 4. 管理员审核通过
  // 切回管理员
  await page.evaluate(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  })
  await login(page, ADMIN_USER)

  const adminToken2 = await getAuthToken(page)

  // 通过列表 API 获取 reg_id（如果 submit 没返回 id）
  let finalRegId = regId
  if (!finalRegId) {
    const listData = await getRegList(page, adminToken2, compName)
    if (listData.data?.list?.length > 0) {
      finalRegId = listData.data.list[0].id
    }
  }
  console.log(`最终 regId: ${finalRegId}`)

  if (finalRegId) {
    await approveRegistration(page, adminToken2, finalRegId)
  }

  // 5. 学生提交作品
  await page.evaluate(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  })
  await login(page, STUDENT_USER)

  const studentToken2 = await getAuthToken(page)
  if (finalRegId) {
    await submitWork(page, studentToken2, finalRegId)
  }

  await page.close()
  return { compId, regId: finalRegId }
}

// ==================== 测试套件 ====================

test.describe('作品审核 E2E 测试', () => {
  // 每个测试独立准备数据，避免测试间干扰
  // 共享变量在 beforeAll 中赋值
  let compName, teamName, compId, regId

  test.beforeAll(async ({ browser }) => {
    compName = uniqueCompName('E2E作品审核')
    teamName = `作品测试队伍_${Date.now()}`
    const data = await setupWorkAuditData(browser, compName, teamName)
    compId = data.compId
    regId = data.regId
    console.log(`作品审核测试数据就绪: compId=${compId}, regId=${regId}, compName=${compName}`)
  })

  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_USER)
  })

  test('赛事列表页 - 加载与筛选', async ({ page }) => {
    // ============================================================
    // 第一部分：验证赛事列表页加载
    // ============================================================
    await page.goto('/#/register/work-audit')
    await page.waitForLoadState('networkidle')
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/work/audit/comp/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    // 验证页面结构
    await expect(page.locator('.el-table')).toBeVisible()
    await expect(page.locator('.search-container')).toBeVisible()

    // 验证测试赛事出现在列表中
    const targetRow = page.locator('.el-table__body tr').filter({ hasText: compName }).first()
    await expect(targetRow).toBeVisible({ timeout: 10000 })

    // ============================================================
    // 第二部分：按赛事名称筛选
    // ============================================================
    await page.fill('input[placeholder="请输入赛事名称"]', compName)
    const searchRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/work/audit/comp/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.locator('button:has-text("搜索")').click()
    await searchRespPromise
    await page.waitForTimeout(500)

    // 验证筛选结果
    const filteredRow = page.locator('.el-table__body tr').filter({ hasText: compName }).first()
    await expect(filteredRow).toBeVisible({ timeout: 5000 })

    // 验证提交人数 > 0
    const submitCountCell = filteredRow.locator('td').nth(3) // 提交人数列
    await expect(submitCountCell).toContainText(/[1-9]/)

    // ============================================================
    // 第三部分：重置筛选
    // ============================================================
    await page.locator('button:has-text("重置")').click()
    await page.waitForTimeout(500)

    // 验证列表刷新
    await expect(page.locator('.el-table__body tr').first()).toBeVisible({ timeout: 5000 })

    console.log('赛事列表页测试完成')
  })

  test('学生提交列表 - 查看与搜索', async ({ page }) => {
    // ============================================================
    // 第一部分：进入赛事的学生提交列表
    // ============================================================
    await page.goto('/#/register/work-audit')
    await page.waitForLoadState('networkidle')
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/work/audit/comp/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    // 找到目标赛事并点击"查看"
    const targetRow = page.locator('.el-table__body tr').filter({ hasText: compName }).first()
    await expect(targetRow).toBeVisible({ timeout: 10000 })

    const studentListRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/work/audit/student/list') && resp.status() === 200,
      { timeout: 10000 }
    )

    await targetRow.locator('button:has-text("查看")').click()

    // 等待导航到学生列表页
    await page.waitForURL(/\/register\/work-audit\/comp\//, { timeout: 10000 })
    await studentListRespPromise
    await page.waitForTimeout(500)

    // ============================================================
    // 第二部分：验证学生列表内容
    // ============================================================

    // 验证页面标题显示赛事名称
    await expect(page.locator('.title-text')).toContainText(compName)

    // 验证表格可见
    await expect(page.locator('.el-table')).toBeVisible()

    // 验证测试学生出现在列表中（用学号定位，因为 leader_name 取的是数据库中的真实姓名）
    const studentRow = page.locator('.el-table__body tr').filter({ hasText: 'S2024001' }).first()
    await expect(studentRow).toBeVisible({ timeout: 10000 })

    // ============================================================
    // 第三部分：搜索功能
    // ============================================================
    await page.fill('input[placeholder="输入队伍名/负责人/学号搜索"]', 'S2024001')
    const searchRespPromise2 = page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/work/audit/student/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.locator('button:has-text("搜索")').click()
    await searchRespPromise2
    await page.waitForTimeout(500)

    // 验证搜索结果
    const searchedRow = page.locator('.el-table__body tr').filter({ hasText: 'S2024001' }).first()
    await expect(searchedRow).toBeVisible({ timeout: 5000 })

    console.log('学生提交列表测试完成')
  })

  test('作品详情页 - 查看提交内容', async ({ page }) => {
    // ============================================================
    // 第一部分：导航到作品详情页
    // ============================================================
    await page.goto('/#/register/work-audit')
    await page.waitForLoadState('networkidle')
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/work/audit/comp/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    // 进入学生列表
    const targetRow = page.locator('.el-table__body tr').filter({ hasText: compName }).first()
    await expect(targetRow).toBeVisible({ timeout: 10000 })

    await targetRow.locator('button:has-text("查看")').click()
    await page.waitForURL(/\/register\/work-audit\/comp\//, { timeout: 10000 })
    await page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/work/audit/student/list') && resp.status() === 200,
      { timeout: 10000 }
    )
    await page.waitForTimeout(500)

    // 点击学生记录的"查看"进入详情页
    const studentRow = page.locator('.el-table__body tr').filter({ hasText: 'S2024001' }).first()
    await expect(studentRow).toBeVisible({ timeout: 10000 })

    const detailRespPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/reg/detail') && resp.status() === 200,
      { timeout: 10000 }
    )

    await studentRow.locator('button:has-text("查看")').click()

    // 等待导航到详情页
    await page.waitForURL(/\/register\/work-audit\/detail\//, { timeout: 10000 })
    await detailRespPromise
    await page.waitForTimeout(500)

    // ============================================================
    // 第二部分：验证详情页内容
    // ============================================================

    // 验证页面标题
    await expect(page.locator('.page-title')).toContainText('作品提交详情')

    // 验证基础信息
    await expect(page.locator('.el-descriptions')).toBeVisible()
    await expect(page.locator('.el-descriptions')).toContainText(compName)
    await expect(page.locator('.el-descriptions')).toContainText('S2024001')

    // 验证作品资料区域
    await expect(page.locator('.section-title:has-text("作品资料")')).toBeVisible()

    // 验证作品文件已显示
    const workAttachment = page.locator('.attachment-box').first()
    await expect(workAttachment).toBeVisible({ timeout: 5000 })

    // 验证没有审核操作按钮（纯查看页面）
    await expect(page.locator('button:has-text("驳回报名")')).not.toBeVisible()
    await expect(page.locator('button:has-text("通过审核")')).not.toBeVisible()

    console.log('作品详情页测试完成')
  })
})
