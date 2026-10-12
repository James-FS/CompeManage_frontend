/**
 * 获奖填报全流程 E2E（串行，按真实业务顺序执行）：
 *
 * 1. 校管理员在"赛事管理 → 新增赛事"手动创建 3 个校级赛事
 * 2. 院管理员在"获奖填报 → 校赛填报"里：
 *    - 赛事A：列表卡片"导入数据"直传 Excel（3人跨学院团队 + 1个国家级个人）
 *    - 赛事B：详情页"导入名单"进导入页，Excel 上传 → 校验（含1行学号不存在）→ 删错行 → 提交
 *             （2人跨学院团队 + 校赛个人 + 国际级个人，验证国际级归一为国家级）
 *    - 赛事C：导入页"新增一条"手动录入 2 人团队（含跨赛重复队员）
 * 3. 校管理员回到"校赛填报"，按赛事年份导出附件1（省级以上项目）与附件2（省级以上学生），
 *    解析下载的 Excel 核对内容：省级以上样例齐全、校赛样例不出现
 *
 * 运行：npx playwright test --config=playwright.flow.config.js
 * 前置：后端 8080 已启动（globalSetup 会检查），学生样例由 globalSetup 播种。
 */
import { test, expect } from '@playwright/test'
import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import { login } from '../helpers/auth'
import { SCHOOL_ADMIN, COLLEGE_ADMIN, YEAR, FLOW_COMPS, awardExcelFile, STUDENT } from '../helpers/award-flow-data'

test.describe.configure({ mode: 'serial' })

const RUN_TAG = Date.now().toString(36)
const P = {
  A1: `智能视觉识别系统_${RUN_TAG}`,
  A2: `校园二手交易平台_${RUN_TAG}`,
  B1: `城市交通流量预测平台_${RUN_TAG}`,
  B2: `柔性夹持机械手设计_${RUN_TAG}`,
  B3: `法律知识智能问答助手_${RUN_TAG}`,
  C1: `智慧校园导览小程序_${RUN_TAG}`,
  BAD: `幽灵项目_${RUN_TAG}`,
}

// 串行用例间共享：赛事 key → { id, compCode, name }
const state = { comps: {} }

test('校管理员手动新建 3 个赛事', async ({ page }) => {
  test.setTimeout(240_000)
  await login(page, SCHOOL_ADMIN)

  for (const comp of FLOW_COMPS) {
    const name = `${comp.base}_${RUN_TAG}`
    await page.goto('/#/competition/add')
    await page.locator('input[placeholder="请输入赛事名称"]').waitFor()
    await page.locator('input[placeholder="请输入赛事名称"]').fill(name)

    await selectElOption(page, '赛事级别', comp.level)
    await selectElOption(page, '赛事类型', comp.type)

    const collegeSelect = page.locator('.el-form-item').filter({ hasText: '所属学院' }).locator('.el-select').first()
    await collegeSelect.click()
    await page.getByRole('option', { name: comp.college, exact: true }).first().click()

    await page.locator('input[placeholder="请填写主办单位"]').fill(comp.organizer)
    await page.locator('input[placeholder="请填写承办单位"]').fill(comp.undertaker)

    await pickManagerByWorkId(page, comp.managerWorkId)

    await page.locator('input[placeholder="请选择所属年份"]').fill(YEAR)
    await page.locator('textarea[placeholder="填写赛事的其他补充说明..."]').fill(comp.desc)

    const createResp = page.waitForResponse(r => r.url().includes('/api/comp/create') && r.request().method() === 'POST')
    await page.locator('button:has-text("创建")').first().click()
    const resp = await createResp
    const json = await resp.json()
    expect(json.code, `创建「${name}」应成功：${json.message}`).toBe(200)
    expect(json.data.competition.comp_code).toBeTruthy()
    state.comps[comp.key] = { id: json.data.competition.id, compCode: json.data.competition.comp_code, name }
    console.log(`[award-flow] 已创建赛事${comp.key}: ${name} (${json.data.competition.comp_code}, id=${json.data.competition.id})`)

    await expect(page).toHaveURL(/competition\/list/)
  }

  expect(Object.keys(state.comps)).toHaveLength(3)
})

