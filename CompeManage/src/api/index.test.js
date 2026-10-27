import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// 打桩请求层：api 包装层的单测只验证 URL/参数/方法拼装
vi.mock('@/utils/request', () => ({
  get: vi.fn().mockResolvedValue({ code: 200 }),
  post: vi.fn().mockResolvedValue({ code: 200 }),
  put: vi.fn().mockResolvedValue({ code: 200 }),
  del: vi.fn().mockResolvedValue({ code: 200 }),
  request: vi.fn(),
}))
import { get, post, put, del } from '@/utils/request'
import { api } from './index'

const lastUrl = (mock) => mock.mock.calls[0][0]

function runCases(cases) {
  for (const { name, invoke, mock, url } of cases) {
    it(name, async () => {
      await invoke()
      expect(mock).toHaveBeenCalled()
      expect(lastUrl(mock)).toBe(url)
    })
  }
}

beforeEach(() => {
  vi.mocked(get).mockClear().mockResolvedValue({ code: 200 })
  vi.mocked(post).mockClear().mockResolvedValue({ code: 200 })
  vi.mocked(put).mockClear().mockResolvedValue({ code: 200 })
  vi.mocked(del).mockClear().mockResolvedValue({ code: 200 })
})

describe('api 包装层：健康/认证/权限/用户/学院/部门', () => {
  runCases([
    { name: 'health', invoke: () => api.health(), mock: get, url: '/health' },
    { name: 'login', invoke: () => api.login({ u: 1 }), mock: post, url: '/api/login' },
    { name: 'getPermissionList', invoke: () => api.getPermissionList(), mock: get, url: '/api/perm/permission/list' },
    { name: 'getRoleList', invoke: () => api.getRoleList(), mock: get, url: '/api/perm/role/list' },
    { name: 'assignPermissions', invoke: () => api.assignPermissions({ a: 1 }), mock: post, url: '/api/perm/role/assign_perm' },
    { name: 'getAllUsers', invoke: () => api.getAllUsers({ page: 1 }), mock: get, url: '/api/perm/member/list' },
    { name: 'assignUserRole', invoke: () => api.assignUserRole(3, { r: 1 }), mock: put, url: '/api/perm/member/3/role' },
    { name: 'getCollegeList', invoke: () => api.getCollegeList(), mock: get, url: '/api/college/list' },
    { name: 'getDepartmentList', invoke: () => api.getDepartmentList(), mock: get, url: '/api/department/list' },
  ])
})

describe('api 包装层：指导教师获奖填报', () => {
  runCases([
    { name: 'getAdvisorAwards', invoke: () => api.getAdvisorAwards({ p: 1 }), mock: get, url: '/api/award/advisor/list' },
    { name: 'getAwardChanges', invoke: () => api.getAwardChanges(5), mock: get, url: '/api/award/5/changes' },
    { name: 'getAdvisorAwardDetail', invoke: () => api.getAdvisorAwardDetail(5), mock: get, url: '/api/award/advisor/5' },
    { name: 'updateAdvisorAward', invoke: () => api.updateAdvisorAward(5, { x: 1 }), mock: put, url: '/api/award/advisor/5' },
    { name: 'lookupAwardAdvisors', invoke: () => api.lookupAwardAdvisors(['T1']), mock: post, url: '/api/award/advisors/lookup' },
  ])
  it('lookupAwardAdvisors 包装 usernames', async () => {
    await api.lookupAwardAdvisors(['T1', 'T2'])
    expect(post).toHaveBeenCalledWith('/api/award/advisors/lookup', { usernames: ['T1', 'T2'] })
  })
})

