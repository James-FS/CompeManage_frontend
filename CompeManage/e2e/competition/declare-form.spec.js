import { test, expect } from 'playwright-test-coverage'

// competition/declare.vue 申报表单定向覆盖：
// 新建保存（含附件上传/负责人弹窗）、编辑回显与更新、状态只读、取消确认、校验与上传失败

const MANAGER = { id: 65089, name: '何老师', work_id: 'T2023012', college: '计算机学院' }

const DETAIL_DRAFT = {
  comp_name: '历史申报赛事', comp_level: '省级', comp_type: '学科竞赛',
  organizer: '主办方A', undertaker: '承办方B', college_id: 4,
  manager_id: 65089, manager: { realname: '何老师' }, year: 2025,
  desc: '历史简介', attachment_path: 'http://mock/a_计划书.pdf,http://mock/b_名单.xlsx',
  declare_status: 0,
}

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'declare-form-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const state = { created: undefined, updated: undefined, uploads: 0 }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    let data = []
    if (p === '/api/college/list') data = [{ id: 4, name: '计算机学院' }, { id: 9, name: '数学学院' }]
    if (p === '/api/department/list') data = []
    if (p === '/api/comp/manager/list') data = { list: [MANAGER], total: 1 }
    if (p.startsWith('/api/declare/') && req.method() === 'GET') {
      data = { ...DETAIL_DRAFT, ...(opts.detail || {}) }
    }
    if (p === '/api/declare' && req.method() === 'POST') {
      state.created = req.postDataJSON()
    }
    if (p.startsWith('/api/declare/') && req.method() === 'PUT') {
      state.updated = req.postDataJSON()
    }
    if (p === '/api/upload') {
      state.uploads += 1
      if (opts.uploadFail) {
        await route.fulfill({ status: 500, json: { code: 500, message: '上传失败' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { url: 'http://mock/new_计划书.pdf', name: '计划书.pdf' } } })
      return
    }
    if (opts.saveFail && (p === '/api/declare' || p.startsWith('/api/declare/'))) {
      await route.fulfill({ json: { code: 500, message: '保存失败' } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
  await page.goto(opts.id ? `/#/competition/declare?id=${opts.id}` : '/#/competition/declare')
  await expect(page.getByPlaceholder('请输入赛事名称')).toBeVisible()
  return state
}

async function chooseOption(page, formItemLabel, optionName) {
  await page.locator('.el-form-item').filter({ hasText: formItemLabel }).locator('.el-select').click()
  await page.getByRole('option', { name: optionName }).click()
}

async function pickManager(page) {
  await page.locator('.manager-input input').click()
  const dialog = page.getByRole('dialog', { name: '选择负责人（教职工）' })
  await expect(dialog).toBeVisible()
  await dialog.getByPlaceholder('输入姓名').fill('何')
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(1)
  await dialog.locator('.el-table__body tr').first().getByRole('button', { name: '选择', exact: true }).click()
  await expect(dialog).not.toBeVisible()
}

async function fillRequiredForm(page) {
  await page.getByPlaceholder('请输入赛事名称').fill('申报测试赛事')
  await chooseOption(page, '赛事等级', '校级')
  await chooseOption(page, '赛事类型', '学科竞赛')
  await chooseOption(page, '所属学院', '计算机学院')
  await page.getByPlaceholder('请填写主办单位').fill('测试主办方')
  await page.getByPlaceholder('请填写承办单位').fill('测试承办方')
  await pickManager(page)
}

// ==================== 新建申报 ====================

test('新建申报：全字段 + 负责人弹窗 + 附件上传 → 创建成功并跳转审核页', async ({ page }) => {
  const state = await setup(page)
  await fillRequiredForm(page)

  // 选择附件（auto-upload=false，保存时统一上传）
  await page.locator('input[type=file]').setInputFiles({
    name: '计划书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf'),
  })
  await expect(page.getByText('附件已选择：计划书.pdf')).toBeVisible()

  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(() => state.created).toBeTruthy()
  expect(state.created).toMatchObject({
    comp_name: '申报测试赛事', comp_level: '校级', comp_type: '学科竞赛',
    organizer: '测试主办方', undertaker: '测试承办方', college_id: 4, manager_id: 65089,
  })
  expect(state.uploads).toBe(1)
  expect(state.created.attachment_path).toContain('http://mock/new_计划书.pdf')
  await expect(page.getByText('保存成功')).toBeVisible()
  await page.waitForURL(/\/competition\/audit/)
})

// ==================== 编辑模式 ====================

test('编辑模式回显详情（附件名解析）并更新申报', async ({ page }) => {
  const state = await setup(page, { id: 5 })
  // 回显断言
  await expect(page.getByPlaceholder('请输入赛事名称')).toHaveValue('历史申报赛事')
  await expect(page.locator('.manager-input input')).toHaveValue('何老师')
  await expect(page.getByText('计划书.pdf')).toBeVisible()
  await expect(page.getByText('名单.xlsx')).toBeVisible()

  await page.getByPlaceholder('请输入赛事名称').fill('修改后的申报')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(() => state.updated).toBeTruthy()
  expect(state.updated.comp_name).toBe('修改后的申报')
  // 已有附件 URL 直接沿用，不触发上传
  expect(state.updated.attachment_path).toBe('http://mock/a_计划书.pdf,http://mock/b_名单.xlsx')
  expect(state.uploads).toBe(0)
})

test('已提交状态为只读，无法保存修改', async ({ page }) => {
  await setup(page, { id: 5, detail: { declare_status: 1 } })
  await expect(page.getByPlaceholder('请输入赛事名称')).toBeDisabled()
  // 只读模式下按钮区整体不渲染
  await expect(page.getByRole('button', { name: '保存', exact: true })).toHaveCount(0)
})

test('驳回状态允许编辑并可重新保存', async ({ page }) => {
  const state = await setup(page, { id: 5, detail: { declare_status: 3 } })
  await expect(page.getByPlaceholder('请输入赛事名称')).toBeEnabled()
  await page.getByPlaceholder('请输入赛事名称').fill('驳回后修改')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(() => state.updated).toBeTruthy()
  expect(state.updated.comp_name).toBe('驳回后修改')
})

// ==================== 取消确认框 ====================

test('取消操作带确认框：确认取消返回，继续编辑留在页面', async ({ page }) => {
  await setup(page)
  await page.getByPlaceholder('请输入赛事名称').fill('待取消的申报')

  // 继续编辑 → 留在页面
  await page.getByRole('button', { name: '取消', exact: true }).click()
  const msgbox = page.locator('.el-message-box')
  await expect(msgbox).toBeVisible()
  await msgbox.getByRole('button', { name: '继续编辑' }).click()
  await expect(msgbox).not.toBeVisible()
  await expect(page.getByPlaceholder('请输入赛事名称')).toHaveValue('待取消的申报')

  // 确认取消 → 返回上一页（无历史 → about:blank）
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await msgbox.getByRole('button', { name: '确认取消' }).click()
  await page.waitForURL((u) => u.href === 'about:blank', { timeout: 5000 })
})

// ==================== 校验与失败分支 ====================

test('必填校验拦截空表单，附件上传失败中断保存', async ({ page }) => {
  const state = await setup(page, { uploadFail: true })

  // 空表单 → 校验提示
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('.el-message').filter({ hasText: '请填写完整的必填项' })).toBeVisible()
  expect(state.created).toBeUndefined()

  // 填好表单但附件上传失败 → 中断保存（不发起创建）
  await fillRequiredForm(page)
  await page.locator('input[type=file]').setInputFiles({
    name: '计划书.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf'),
  })
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.locator('.el-message').filter({ hasText: /附件上传失败/ })).toBeVisible()
  expect(state.created).toBeUndefined()
})
