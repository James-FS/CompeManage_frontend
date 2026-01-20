import { get, post, put, del } from '@/utils/request'

export const api = {
  // 健康检查
  health: () => get('/health'),

  // ==================== 认证相关 ====================
  // 用户登录
  login: (data) => post('/api/login', data),

  // ==================== 权限相关 ====================
  // 获取所有权限列表
  getPermissionList: () => get('/api/permission/list'),

  // ==================== 角色相关 ====================
  // 获取所有角色列表
  getRoleList: () => get('/api/role/list'),
  // 分配权限给角色
  assignPermissions: (data) => post('/api/role/assign_perm', data),

}

export default api
