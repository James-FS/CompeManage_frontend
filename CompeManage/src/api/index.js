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

  // ==================== 学院相关 ====================
  getCollegeList: () => get('/api/college/list'),

  // ==================== 竞赛相关 ====================
  getCompetitionList: (params) => get('/api/comp/list',params),

  // ==================== 报名相关 ====================
  saveRegConfig: (data) => post('/api/reg/config', data),
  getRegConfig: (compID) => get(`/api/reg/config/get?comp_id=${compID}`),
  getRegStatus: (comp_id) => get(`/api/reg/status?comp_id=${comp_id}`),
  submitReg:(data) => post('/api/reg/submit', data),
  reSubmitReg:(data) => put('/api/reg/resubmit', data),
  getRegList:(params) => get('/api/reg/list', params),
  getRegDetail:(id) => get(`/api/reg/detail?id=${id}`),
  auditReg:(data) => put('/api/reg/audit', data),
  
  // ==================== 通知相关 ====================
}

export default api
