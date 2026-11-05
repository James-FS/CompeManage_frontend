/**
 * 获奖填报全流程测试的共享数据与 Excel 构造工具
 *
 * 覆盖矩阵：
 * - 学生 9 人，横跨 8 个学院（含跨学院组队）
 * - 团队奖 3 个（3 人队 / 2 人队 / 2 人跨赛重复队员）、个人奖 3 个
 * - 获奖类别：省级 / 国家级 / 国际级（后端归一为国家级）/ 校赛（不参与附件导出）
 * - 三种导入路径：列表页直传 Excel、导入页 Excel + 校验 + 删错行、导入页手动新增
 */
import * as XLSX from 'xlsx'

export const BACKEND_URL = 'http://localhost:8080'
export const YEAR = '2026'

export const SCHOOL_ADMIN = { username: 'T2023001', password: '123', role: 'school_admin' }
export const COLLEGE_ADMIN = { username: 'T2023002', password: '123', role: 'college_admin' }

/** 与 S2024001 相同的口令 "123" 的 bcrypt 哈希，播种学生复用 */
export const SEED_PASSWORD_HASH = '$2a$10$76On7kqU6Qw62wEVFd61auav8aJaxg03oguOxKXmECD4cNmMgIYA6'

/** E2E 专用学生样例（学号前缀 E2E26，globalSetup 幂等播种到 users 表；学院名与数据中台同步的真实学院一致） */
export const FLOW_STUDENTS = [
  { username: 'E2E2601', name: '王奕辰', college: '计算机科学与网络工程学院', major: '计算机科学与技术' },
  { username: 'E2E2602', name: '刘思远', college: '数学与信息科学学院', major: '数学与应用数学' },
  { username: 'E2E2603', name: '陈嘉懿', college: '电子与通信工程学院', major: '电子信息工程' },
  { username: 'E2E2604', name: '赵雨桐', college: '计算机科学与网络工程学院', major: '软件工程' },
  { username: 'E2E2605', name: '林芷晴', college: '经济与统计学院', major: '统计学' },
  { username: 'E2E2606', name: '黄子涛', college: '外国语学院', major: '英语' },
  { username: 'E2E2607', name: '徐若曦', college: '机械与电气工程学院', major: '机械设计制造及其自动化' },
  { username: 'E2E2608', name: '孙浩然', college: '法学院（律师学院）', major: '法学' },
  { username: 'E2E2609', name: '郑晓萌', college: '美术与设计学院', major: '视觉传达设计' },
]

export const STUDENT = Object.fromEntries(FLOW_STUDENTS.map(s => [s.username, s]))

/** 三个待创建赛事的表单要素（学院必须从"所属学院"下拉可选的真实学院中选择） */
export const FLOW_COMPS = [
  {
    key: 'A', base: 'E2E获奖流程·蓝桥杯校赛选拔', level: '校级', type: '学科竞赛',
    college: '计算机科学与网络工程学院', organizer: '校教务处', undertaker: '计算机科学与网络工程学院',
    managerWorkId: 'T2023012', desc: 'E2E 获奖填报流程测试赛事A',
  },
  {
    key: 'B', base: 'E2E获奖流程·数学建模挑战赛', level: '校级', type: '学科竞赛',
    college: '数学与信息科学学院', organizer: '校教务处', undertaker: '数学与信息科学学院',
    managerWorkId: 'T2023003', desc: 'E2E 获奖填报流程测试赛事B',
  },
  {
    key: 'C', base: 'E2E获奖流程·新生程序设计赛', level: '校级', type: '创新创业竞赛',
    college: '计算机科学与网络工程学院', organizer: '校教务处', undertaker: '计算机科学与网络工程学院',
    managerWorkId: 'T2023004', desc: 'E2E 获奖填报流程测试赛事C',
  },
]

/**
 * 赛事负责人（教职工池）账号，globalSetup 幂等播种。
 * 账号不存在时"按工号选负责人"弹窗查不到行，用例会以超时失败——播种后套件不再依赖库中存在哪个教师账号。
 */
export const FLOW_MANAGERS = [
  { username: 'T2023012', name: '何老师', college: '计算机科学与网络工程学院', major: '计算机科学与技术' },
  { username: 'T2023003', name: '张伟', college: '计算机科学与网络工程学院', major: '计算机科学' },
  { username: 'T2023004', name: '李华', college: '计算机科学与网络工程学院', major: '计算机科学' },
]

/** 历史遗留的 E2E 赛事名前缀（globalSetup 软删清理，避免影响校赛填报列表与附件导出） */
export const E2E_COMP_PREFIX = 'E2E获奖流程·'

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** 获奖名单导入模板的十列表头（与后端 awardImportHeaders 一致） */
export const AWARD_EXCEL_HEADERS = ['序号', '学号', '学生姓名', '所属学院', '所在专业', '参赛项目名称', '获奖时间（年/月）', '获奖类别', '获奖等级', '备注']

/**
 * 构造获奖名单导入 Excel（含示例行与说明区，用于验证解析边界）
 * @param {Array<{username:string,name:string,college:string,major?:string,project:string,month:string,category:string,level:string,remark?:string}>} rows
 * @returns {Buffer}
 */
export function buildAwardExcel(rows) {
  const aoa = [
    AWARD_EXCEL_HEADERS,
    ['示例', '0000', '示例学生', '示例学院', '示例专业', '示例项目', '2026-01', '校赛', '一等奖', '会被跳过'],
    ...rows.map((r, i) => [
      i + 1, r.username, r.name, r.college, r.major || '', r.project, r.month, r.category, r.level, r.remark || '',
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

/** Playwright setInputFiles 用的文件描述 */
export function awardExcelFile(filename, rows) {
  return { name: filename, mimeType: XLSX_MIME, buffer: buildAwardExcel(rows) }
}
