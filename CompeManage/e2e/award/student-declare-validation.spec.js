import { test, expect } from 'playwright-test-coverage'

// studentDeclare 补充覆盖：提交校验阶梯（个人/团队全分支）、证书上传失败、
// 选择弹窗搜索/重置/分页（与 student-declare.spec.js 的 happy-path 互补）

const STUDENTS = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: `学生${String.fromCharCode(65 + (i % 26))}${i}`,
  username: `00${String(100 + i).slice(-3)}`,
  college: '学院甲',
}))
const TEACHERS = [{ id: 11, name: '张老师', username: 'T001', college: '学院甲' }]

async function setup(page, opts = {}) {
  await page.addInitScript((username) => {
    localStorage.setItem('token', 'student-declare-validation')
    localStorage.setItem('role', 'student')
    localStorage.setItem('userInfo', JSON.stringify({ name: '校外学生', username, id: 9 }))
  }, opts.selfInPool ? '00100' : 'S2024999')
  const state = { submitted: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    let data = []
    if (url.pathname === '/api/reg/user/list') {
      const role = url.searchParams.get('role') || 'student'
      const search = url.searchParams.get('search') || ''
      let list = role === 'teacher' ? TEACHERS : STUDENTS
      if (search) list = list.filter((u) => u.username.includes(search) || u.name.includes(search))
      const pageNo = Number(url.searchParams.get('page') || 1)
      const size = Number(url.searchParams.get('page_size') || 10)
      data = { list: list.slice((pageNo - 1) * size, pageNo * size), total: list.length }
    }
    if (url.pathname === '/api/award/comp/list') {
      data = { list: [{ id: 7, comp_name: '数学建模竞赛', comp_code: 'G2026007', year: 2026, comp_level: '国家级' }], total: 1 }
    }
    if (url.pathname === '/api/upload') {
      if (opts.uploadFail) {
        await route.fulfill({ json: { code: 500, message: '上传服务不可用' } })
        return
      }
      data = { url: '/proof.pdf' }
    }
    if (url.pathname === '/api/award/student/supplement') {
      state.submitted = req.postDataJSON()
      data = { award_id: 1 }
    }
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
  await page.goto('/#/award/student/declare?comp_id=7&comp_name=数学建模竞赛')
  await expect(page.getByRole('heading', { name: '校外获奖申报登记' })).toBeVisible()
  return state
}

async function fillRules(page) {
  await page.getByPlaceholder('请输入参赛项目名称，同一赛事通过项目名称区分团队').fill('校验阶梯项目')
  await page.locator('.el-form-item').filter({ hasText: '获奖类别' }).locator('.el-select').click()
  await page.getByRole('option', { name: '国家级' }).click()
  await page.locator('.el-form-item').filter({ hasText: '获奖等级' }).locator('.el-select').click()
  await page.getByRole('option', { name: '一等奖' }).click()
  await page.getByPlaceholder('选择获奖日期').fill('2026-10-12')
  await page.getByPlaceholder('选择获奖日期').press('Enter')
  await page.locator('input[type=file]').setInputFiles({
    name: 'proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 t'),
  })
}

