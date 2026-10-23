import { test, expect } from 'playwright-test-coverage'
const students = [{ id: 1, name: '学生甲', username: '00123', college: '学院甲' }, { id: 2, name: '学生乙', username: '00456', college: '学院乙' }]
async function setup(page, config = {}, status = null) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'registration-ui-test'); localStorage.setItem('role', 'student')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '学生甲', username: '00123' }))
  })
  let submitted, method
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), url = new URL(req.url())
    let data = []
    if (url.pathname === '/api/reg/config/get') data = { comp_name: '报名赛制测试', participant_type: 2, min_team_member: 1, max_team_member: 5, need_advisor: 0, need_attachment: 0, track: [], ...config }
    if (url.pathname === '/api/reg/status') data = status
    if (url.pathname === '/api/reg/user/list') data = { list: url.searchParams.get('search') === '00123' ? [students[0]] : students, total: 2 }
    if (['/api/reg/submit', '/api/reg/resubmit'].includes(url.pathname)) { submitted = req.postDataJSON(); method = req.method() }
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
  await page.goto('/#/register/detail/7')
  await expect(page.getByRole('heading', { name: '报名赛制测试' })).toBeVisible()
  await expect(page.getByPlaceholder('请输入参赛项目名称')).toBeVisible()
  return () => ({ submitted, method })
}
async function fillContact(page) {
  await page.locator('.info-grid').getByPlaceholder('请输入手机号').fill('13800000001')
  await page.locator('.info-grid').getByPlaceholder('请输入邮箱').fill('a@example.com')
}
async function chooseLeader(page) {
  await page.getByRole('button', { name: '选择队长', exact: true }).click()
  await page.getByRole('dialog', { name: '选择队长', exact: true }).locator('.el-table__body tr').nth(1).getByRole('button', { name: '选择', exact: true }).click()
}
async function addApplicant(page) {
  await page.getByRole('button', { name: '添加成员', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '选择队员', exact: true })
  await dialog.locator('.el-table__body tr').nth(1).getByRole('button', { name: '选择', exact: true }).click()
  await expect(page.getByText('该学生已在团队中，请勿重复选择').last()).toBeVisible()
  await dialog.locator('.el-table__body tr').first().getByRole('button', { name: '选择', exact: true }).click()
  await page.locator('.member-card').getByPlaceholder('请输入手机号').fill('13800000002')
  await page.locator('.member-card').getByPlaceholder('请输入邮箱').fill('b@example.com')
}
test('个人赛自动带入本人、要求项目名称并加宽页面', async ({ page }) => {
  const state = await setup(page, { participant_type: 1, min_team_member: 1, max_team_member: 1 })
  await expect(page.locator('.info-grid input').first()).toHaveValue('学生甲')
  await expect(page.getByRole('button', { name: '选择队长', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '添加成员', exact: true })).toHaveCount(0)
  await expect(page.locator('.el-radio-group')).toHaveCount(0)
  expect(await page.locator('.content-area').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(1000)
  await fillContact(page)
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect(page.getByText('请输入参赛项目名称', { exact: true })).toBeVisible()
  expect(state().submitted).toBeUndefined()
  await page.getByPlaceholder('请输入参赛项目名称').fill('个人项目')
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect.poll(() => state().submitted).toBeTruthy()
  expect(state().submitted).toMatchObject({ participation_type: 'individual', team_name: '个人项目', leader: { stuID: '00123' }, members: [] })
})
test('1-5人可切换，团队队长不默认本人，申报人作为成员提交', async ({ page }) => {
  const state = await setup(page)
  await expect(page.locator('.info-grid input').first()).toHaveValue('学生甲')
  await page.getByText('团队参赛', { exact: true }).click()
  await expect(page.getByText('请先选择队长', { exact: true })).toBeVisible()
  await chooseLeader(page); await fillContact(page); await addApplicant(page)
  await page.getByText('个人参赛', { exact: true }).click()
  await expect(page.locator('.info-grid input').first()).toHaveValue('学生甲')
  await expect(page.locator('.member-card')).toHaveCount(0)
  await page.getByText('团队参赛', { exact: true }).click()
  await expect(page.getByText('请先选择队长', { exact: true })).toBeVisible()
  await chooseLeader(page); await fillContact(page); await addApplicant(page)
  await page.getByPlaceholder('请输入参赛项目名称').fill('团队项目')
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect.poll(() => state().submitted).toBeTruthy()
  expect(state().submitted).toMatchObject({ participation_type: 'team', leader: { stuID: '00456' }, members: [{ stuID: '00123' }] })
})
test('最少2人固定团队参赛且不足人数阻止提交', async ({ page }) => {
  const state = await setup(page, { min_team_member: 2 })
  await expect(page.locator('.el-radio-group')).toHaveCount(0)
  await expect(page.getByText('请先选择队长', { exact: true })).toBeVisible()
  await chooseLeader(page); await fillContact(page)
  await page.getByPlaceholder('请输入参赛项目名称').fill('多人项目')
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect(page.getByText('团队参赛人数须为2-5人（含队长）')).toBeVisible()
  expect(state().submitted).toBeUndefined()
  await addApplicant(page)
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect.poll(() => state().submitted).toBeTruthy()
})
test('普通成员重新提交驳回报名，队长与成员正确回显', async ({ page }) => {
  const state = await setup(page, {}, { id: 77, status: 2, team_name: '原项目', members: [{ name: '学生乙', username: '00456', college: '学院乙', phone: '13800000001', email: 'a@example.com', is_leader: true }, { name: '学生甲', username: '00123', college: '学院甲', phone: '13800000002', email: 'b@example.com', is_leader: false }] })
  await expect(page.locator('.info-grid input').first()).toHaveValue('学生乙')
  await expect(page.locator('.member-card input').first()).toHaveValue('学生甲')
  await page.getByPlaceholder('请输入参赛项目名称').fill('修改后的项目')
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect.poll(() => state().submitted).toBeTruthy()
  expect(state().method).toBe('PUT')
  expect(state().submitted).toMatchObject({ reg_id: 77, participation_type: 'team', team_name: '修改后的项目', leader: { stuID: '00456' } })
})

test('无需指导老师时隐藏填写区，重新报名不提交历史指导老师', async ({ page }) => {
  const state = await setup(page, { participant_type: 1, need_advisor: '0' }, {
    id: 77, status: 2, team_name: '原项目',
    advisor_info: { id: 9, name: '历史教师', username: 'T001', college: '学院甲' },
    members: [{ ...students[0], phone: '13800000001', email: 'a@example.com', is_leader: true }],
  })
  await expect(page.getByText('指导老师信息', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '选择指导老师', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect.poll(() => state().submitted).toBeTruthy()
  expect(state().submitted.advisor_info).toBeNull()
})

test('允许填写指导老师时显示选择区，可不选直接报名', async ({ page }) => {
  const state = await setup(page, { participant_type: 1, need_advisor: '1' })
  await expect(page.getByRole('button', { name: '选择指导老师', exact: true })).toBeVisible()
  await fillContact(page)
  await page.getByPlaceholder('请输入参赛项目名称').fill('可选指导老师项目')
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect.poll(() => state().submitted).toBeTruthy()
  expect(state().submitted.advisor_info).toBeNull()
})

test('指导老师必填时，未选择会阻止报名', async ({ page }) => {
  const state = await setup(page, { participant_type: 1, need_advisor: '2' })
  await expect(page.getByRole('button', { name: '选择指导老师', exact: true })).toBeVisible()
  await fillContact(page)
  await page.getByPlaceholder('请输入参赛项目名称').fill('必填指导老师项目')
  await page.getByRole('button', { name: '确认报名', exact: true }).click()
  await expect(page.getByText('该赛事要求必须选择指导老师', { exact: true })).toBeVisible()
  expect(state().submitted).toBeUndefined()
})
