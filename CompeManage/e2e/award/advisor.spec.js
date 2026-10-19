import { test, expect } from '@playwright/test'

async function setup(page, role = 'teacher', status = 'rejected') {
  await page.addInitScript(role => {
    localStorage.setItem('token', 'advisor-test')
    localStorage.setItem('role', role)
    localStorage.setItem('userInfo', JSON.stringify({ id: 11, name: '张老师', username: 'T001', role }))
  }, role)
  const award = { id: 7, project_name: '智能校园创新项目', competition: { comp_name: '大学生创新竞赛' }, award_category: '省级', award_name: '一等奖', award_level: '省级一等奖', award_time: '2026-10-12T00:00:00+08:00', update_time: '2026-10-14T09:00:00+08:00', proof_url: '/api/file/download/award_proof/proof.pdf', status, source: 'supplement', reject_reason: status === 'rejected' ? '请核对获奖等级' : '', advisors: [{ username: 'T001', name: '张老师' }], award_members: [{ name: '学生甲', student_number: '00123', college: '计算机学院', is_leader: true }], remark: '学生自主申报' }
  let submitted
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    let data = []
    if (path === '/api/award/advisor/list') data = { list: [{ ...award, comp_name: award.competition.comp_name, can_edit: award.status !== 'approved' }], total: 1 }
    if (path === '/api/award/advisor/7') {
      if (req.method() === 'PUT') { submitted = req.postDataJSON(); Object.assign(award, submitted, { status: 'draft' }) }
      else data = { award, can_edit: award.status !== 'approved', changes: [] }
    }
    await route.fulfill({ json: { code: 200, message: '操作成功', data } })
  })
  return () => submitted
}

test('teacher can correct rejected project and resubmit without changing members', async ({ page }) => {
  const submitted = await setup(page)
  await page.goto('/#/award/advisor')
  await expect(page.getByRole('menuitem', { name: '我的指导获奖' })).toBeVisible()
  await page.getByRole('button', { name: '查看 / 修改' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('学生甲')).toBeVisible()
  await expect(dialog.getByText('退回原因：请核对获奖等级')).toBeVisible()
  await dialog.locator('.el-form-item').filter({ hasText: '项目名称' }).getByRole('textbox').fill('修正后的创新项目')
  await dialog.getByRole('button', { name: '保存并送审' }).click()
  await expect(page.getByText('修改成功，等待管理员审核')).toBeVisible()
  expect(submitted().project_name).toBe('修正后的创新项目')
  expect(submitted().update_time).toBe('2026-10-14T09:00:00+08:00')
  expect(submitted().members).toBeUndefined()
  await expect(page.getByRole('cell', { name: '待审核', exact: true })).toBeVisible()
})

test('competition manager can view approved guided award as read only', async ({ page }) => {
  await setup(page, 'competition_manager', 'approved')
  await page.goto('/#/award/advisor')
  await page.getByRole('button', { name: '查看详情' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: '保存并送审' })).toHaveCount(0)
  await expect(dialog.locator('.el-form-item').filter({ hasText: '项目名称' }).getByRole('textbox')).toBeDisabled()
  await expect(dialog.getByRole('button', { name: '下载当前获奖证明' })).toBeVisible()
})

test('advisor page preview', async ({ page }) => {
  await setup(page)
  await page.goto('/#/award/advisor')
  await expect(page.getByText('智能校园创新项目')).toBeVisible()
  await page.screenshot({ path: 'test-results/advisor-preview.png', fullPage: true })
})

test('upload keeps the project dialog open until completion', async ({ page }) => {
  await setup(page)
  let releaseUpload
  const gate = new Promise(resolve => { releaseUpload = resolve })
  await page.route('**/api/upload', async route => {
    expect(route.request().postData()).toContain('award_cert')
    await gate
    await route.fulfill({ json: { code: 200, data: { url: '/api/file/download/award_cert/01234567890123456789012345678901_proof.pdf' } } })
  })
  await page.goto('/#/award/advisor')
  await page.getByRole('button', { name: '查看 / 修改' }).click()
  const dialog = page.getByRole('dialog')
  try {
    await dialog.locator('input[type=file]').setInputFiles({ name: 'proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('proof') })
    await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeDisabled()
    await expect(dialog.locator('.el-dialog__headerbtn')).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
  } finally { releaseUpload() }
  await expect(dialog.getByRole('button', { name: '关闭', exact: true })).toBeEnabled()
})
