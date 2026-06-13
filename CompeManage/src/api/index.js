import { get, post, put, del } from '@/utils/request'

export const api = {
  // 健康检查
  health: () => get('/health'),

  // ==================== 认证相关 ====================
  // 用户登录
  login: (data) => post('/api/login', data),

  // ==================== 权限相关 ====================
  // 获取所有权限列表
  getPermissionList: () => get('/api/perm/permission/list'),

  // ==================== 角色相关 ====================
  // 获取所有角色列表
  getRoleList: () => get('/api/perm/role/list'),
  // 分配权限给角色
  assignPermissions: (data) => post('/api/perm/role/assign_perm', data),

  // ==================== 学院相关 ====================
  getCollegeList: () => get('/api/college/list'),

  // ==================== 部门相关 ====================
  getDepartmentList: () => get('/api/department/list'),

  // ==================== 竞赛相关 ====================
  getCompetitionList: (params) => get('/api/comp/list', params),
  createCompetition: (data) => post('/api/comp/create', data),
  batchImportCompetition: (data) => post('/api/comp/batch-import', data),
  deleteCompetition: (id) => del(`/api/comp/${id}`),
  batchDeleteCompetition: (ids) => post('/api/comp/batch-delete', { ids }),
  restoreCompetition: (id) => put(`/api/comp/${id}/restore`),
  getManagerList: (params) => get('/api/comp/manager/list', params),
  getCompetitionYears: () => get('/api/comp/years'),
  getCompetitionDetail: (id) => get(`/api/comp/${id}`),
  updateCompetition: (id, data) => put(`/api/comp/${id}`, data),

  // ==================== 报名相关 ====================
  saveRegConfig: (data) => post('/api/reg/config', data),
  getRegConfig: (compID) => get(`/api/reg/config/get?comp_id=${compID}`),
  getRegStatus: (comp_id) => get(`/api/reg/status?comp_id=${comp_id}`),
  submitReg: (data) => post('/api/reg/submit', data),
  resubmitReg: (data) => put('/api/reg/resubmit', data),
  reSubmitReg: (data) => put('/api/reg/resubmit', data),
  getRegList: (params) => get('/api/reg/list', params),
  getWorkAuditCompList: (params) => get('/api/reg/work/audit/comp/list', params),
  getWorkAuditStudentList: (params) => get('/api/reg/work/audit/student/list', params),
  getRegDetail: (id) => get(`/api/reg/detail?id=${id}`),
  auditReg: (data) => put('/api/reg/audit', data),
  getStudentList: (params) => get('/api/reg/user/list', params),

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
  getMyReg: (id) => get(`/api/reg/my-reg`, id),
  submitWork: (data) => put('/api/reg/work-submit', data),
 
  // ==================== 通知相关 ====================
  getNoticeList: (params) => get('/api/notice/list', params),
  getNoticeDetail: (id) => get(`/api/notice/${id}`),
  createNotice: (data) => post('/api/notice/comp/create', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateNotice: (id, data) => put(`/api/notice/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  publishNotice: (id) => put(`/api/notice/${id}/publish`),
  deleteNotice: (id) => del(`/api/notice/${id}`),
  // ==================== 获奖相关 ====================
  getAwardCompList: (params) => get('/api/award/list', params),
  getCompAwards: (comp_id) => get(`/api/award/comp-awards?comp_id=${comp_id}`),
  getAwardTemplate: (comp_id) => get(`/api/award/export-template?comp_id=${comp_id}`, {}, { responseType: 'blob' }),
  getAwardCompList:(params) => get('/api/award/list', params),
  getCompAwards:(comp_id) => get(`/api/award/comp-awards?comp_id=${comp_id}`),
  getMyAwardList:(params) => get('/api/award/student/my-awards', params),
  getAwardAuditList: (params) => get('/api/award/audit/list', params),
  getAwardAuditDetail: (id) => get(`/api/award/audit/detail/${id}`),
  passAwardAudit: (id) => put(`/api/award/audit/${id}/pass`),
  rejectAwardAudit: (id, reason) => put(`/api/award/audit/${id}/reject`, { reason }),
  batchPassAwardAudit: (ids) => put('/api/award/audit/batch/pass', { ids }),
  batchRejectAwardAudit: (ids, reason) => put('/api/award/audit/batch/reject', { ids, reason }),
  searchCompList: (params) => get('/api/award/comp/list', params),
  submitAward: (data) => post('/api/award/student/supplement', data),

  // ==================== 赛事总结相关 ====================
  getSummaryList: (params) => get('/api/summary/list', params),
  getSummaryDetail: (id) => get(`/api/summary/${id}`),
  saveSummary: (id, data) => post(`/api/summary/${id}`, data),

  // ==================== 数据看板相关 ====================
  getStatisticsDashboard: (params) => get('/api/statistics/dashboard', params),

  // ==================== 通用上传 ====================
  uploadFile: (data) => post('/api/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // ==================== 专家评审相关 ====================
  // 管理员
  getReviewCompList: (params) => get('/api/review/comp/list', params),
  getExpertList: (params) => get('/api/review/expert/list', params),
  getReviewTaskList: (params) => get('/api/review/task/list', params),
  assignReviewTask: (data) => post('/api/review/task/assign', data),
  initReviewTasks: (data) => post('/api/review/task/init', data),
  deleteReviewTask: (id, params) => del(`/api/review/task/${id}`, params),
  getReviewProgress: (params) => get('/api/review/progress', params),
  getReviewResultList: (params) => get('/api/review/result/list', params),
  confirmReviewResult: (data) => post('/api/review/result/confirm', data),
  // 专家
  getMyReviewTasks: (params) => get('/api/review/my/tasks', params),
  getMyReviewWorks: (params) => get('/api/review/my/works', params),
  getReviewWorkDetail: (regId, params) => get(`/api/review/my/works/${regId}`, params),
  submitReview: (data) => post('/api/review/submit', data),
  updateReview: (id, data) => put(`/api/review/submit/${id}`, data),

  // ==================== 文件下载/预览（受控接口，带 Bearer Token）====================
  // url 是后端返回的 /api/file/download/<type>/<md5>_<name> 格式
  // preview=true 走内嵌（图片/PDF 浏览器内打开，docx 等不可内嵌类型仍下载）
  // preview=false 强制下载，文件名取自 Content-Disposition
  // fallbackName 是后端拿不到文件名时的兜底
  downloadFile: async (url, preview = true, fallbackName = '') => {
    const fullUrl = url
    const token = localStorage.getItem('token')

    // 先同步打开窗口，避免异步 fetch 后浏览器拦截弹窗
    const previewWindow = preview ? window.open('', '_blank') : null

    const res = await fetch(fullUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      if (previewWindow) previewWindow.close()
      throw new Error(`下载失败: ${res.status}`)
    }

    const disp = res.headers.get('Content-Disposition') || ''
    const match = /filename\*?=(?:UTF-8'')?([^;]+)/i.exec(disp)
    let fileName = fallbackName
    if (match) {
      fileName = decodeURIComponent(match[1].replace(/^"|"$/g, '').trim())
    }

    const blob = await res.blob()
    const canInline = /^(image\/|application\/pdf)/i.test(blob.type)

    if (preview && canInline) {
      const blobUrl = URL.createObjectURL(blob)
      if (previewWindow) {
        previewWindow.location.href = blobUrl
      } else {
        window.open(blobUrl, '_blank')
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } else {
      if (previewWindow) previewWindow.close()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    }
  },
}

export default api