test('院管理员在校赛填报用"导入数据"直传赛事A获奖名单', async ({ page }) => {
  const comp = state.comps.A
  const rowsA = [
    { ...STUDENT.E2E2601, project: P.A1, month: '2026-05', category: '省级', level: '一等奖' },
    { ...STUDENT.E2E2602, project: P.A1, month: '2026-05', category: '省级', level: '一等奖' },
    { ...STUDENT.E2E2603, project: P.A1, month: '2026-05', category: '省级', level: '一等奖' },
    { ...STUDENT.E2E2604, project: P.A2, month: '2026-06', category: '国家级', level: '二等奖', remark: 'E2E个人样例' },
  ]

  await login(page, COLLEGE_ADMIN)
  await gotoAwardListViaMenu(page)

  const card = page.locator('.comp-card').filter({ hasText: comp.name })
  await expect(card).toBeVisible()
  await expect(card.locator('.btn-text', { hasText: '导入数据' })).toBeVisible()

  const importResp = page.waitForResponse(r => r.url().includes('/api/award/import?') && r.request().method() === 'POST')
  await card.locator('.upload-wrapper input[type="file"]').setInputFiles(awardExcelFile(`赛事A获奖名单_${RUN_TAG}.xlsx`, rowsA))
  const json = await (await importResp).json()
  expect(json.code, `赛事A直传导入应成功：${JSON.stringify(json)}`).toBe(200)
  expect(json.message).toContain('处理4名学生、2个团队')
  expect(json.message).toContain('新增4人')
  expect(json.data).toMatchObject({ student_count: 4, team_count: 2, success_count: 4, fail_count: 0 })
  await expect(page.locator('.el-message--success').first()).toBeVisible()

  // 查看结果 → 获奖名单页
  await card.locator('.primary-btn').click()
  await expect(page).toHaveURL(new RegExp(`award/detail/${comp.id}`))
  await expect(page.getByText(/2 个团队项目\s*·\s*4 名获奖学生/)).toBeVisible()

  const teamRow = page.locator('.el-table__body tr').filter({ hasText: P.A1 })
  await expect(teamRow).toContainText('省级')
  await expect(teamRow).toContainText('一等奖')
  await expect(teamRow).toContainText('王奕辰、刘思远、陈嘉懿（3人）')

  const individualRow = page.locator('.el-table__body tr').filter({ hasText: P.A2 })
  await expect(individualRow).toContainText('国家级')
  await expect(individualRow).toContainText('赵雨桐（1人）')

  // 打开团队获奖成员弹窗，核对跨学院成员与学院
  await teamRow.locator('button').filter({ hasText: '（3人）' }).click()
  const dialog = page.locator('.el-dialog:visible').first()
  await expect(dialog).toBeVisible()
  for (const u of ['E2E2601', 'E2E2602', 'E2E2603']) await expect(dialog).toContainText(u)
  await expect(dialog).toContainText('数学与信息科学学院')
  await expect(dialog).toContainText('电子与通信工程学院')
  await page.locator('.el-dialog__headerbtn').first().click()
  await expect(dialog).not.toBeVisible()
})

