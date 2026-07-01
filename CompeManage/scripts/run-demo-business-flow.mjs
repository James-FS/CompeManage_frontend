import fs from 'node:fs/promises'
import path from 'node:path'

const BASE_URL = process.env.DEMO_BASE_URL || 'http://1.117.230.218'
const OUTPUT_PATH = path.resolve(process.cwd(), '..', 'docs', 'demo-operation-log.md')

const adminAccount = { username: 'T2023001', password: '123', role: '校级管理员' }
const studentAccount = { username: 'S2024001', password: '123', role: '学生' }

const now = new Date()
const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
const demoName = `README演示赛-${stamp}`

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

async function request(method, url, { token, body, query } = {}) {
  const target = new URL(url, BASE_URL)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        target.searchParams.set(key, String(value))
      }
    }
  }

  const res = await fetch(target, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }

  if (!res.ok || (json.code !== undefined && json.code !== 200)) {
    const message = json.message || json.msg || text || res.statusText
    throw new Error(`${method} ${target.pathname} failed: ${message}`)
  }

  return json
}

async function login(account) {
  const res = await request('POST', '/api/login', {
    body: {
      username: account.username,
      password: account.password,
    },
  })
  return {
    token: res.data.token,
    userInfo: res.data.userInfo,
  }
}

function step(steps, title, detail) {
  steps.push({
    index: steps.length + 1,
    title,
    detail,
    time: new Date().toISOString(),
  })
  console.log(`${steps.length}. ${title}`)
}

