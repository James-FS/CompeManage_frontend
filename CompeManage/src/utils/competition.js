// 1. 学科分类
export const COMP_CATEGORIES = [
  '全部',
  '计算机/软件',
  '数学/建模',
  '电子/自动化',
  '机械工程',
  '艺术/设计',
  '经济/金融',
  '创新创业',
  '外语',
  '土木建筑',
  '化工/材料',
  '法学',
  '体育',
  '文学/新闻',
  '物理',
  '生命科学',
  '环境工程',
  '医学',
  '教育学',
  '哲学',
]

// 2. 赛事状态配置 (Map)
// status: 后端数据库存储的 int 值
export const getStatusConfig = (status) => {
  const map = {
    1: { label: '立即报名', tagType: 'success', tagText: '报名中' },
    2: { label: '立即报名', tagType: 'danger', tagText: '急' },
    3: { label: '等待开始', tagType: 'info', tagText: '筹备中' },
    0: { label: '查看公示', tagType: 'info', tagText: '已结束' },
  }
  return map[status]
}

/**
 * 获取赛事状态配置
 * @param {number} status - 状态码
 */
// 3. 参赛形式配置
export const PARTICIPANT_TYPE_MAP = {
  1: '个人赛',
  2: '团队赛',
}

/**
 * 获取参赛形式文案
 * @param {number} type - 类型码
 */
export const getParticipantType = (type) => {
  return PARTICIPANT_TYPE_MAP[type] || '未知类型'
}

// 4. 筛选栏的状态选项 (前端 UI 用的)
export const FILTER_STATUS_OPTIONS = {
  all: '全部',
  upcoming: '未开始',
  ongoing: '进行中',
  ended: '已结束',
}