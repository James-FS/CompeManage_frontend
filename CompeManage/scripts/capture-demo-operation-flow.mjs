import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const BASE_URL = process.env.DEMO_BASE_URL || 'http://1.117.230.218'
const OUTPUT_DIR = path.resolve(process.cwd(), '..', 'docs', 'operation-images')
const LOG_PATH = path.resolve(process.cwd(), '..', 'docs', 'demo-operation-log.md')
const CHROME_PATH = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const adminAccount = { username: 'T2023001', password: '123', role: '校级管理员' }
const studentAccount = { username: 'S2024001', password: '123', role: '学生' }
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
const demoName = `README流程演示赛-${stamp}`

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

async function apiLogin(account) {
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

async function waitForSettled(page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1600)
}

async function setSession(page, session) {
  await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ token, userInfo }) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', userInfo.role)
    localStorage.setItem(
      'userInfo',
      JSON.stringify({
        id: userInfo.id,
        name: userInfo.realname || userInfo.username,
        username: userInfo.username,
      }),
    )
  }, session)
}

async function capture(page, filename, route, description) {
  await page.goto(`${BASE_URL}/#${route}`, { waitUntil: 'domcontentloaded' })
  await waitForSettled(page)
  await page.screenshot({
    path: path.join(OUTPUT_DIR, filename),
    fullPage: false,
  })
  console.log(`captured ${filename} - ${description}`)
}

async function captureLoginOperation(page) {
  await page.goto(`${BASE_URL}/#/login`, { waitUntil: 'domcontentloaded' })
  await waitForSettled(page)
  const adminButton = page.getByText('管理员账号登录')
  if (await adminButton.isVisible().catch(() => false)) {
    await adminButton.click()
  }
  await page.getByPlaceholder('管理员用户名').fill(adminAccount.username)
  await page.getByPlaceholder('密码').fill(adminAccount.password)
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '01-login-filled.png'),
    fullPage: false,
  })
  await page.getByRole('button', { name: /^登录$/ }).click()
  await page.waitForURL(/#\/home/, { timeout: 15000 })
  await waitForSettled(page)
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '02-admin-home-after-login.png'),
    fullPage: false,
  })
}