test('院管理员为赛事B走导入页：校验报错、删错行、提交成功', async ({ page }) => {
  const comp = state.comps.B
  const rowsB = [
    { ...STUDENT.E2E2605, major: '', project: P.B1, month: '2026-04', category: '省级', level: '二等奖' }, // 专业留空，按系统资料回填
    { ...STUDENT.E2E2606, project: P.B1, month: '2026-04', category: '省级', level: '二等奖' },
    { ...STUDENT.E2E2607, project: P.B2, month: '2026-03', category: '校赛', level: '一等奖', remark: 'E2E校内样例' },
    { ...STUDENT.E2E2608, project: P.B3, month: '2026-07', category: '国际级', level: '三等奖' },
    { username: 'E2E9999', name: '不存在学生', college: '数学学院', major: '数学与应用数学', project: P.BAD, month: '2026-05', category: '省级', level: '一等奖' },
  ]

  await login(page, COLLEGE_ADMIN)
  await page.goto('/#/award/list')
  const card = page.locator('.comp-card').filter({ hasText: comp.name })
  await expect(card).toBeVisible()
  await card.locator('.primary-btn').click()
  await expect(page).toHaveURL(new RegExp(`award/detail/${comp.id}`))
  await expect(page.getByText(/0 个团队项目\s*·\s*0 名获奖学生/)).toBeVisible()

  await page.getByRole('button', { name: '导入名单' }).click()
  await expect(page).toHaveURL(new RegExp(`award/import/${comp.id}`))
  await expect(page.getByText('当前报名要求：无需报名')).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles(awardExcelFile(`赛事B获奖名单_${RUN_TAG}.xlsx`, rowsB))
  await expect(page.getByText(/读取 5 名学生，示例和说明行已排除/)).toBeVisible()
  await expect(page.locator('.el-table__body tbody tr')).toHaveCount(5)

  // 提交时自动校验：学号不存在的行应报错且不写入
  const invalidImportResp = page.waitForResponse(r => r.url().includes('/api/award/import?') && r.request().method() === 'POST')
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  expect((await (await invalidImportResp).json()).code).toBe(400)
  await expect(page.getByText('1 行需要修正；本批数据未写入，请根据下方提示修改后重新提交。')).toBeVisible()
  const badRow = page.locator('.el-table__body tbody tr').filter({ hasText: '学号不存在' })
  await expect(badRow).toHaveCount(1)

  await badRow.getByRole('button').click()
  await expect(page.locator('.el-table__body tbody tr')).toHaveCount(4)

  const importResp = page.waitForResponse(r => r.url().includes('/api/award/import?') && r.request().method() === 'POST')
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  expect((await (await importResp).json()).code).toBe(200)

  await expect(page).toHaveURL(new RegExp(`award/detail/${comp.id}`))
  await expect(page.getByText(/3 个团队项目\s*·\s*4 名获奖学生/)).toBeVisible()

  // 国际级在后端归一为国家级展示
  await expect(page.locator('.el-table__body tr').filter({ hasText: P.B3 })).toContainText('国家级')
  // 校赛样例正常入库
  await expect(page.locator('.el-table__body tr').filter({ hasText: P.B2 })).toContainText('校赛')
  // 跨学院团队两名成员
  await expect(page.locator('.el-table__body tr').filter({ hasText: P.B1 })).toContainText('林芷晴、黄子涛（2人）')
})

