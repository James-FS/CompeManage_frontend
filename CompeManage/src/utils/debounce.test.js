import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from './debounce'

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('延迟到期后只执行最后一次调用', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('a')
    vi.advanceTimersByTime(50)
    debounced('b')
    vi.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('连续调用合并为一次', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)
    for (let i = 0; i < 10; i++) debounced(i)
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(9)
  })

  it('保留 this 上下文与多参数', () => {
    const ctx = { value: 'ctx' }
    const fn = vi.fn(function (...args) {
      expect(this).toBe(ctx)
      return args
    })
    const debounced = debounce(fn, 50)
    debounced.call(ctx, 1, 2)
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledWith(1, 2)
  })

  it('默认延迟 500ms', () => {
    const fn = vi.fn()
    const debounced = debounce(fn)
    debounced()
    vi.advanceTimersByTime(499)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
