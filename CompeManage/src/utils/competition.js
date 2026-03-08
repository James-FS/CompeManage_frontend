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
    2: { label: '等待开始', tagType: 'info', tagText: '筹备中' },
    3: { label: '报名截止', tagType: 'info', tagText: '已截止' },
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

/**
 * 根据时间计算赛事报名状态
 * @param {string} startTime - 报名开始时间 (ISO 格式)
 * @param {string} endTime - 报名结束时间 (ISO 格式)
 * @returns {Object} { label, type, disabled, tagText, tagType }
 */
export const getTimeState = (startTime, endTime) => {
  const now = new Date().getTime()

  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()

  // 缺失/非法时间（含 null、空串、0001-...）统一视为待定，避免误判为已结束。
  if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0 || end <= 0) {
    return {
      label: '筹备中',
      type: 'info',
      disabled: true,
      tagText: '筹备中',
      tagType: 'info'
    }
  }

  // 1. 等待开始 (当前时间 < 开始时间)
  if (now < start) {
    return {
      label: '等待开始',
      type: 'info',       // 按钮颜色：灰色
      disabled: true,     // 按钮不可点
      tagText: '筹备中',
      tagType: 'info'
    }
  }
  
  // 2. 报名截止 (当前时间 > 结束时间)
  if (now > end) {
    return {
      label: '报名截止',
      type: 'info',       // 按钮颜色：灰色
      disabled: true,     // 按钮不可点
      tagText: '已结束',
      tagType: 'info'
    }
  }

  const isUrgent = (end - now) < (3 * 24 * 60 * 60 * 1000); // 剩余不足3天
  
  return {
    label: '立即报名',
    type: 'primary',      // 按钮颜色：主色
    disabled: false,      // 按钮可点
    tagText: isUrgent ? '即将截止' : '报名中',
    tagType: isUrgent ? 'danger' : 'success'
  }
}