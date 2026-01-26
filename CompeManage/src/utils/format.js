import dayjs from 'dayjs'
/**
 * 格式化单个时间
 * @param {string} time - 后端时间字符串
 * @param {string} template - 格式模板 (默认 YYYY-MM-DD)
 * @returns {string} 格式化后的时间 或 "待定"
 */

export function formatTime(time, template = 'YYYY-MM-DD') {
    if (!time) {
        return '待定'
    }

    if (time.startsWith('0001') || time === '0000-00-00 00:00:00') {
    return '待定'
  }
  const date = dayjs(time)
  return date.isValid() ? date.format(template) : '待定'
}

/**
 * 格式化时间范围
 * @param {string} start - 开始时间
 * @param {string} end - 结束时间
 * @param {string} template - 格式模板 (默认 YYYY-MM-DD)
 * @returns {string} 例如 "2026-01-01 至 2026-02-01"
 */
export const formatTimeRange = (start, end, template = 'YYYY-MM-DD') => {
  const s = formatTime(start,template)
  const e = formatTime(end,template)

  if (s === '待定' || e === '待定') {
    return '时间待定'
  }

  return `${s} 至 ${e}`
}

/**
 * 将前端时间转换为 Go 后端可识别的 RFC3339 格式
 * 解决 Element Plus "YYYY-MM-DD HH:mm:ss" 格式 Go 无法解析的问题
 * @param {string|Date} time - 前端时间字符串或Date对象
 * @returns {string|null} 例如 "2026-01-01T12:00:00+08:00" 或 null
 */
export function formatToGoTime(time) {
  if (!time) return null
  
  const date = dayjs(time)
  if (!date.isValid()) return null

  // format('YYYY-MM-DDTHH:mm:ssZ') 会自动加上 T 和当前时区偏移 (例如 +08:00)
  return date.format('YYYY-MM-DDTHH:mm:ssZ')
}