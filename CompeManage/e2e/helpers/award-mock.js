export async function mockAwardSession(page, role = 'school_admin') {
  await page.addInitScript(role => {
    localStorage.setItem('token', 'award-ui-test')
    localStorage.setItem('role', role)
    localStorage.setItem('userInfo', JSON.stringify({ name: '测试管理员', role }))
  }, role)
  const team = {
    id: 1, project_name: '跨院项目', award_category: '国家级', award_name: '一等奖', award_month: '2026-10', can_edit_team: true,
    members: [
      { id: 1, student_id: '00123', name: '学生甲', college: '学院甲', major: '专业甲', remark: '甲成员', submitted_college_id: 1, can_edit: true },
      { id: 2, student_id: '00456', name: '学生乙', college: '学院乙', major: '专业乙', remark: '乙成员', submitted_college_id: 2, can_edit: false },
    ],
  }
  let submitted = null
  let setting = false
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const req = route.request()
    const path = new URL(req.url()).pathname
    let data = []
    if (path === '/api/award/import/settings') {
      if (req.method() === 'PUT') setting = req.postDataJSON().require_registration
      data = { require_registration: setting }
    } else if (path === '/api/award/import') {
      submitted = req.postDataJSON()
      const rows = submitted.rows.map(row => ({ ...row, error: row.student_id ? '' : '学号不能为空', existing: false }))
      const errorCount = rows.filter(row => row.error).length
      if (errorCount) {
        await route.fulfill({
          status: 400,
          json: { code: 400, message: '数据校验未通过，未写入任何数据', data: { rows, error_count: errorCount } },
        })
        return
      }
      data = { student_count: submitted.rows.length, team_count: 1 }
    } else if (path === '/api/award/student/supplement') {
      await route.fulfill({
        status: 400,
        json: { code: 400, message: '记录已存在：该学生在本赛事已有获奖记录；如需更正，请联系管理员修改原记录' },
      })
      return
    } else if (path === '/api/award/comp-awards') data = { list: [team], student_count: 2, team_count: 1 }
    else if (path === '/api/college/list') data = [{ id: 1, name: '学院甲' }, { id: 2, name: '学院乙' }]
    else if (path === '/api/award/teams/1') Object.assign(team, req.postDataJSON())
    else if (path === '/api/award/members/1') Object.assign(team.members[0], req.postDataJSON())
    await route.fulfill({ json: { code: 200, message: '操作成功', data } })
  })
  return { getSubmitted: () => submitted }
}