async function addAdvisor(page) {
  await page.getByRole('button', { name: '添加指导老师' }).click()
  const dialog = page.getByRole('dialog', { name: '选择指导老师', exact: true })
  await dialog.locator('.el-table__body tr').first().getByRole('button', { name: '选择', exact: true }).click()
  await expect(dialog).not.toBeVisible()
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('个人赛提交校验阶梯：导师→手机号→邮箱逐级拦截', async ({ page }) => {
  const state = await setup(page, { selfInPool: true }) // 本人信息自动回填
  await fillRules(page)

  // ① 无指导老师
  await page.getByRole('button', { name: '确认提交' }).click()
  await toast(page, '请选择指导老师')

  // ② 手机号
  await addAdvisor(page)
  await page.getByRole('button', { name: '确认提交' }).click()
  await toast(page, '请填写本人手机号')

  // ③ 邮箱
  await page.locator('.info-grid').getByPlaceholder('请输入手机号').fill('13800000001')
  await page.getByRole('button', { name: '确认提交' }).click()
  await toast(page, '请填写本人邮箱')

  // ④ 全部补齐 → 提交成功（阶梯走完）
  await page.locator('.info-grid').getByPlaceholder('请输入邮箱').fill('a@example.com')
  await page.getByRole('button', { name: '确认提交' }).click()
  await expect.poll(() => state.submitted, { timeout: 10000 }).toBeTruthy()
  expect(state.submitted.participation_type).toBe('individual')
})

test('本人信息加载不到时提交拦截（个人赛无手动填写入口）', async ({ page }) => {
  const state = await setup(page) // 登录用户不在学生池
  await fillRules(page)
  await addAdvisor(page)
  await page.getByRole('button', { name: '确认提交' }).click()
  await toast(page, '请先填写本人信息')
  expect(state.submitted).toBeUndefined()
})

test('团队赛校验阶梯：无成员→队长信息→队长手机/邮箱→成员手机/邮箱', async ({ page }) => {
  const state = await setup(page)
  await fillRules(page)
  await addAdvisor(page)
  await page.getByText('团队赛', { exact: true }).click()

  // ① 无成员
  await page.getByRole('button', { name: '确认提交' }).click()
  await toast(page, '团队赛请至少添加一名团队成员')

  // 选队长 + 添加成员
  await page.getByRole('button', { name: '选择队长', exact: true }).click()
  await page.getByRole('dialog', { name: '选择队长', exact: true })
    .locator('.el-table__body tr').first().getByRole('button', { name: '选择', exact: true }).click()
  await page.getByRole('button', { name: '添加成员', exact: true }).click()
  await page.getByRole('dialog', { name: '选择队员' })
    .locator('.el-table__body tr').nth(1).getByRole('button', { name: '选择', exact: true }).click()

  // ② 队长信息（队长姓名由弹窗选择，先清空手机号路径）
  await page.locator('.info-grid').first().getByPlaceholder('请输入手机号').fill('')
  await page.getByRole('button', { name: '确认提交' }).click()
  await toast(page, '请填写队长手机号')

  await page.locator('.info-grid').first().getByPlaceholder('请输入手机号').fill('13800000002')
  await page.getByRole('button', { name: '确认提交' }).click()
  await toast(page, '请填写队长邮箱')

  // ③ 成员手机号/邮箱
  await page.locator('.info-grid').first().getByPlaceholder('请输入邮箱').fill('b@example.com')
  await page.getByRole('button', { name: '确认提交' }).click()
  await toast(page, '成员1的手机号不能为空')
  await page.locator('.member-card').getByPlaceholder('请输入手机号').fill('13800000003')
  await page.getByRole('button', { name: '确认提交' }).click()
  await toast(page, '成员1的邮箱不能为空')

  // ④ 全部补齐 → 成功
  await page.locator('.member-card').getByPlaceholder('请输入邮箱').fill('c@example.com')
  await page.getByRole('button', { name: '确认提交' }).click()
  await expect.poll(() => state.submitted, { timeout: 10000 }).toBeTruthy()
  expect(state.submitted.members).toHaveLength(2)
})

test('证书上传失败提示；学生弹窗搜索/重置/分页', async ({ page }) => {
  await setup(page, { uploadFail: true })
  await page.locator('input[type=file]').setInputFiles({
    name: 'proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 t'),
  })
  await toast(page, '上传失败，请重试')

  // 弹窗搜索/重置/分页（走成员选择入口）
  await page.getByText('团队赛', { exact: true }).click()
  await page.getByRole('button', { name: '添加成员', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '选择队员' })
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(10)

  await dialog.getByPlaceholder('输入姓名').fill('A0')
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(1)
  await dialog.getByRole('button', { name: '重置', exact: true }).click()
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(10)

  await dialog.locator('.el-pagination .btn-next').click()
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(5)
})
