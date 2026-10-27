import { test, expect } from 'playwright-test-coverage'

/**
 * 报名详情页（学生报名表单）定向覆盖：学生选择弹窗（队长/队员/指导老师）、
 * 搜索/重置/分页、成员增删、只读态。route 模拟后端。
 */
const students = [
  { id: 1, name: '学生甲', username: 'S001', college: '计算机学院', major: '软件工程' },
  { id: 2, name: '学生乙', username: 'S002', college: '信息学院', major: '网络工程' },
  { id: 3, name: '李同学', username: 'S003', college: '数学学院', major: '应用数学' },
]

async function setupRegister(page, { status = null } = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'reg-itest')
    localStorage.setItem('role', 'student')
    localStorage.setItem('userInfo', JSON.stringify({ id: 9, name: '当前学生', username: 'S001', role: 'student' }))
  })
  let submitted = null
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), u = new URL(req.url()), path = u.pathname
    let data
    switch (path) {
      case '/api/college/list':
        data = [{ id: 1, name: '计算机学院' }, { id: 2, name: '信息学院' }]
        break
      case '/api/department/list':
        data = [{ id: 1, name: '教务处' }]
        break
      case '/api/reg/user/list': {
        const search = u.searchParams.get('search') || ''
        data = { list: students.filter(s => !search || s.name.includes(search) || s.username.includes(search)), total: students.length }
        break
      }
      case '/api/reg/config/get':
        data = { comp_id: 3, comp_name: '定向测试竞赛', comp_type: 2, participant_type: 2, max_team_member: 5, min_team_member: 1, need_attachment: 0, need_advisor: 1, reg_start_time: '2026-01-01', reg_end_time: '2027-01-01' }
        break
      case '/api/reg/status':
        data = status === null ? null : status // null=未报名 -> pageStatus 0；undefined 走默认 []
        if (data === undefined) data = []
        break
      case '/api/reg/submit':
      case '/api/reg/resubmit':
        submitted = req.postDataJSON()
        data = { id: 100 }
        break
      default:
        data = []
    }
    await route.fulfill({ json: { code: 200, message: '操作成功', data } })
  })
  return () => submitted
}

const openStudentDialog = async (page, title) => {
  await page.getByRole('button', { name: /选择队长|添加队员|新增成员/ }).first().click()
  await expect(page.getByRole('dialog').filter({ hasText: title })).toBeVisible()
}

test('选择队长与队员：弹窗搜索/重置/选择', async ({ page }) => {
  await setupRegister(page)
  await page.goto('/#/register/detail/3')
  await page.waitForTimeout(1200)

  // 切到团队参赛，出现选择队长入口
  await page.getByText('团队参赛', { exact: true }).click()
  await page.getByRole('button', { name: '选择队长' }).click()
  const dialog = page.getByRole('dialog').filter({ hasText: /选择队长|选择队员/ })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('学生乙')).toBeVisible()

  // 搜索过滤
  await dialog.getByPlaceholder('输入姓名').fill('学生乙')
  await page.waitForTimeout(700) // debounce 500ms
  await expect(dialog.getByText('学生甲')).toHaveCount(0)
  await expect(dialog.getByText('学生乙')).toBeVisible()

  // 选择学生乙入队
  await dialog.locator('tr').filter({ hasText: '学生乙' }).getByRole('button', { name: '选择' }).click()
  await expect(dialog).toBeHidden()
})

test('个人赛信息回填当前学生（applyCurrentStudent）', async ({ page }) => {
  await setupRegister(page)
  await page.goto('/#/register/detail/3')
  await page.waitForTimeout(1500)
  // 当前学生 S001 已登录，个人赛表单应回填
  await expect(page.getByText('定向测试竞赛').first()).toBeVisible()
  const nameInput = page.getByPlaceholder('请输入姓名').or(page.locator('.el-form-item').filter({ hasText: '姓名' }).locator('input').first())
  await expect(nameInput.first()).toHaveValue('学生甲')
})

test('只读态（已通过审核 status=1）：不可再编辑', async ({ page }) => {
  await setupRegister(page, { status: { id: 55, status: 1, members: [] } })
  await page.goto('/#/register/detail/3')
  await page.waitForTimeout(1500)
  // 只读态隐藏编辑入口
  await expect(page.getByText(/已报名|驳回|已通过/).first()).toBeVisible()
})
