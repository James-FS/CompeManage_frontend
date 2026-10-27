import { describe, it, expect } from 'vitest'
import { formatTime, formatTimeRange, formatToGoTime } from './format'

describe('formatTime', () => {
  it('空值返回 待定', () => {
    expect(formatTime(null)).toBe('待定')
    expect(formatTime('')).toBe('待定')
    expect(formatTime(undefined)).toBe('待定')
  })

  it('Go 零值时间返回 待定', () => {
    expect(formatTime('0001-01-01T00:00:00Z')).toBe('待定')
    expect(formatTime('0000-00-00 00:00:00')).toBe('待定')
  })

  it('合法时间按模板格式化', () => {
    expect(formatTime('2026-10-01 12:30:00')).toBe('2026-10-01')
    expect(formatTime('2026-10-01 12:30:00', 'YYYY/MM/DD')).toBe('2026/10/01')
    expect(formatTime('2026-10-01T04:30:00Z', 'YYYY-MM-DD HH:mm')).toBe('2026-10-01 12:30')
  })

  it('Date 对象直接格式化', () => {
    expect(formatTime(new Date('2026-01-02T08:00:00'), 'YYYY-MM-DD')).toBe('2026-01-02')
  })

  it('非法字符串返回 待定', () => {
    expect(formatTime('not-a-date')).toBe('待定')
  })
})

describe('formatTimeRange', () => {
  it('两端齐全时输出 a 至 b', () => {
    expect(formatTimeRange('2026-01-01', '2026-02-01')).toBe('2026-01-01 至 2026-02-01')
  })

  it('任一端缺失输出 时间待定', () => {
    expect(formatTimeRange('', '2026-02-01')).toBe('时间待定')
    expect(formatTimeRange('2026-01-01', null)).toBe('时间待定')
  })
})

describe('formatToGoTime', () => {
  it('空值返回 null', () => {
    expect(formatToGoTime(null)).toBeNull()
    expect(formatToGoTime('')).toBeNull()
  })

  it('非法时间返回 null', () => {
    expect(formatToGoTime('abc')).toBeNull()
  })

  it('输出带时区偏移的 RFC3339（Go 可解析）', () => {
    const out = formatToGoTime('2026-10-01 12:00:00')
    expect(out).toMatch(/^2026-10-01T12:00:00[+-]\d{2}:\d{2}$/)
  })
})