describe('api 包装层：竞赛目录/年份', () => {
  runCases([
    { name: 'getCompetitionList', invoke: () => api.getCompetitionList({ p: 1 }), mock: get, url: '/api/comp/list' },
    { name: 'createCompetition', invoke: () => api.createCompetition({ n: 1 }), mock: post, url: '/api/comp/create' },
    { name: 'batchImportCompetition', invoke: () => api.batchImportCompetition({ rows: [] }), mock: post, url: '/api/comp/batch-import' },
    { name: 'deleteCompetition', invoke: () => api.deleteCompetition(7), mock: del, url: '/api/comp/7' },
    { name: 'batchDeleteCompetition', invoke: () => api.batchDeleteCompetition([1, 2]), mock: post, url: '/api/comp/batch-delete' },
    { name: 'restoreCompetition', invoke: () => api.restoreCompetition(7), mock: put, url: '/api/comp/7/restore' },
    { name: 'getManagerList', invoke: () => api.getManagerList({ q: 1 }), mock: get, url: '/api/comp/manager/list' },
    { name: 'lookupManagersByWorkIds', invoke: () => api.lookupManagersByWorkIds(['T1']), mock: post, url: '/api/comp/manager/lookup-by-work-ids' },
    { name: 'getCompetitionYears', invoke: () => api.getCompetitionYears(), mock: get, url: '/api/comp/years' },
    { name: 'createCompetitionYear', invoke: () => api.createCompetitionYear({ y: 2026 }), mock: post, url: '/api/comp/years' },
    { name: 'updateCompetitionYear', invoke: () => api.updateCompetitionYear(2026, { n: 1 }), mock: put, url: '/api/comp/years/2026' },
    { name: 'deleteCompetitionYear', invoke: () => api.deleteCompetitionYear(2026), mock: del, url: '/api/comp/years/2026' },
    { name: 'getCompetitionDetail', invoke: () => api.getCompetitionDetail(9), mock: get, url: '/api/comp/9' },
    { name: 'updateCompetition', invoke: () => api.updateCompetition(9, { n: 1 }), mock: put, url: '/api/comp/9' },
  ])
})

describe('api 包装层：报名', () => {
  runCases([
    { name: 'saveRegConfig', invoke: () => api.saveRegConfig({ c: 1 }), mock: post, url: '/api/reg/config' },
    { name: 'getRegConfig', invoke: () => api.getRegConfig(3), mock: get, url: '/api/reg/config/get?comp_id=3' },
    { name: 'getRegStatus', invoke: () => api.getRegStatus(3), mock: get, url: '/api/reg/status?comp_id=3' },
    { name: 'submitReg', invoke: () => api.submitReg({ m: 1 }), mock: post, url: '/api/reg/submit' },
    { name: 'resubmitReg', invoke: () => api.resubmitReg({ m: 1 }), mock: put, url: '/api/reg/resubmit' },
    { name: 'reSubmitReg（别名）', invoke: () => api.reSubmitReg({ m: 1 }), mock: put, url: '/api/reg/resubmit' },
    { name: 'getRegList', invoke: () => api.getRegList({ p: 1 }), mock: get, url: '/api/reg/list' },
    { name: 'getWorkAuditCompList', invoke: () => api.getWorkAuditCompList({ p: 1 }), mock: get, url: '/api/reg/work/audit/comp/list' },
    { name: 'getWorkAuditStudentList', invoke: () => api.getWorkAuditStudentList({ p: 1 }), mock: get, url: '/api/reg/work/audit/student/list' },
    { name: 'getRegDetail', invoke: () => api.getRegDetail(11), mock: get, url: '/api/reg/detail?id=11' },
    { name: 'auditReg', invoke: () => api.auditReg({ s: 1 }), mock: put, url: '/api/reg/audit' },
    { name: 'getStudentList', invoke: () => api.getStudentList({ p: 1 }), mock: get, url: '/api/reg/user/list' },
    { name: 'getMyReg', invoke: () => api.getMyReg({ comp_id: 2 }), mock: get, url: '/api/reg/my-reg' },
    { name: 'submitWork', invoke: () => api.submitWork({ w: 1 }), mock: put, url: '/api/reg/work-submit' },
  ])
})

