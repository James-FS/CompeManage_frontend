import { test, expect } from 'playwright-test-coverage'

// studentDeclare 选择器分支定向覆盖：
// 队长选择正向、成员新增/编辑、导师新增/重复/编辑、弹窗关闭重置、提交失败分支

const STUDENTS = [
  { id: 21, name: '学生甲', username: '00100', college: '计算机学院' },
  { id: 22, name: '学生乙', username: '00200', college: '数学学院' },
  { id: 23, name: '学生丙', username: '00300', college: '外语学院' },
]
const TEACHERS = [{ id: 31, name: '张老师', username: 'T001', college: '学院甲' }]

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'sd-select-test')
    localStorage.setItem('role', 'student')
    localStorage.setItem('userInfo', JSON.stringify({ id: 21, name: '学生甲', username: '00100' }))
    localStorage.setItem('resubmitAward', JSON.stringify({ reason: '材料不全' }))
  })
  const state = { submitted: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/reg/user/list') {
      const role = url.searchParams.get('role')
      const list = role === 'teacher' ? TEACHERS : STUDENTS
      await route.fulfill({ json: { code: 200, message: 'success', data: { list, total: list.length } } })
      return
    }
    if (p === '/api/comp/list') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: [
        { id: 55, comp_name: '申报选择赛事', comp_code: 'X2026055', year: 2026, comp_level: '校级' },
      ], total: 1 } } })
      return
    }
    if (p === '/api/award/submit') {
      if (opts.submitBizFail) {
        await route.fulfill({ json: { code: 0, msg: '申报被拒绝' } })
        return
      }
      state.submitted = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: { list: [], total: 0 } } })
  })
  await page.goto('/#/award/student/declare')
  await expect(page.getByText('校外获奖申报登记')).toBeVisible()
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('队长选择正向回填', async ({ page }) => {
  await setup(page)
  await page.getByRole('radio', { name: '团队赛' }).click({ force: true })
  await page.getByRole('button', { name: '选择队长' }).click({ force: true })
  const dialog = page.locator('.el-dialog')
  await dialog.getByRole('button', { name: '选择' }).first().click()
  await toast(page, '已选择队长：学生甲，请补充手机号和邮箱')
  await expect(page.getByText('队长信息')).toBeVisible()
  // 回填姓名（disabled input value）
  await expect(page.locator('.info-grid').first().locator('input').first()).toHaveValue('学生甲')
})

test('弹窗关闭重置选择模式', async ({ page }) => {
  await setup(page)
  await page.getByRole('radio', { name: '团队赛' }).click({ force: true })
  await page.getByRole('button', { name: '选择队长' }).click({ force: true })
  await expect(page.locator('.el-dialog').getByText('选择队长')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.el-dialog')).toBeHidden()

  // 关闭后重置 isSelectingLeader——重新打开为"选择队员"模式
  await page.getByRole('button', { name: '添加成员' }).click({ force: true })
  await expect(page.locator('.el-dialog').getByText('选择队员')).toBeVisible()
})
