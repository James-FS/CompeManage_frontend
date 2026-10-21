/**
 * 多学院分角色并行填报测试的共享数据
 *
 * 覆盖 20 个学院：每学院 1 个 college_admin + 1 个学生；
 * 校级管理员创建 1 个校级共享赛事（全员可导）+ 2 个学院专属省级赛事（验证隔离）。
 */
import * as XLSX from 'xlsx'

export const BACKEND_URL = 'http://localhost:8080'
export const YEAR = '2026'
// RUN_TAG 仅由 globalSetup 生成并写入 state；worker 内不要在这里再造 Date.now()，
// 否则各进程 TAG 不一致，项目名对不上汇总断言。
export const RUN_TAG = `MC${Date.now().toString(36).toUpperCase()}`

export const SCHOOL_ADMIN = { username: 'T2023001', password: '123', role: 'school_admin' }

/** 与 "123" 对应的 bcrypt 哈希（与 award-flow 播种一致） */
export const SEED_PASSWORD_HASH = '$2a$10$76On7kqU6Qw62wEVFd61auav8aJaxg03oguOxKXmECD4cNmMgIYA6'

/** 前 20 个有效学院（本地库真实学院，id 连续） */
export const COLLEGES = [
  { id: 4, name: '地理科学与遥感学院', short: '地理' },
  { id: 5, name: '法学院（律师学院）', short: '法学' },
  { id: 6, name: '公共管理学院', short: '公管' },
  { id: 7, name: '环境科学与工程学院', short: '环境' },
  { id: 8, name: '化学化工学院', short: '化工' },
  { id: 9, name: '计算机科学与网络工程学院', short: '计算机' },
  { id: 10, name: '机械与电气工程学院', short: '机械' },
  { id: 11, name: '教育学院（师范学院）', short: '教育' },
  { id: 12, name: '建筑与城市规划学院', short: '建筑' },
  { id: 13, name: '美术与设计学院', short: '美术' },
  { id: 14, name: '人文学院', short: '人文' },
  { id: 15, name: '生命科学学院', short: '生科' },
  { id: 16, name: '数学与信息科学学院', short: '数学' },
  { id: 17, name: '土木与交通工程学院', short: '土木' },
  { id: 18, name: '体育学院', short: '体育' },
  { id: 19, name: '外国语学院', short: '外语' },
  { id: 20, name: '物理与材料科学学院', short: '物材' },
  { id: 21, name: '新闻与传播学院', short: '新闻' },
  { id: 22, name: '音乐舞蹈学院', short: '音舞' },
  { id: 23, name: '电子与通信工程学院', short: '电子' },
]

export function collegeAdmin(collegeIndex) {
  const i = String(collegeIndex + 1).padStart(2, '0')
  return {
    username: `MC26${i}`,
    password: '123',
    role: 'college_admin',
    college: COLLEGES[collegeIndex],
    realname: `${COLLEGES[collegeIndex].short}负责人${i}`,
  }
}

export function collegeStudent(collegeIndex) {
  const i = String(collegeIndex + 1).padStart(2, '0')
  return {
    username: `MS26${i}`,
    name: `${COLLEGES[collegeIndex].short}学生${i}`,
    college: COLLEGES[collegeIndex].name,
    major: `${COLLEGES[collegeIndex].short}专业`,
  }
}

/** 每学院 1 条个人奖（共 20 条，用于校级汇总）；runTag 必须传 state.runTag */
export function awardRowsForCollege(collegeIndex, runTag) {
  const s = collegeStudent(collegeIndex)
  return [
    {
      username: s.username,
      name: s.name,
      college: s.college,
      major: s.major,
      project: `${runTag || RUN_TAG}-${COLLEGES[collegeIndex].short}并行填报项目`,
      month: '2026-06',
      category: '省级',
      level: '一等奖',
      remark: '多学院并行E2E',
    },
  ]
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const AWARD_EXCEL_HEADERS = [
  '序号', '学号', '学生姓名', '所属学院', '所在专业',
  '参赛项目名称', '获奖时间（年/月）', '获奖类别', '获奖等级', '备注',
]

export function buildAwardExcel(rows) {
  const aoa = [
    AWARD_EXCEL_HEADERS,
    ['示例', '0000', '示例学生', '示例学院', '示例专业', '示例项目', '2026-01', '校赛', '一等奖', '会被跳过'],
    ...rows.map((r, i) => [
      i + 1, r.username, r.name, r.college, r.major || '',
      r.project, r.month, r.category, r.level, r.remark || '',
    ]),
    [],
    ['说明：1. 获奖类别：校赛、国家级、省级、国际级；国际级统一保存为国家级。'],
    ['2. 获奖等级：指一等奖、二等奖、三等奖。'],
    ['3. 一行一个学生。'],
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), '获奖录入')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
}

export function awardExcelFile(filename, rows) {
  return { name: filename, mimeType: XLSX_MIME, buffer: buildAwardExcel(rows) }
}

/** 转成后端 /api/award/import 的 AwardImportRow JSON 字段名 */
export function toImportRows(rows) {
  return rows.map(r => ({
    student_id: r.username,
    name: r.name,
    college: r.college,
    major: r.major || '',
    project_name: r.project,
    award_month: r.month,
    award_category: r.category,
    award_name: r.level,
    remark: r.remark || '',
  }))
}

/** 隔离用：甲学院负责人试图导入乙学院专属赛事时的行 */
export function crossCollegeAttackRow() {
  return [
    {
      username: 'MS2601',
      name: COLLEGES[0].name,
      college: COLLEGES[0].name,
      major: '地理专业',
      project: `${RUN_TAG}-越权导入项目`,
      month: '2026-06',
      category: '省级',
      level: '一等奖',
    },
  ]
}