test('已导入成员不能重复补录，同赛事重复获奖记录整批拒绝', async ({ page }) => {
  let comp = state.comps.B
  if (!comp) {
    // 支持单独运行本条回归用例：此前 B 赛事由前序 UI 用例创建，这里补齐最小 API fixture。
    await login(page, SCHOOL_ADMIN)
    const adminToken = await page.evaluate(() => localStorage.getItem('token'))
    const createResponse = await page.request.post('/api/comp/create', {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        comp_name: `E2E获奖流程·重复校验_${RUN_TAG}`,
        comp_level: '校级',
        comp_type: '学科竞赛',
        organizer: 'E2E测试主办方',
        undertaker: 'E2E测试承办方',
        manager_id: 7,
        college: '计算机科学与网络工程学院',
        year: YEAR,
        desc: '独立运行重复获奖校验用例',
      },
    })
    const created = await createResponse.json()
    expect(created.code, `创建校验赛事应成功：${JSON.stringify(created)}`).toBe(200)
    comp = { id: created.data.competition.id, compCode: created.data.competition.comp_code, name: created.data.competition.comp_name }

    const seedResponse = await page.request.post(`/api/award/import?comp_id=${comp.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { rows: [{
        student_id: STUDENT.E2E2605.username,
        name: STUDENT.E2E2605.name,
        college: STUDENT.E2E2605.college,
        major: STUDENT.E2E2605.major,
        project_name: P.B1,
        award_month: '2026-04',
        award_category: '省级',
        award_name: '二等奖',
      }] },
    })
    const seedBody = await seedResponse.json()
    expect(seedBody.code, `导入初始获奖记录失败：${JSON.stringify(seedBody)}`).toBe(200)
  }

  await login(page, { username: STUDENT.E2E2605.username, password: '123', role: 'student' })
  const studentToken = await page.evaluate(() => localStorage.getItem('token'))
  const supplementResponse = await page.request.post('/api/award/student/supplement', {
    headers: { Authorization: `Bearer ${studentToken}` },
    data: {
      comp_id: comp.id,
      team_name: P.B1,
      award_level: '省级二等奖',
      award_name: '二等奖',
      award_date: '2026-04-01',
      proof_url: '/uploads/e2e-duplicate-award.pdf',
      members: [{
        name: STUDENT.E2E2605.name,
        student_id: STUDENT.E2E2605.username,
        phone: '13800000000',
        email: 'e2e2605@example.com',
        college: STUDENT.E2E2605.college,
        is_leader: true,
      }],
    },
  })
  expect(supplementResponse.status()).toBe(400)
  expect((await supplementResponse.json()).message).toContain('记录已存在')

  await login(page, SCHOOL_ADMIN)
  const managerToken = await page.evaluate(() => localStorage.getItem('token'))
  const duplicateExistingResponse = await page.request.post(`/api/award/import?comp_id=${comp.id}`, {
    headers: { Authorization: `Bearer ${managerToken}` },
    data: { rows: [{
      student_id: STUDENT.E2E2605.username,
      name: STUDENT.E2E2605.name,
      college: STUDENT.E2E2605.college,
      major: STUDENT.E2E2605.major,
      project_name: `另一个项目_${RUN_TAG}`,
      award_month: '2026-05',
      award_category: '国家级',
      award_name: '一等奖',
    }] },
  })
  expect(duplicateExistingResponse.status()).toBe(400)
  const duplicateExistingBody = await duplicateExistingResponse.json()
  expect(duplicateExistingBody.data.rows[0].error).toContain('该学生在本赛事已有其他获奖记录')

  const duplicateBatchResponse = await page.request.post(`/api/award/import?comp_id=${comp.id}`, {
    headers: { Authorization: `Bearer ${managerToken}` },
    data: { rows: ['批次项目一', '批次项目二'].map(projectName => ({
      student_id: STUDENT.E2E2609.username,
      name: STUDENT.E2E2609.name,
      college: STUDENT.E2E2609.college,
      major: STUDENT.E2E2609.major,
      project_name: `${projectName}_${RUN_TAG}`,
      award_month: '2026-05',
      award_category: '省级',
      award_name: '二等奖',
    })) },
  })
  expect(duplicateBatchResponse.status()).toBe(400)
  const duplicateBatchBody = await duplicateBatchResponse.json()
  expect(duplicateBatchBody.data.error_count).toBe(1)
  expect(duplicateBatchBody.data.rows[1].error).toContain('同一赛事中，每名学生只能申报一条获奖记录')
})

test('院管理员为赛事C手动新增 2 人团队获奖', async ({ page }) => {
  const comp = state.comps.C
  await login(page, COLLEGE_ADMIN)
  await page.goto('/#/award/list')
  const card = page.locator('.comp-card').filter({ hasText: comp.name })
  await expect(card).toBeVisible()
  await card.locator('.primary-btn').click()
  await expect(page).toHaveURL(new RegExp(`award/detail/${comp.id}`))
  await page.getByRole('button', { name: '导入名单' }).click()
  await expect(page).toHaveURL(new RegExp(`award/import/${comp.id}`))

  await page.getByRole('button', { name: '新增一条', exact: true }).click()
  await fillImportRow(page, 0, {
    学号: STUDENT.E2E2609.username, 姓名: STUDENT.E2E2609.name, 学院: STUDENT.E2E2609.college, 专业: STUDENT.E2E2609.major,
    项目: P.C1, 时间: '2026-08', 类别: '省级', 等级: '三等奖',
  })
  await page.getByRole('button', { name: '新增一条', exact: true }).click()
  await fillImportRow(page, 1, {
    学号: STUDENT.E2E2601.username, 姓名: STUDENT.E2E2601.name, 学院: STUDENT.E2E2601.college, 专业: STUDENT.E2E2601.major,
    项目: P.C1, 时间: '2026-08', 类别: '省级', 等级: '三等奖',
  })

  const importResp = page.waitForResponse(r => r.url().includes('/api/award/import?') && r.request().method() === 'POST')
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  expect((await (await importResp).json()).code).toBe(200)

  await expect(page).toHaveURL(new RegExp(`award/detail/${comp.id}`))
  await expect(page.getByText(/1 个团队项目\s*·\s*2 名获奖学生/)).toBeVisible()
  // 详情页成员展示顺序与提交顺序无关，只断言两名成员都在
  await expect(page.locator('.el-table__body tr').filter({ hasText: P.C1 })).toContainText(/(郑晓萌、王奕辰|王奕辰、郑晓萌)（2人）/)
})

test('校管理员按赛事年份导出附件1/附件2并核对内容', async ({ page }) => {
  const comps = state.comps
  await login(page, SCHOOL_ADMIN)
  await page.goto('/#/award/list')
  await expect(page.getByText('赛事年份', { exact: true })).toBeVisible()

  // 按赛事年份过滤导出
  const yearInput = page.getByPlaceholder('全部赛事年份')
  await yearInput.fill(YEAR)
  await yearInput.press('Enter')
  await yearInput.blur()
  await expect(yearInput).toHaveValue(new RegExp(YEAR))

  const download1 = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出附件1（省级以上项目）' }).click()
  const d1 = await download1
  expect(d1.suggestedFilename()).toBe(`${YEAR}年大学生参加省级以上各类竞赛获奖项目一览表（本科生获奖统计）.xlsx`)
  const f1 = test.info().outputPath(d1.suggestedFilename())
  await d1.saveAs(f1)
  await expect(page.locator('.el-message--success').first()).toBeVisible()

  const download2 = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出附件2（省级以上学生）' }).click()
  const d2 = await download2
  expect(d2.suggestedFilename()).toBe(`${YEAR}年大学生参加省级以上各类竞赛获奖学生一览表（本科生获奖统计）.xlsx`)
  const f2 = test.info().outputPath(d2.suggestedFilename())
  await d2.saveAs(f2)

  console.log(`[award-flow] 附件1: ${f1}\n[award-flow] 附件2: ${f2}`)

  // ---- 附件1：省级以上项目一览 ----
  const projectRows = sheetRowTexts(f1, '获奖项目')
  expect(projectRows.some(t => t.includes(`${YEAR}年`)), '标题应含赛事年份').toBe(true)
  const findProjectRow = token => projectRows.find(t => t.includes(token))

  const rA1 = findProjectRow(P.A1)
  expect(rA1, `附件1应含项目 ${P.A1}`).toBeTruthy()
  expect(rA1).toContain(comps.A.name)
  expect(rA1).toContain('省级一等奖')
  expect(rA1).toContain('王奕辰 刘思远 陈嘉懿')
  expect(rA1).toContain('计算机科学与网络工程学院 数学与信息科学学院 电子与通信工程学院')

  const rA2 = findProjectRow(P.A2)
  expect(rA2, `附件1应含项目 ${P.A2}`).toBeTruthy()
  expect(rA2).toContain('国家级二等奖')
  expect(rA2).toContain('赵雨桐')

  const rB1 = findProjectRow(P.B1)
  expect(rB1, `附件1应含项目 ${P.B1}`).toBeTruthy()
  expect(rB1).toContain('省级二等奖')
  expect(rB1).toContain('林芷晴 黄子涛')

  const rB3 = findProjectRow(P.B3)
  expect(rB3, `附件1应含项目 ${P.B3}`).toBeTruthy()
  expect(rB3).toContain('国家级三等奖') // 国际级归一为国家级
  expect(rB3).toContain('孙浩然')

  const rC1 = findProjectRow(P.C1)
  expect(rC1, `附件1应含项目 ${P.C1}`).toBeTruthy()
  expect(rC1).toContain('省级三等奖')
  expect(rC1).toContain('郑晓萌')
  expect(rC1).toContain('王奕辰')

  expect(projectRows.some(t => t.includes(P.B2)), '校赛样例不应出现在省级以上附件1').toBe(false)

  // ---- 附件2：省级以上学生一览 ----
  const studentRows = sheetRowTexts(f2, '获奖学生')
  const exportedIds = ['E2E2601', 'E2E2602', 'E2E2603', 'E2E2604', 'E2E2605', 'E2E2606', 'E2E2608', 'E2E2609']
  for (const id of exportedIds) {
    expect(studentRows.some(t => t.includes(id)), `附件2应含学号 ${id}`).toBe(true)
  }
  expect(studentRows.some(t => t.includes('E2E2607')), '校赛学生不应出现在附件2').toBe(false)
  expect(studentRows.filter(t => t.includes('E2E2601')), '王奕辰跨赛重复队员应有2行').toHaveLength(2)

  const r2605 = studentRows.find(t => t.includes('E2E2605'))
  expect(r2605).toContain('林芷晴')
  expect(r2605).toContain(P.B1)
  expect(r2605).toContain('省级')
  expect(r2605).toContain('二等奖')

  const r2604 = studentRows.find(t => t.includes('E2E2604'))
  expect(r2604).toContain('E2E个人样例') // 备注列随导出保留
})

test('校赛填报列表支持关键词/级别筛选（服务端过滤）', async ({ page }) => {
  await login(page, SCHOOL_ADMIN)
  await page.goto('/#/award/list')
  const filterBar = page.locator('.filter-card') // 与赛事审核页统一的筛选卡片
  await expect(filterBar).toBeVisible()

  // 关键词搜索：断言请求带 keyword 参数且 total 为 1（total 是全量匹配数，能证明是服务端过滤）
  const keywordResp = page.waitForResponse(r => {
    if (!r.url().includes('/api/award/list')) return false
    return new URL(r.url()).searchParams.get('keyword') === '蓝桥杯校赛选拔'
  })
  await filterBar.locator('input[placeholder="请输入赛事名称或编号"]').fill('蓝桥杯校赛选拔')
  await filterBar.getByRole('button', { name: '搜索' }).click()
  const json = await (await keywordResp).json()
  expect(json.data.total, '关键词应精确匹配到赛事A').toBe(1)
  await expect(page.locator('.comp-card')).toHaveCount(1)
  await expect(page.locator('.comp-card').filter({ hasText: state.comps.A.name })).toBeVisible()

  // 级别 + 无匹配关键词 → 空状态
  await filterBar.locator('input[placeholder="请输入赛事名称或编号"]').fill('不存在的关键词XYZ')
  await filterBar.getByRole('button', { name: '搜索' }).click()
  await expect(page.locator('.el-empty')).toBeVisible()

  // 重置恢复，级别下拉选校级后本批 3 个校级赛事都在
  await filterBar.getByRole('button', { name: '重置' }).click()
  await expect(page.locator('.comp-card').filter({ hasText: state.comps.A.name })).toBeVisible()
  await filterBar.locator('.el-select').first().click()
  await page.getByRole('option', { name: '校级', exact: true }).click()
  const levelResp = page.waitForResponse(r => {
    if (!r.url().includes('/api/award/list')) return false
    return new URL(r.url()).searchParams.get('level') === '校级'
  })
  await filterBar.getByRole('button', { name: '搜索' }).click()
  const levelJson = await (await levelResp).json()
  expect(levelJson.data.total).toBeGreaterThanOrEqual(3)
  for (const comp of Object.values(state.comps)) {
    await expect(page.locator('.comp-card').filter({ hasText: comp.name })).toBeVisible()
  }
})

test('回归：导入页点面包屑"获奖详情"应回填路由参数而不是 ":id"', async ({ page }) => {
  const comp = state.comps.B
  await login(page, COLLEGE_ADMIN)
  await page.goto(`/#/award/import/${comp.id}`)
  await expect(page.locator('.breadcrumb-container a.redirect', { hasText: '获奖详情' })).toBeVisible()

  await page.locator('.breadcrumb-container a.redirect', { hasText: '获奖详情' }).click()

  // 修复前：URL 会变成 /award/detail/:id 并弹出"赛事ID无效"
  await expect(page).toHaveURL(new RegExp(`award/detail/${comp.id}`), { timeout: 10000 })
  await expect(page.getByText(/3 个团队项目\s*·\s*4 名获奖学生/)).toBeVisible()
  await expect(page.locator('.el-message--error')).toHaveCount(0)
})

// ---------- 公共辅助 ----------

async function selectElOption(page, labelText, optionText) {
  const formItem = page.locator('.el-form-item').filter({ hasText: labelText })
  await formItem.locator('.el-select').first().click()
  const option = page.getByRole('option', { name: optionText, exact: true })
  await option.waitFor({ state: 'visible', timeout: 5000 })
  await option.click()
}

/** 负责人弹窗按工号精确搜索（默认不加载列表，必须先搜索），选中唯一命中行 */
async function pickManagerByWorkId(page, workId) {
  await page.locator('input[placeholder="请选择赛事负责人"]').click()
  const dialog = page.locator('.el-dialog:visible').first()
  await dialog.waitFor({ state: 'visible', timeout: 5000 })
  await dialog.locator('input[placeholder="输入工号"]').fill(workId)
  const rows = dialog.locator('.el-table__body tr')
  await rows.first().waitFor({ state: 'visible', timeout: 10000 })
  await rows.first().locator('button:has-text("选择")').click()
  await expect(dialog).not.toBeVisible({ timeout: 5000 })
}

/** 通过侧边栏菜单进入"获奖填报 → 校赛填报"（菜单异常时兜底直跳路由） */
async function gotoAwardListViaMenu(page) {
  const submenu = page.locator('.el-sub-menu__title').filter({ hasText: '获奖填报' })
  await submenu.waitFor({ state: 'visible', timeout: 10000 })
  await submenu.click()
  const item = page.getByRole('menuitem', { name: '校赛填报' })
  try {
    await item.click({ timeout: 5000 })
  } catch {
    await page.goto('/#/award/list')
  }
  await expect(page).toHaveURL(/award\/list/)
}

/** 导入页表格行填充：td 0=序号，1-9 对应九个数据列，获奖类别为下拉 */
async function fillImportRow(page, index, data) {
  const rows = page.locator('.el-table__body tbody tr')
  await expect(rows).toHaveCount(index + 1)
  const row = rows.nth(index)
  const cell = i => row.locator('td').nth(i)
  await cell(1).locator('input').fill(data.学号)
  await cell(2).locator('input').fill(data.姓名)
  await cell(3).locator('input').fill(data.学院)
  if (data.专业) await cell(4).locator('input').fill(data.专业)
  await cell(5).locator('input').fill(data.项目)
  await cell(6).locator('input').fill(data.时间)
  await cell(7).locator('.el-select').click()
  // 通过展开态 combobox 的 aria-controls 精确定位它自己的下拉 listbox，
  // 避免命中其他行已收起但仍在 DOM 中的 popper
  const combobox = cell(7).locator('[role="combobox"][aria-expanded="true"]')
  await combobox.waitFor({ state: 'visible', timeout: 5000 })
  const listboxId = await combobox.getAttribute('aria-controls')
  const listbox = page.locator(`ul[role="listbox"]#${listboxId}`)
  await listbox.getByRole('option', { name: data.类别, exact: true }).click()
  await expect(cell(7)).toContainText(data.类别)
  await cell(8).locator('input').fill(data.等级)
  if (data.备注) await cell(9).locator('input').fill(data.备注)
}

/** 读取下载的 xlsx 指定工作表，返回每行所有单元格拼接后的文本数组 */
function sheetRowTexts(filePath, sheetName) {
  const wb = XLSX.read(readFileSync(filePath), { type: 'buffer' }) // xlsx 的 ESM 构建无 readFile
  const ws = wb.Sheets[sheetName]
  expect(ws, `工作表「${sheetName}」应存在于 ${filePath}`).toBeTruthy()
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }).map(r => r.map(c => String(c).trim()).join('|'))
}
