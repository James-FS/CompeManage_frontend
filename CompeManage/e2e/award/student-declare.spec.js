import { test, expect } from '@playwright/test'

const students = [
  { id: 1, name: '学生甲', username: '00123', college: '学院甲' },
  { id: 2, name: '学生乙', username: '00456', college: '学院乙' },
]
async function setup(page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'student-ui-test')
    localStorage.setItem('role', 'student')
    localStorage.setItem('userInfo', JSON.stringify({ name: '学生甲', username: '00123', id: 1 }))
  })
  let submitted
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), url = new URL(req.url())
    let data = []
    if (url.pathname === '/api/reg/user/list') data = { list: url.searchParams.get('search') === '00123' ? [students[0]] : students, total: 2 }
    if (url.pathname === '/api/award/comp/list') data = { list: [{ id: 7, comp_name: '数学建模竞赛', comp_code: 'G2026007', year: 2026, comp_level: '国家级' }], total: 1 }
    if (url.pathname === '/api/upload') data = { url: '/proof.pdf' }
    if (url.pathname === '/api/award/student/supplement') { submitted = req.postDataJSON(); data = { award_id: 1 } }
    await route.fulfill({ json: { code: 200, message: 'success', data } })
  })
  await page.goto('/#/award/student/declare')
  await expect(page.locator('.info-grid input').first()).toHaveValue('学生甲')
  return () => submitted
}
async function fillAward(page) {
  await page.getByRole('button', { name: '选择赛事', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '选择赛事', exact: true })
  await expect(dialog.getByText('G2026007')).toBeVisible()
  await dialog.getByPlaceholder('输入赛事名称或编号').fill('数学建模')
  const search = page.waitForRequest(r => r.url().includes('/api/award/comp/list') && r.url().includes('keyword='))
  await dialog.getByRole('button', { name: '搜索', exact: true }).click()
  expect(new URL((await search).url()).searchParams.get('keyword')).toBe('数学建模')
  await dialog.getByRole('button', { name: '选择', exact: true }).click()
  await page.getByPlaceholder('请输入参赛项目名称，同一赛事通过项目名称区分团队').fill('智能交通项目')
  await page.locator('.info-grid').getByPlaceholder('请输入手机号').fill('13800000001')
  await page.locator('.info-grid').getByPlaceholder('请输入邮箱').fill('a@example.com')
  await page.getByPlaceholder('请输入指导老师姓名').first().fill('张老师')
  await page.getByRole('button', { name: '添加指导老师' }).click()
  await page.getByPlaceholder('请输入指导老师姓名').nth(1).fill('李老师')
  await page.locator('.el-form-item').filter({ hasText: '获奖类别' }).locator('.el-select').click()
  await page.getByRole('option', { name: '国家级', exact: true }).click()
  await page.locator('.el-form-item').filter({ hasText: '获奖等级' }).locator('.el-select').click()
  await page.getByRole('option', { name: '一等奖', exact: true }).click()
  await page.getByPlaceholder('选择获奖日期').fill('2026-10-12')
  await page.getByPlaceholder('选择获奖日期').press('Enter')
  await page.getByPlaceholder('填写需要补充说明的信息（选填）').fill('项目备注')
  await page.locator('input[type=file]').setInputFiles({ name: 'proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') })
  await expect(page.getByText('proof.pdf', { exact: true })).toBeVisible()
}

test('个人申报使用本人信息，提交类别、项目、多位指导老师和备注', async ({ page }) => {
  const submitted = await setup(page)
  const width = await page.locator('.paper-sheet').evaluate(el => el.getBoundingClientRect().width)
  expect(width).toBeGreaterThan(760)
  await expect(page.getByRole('button', { name: '添加成员', exact: true })).toBeHidden()
  await fillAward(page)
  await page.getByRole('button', { name: '确认提交' }).click()
  await expect.poll(submitted).toBeTruthy()
  expect(submitted()).toMatchObject({ comp_id: 7, participation_type: 'individual', team_name: '智能交通项目', award_category: '国家级', award_name: '一等奖', award_level: '国家级一等奖', award_date: '2026-10-12', remark: '项目备注', advisors: [{ name: '张老师', college: '' }, { name: '李老师', college: '' }] })
  expect(submitted().members).toHaveLength(1)
  expect(submitted().members[0].student_id).toBe('00123')
  await page.locator('.paper-header').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/student-declare-individual.png', fullPage: true })
})

test('团队成员不能重复，切回个人赛清除队员，团队申报携带全体信息', async ({ page }) => {
  const submitted = await setup(page)
  await fillAward(page)
  await page.getByText('团队赛', { exact: true }).click()
  await page.getByRole('button', { name: '添加成员', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '选择队员' })
  await dialog.locator('.el-table__body tr').first().getByRole('button', { name: '选择', exact: true }).click()
  await expect(page.getByText('该学生已在团队中，请勿重复选择')).toBeVisible()
  await dialog.locator('.el-table__body tr').nth(1).getByRole('button', { name: '选择', exact: true }).click()
  await page.locator('.member-card').getByPlaceholder('请输入手机号').fill('13800000002')
  await page.locator('.member-card').getByPlaceholder('请输入邮箱').fill('b@example.com')
  await page.getByRole('button', { name: '确认提交' }).click()
  await expect.poll(submitted).toBeTruthy()
  expect(submitted().participation_type).toBe('team')
  expect(submitted().members.map(m => m.student_id)).toEqual(['00123', '00456'])
  await page.locator('.paper-header').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/student-declare-team.png', fullPage: true })
  await page.getByText('个人赛', { exact: true }).click()
  await expect(page.locator('.member-card')).toHaveCount(0)
})


test('驳回后重新申报回显团队、日期、多位指导老师和备注', async ({ page }) => {
  await setup(page)
  await page.evaluate(() => sessionStorage.setItem('resubmitAward', JSON.stringify({
    comp_id: 7, team_name: '待修正项目', participation_type: 'team', award_category: '省级', award_level: '省级三等奖', award_name: '三等奖',
    award_time: '2026-10-10T00:00:00+08:00', proof_url: '/proof.pdf', remark: '回显备注',
    advisor_info: JSON.stringify([{ name: '指导老师甲', college: '学院甲' }, { name: '指导老师乙', college: '学院乙' }]),
    members: [{ name: '学生甲', stu_id: '00123', college: '学院甲', phone: '13800000001', email: 'a@example.com', is_leader: true }, { name: '学生乙', stu_id: '00456', college: '学院乙', phone: '13800000002', email: 'b@example.com', is_leader: false }],
  })))
  await page.goto('/#/award/student/declare?comp_id=7&comp_name=数学建模竞赛')
  await page.reload()
  await expect(page.getByPlaceholder('请输入参赛项目名称，同一赛事通过项目名称区分团队')).toHaveValue('待修正项目')
  await expect(page.getByPlaceholder('选择获奖日期')).toHaveValue('2026-10-10')
  await expect(page.getByPlaceholder('请输入指导老师姓名')).toHaveCount(2)
  await expect(page.getByPlaceholder('请输入指导老师姓名').nth(1)).toHaveValue('指导老师乙')
  await expect(page.getByPlaceholder('填写需要补充说明的信息（选填）')).toHaveValue('回显备注')
  await expect(page.locator('.member-card input').nth(1)).toHaveValue('00456')
  await expect(page.locator('.info-grid input').nth(3)).toHaveValue('13800000001')
})
