import { describe, it, expect, vi, afterEach } from 'vitest'
import { COMP_CATEGORIES, getStatusConfig, getParticipantType, getTimeState } from './competition'

describe('COMP_CATEGORIES', () => {
  it('非空且首项为 全部', () => {
    expect(COMP_CATEGORIES.length).toBeGreaterThan(1)
    expect(COMP_CATEGORIES[0]).toBe('全部')
  })
})

describe('getStatusConfig', () => {
  it('映射四个已知状态码', () => {
    expect(getStatusConfig(1).tagText).toBe('报名中')
    expect(getStatusConfig(2).tagText).toBe('筹备中')
    expect(getStatusConfig(3).tagText).toBe('已截止')
    expect(getStatusConfig(0).tagText).toBe('已结束')
  })

  it('未知状态码返回 undefined', () => {
    expect(getStatusConfig(99)).toBeUndefined()
  })
})

describe('getParticipantType', () => {
  it('1=个人赛 2=团队赛 未知兜底', () => {
    expect(getParticipantType(1)).toBe('个人赛')
    expect(getParticipantType(2)).toBe('团队赛')
    expect(getParticipantType(9)).toBe('未知类型')
  })
})

describe('getTimeState', () => {
  afterEach(() => vi.useRealTimers())

  it('缺失/非法/零值时间视为筹备中且禁用', () => {
    for (const [s, e] of [[null, null], ['', ''], ['0001-01-01', '0001-01-01'], ['bad', 'bad']]) {
      const st = getTimeState(s, e)
      expect(st.tagText).toBe('筹备中')
      expect(st.disabled).toBe(true)
    }
  })

  it('未开始 -> 等待开始（禁用）', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00'))
    const st = getTimeState('2026-02-01', '2026-03-01')
    expect(st.label).toBe('等待开始')
    expect(st.disabled).toBe(true)
  })

  it('已过期 -> 报名截止（禁用）', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-01T00:00:00'))
    const st = getTimeState('2026-02-01', '2026-03-01')
    expect(st.label).toBe('报名截止')
    expect(st.tagText).toBe('已结束')
  })

  it('进行中且剩余>3天 -> 报名中', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-15T00:00:00'))
    const st = getTimeState('2026-01-01', '2026-02-01')
    expect(st.label).toBe('立即报名')
    expect(st.disabled).toBe(false)
    expect(st.tagText).toBe('报名中')
    expect(st.tagType).toBe('success')
  })

  it('进行中且剩余<3天 -> 即将截止（danger）', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-30T00:00:00'))
    const st = getTimeState('2026-01-01', '2026-02-01')
    expect(st.tagText).toBe('即将截止')
    expect(st.tagType).toBe('danger')
  })
})
