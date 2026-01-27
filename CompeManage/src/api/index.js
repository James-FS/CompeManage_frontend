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
  createCompetition: (data) => post('/api/comp/create', data),
  batchImportCompetition: (data) => post('/api/comp/batch-import', data),
  deleteCompetition: (id) => del(`/api/comp/${id}`),
  batchDeleteCompetition: (ids) => post('/api/comp/batch-delete', { ids }),
  restoreCompetition: (id) => put(`/api/comp/${id}/restore`),
  getManagerList: (params) => get('/api/comp/manager/list', params),
  getCompetitionYears: () => get('/api/comp/years'),

  // ==================== 报名相关 ====================
  saveRegConfig: (data) => post('/api/reg/config', data),
  getRegConfig: (compID) => get(`/api/reg/config/get?comp_id=${compID}`),
}

export default api
