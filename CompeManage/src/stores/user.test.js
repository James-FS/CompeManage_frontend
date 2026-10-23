import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from './user'

// mock 掉 api 层：单测只验证 store 自身的状态流转
vi.mock('@/api', () => ({
  api: { login: vi.fn() },
}))
import { api } from '@/api'

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.mocked(api.login).mockReset()
  })

  it('login 成功：写入 token/role/userInfo 并持久化 localStorage', async () => {
    vi.mocked(api.login).mockResolvedValue({
      code: 200,
      data: {
        token: 'jwt-token-1',
        userInfo: { id: 7, role: 'school_admin', realname: '测试管理员', username: '900001' },
      },
    })
    const store = useUserStore()
    const res = await store.login({ username: '900001', password: 'x' })

    expect(res.code).toBe(200)
    expect(store.token).toBe('jwt-token-1')
    expect(store.role).toBe('school_admin')
    expect(store.userInfo).toEqual({ id: 7, name: '测试管理员', username: '900001' })
    expect(localStorage.getItem('token')).toBe('jwt-token-1')
    expect(localStorage.getItem('role')).toBe('school_admin')
    expect(JSON.parse(localStorage.getItem('userInfo')).name).toBe('测试管理员')
  })

  it('login 业务失败：抛错且不写状态', async () => {
    vi.mocked(api.login).mockResolvedValue({ code: 401, msg: '账号或密码错误' })
    const store = useUserStore()
    await expect(store.login({ username: 'x', password: 'y' })).rejects.toThrow('账号或密码错误')
    expect(store.token).toBe('')
  })

  it('logout：清空状态与 localStorage', async () => {
    vi.mocked(api.login).mockResolvedValue({
      code: 200,
      data: { token: 't', userInfo: { id: 1, role: 'student', realname: 's', username: 'u' } },
    })
    const store = useUserStore()
    await store.login({ username: 'u', password: 'p' })
    store.logout()
    expect(store.token).toBe('')
    expect(store.role).toBe('')
    expect(store.userInfo).toEqual({})
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('restoreState：从 localStorage 恢复', () => {
    localStorage.setItem('role', 'college_admin')
    localStorage.setItem('token', 'restored-token')
    localStorage.setItem('userInfo', JSON.stringify({ name: '院管' }))
    const store = useUserStore()
    store.restoreState()
    expect(store.role).toBe('college_admin')
    expect(store.token).toBe('restored-token')
    expect(store.userInfo).toEqual({ name: '院管' })
  })

  it('hasPermission：空列表放行；按角色判定', () => {
    const store = useUserStore()
    store.role = 'student'
    expect(store.hasPermission(null)).toBe(true)
    expect(store.hasPermission([])).toBe(true)
    expect(store.hasPermission(['student'])).toBe(true)
    expect(store.hasPermission(['school_admin', 'college_admin'])).toBe(false)
  })
})
