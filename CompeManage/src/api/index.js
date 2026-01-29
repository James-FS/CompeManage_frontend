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
  getRegStatus: (comp_id) => get(`/api/reg/status?comp_id=${comp_id}`),
  submitReg:(data) => post('/api/reg/submit', data),
  reSubmitReg:(data) => put('/api/reg/resubmit', data),
  getRegList:(params) => get('/api/reg/list', params),
  getRegDetail:(id) => get(`/api/reg/detail?id=${id}`),
  auditReg:(data) => put('/api/reg/audit', data),

  // ==================== 赛事申报相关 ====================
  // 院级申报
  createDeclare: (data) => post('/api/declare', data),
  getDeclareDetail: (id) => get(`/api/declare/${id}`),
  updateDeclare: (id, data) => put(`/api/declare/${id}`, data),
  submitDeclare: (id) => post(`/api/declare/${id}/submit`),
  revokeDeclare: (id) => post(`/api/declare/${id}/revoke`),
  getMyDeclares: (params) => get('/api/declare/my/list', params),
  getMyPendingDeclares: (params) => get('/api/declare/my/pending', params),
  getMyPublishedDeclares: (params) => get('/api/declare/my/published', params),
  deleteDeclare: (id) => del(`/api/declare/${id}`),
  // 校级审核
  getPendingDeclares: (params) => get('/api/declare/pending/list', params),
  getAuditedDeclares: (params) => get('/api/declare/audited/list', params),
  auditDeclare: (data) => post('/api/declare/audit', data),
  getAllDeclares: (params) => get('/api/declare/all', params),

  //==================== 报名相关 ====================
  getMyReg:(id) => get(`/api/reg/my-reg`,id),
  submitWork:(data) => put('/api/reg/work-submit', data),
  // ==================== 通知相关 ====================

  // ==================== 获奖相关 ====================
  getAwardCompList:(params) => get('/api/award/list', params),
  getCompAwards:(comp_id) => get(`/api/award/comp-awards?comp_id=${comp_id}`),
  getAwardTemplate:(comp_id) => get(`/api/award/export-template?comp_id=${comp_id}`, {},{ responseType: 'blob' }),
}

export default api
