/**
 * 通用表单验证工具函数
 */

/**
 * 验证手机号码（中国大陆）
 * 支持：11位数字，以1开头，第二位为3-9
 * @param {string} phone 手机号
 * @returns {boolean} true 表示有效，false 表示无效
 */
export function isValidPhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

/**
 * 验证邮箱格式
 * 支持：标准邮箱格式
 * @param {string} email 邮箱地址
 * @returns {boolean} true 表示有效，false 表示无效
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Element Plus 电话号码验证规则
 */
export const phoneRule = {
  validator: (rule, value, callback) => {
    if (!value) {
      callback(new Error('请输入手机号'))
    } else if (!isValidPhone(value)) {
      callback(new Error('请输入有效的11位手机号'))
    } else {
      callback()
    }
  },
  trigger: 'blur',
}

/**
 * Element Plus 邮箱验证规则
 */
export const emailRule = {
  validator: (rule, value, callback) => {
    if (!value) {
      callback(new Error('请输入邮箱'))
    } else if (!isValidEmail(value)) {
      callback(new Error('请输入有效的邮箱地址'))
    } else {
      callback()
    }
  },
  trigger: 'blur',
}

/**
 * 通用验证规则集合
 * 包含常用的表单验证规则
 */
export const commonValidationRules = {
  phone: [phoneRule],
  email: [emailRule],
  phoneAndEmail: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    phoneRule,
  ],
}