async function main() {
  const steps = []

  const admin = await login(adminAccount)
  step(steps, '校级管理员登录', `${adminAccount.username} 登录成功，角色为 ${admin.userInfo.role}`)

  const managers = await request('GET', '/api/comp/manager/list', {
    token: admin.token,
    query: { page: 1, page_size: 10 },
  })
  const manager = managers.data.list.find((item) => item.work_id === 'T2023003') || managers.data.list[0]
  if (!manager) {
    throw new Error('未找到赛事负责人账号')
  }
  step(steps, '查询赛事负责人', `选择 ${manager.name}（${manager.work_id}）作为赛事负责人`)

  const created = await request('POST', '/api/comp/create', {
    token: admin.token,
    body: {
      comp_name: demoName,
      comp_level: '校级',
      comp_type: '创新创业类',
      organizer: 'README 演示办公室',
      undertaker: '计算机科学与网络工程学院',
      manager_id: manager.id,
      college: '计算机科学与网络工程学院',
      desc: '用于 README 操作流程截图的演示赛事，数据为公开演示数据。',
      year: String(now.getFullYear()),
    },
  })
  const compID = created.data.id
  step(steps, '创建赛事目录', `创建赛事「${demoName}」，赛事 ID=${compID}`)

  await request('POST', '/api/reg/config', {
    token: admin.token,
    body: {
      comp_id: compID,
      participant_type: 2,
      min_team_member: 1,
      max_team_member: 3,
      reg_start_time: daysFromNow(-1),
      reg_end_time: daysFromNow(14),
      submit_start_time: daysFromNow(-1),
      submit_end_time: daysFromNow(21),
      grade_requirement: [2024],
      award_hierarchy: ['一等奖', '二等奖', '三等奖'],
      need_advisor: 1,
      need_attachment: 1,
      need_reg_audit: 1,
      track: [
        {
          trackName: '软件创新',
          subTrack: [{ title: 'Web 应用' }],
        },
      ],
      need_review: 0,
      expert_ids: [],
      force_close_review: true,
    },
  })
  step(steps, '配置报名规则', '设置团队赛、报名时间、作品提交时间、奖项层级和赛道')

  const student = await login(studentAccount)
  step(steps, '学生登录', `${studentAccount.username} 登录成功，准备提交报名`)

  await request('POST', '/api/reg/submit', {
    token: student.token,
    body: {
      comp_id: compID,
      team_name: `演示团队-${stamp}`,
      leader: {
        name: '林晓明',
        stuID: 'S2024001',
        phone: '13800000001',
        email: 'demo-student@example.com',
        college: '计算机科学与网络工程学院',
      },
      members: [],
      advisor_info: {
        id: 0,
        username: 'T2023010',
        name: '陈老师',
        phone: '13800000010',
        email: 'demo-teacher@example.com',
        college: '计算机科学与网络工程学院',
      },
      attachment_url: '/demo/readme-registration-material.pdf',
      track: '软件创新 / Web 应用',
    },
  })
  step(steps, '学生提交报名', '学生提交团队名称、负责人、指导老师、报名附件和赛道')

  const regList = await request('GET', '/api/reg/list', {
    token: admin.token,
    query: { page: 1, size: 10, comp_name: demoName },
  })
  const registration = regList.data.list.find((item) => item.comp_name === demoName || item.competition?.comp_name === demoName) || regList.data.list[0]
  if (!registration) {
    throw new Error('未找到刚提交的报名记录')
  }
  const regID = registration.id
  step(steps, '管理员查看报名审核列表', `找到报名记录 ID=${regID}`)

  await request('PUT', '/api/reg/audit', {
    token: admin.token,
    body: {
      id: regID,
      status: 1,
      reason: '',
    },
  })
  step(steps, '管理员通过报名审核', `报名记录 ID=${regID} 审核通过`)

  await request('PUT', '/api/reg/work-submit', {
    token: student.token,
    body: {
      reg_id: regID,
      work_attachment_url: '/demo/readme-work-package.zip',
    },
  })
  step(steps, '学生提交作品', '学生上传作品材料链接，进入作品审核列表')

  await request('POST', '/api/award/student/supplement', {
    token: student.token,
    body: {
      comp_id: compID,
      team_name: `演示团队-${stamp}`,
      members: [
        {
          name: '林晓明',
          student_id: 'S2024001',
          phone: '13800000001',
          email: 'demo-student@example.com',
          college: '计算机科学与网络工程学院',
          is_leader: true,
          year: '2024级',
        },
      ],
      award_level: '校级一等奖',
      award_name: '一等奖',
      award_date: new Date().toISOString().slice(0, 10),
      proof_url: '/demo/readme-award-proof.pdf',
    },
  })
  step(steps, '学生补录获奖', '学生提交获奖等级、获奖日期和证明材料')

  const awardList = await request('GET', '/api/award/audit/list', {
    token: admin.token,
    query: { page: 1, page_size: 10, comp_name: demoName, source: 'supplement' },
  })
  const award = awardList.data.list.find((item) => item.comp_name === demoName) || awardList.data.list[0]
  if (!award) {
    throw new Error('未找到获奖补录审核记录')
  }
  step(steps, '管理员查看获奖审核列表', `找到获奖审核记录 ID=${award.id}`)

  await request('PUT', `/api/award/audit/${award.id}/pass`, {
    token: admin.token,
  })
  step(steps, '管理员通过获奖审核', `获奖审核记录 ID=${award.id} 通过`)

  await request('POST', '/api/reg/config', {
    token: admin.token,
    body: {
      comp_id: compID,
      participant_type: 2,
      min_team_member: 1,
      max_team_member: 3,
      reg_start_time: daysFromNow(-30),
      reg_end_time: daysFromNow(-20),
      submit_start_time: daysFromNow(-19),
      submit_end_time: daysFromNow(-18),
      grade_requirement: [2024],
      award_hierarchy: ['一等奖', '二等奖', '三等奖'],
      need_advisor: 1,
      need_attachment: 1,
      need_reg_audit: 1,
      track: [
        {
          trackName: '软件创新',
          subTrack: [{ title: 'Web 应用' }],
        },
      ],
      need_review: 0,
      expert_ids: [],
      force_close_review: true,
    },
  })
  step(steps, '结束赛事用于总结演示', '将演示赛事时间调整为已结束状态，便于提交赛事总结')

  await request('POST', `/api/summary/${compID}`, {
    token: admin.token,
    body: {
      summary_content: 'README 演示赛事总结：完成报名、审核、作品提交、获奖补录和结果确认流程。',
      expenses: [
        { usage: '宣传物料', amount: 300, remark: '海报与通知材料' },
        { usage: '评审组织', amount: 500, remark: '演示数据' },
      ],
      attachments: [{ name: 'README演示总结.pdf', url: '/demo/readme-summary.pdf' }],
      status: 0,
    },
  })
  step(steps, '填写赛事总结', '管理员保存赛事总结草稿、经费明细和附件信息')

  const lines = [
    '# 线上演示操作记录',
    '',
    `演示站点：${BASE_URL}`,
    '',
    `演示赛事：${demoName}`,
    '',
    `赛事 ID：${compID}`,
    '',
    `报名记录 ID：${regID}`,
    '',
    `获奖审核记录 ID：${award.id}`,
    '',
    '## 操作步骤',
    '',
    ...steps.flatMap((item) => [
      `### ${item.index}. ${item.title}`,
      '',
      `- 时间：${item.time}`,
      `- 结果：${item.detail}`,
      '',
    ]),
    '## 说明',
    '',
    '- 本记录由 `scripts/run-demo-business-flow.mjs` 在已部署的线上演示环境自动执行生成。',
    '- 操作使用的是前端同源的线上 REST API，执行后数据会真实写入演示数据库。',
    '- DataHall 外部同步保持关闭，演示数据不包含真实学生或教职工信息。',
    '',
  ]

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true })
  await fs.writeFile(OUTPUT_PATH, lines.join('\n'), 'utf8')

  console.log(`operation log written to ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
