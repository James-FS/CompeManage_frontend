import { test, expect } from 'playwright-test-coverage'

/**
 * 获奖详情页交互定向覆盖（route 模拟后端，覆盖前端交互代码）：
 * 团队编辑弹窗 + 指导教师选择弹窗（搜索/添加/移除/保存）+ 成员编辑 + 筛选。
 */
async function setupDetail(page) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'detail-itest')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: '900001', role: 'school_admin' }))
  })
  const team = {
    id: 11, project_name: '智能校园项目', team_name: '智能校园项目', award_category: '国家级',
    award_name: '一等奖', award_month: '2026-10-12T00:00:00+08:00', status: 'approved',
    can_edit_team: true,
    members: [
      { id: 21, name: '学生甲', student_id: '00123', college: '计算机学院', major: '软件工程', remark: '', can_edit: true },
      { id: 22, name: '学生乙', student_id: '00456', college: '信息学院', major: '网络工程', remark: '', can_edit: false },
    ],
    advisors: [{ username: 'T2010', name: '刘老师', college: '计算机学院', sort: 0 }],
  }
  const teachers = [
    { id: 31, name: '何老师', username: 'T2012', college: '数学学院' },
    { id: 32, name: '张伟', username: 'T2023003', college: '计算机学院' },
  ]
  const calls = { team: null, member: null }
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    let data
    if (path === '/api/award/comp-awards') {
      data = { list: [team], student_count: 2, team_count: 1 }
    } else if (path === '/api/reg/user/list') {
      const search = new URL(req.url()).searchParams.get('search') || ''
      data = { list: teachers.filter(t => !search || t.name.includes(search) || t.username.includes(search)), total: teachers.length }
    } else if (path === '/api/award/teams/11' && req.method() === 'PUT') {
      calls.team = req.postDataJSON()
      Object.assign(team, calls.team)
      data = null
    } else if (path === '/api/award/members/21' && req.method() === 'PUT') {
      calls.member = req.postDataJSON()
      Object.assign(team.members[0], calls.member)
      data = null
    } else {
      data = []
    }
    await route.fulfill({ json: { code: 200, message: '操作成功', data } })
  })
  return calls
}

test('团队编辑：指导教师弹窗选择/移除并保存', async ({ page }) => {
  const calls = await setupDetail(page)
  await page.goto('/#/award/detail/3')
  await page.getByRole('button', { name: /修改获奖信息/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('刘老师（T2010）')).toBeVisible()

  // 打开教师选择弹窗（append-to-body，两个 dialog 共存）
  await dialog.getByRole('button', { name: '+ 选择教师' }).click()
  const picker = page.getByRole('dialog').filter({ hasText: '选择指导教师' })
  await expect(picker.getByText('何老师（T2012）')).toBeVisible()

  // 搜索过滤
  await picker.getByPlaceholder('搜索教师姓名或工号').fill('张伟')
  await expect(picker.getByText('何老师（T2012）')).toHaveCount(0)
  await expect(picker.getByText('张伟（T2023003）')).toBeVisible()

  // 添加 + 重复添加拦截
  await picker.getByRole('button', { name: '添加' }).first().click()
  await expect(page.getByText('该教师已在列表中')).toHaveCount(0) // 新增成功无提示
  await picker.getByRole('button', { name: '添加' }).first().click()
  await expect(page.getByText('该教师已在列表中')).toBeVisible()

  // 关闭选择弹窗后移除原教师，保存团队
  await picker.getByRole('dialog').count() // noop
  await page.keyboard.press('Escape')
  await dialog.locator('.el-tag').filter({ hasText: '刘老师' }).locator('.el-tag__close').click()
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('获奖信息已更新')).toBeVisible()
  expect(calls.team.advisors.map(a => a.username)).toEqual(['T2023003'])
})

test('成员编辑：修正学号与备注保存', async ({ page }) => {
  const calls = await setupDetail(page)
  await page.goto('/#/award/detail/3')
  // 展开成员表并点击可编辑成员（can_edit: true 的学生甲行内 编辑 按钮）
  await page.getByRole('button', { name: /学生甲、学生乙（2人）/ }).click()
  const editBtns = page.getByRole('button', { name: '编辑', exact: true })
  await editBtns.first().click()
  const dialog = page.getByRole('dialog').filter({ hasText: '修正学号时' })
  await dialog.getByPlaceholder('请输入学号').or(dialog.locator('input').first()).fill('00123')
  await dialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('成员信息已更新')).toBeVisible()
  expect(calls.member).toBeTruthy()
})

test('列表筛选：关键词/类别联动', async ({ page }) => {
  await setupDetail(page)
  await page.goto('/#/award/detail/3')
  await expect(page.getByText('智能校园项目')).toBeVisible()
  await page.getByPlaceholder('搜索项目、姓名、学号、学院或指导老师').fill('不存在的东西')
  await expect(page.getByRole('button', { name: /修改获奖信息/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /学生甲、学生乙（2人）/ })).toHaveCount(0)
  await page.getByPlaceholder('搜索项目、姓名、学号、学院或指导老师').fill('学生甲')
  await expect(page.getByText('智能校园项目')).toBeVisible()
})
