/**
 * 防抖函数
 * @param {Function} fn 需要执行的函数
 * @param {Number} delay 延迟时间（毫秒），默认 500ms
 * @returns {Function}
 */
export const debounce = (fn, delay = 500) => {
  let timer = null
  return function (...args) {
    // 如果已有定时器，清除它，重新计时
    if (timer) clearTimeout(timer)
    
    // 保存当前的 this 上下文（虽然在 Vue3 setup 中不太依赖 this，但为了通用性）
    const context = this
    
    timer = setTimeout(() => {
      fn.apply(context, args)
      timer = null
    }, delay)
  }
}