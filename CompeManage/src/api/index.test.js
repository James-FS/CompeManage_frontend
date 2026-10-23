import { describe, it, expect, beforeEach, vi } from 'vitest'

// 打桩请求层：api 包装层的单测只验证 URL/参数拼装
vi.mock('@/utils/request', () => ({
  get: vi.fn().mockResolvedValue({ code: 200 }),
  post: vi.fn().mockResolvedValue({ code: 200 }),
  put: vi.fn().mockResolvedValue({ code: 200 }),
  del: vi.fn().mockResolvedValue({ code: 200 }),
  request: vi.fn(),
}))
import { get, post, put, del } from '@/utils/request'
import { api } from './index'

describe('api 包装层 URL/参数拼装', () => {
  beforeEach(() => {
    vi.mocked(get).mockClear()
    vi.mocked(post).mockClear()
    vi.mocked(put).mockClear()
    vi.mocked(del).mockClear()
  })

  it('列表类：路径与查询参数直传', () => {
    api.getAwardCompList({ page: 1, size: 10 })
    expect(get).toHaveBeenCalledWith('/api/award/list', { page: 1, size: 10 })

    api.getCompAwards(3)
    expect(get).toHaveBeenCalledWith('/api/award/comp-awards?comp_id=3')
  })

  it('导出类：年份拼接（空/非空）', () => {
    api.exportAwardProjects('')
    expect(get).toHaveBeenCalledWith('/api/award/export/projects', {}, expect.anything())

    api.exportAwardReport('2026')
    expect(get).toHaveBeenCalledWith(
      '/api/award/export/report?year=2026', {}, expect.anything(),
    )
  })

  it('通知类：删除走 del，创建走 post', () => {
    api.deleteNotice(5)
    expect(del).toHaveBeenCalledWith('/api/notice/5')

    api.createNotice({ title: 't' })
    expect(post).toHaveBeenCalledWith('/api/notice/comp/create', { title: 't' }, expect.anything())
  })

  it('模板/成员类：路径含动态 id', () => {
    api.getAwardTemplate(8)
    expect(get).toHaveBeenCalledWith(
      '/api/award/export-template?comp_id=8', {}, expect.anything(),
    )

    api.updateCompetition(12, { comp_name: 'p' })
    expect(put).toHaveBeenCalledWith('/api/comp/12', { comp_name: 'p' })
  })

  it('登录类：post /api/login', () => {
    api.login({ username: 'u', password: 'p' })
    expect(post).toHaveBeenCalledWith('/api/login', { username: 'u', password: 'p' })
  })
})