describe('api 包装层：赛事申报', () => {
  runCases([
    { name: 'createDeclare', invoke: () => api.createDeclare({ d: 1 }), mock: post, url: '/api/declare' },
    { name: 'getDeclareDetail', invoke: () => api.getDeclareDetail(4), mock: get, url: '/api/declare/4' },
    { name: 'updateDeclare', invoke: () => api.updateDeclare(4, { d: 1 }), mock: put, url: '/api/declare/4' },
    { name: 'submitDeclare', invoke: () => api.submitDeclare(4), mock: post, url: '/api/declare/4/submit' },
    { name: 'revokeDeclare', invoke: () => api.revokeDeclare(4), mock: post, url: '/api/declare/4/revoke' },
    { name: 'getMyDeclares', invoke: () => api.getMyDeclares({ p: 1 }), mock: get, url: '/api/declare/my/list' },
    { name: 'getMyPendingDeclares', invoke: () => api.getMyPendingDeclares({ p: 1 }), mock: get, url: '/api/declare/my/pending' },
    { name: 'getMyPublishedDeclares', invoke: () => api.getMyPublishedDeclares({ p: 1 }), mock: get, url: '/api/declare/my/published' },
    { name: 'deleteDeclare', invoke: () => api.deleteDeclare(4), mock: del, url: '/api/declare/4' },
    { name: 'getPendingDeclares', invoke: () => api.getPendingDeclares({ p: 1 }), mock: get, url: '/api/declare/pending/list' },
    { name: 'getAuditedDeclares', invoke: () => api.getAuditedDeclares({ p: 1 }), mock: get, url: '/api/declare/audited/list' },
    { name: 'auditDeclare', invoke: () => api.auditDeclare({ a: 1 }), mock: post, url: '/api/declare/audit' },
    { name: 'getAllDeclares', invoke: () => api.getAllDeclares({ p: 1 }), mock: get, url: '/api/declare/all' },
  ])
})

describe('api 包装层：通知', () => {
  runCases([
    { name: 'getNoticeList', invoke: () => api.getNoticeList({ p: 1 }), mock: get, url: '/api/notice/list' },
    { name: 'getNoticeDetail', invoke: () => api.getNoticeDetail(6), mock: get, url: '/api/notice/6' },
    { name: 'updateNotice', invoke: () => api.updateNotice(6, { t: 1 }), mock: put, url: '/api/notice/6' },
    { name: 'publishNotice', invoke: () => api.publishNotice(6), mock: put, url: '/api/notice/6/publish' },
    { name: 'deleteNotice', invoke: () => api.deleteNotice(6), mock: del, url: '/api/notice/6' },
  ])
  it('createNotice 携带 multipart 配置', async () => {
    await api.createNotice({ t: 1 })
    expect(post).toHaveBeenCalledWith('/api/notice/comp/create', { t: 1 }, expect.objectContaining({ headers: expect.any(Object) }))
  })
})

