import { describe, it, expect, beforeEach, vi } from 'vitest'

// ElMessage 打桩：只验证调用，不渲染 UI
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn(), warning: vi.fn() },
}))
import { ElMessage } from 'element-plus'
import service, { get } from './request'

// 用自定义 adapter 拦截 axios 请求，构造响应/错误分支
const respondWith = (status, data, url = '/api/x') => {
  service.defaults.adapter = async (config) => ({
    data,
    status,
    statusText: String(status),
    headers: {},
    config: { ...config, url: config.url || url },
  })
}
const rejectWith = (err) => {
  service.defaults.adapter = () => Promise.reject(err)
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('request 响应拦截器', () => {
  beforeEach(() => {
    vi.mocked(ElMessage.error).mockClear()
    vi.mocked(ElMessage.warning).mockClear()
    localStorage.clear()
  })

  it('code=200 原样返回业务数据', async () => {
    respondWith(200, { code: 200, message: 'ok', data: { a: 1 } })
    const res = await get('/api/x')
    expect(res.code).toBe(200)
    expect(res.data).toEqual({ a: 1 })
    expect(ElMessage.error).not.toHaveBeenCalled()
  })

  it('业务 code 非 200：报错并 reject（messageShown 标记）', async () => {
    respondWith(200, { code: 400, msg: '参数错误' })
    await expect(get('/api/x')).rejects.toThrow('参数错误')
    expect(ElMessage.error).toHaveBeenCalledWith('参数错误')
  })

  it('code=401 非登录接口：清除 token', async () => {
    localStorage.setItem('token', 'stale')
    respondWith(200, { code: 401, message: '请先登录' }, '/api/other')
    await expect(get('/api/other')).rejects.toThrow('请先登录')
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('code=401 登录接口：不做跳转清理，仅 reject 账号密码错误', async () => {
    localStorage.setItem('token', 'should-keep')
    respondWith(200, { code: 401, message: '账号或密码错误' }, '/api/login')
    await expect(get('/api/login')).rejects.toThrow('账号或密码错误')
    expect(localStorage.getItem('token')).toBe('should-keep')
  })
})

describe('request HTTP 错误分支', () => {
  beforeEach(() => {
    vi.mocked(ElMessage.error).mockClear()
    localStorage.clear()
  })

  const httpError = (status, data, url, extra = {}) => ({
    config: { url, ...extra },
    response: { status, data, config: { url, ...extra } },
  })

  it('HTTP 403：展示后端 message', async () => {
    rejectWith(httpError(403, { message: '没有权限访问该资源' }, '/api/x'))
    await expect(get('/api/x')).rejects.toMatchObject({ message: '没有权限访问该资源' })
    expect(ElMessage.error).toHaveBeenCalledWith('没有权限访问该资源')
  })

  it('HTTP 404/500：固定文案', async () => {
    rejectWith(httpError(404, {}, '/api/x'))
    await expect(get('/api/x')).rejects.toMatchObject({ messageShown: true })
    expect(ElMessage.error).toHaveBeenCalledWith('请求的资源不存在')

    rejectWith(httpError(500, {}, '/api/x'))
    await expect(get('/api/x')).rejects.toMatchObject({ messageShown: true })
    expect(ElMessage.error).toHaveBeenCalledWith('服务器内部错误')
  })

  it('HTTP 400 + warningOnBadRequest：用 warning 提示', async () => {
    rejectWith(httpError(400, { message: '数据校验未通过' }, '/api/x', { warningOnBadRequest: true }))
    const p = get('/api/x', {}, { warningOnBadRequest: true })
    await expect(p).rejects.toMatchObject({ messageShown: true })
    await flush()
    expect(ElMessage.warning).toHaveBeenCalledWith('数据校验未通过')
  })

  it('导入接口超时：专属超时文案', async () => {
    rejectWith({
      config: { url: '/api/award/import?comp_id=1' },
      request: {},
      code: 'ECONNABORTED',
    })
    await expect(get('/api/award/import?comp_id=1')).rejects.toMatchObject({ messageShown: true })
    expect(ElMessage.error).toHaveBeenCalledWith(
      '导入请求超时，结果尚未确认，请先刷新获奖列表核实后再操作',
    )
  })

  it('请求拦截器：携带 localStorage 中的 token', async () => {
    localStorage.setItem('token', 'unit-token')
    let seenConfig = null
    service.defaults.adapter = async (config) => {
      seenConfig = config
      return { data: { code: 200 }, status: 200, statusText: 'OK', headers: {}, config }
    }
    await get('/api/x')
    expect(seenConfig.headers['Authorization']).toBe('Bearer unit-token')
  })
})
