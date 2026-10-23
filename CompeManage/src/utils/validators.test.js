import { describe, it, expect } from 'vitest'
import { isValidPhone, isValidEmail, phoneRule, emailRule } from './validators'

describe('isValidPhone', () => {
  it.each([
    ['13800138000', true],
    ['15912345678', true],
    ['19999999999', true],
    ['12345678901', false], // 第二位 2
    ['1380013800', false],  // 10 位
    ['138001380001', false], // 12 位
    ['23800138000', false], // 不以 1 开头
    ['abc', false],
    ['', false],
  ])('%s -> %s', (input, expected) => {
    expect(isValidPhone(input)).toBe(expected)
  })
})

describe('isValidEmail', () => {
  it.each([
    ['a@b.com', true],
    ['user.name@gzhu.edu.cn', true],
    ['no-at-sign.com', false],
    ['a@b', false],          // 缺顶级域名
    ['a b@c.com', false],    // 含空格
    ['@c.com', false],
  ])('%s -> %s', (input, expected) => {
    expect(isValidEmail(input)).toBe(expected)
  })
})

// Element Plus 规则：callback(Error) 表示校验失败，callback() 表示通过
const capture = () => {
  const calls = []
  return { calls, cb: (arg) => calls.push(arg) }
}

describe('phoneRule', () => {
  it('空值报 请输入手机号', () => {
    const { calls, cb } = capture()
    phoneRule.validator(null, '', cb)
    expect(calls[0]).toBeInstanceOf(Error)
    expect(calls[0].message).toBe('请输入手机号')
  })

  it('格式错误报 11 位手机号', () => {
    const { calls, cb } = capture()
    phoneRule.validator(null, '123', cb)
    expect(calls[0].message).toBe('请输入有效的11位手机号')
  })

  it('合法手机号通过（无 Error）', () => {
    const { calls, cb } = capture()
    phoneRule.validator(null, '13800138000', cb)
    expect(calls[0]).toBeUndefined()
  })
})

describe('emailRule', () => {
  it('空值与非法值报错，合法值通过', () => {
    const empty = capture()
    emailRule.validator(null, '', empty.cb)
    expect(empty.calls[0].message).toBe('请输入邮箱')

    const bad = capture()
    emailRule.validator(null, 'x@', bad.cb)
    expect(bad.calls[0].message).toBe('请输入有效的邮箱地址')

    const ok = capture()
    emailRule.validator(null, 'x@y.com', ok.cb)
    expect(ok.calls[0]).toBeUndefined()
  })
})