describe('api 包装层：获奖', () => {
  runCases([
    { name: 'getAwardCompList', invoke: () => api.getAwardCompList({ p: 1 }), mock: get, url: '/api/award/list' },
    { name: 'getCompAwards', invoke: () => api.getCompAwards(8), mock: get, url: '/api/award/comp-awards?comp_id=8' },
    { name: 'getAwardTemplate', invoke: () => api.getAwardTemplate(8), mock: get, url: '/api/award/export-template?comp_id=8' },
    { name: 'getMyAwardList', invoke: () => api.getMyAwardList({ p: 1 }), mock: get, url: '/api/award/student/my-awards' },
    { name: 'getAwardAuditList', invoke: () => api.getAwardAuditList({ p: 1 }), mock: get, url: '/api/award/audit/list' },
    { name: 'getAwardAuditDetail', invoke: () => api.getAwardAuditDetail(15), mock: get, url: '/api/award/audit/detail/15' },
    { name: 'passAwardAudit', invoke: () => api.passAwardAudit(15, '2026-01-01'), mock: put, url: '/api/award/audit/15/pass' },
    { name: 'rejectAwardAudit', invoke: () => api.rejectAwardAudit(15, '原因', 't'), mock: put, url: '/api/award/audit/15/reject' },
    { name: 'batchPassAwardAudit', invoke: () => api.batchPassAwardAudit([1], ['t']), mock: put, url: '/api/award/audit/batch/pass' },
    { name: 'batchRejectAwardAudit', invoke: () => api.batchRejectAwardAudit([1], 'r', ['t']), mock: put, url: '/api/award/audit/batch/reject' },
    { name: 'searchCompList', invoke: () => api.searchCompList({ q: 1 }), mock: get, url: '/api/award/comp/list' },
    { name: 'submitAward', invoke: () => api.submitAward({ a: 1 }), mock: post, url: '/api/award/student/supplement' },
    { name: 'exportAwardProjects(空年份)', invoke: () => api.exportAwardProjects(''), mock: get, url: '/api/award/export/projects' },
    { name: 'exportAwardProjects(2026)', invoke: () => api.exportAwardProjects('2026'), mock: get, url: '/api/award/export/projects?year=2026' },
    { name: 'exportAwardStudents(2026)', invoke: () => api.exportAwardStudents('2026'), mock: get, url: '/api/award/export/students?year=2026' },
    { name: 'exportAwardReport(2026)', invoke: () => api.exportAwardReport('2026'), mock: get, url: '/api/award/export/report?year=2026' },
    { name: 'exportAwardReport(空)', invoke: () => api.exportAwardReport(''), mock: get, url: '/api/award/export/report' },
  ])
  it('getTeacherList 强制 role=teacher', async () => {
    await api.getTeacherList({ search: '张', page: 1 })
    expect(get).toHaveBeenCalledWith('/api/reg/user/list', { search: '张', page: 1, role: 'teacher' })
  })
  it('getAwardAdvisorList 强制 role=award_advisor', async () => {
    await api.getAwardAdvisorList({ search: '李' })
    expect(get).toHaveBeenCalledWith('/api/reg/user/list', { search: '李', role: 'award_advisor' })
  })
})

describe('api 包装层：总结/看板/上传/评审', () => {
  runCases([
    { name: 'getSummaryList', invoke: () => api.getSummaryList({ p: 1 }), mock: get, url: '/api/summary/list' },
    { name: 'getSummaryDetail', invoke: () => api.getSummaryDetail(21), mock: get, url: '/api/summary/21' },
    { name: 'saveSummary', invoke: () => api.saveSummary(21, { s: 1 }), mock: post, url: '/api/summary/21' },
    { name: 'getStatisticsDashboard', invoke: () => api.getStatisticsDashboard({ months: 6 }), mock: get, url: '/api/statistics/dashboard' },
    { name: 'getReviewCompList', invoke: () => api.getReviewCompList({ p: 1 }), mock: get, url: '/api/review/comp/list' },
    { name: 'getExpertList', invoke: () => api.getExpertList({ p: 1 }), mock: get, url: '/api/review/expert/list' },
    { name: 'getReviewTaskList', invoke: () => api.getReviewTaskList({ p: 1 }), mock: get, url: '/api/review/task/list' },
    { name: 'assignReviewTask', invoke: () => api.assignReviewTask({ t: 1 }), mock: post, url: '/api/review/task/assign' },
    { name: 'initReviewTasks', invoke: () => api.initReviewTasks({ t: 1 }), mock: post, url: '/api/review/task/init' },
    { name: 'deleteReviewTask', invoke: () => api.deleteReviewTask(31, { x: 1 }), mock: del, url: '/api/review/task/31' },
    { name: 'getReviewProgress', invoke: () => api.getReviewProgress({ p: 1 }), mock: get, url: '/api/review/progress' },
    { name: 'getReviewResultList', invoke: () => api.getReviewResultList({ p: 1 }), mock: get, url: '/api/review/result/list' },
    { name: 'confirmReviewResult', invoke: () => api.confirmReviewResult({ r: 1 }), mock: post, url: '/api/review/result/confirm' },
    { name: 'getMyReviewTasks', invoke: () => api.getMyReviewTasks({ p: 1 }), mock: get, url: '/api/review/my/tasks' },
    { name: 'getMyReviewWorks', invoke: () => api.getMyReviewWorks({ p: 1 }), mock: get, url: '/api/review/my/works' },
    { name: 'getReviewWorkDetail', invoke: () => api.getReviewWorkDetail(41, { x: 1 }), mock: get, url: '/api/review/my/works/41' },
    { name: 'submitReview', invoke: () => api.submitReview({ s: 1 }), mock: post, url: '/api/review/submit' },
    { name: 'updateReview', invoke: () => api.updateReview(41, { s: 1 }), mock: put, url: '/api/review/submit/41' },
  ])
  it('uploadFile 携带 multipart 配置', async () => {
    await api.uploadFile(new FormData())
    expect(post).toHaveBeenCalledWith('/api/upload', expect.any(FormData), expect.objectContaining({ headers: expect.any(Object) }))
  })
})