function buildLog({ compID, regID, awardID }) {
  const steps = [
    ['01-login-filled.png', '校级管理员填写账号密码', '在登录页展开“管理员账号登录”，输入校级管理员账号。'],
    ['02-admin-home-after-login.png', '校级管理员登录进入首页', '登录后进入系统首页，侧边栏展示可访问的管理模块。'],
    ['03-competition-created-list.png', '创建赛事后查看赛事目录', `创建赛事「${demoName}」后，赛事目录出现该条记录。`],
    ['04-registration-config-detail.png', '配置报名规则', '进入报名规则配置页，可看到团队赛、报名时间、作品提交时间、赛道和奖项层级。'],
    ['05-student-registration-list.png', '学生查看可报名赛事', '学生账号进入赛事报名页，可看到刚创建并开放报名的赛事。'],
    ['06-student-registration-status.png', '学生提交报名后查看报名状态', '学生提交团队、负责人、指导老师、附件和赛道信息后，页面显示报名状态。'],
    ['07-admin-registration-pending.png', '管理员查看待审核报名', '管理员进入报名审核页，看到学生提交的待审核报名。'],
    ['08-admin-registration-approved.png', '管理员通过报名审核', '报名审核通过后，列表中的状态变为已通过。'],
    ['09-student-work-submitted.png', '学生提交作品后查看作品入口', '学生提交作品材料链接后，作品提交页显示可修改作品。'],
    ['10-admin-work-audit.png', '管理员查看作品审核', '管理员进入作品审核页，看到该赛事已有作品提交数量。'],
    ['11-student-award-center.png', '学生查看竞赛/获奖中心', '学生提交获奖补录后，可在学生侧竞赛中心查看相关记录入口。'],
    ['12-admin-award-pending.png', '管理员查看待审核获奖补录', '管理员进入填报审核页，看到学生提交的获奖补录待审核记录。'],
    ['13-admin-award-approved.png', '管理员通过获奖审核', '获奖审核通过后，审核列表状态更新为已通过。'],
    ['14-summary-list-after-ended.png', '赛事结束后进入总结列表', '将演示赛事调整为已结束后，赛事总结列表出现该赛事。'],
    ['15-summary-edit-draft.png', '管理员填写赛事总结', '管理员保存总结草稿，经费明细和附件信息用于总结归档。'],
    ['16-statistics-after-flow.png', '数据统计看板反映业务数据', '完成赛事、报名、获奖和总结链路后查看统计看板。'],
  ]

  return [
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
    `获奖审核记录 ID：${awardID}`,
    '',
    '## 操作过程截图',
    '',
    ...steps.flatMap(([image, title, detail], index) => [
      `### ${index + 1}. ${title}`,
      '',
      detail,
      '',
      `![${title}](operation-images/${image})`,
      '',
    ]),
    '## 说明',
    '',
    '- 本记录由 `scripts/capture-demo-operation-flow.mjs` 在已部署的线上演示环境自动执行生成。',
    '- 截图按业务动作发生顺序生成，展示的是操作过程中的界面状态，不只是功能页巡览。',
    '- 部分写入动作通过前端同源 REST API 执行，再立即打开对应前端页面截图；数据会真实写入演示数据库。',
    '- DataHall 外部同步保持关闭，演示数据不包含真实学生或教职工信息。',
    '',
  ].join('\n')
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 920 },
    deviceScaleFactor: 1,
    locale: 'zh-CN',
  })

  const page = await context.newPage()
  page.on('dialog', async (dialog) => {
    await dialog.dismiss()
  })

  await captureLoginOperation(page)
  const admin = await apiLogin(adminAccount)
  const student = await apiLogin(studentAccount)
  await setSession(page, admin)

  const managers = await request('GET', '/api/comp/manager/list', {
    token: admin.token,
    query: { page: 1, page_size: 10 },
  })
  const manager = managers.data.list.find((item) => item.work_id === 'T2023003') || managers.data.list[0]
  if (!manager) throw new Error('未找到赛事负责人账号')

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
      desc: '用于 README 操作过程截图的演示赛事，数据为公开演示数据。',
      year: String(new Date().getFullYear()),
    },
  })
  const compID = created.data.id
  await capture(page, '03-competition-created-list.png', '/competition/list', '创建赛事后查看赛事目录')

  const baseConfig = {
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
    track: [{ trackName: '软件创新', subTrack: [{ title: 'Web 应用' }] }],
    need_review: 0,
    expert_ids: [],
    force_close_review: true,
  }
  await request('POST', '/api/reg/config', {
    token: admin.token,
    body: baseConfig,
  })
  await capture(page, '04-registration-config-detail.png', `/register/edit/${compID}`, '配置报名规则')

  await setSession(page, student)
  await capture(page, '05-student-registration-list.png', '/register', '学生查看可报名赛事')

  await request('POST', '/api/reg/submit', {
    token: student.token,
    body: {
      comp_id: compID,
      team_name: `流程演示团队-${stamp}`,
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
  await capture(page, '06-student-registration-status.png', `/register/detail/${compID}`, '学生提交报名后查看报名状态')

  await setSession(page, admin)
  await capture(page, '07-admin-registration-pending.png', '/register/audit', '管理员查看待审核报名')

  const regList = await request('GET', '/api/reg/list', {
    token: admin.token,
    query: { page: 1, size: 10, comp_name: demoName },
  })
  const registration = regList.data.list.find((item) => item.comp_name === demoName || item.competition?.comp_name === demoName) || regList.data.list[0]
  if (!registration) throw new Error('未找到刚提交的报名记录')
  const regID = registration.id

  await request('PUT', '/api/reg/audit', {
    token: admin.token,
    body: { id: regID, status: 1, reason: '' },
  })
  await capture(page, '08-admin-registration-approved.png', '/register/audit', '管理员通过报名审核')

  await request('PUT', '/api/reg/work-submit', {
    token: student.token,
    body: {
      reg_id: regID,
      work_attachment_url: '/demo/readme-work-package.zip',
    },
  })
  await setSession(page, student)
  await capture(page, '09-student-work-submitted.png', '/register/work', '学生提交作品后查看作品入口')

  await setSession(page, admin)
  await capture(page, '10-admin-work-audit.png', '/register/work-audit', '管理员查看作品审核')

  await request('POST', '/api/award/student/supplement', {
    token: student.token,
    body: {
      comp_id: compID,
      team_name: `流程演示团队-${stamp}`,
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
  await setSession(page, student)
  await capture(page, '11-student-award-center.png', '/award/student', '学生查看竞赛/获奖中心')

  await setSession(page, admin)
  await capture(page, '12-admin-award-pending.png', '/award/audit', '管理员查看待审核获奖补录')

  const awardList = await request('GET', '/api/award/audit/list', {
    token: admin.token,
    query: { page: 1, page_size: 10, comp_name: demoName, source: 'supplement' },
  })
  const award = awardList.data.list.find((item) => item.comp_name === demoName) || awardList.data.list[0]
  if (!award) throw new Error('未找到获奖补录审核记录')

  await request('PUT', `/api/award/audit/${award.id}/pass`, { token: admin.token })
  await capture(page, '13-admin-award-approved.png', '/award/audit', '管理员通过获奖审核')

  await request('POST', '/api/reg/config', {
    token: admin.token,
    body: {
      ...baseConfig,
      reg_start_time: daysFromNow(-30),
      reg_end_time: daysFromNow(-20),
      submit_start_time: daysFromNow(-19),
      submit_end_time: daysFromNow(-18),
    },
  })
  await capture(page, '14-summary-list-after-ended.png', '/summary/summary-list', '赛事结束后进入总结列表')

  await request('POST', `/api/summary/${compID}`, {
    token: admin.token,
    body: {
      summary_content: 'README 操作过程演示：完成赛事创建、报名配置、学生报名、审核、作品提交、获奖补录和总结草稿。',
      expenses: [
        { usage: '宣传物料', amount: 300, remark: '海报与通知材料' },
        { usage: '评审组织', amount: 500, remark: '演示数据' },
      ],
      attachments: [{ name: 'README操作演示总结.pdf', url: '/demo/readme-summary.pdf' }],
      status: 0,
    },
  })
  await capture(page, '15-summary-edit-draft.png', `/summary/summary/edit/${compID}?name=${encodeURIComponent(demoName)}&status=0`, '管理员填写赛事总结')

  await capture(page, '16-statistics-after-flow.png', '/statistics/dashboard', '数据统计看板反映业务数据')

  await fs.writeFile(LOG_PATH, buildLog({ compID, regID, awardID: award.id }), 'utf8')
  console.log(`operation log written to ${LOG_PATH}`)

  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