describe('api.downloadFile', () => {
  const blobUrlSpy = vi.fn(() => 'blob:fake')
  let openSpy

  beforeEach(() => {
    localStorage.setItem('token', 'tk')
    openSpy = vi.fn(() => ({ location: { href: '' }, close: vi.fn() }))
    vi.stubGlobal('open', openSpy)
    URL.createObjectURL = blobUrlSpy
    URL.revokeObjectURL = vi.fn()
    blobUrlSpy.mockClear()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.querySelectorAll('a[download]').forEach((a) => a.remove())
    localStorage.clear()
  })

  it('请求失败：关闭预览窗并抛错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(api.downloadFile('/api/file/download/x', true)).rejects.toThrow('下载失败: 404')
    expect(openSpy).toHaveBeenCalled()
  })

  it('内嵌预览（image/*）：新窗口指向 blob', async () => {
    const win = { location: { href: '' }, close: vi.fn() }
    openSpy.mockReturnValue(win)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'attachment; filename="a.png"' },
      blob: () => Promise.resolve(new Blob(['x'], { type: 'image/png' })),
    }))
    await api.downloadFile('/f', true, '兜底.png')
    expect(win.location.href).toBe('blob:fake')
  })

  it('下载分支（非内嵌类型）：构造 <a download> 并解析 filename*', async () => {
    const win = { location: { href: '' }, close: vi.fn() }
    openSpy.mockReturnValue(win)
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "attachment; filename*=UTF-8''%E6%B5%8B%E8%AF%95.xlsx" },
      blob: () => Promise.resolve(new Blob(['x'], { type: 'application/vnd.ms-excel' })),
    }))
    await api.downloadFile('/f', true)
    expect(clickSpy).toHaveBeenCalled()
    // 锚点在点击后即被移除，从 click 侦听实例上取文件名
    const anchor = clickSpy.mock.instances.at(-1)
    expect(anchor?.getAttribute('download')).toBe('测试.xlsx')
    expect(win.close).toHaveBeenCalled()
  })

  it('强制下载（preview=false）：不开预览窗，取 fallbackName', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => '' },
      blob: () => Promise.resolve(new Blob(['x'], { type: 'application/pdf' })),
    }))
    await api.downloadFile('/f', false, '兜底名.pdf')
    expect(openSpy).not.toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    const anchor = clickSpy.mock.instances.at(-1)
    expect(anchor?.getAttribute('download')).toBe('兜底名.pdf')
  })
})
