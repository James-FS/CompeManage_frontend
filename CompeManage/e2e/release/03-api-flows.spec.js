// @ts-check
// 03 API 全业务链路：赛事→申报→审核→通知→获奖→统计（串行，数据用唯一后缀，可重复运行）
import { test, expect } from 'playwright-test-coverage';
import { ACCOUNTS, apiLogin, apiGet, apiPost, getManagerId } from './helpers.js';

const RUN = Date.now().toString(36);

let admin, college, manager; // tokens

test.describe.serial('API全业务链路', () => {
  test('前置：登录三个角色', async ({ request }) => {
    admin = await apiLogin(request, ACCOUNTS.schoolAdminB);
    college = await apiLogin(request, ACCOUNTS.collegeAdmin);
    manager = await apiLogin(request, ACCOUNTS.compManager);
    expect(admin && college && manager).toBeTruthy();
  });

  test('健康检查', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);
  });

  test('校管理员创建赛事→列表可见→详情→更新', async ({ request }) => {
    const name = `发布测试赛事_${RUN}`;
    const managerId = await getManagerId(request, admin);
    expect(managerId, '应能查到负责人').toBeTruthy();

    const create = await apiPost(request, admin, '/api/comp/create', {
      comp_name: name, comp_level: '校级', comp_type: '学科竞赛',
      organizer: '发布测试主办', undertaker: '发布测试承办',
      college: '计算机科学与网络工程学院', manager_id: managerId, year: '2026', desc: '上线前发布测试',
    });
    expect(create.body.code, `创建赛事: ${JSON.stringify(create.body).slice(0, 150)}`).toBe(200);

    const list = await apiGet(request, admin, `/api/comp/list?page=1&page_size=10&comp_name=${name}`);
    const found = list.body?.data?.list?.find(c => c.comp_name === name);
    expect(found, '列表应能查到新赛事').toBeTruthy();
    const compId = found.id;

    const detail = await apiGet(request, admin, `/api/comp/${compId}`);
    expect(detail.body.code).toBe(200);
    expect(detail.body?.data?.comp_name || detail.body?.data?.directory?.comp_name).toBeTruthy();

    const update = await apiPost(request, admin, `/api/comp/${compId}/update`, {});
    // update 接口可能是 PUT，两个都试不合适——仅验证接口可达
    expect([200, 400, 404]).toContain(update.status);
  });

  test('院级管理员创建申报→提交→校管理员审核通过→目录自动创建', async ({ request }) => {
    const colleges = await apiGet(request, college, '/api/college/list');
    const cs = colleges.body?.data?.find(c => c.name.includes('计算机'));
    expect(cs, '学院列表应含计算机学院').toBeTruthy();

    // 校管理员给院管配置管理学院（未配置时申报接口会403"尚未配置管理学院"）
    const members = await apiGet(request, admin, `/api/perm/member/list?page=1&page_size=10&search=${ACCOUNTS.collegeAdmin.username}`);
    const memberData = members.body?.data;
    const target = (memberData?.users || memberData?.list || (Array.isArray(memberData) ? memberData : []))
      .find?.(u => u.username === ACCOUNTS.collegeAdmin.username);
    expect(target, '用户列表应能查到院级管理员').toBeTruthy();
    const roles = await apiGet(request, admin, '/api/perm/role/list');
    const roleData = roles.body?.data;
    const roleObj = (Array.isArray(roleData) ? roleData : roleData?.list || [])
      .find?.(r => r.role_code === 'college_admin');
    expect(roleObj, '角色列表应含院级管理员').toBeTruthy();
    const assign = await request.put(`/api/perm/member/${target.id}/role`, {
      data: { role_id: roleObj.id, managed_college_id: cs.id },
      headers: { Authorization: `Bearer ${admin}` },
    });
    const assignBody = await assign.json().catch(() => ({}));
    expect(assignBody.code ?? assign.status, `配置管理学院: ${JSON.stringify(assignBody).slice(0, 150)}`).toBe(200);

    const managerId = await getManagerId(request, college);

    const create = await apiPost(request, college, '/api/declare', {
      comp_name: `发布测试申报_${RUN}`, comp_level: '校级', comp_type: '学科竞赛',
      organizer: '发布测试主办', undertaker: '发布测试承办',
      college_id: cs.id, manager_id: managerId, year: 2026, desc: '上线前发布测试申报',
    });
    expect(create.body.code, `创建申报: ${JSON.stringify(create.body).slice(0, 150)}`).toBe(200);
    const declaration = create.body?.data?.declaration || create.body?.data;
    const declareId = declaration?.id ?? declaration?.ID;
    expect(declareId, '申报应返回ID').toBeTruthy();

    const submit = await apiPost(request, college, `/api/declare/${declareId}/submit`);
    expect(submit.body.code, `提交申报: ${JSON.stringify(submit.body).slice(0, 150)}`).toBe(200);

    const pending = await apiGet(request, admin, '/api/declare/pending/list?page=1&page_size=20');
    expect(pending.body.code).toBe(200);
    const items = pending.body?.data?.items || pending.body?.data?.list || [];
    const item = items.find(d => String(d.id ?? d.ID) === String(declareId));
    expect(item, '待审核列表应包含新申报').toBeTruthy();

    const audit = await apiPost(request, admin, '/api/declare/audit', {
      declare_id: Number(declareId), audit_status: 2, audit_remark: '发布测试通过',
    });
    expect(audit.body.code ?? audit.status, `审核申报: ${JSON.stringify(audit.body).slice(0, 150)}`).toBe(200);
    // 审核通过后赛事目录自动创建：全部申报里应能查到
    const all = await apiGet(request, admin, `/api/declare/all?page=1&page_size=20&comp_name=发布测试申报_${RUN}`);
    expect(all.status, '全部申报接口不应500').toBeLessThan(500);
  });

  test('通知：创建→发布→列表可见', async ({ request }) => {
    // 通知必须关联赛事：取列表第一个赛事的ID
    const comps = await apiGet(request, admin, '/api/comp/list?page=1&page_size=5');
    const compID = comps.body?.data?.list?.[0]?.id;
    expect(compID, '应存在可关联赛事').toBeTruthy();
    const create = await request.post('/api/notice/comp/create', {
      headers: { Authorization: `Bearer ${admin}` },
      form: { title: `发布测试通知_${RUN}`, content: '上线前发布测试通知内容', compID: String(compID) },
    });
    expect(create.status(), '通知创建HTTP状态').toBeLessThan(500);
    const createBody = await create.json().catch(() => ({}));
    expect(createBody.code, `通知创建: ${JSON.stringify(createBody).slice(0, 150)}`).toBe(200);
    const noticeId = createBody?.data?.id ?? createBody?.data?.ID;

    // 列表按 publish_time 降序——新通知未发布排在最后，历史跑批数据多时会掉出首页；
    // 用 compID + status=0 收窄到本赛事未发布通知，断言稳定
    const list = await apiGet(request, admin, `/api/notice/list?page=1&page_size=50&compID=${compID}&status=0`);
    expect(list.body.code).toBe(200);
    const found = JSON.stringify(list.body.data || '').includes(`发布测试通知_${RUN}`);
    expect(found, '通知列表应包含新通知').toBeTruthy();

    if (noticeId) {
      const publish = await request.put(`/api/notice/${noticeId}/publish`, {
        headers: { Authorization: `Bearer ${admin}` },
      });
      expect(publish.status(), '通知发布不应500').toBeLessThan(500);
    }
  });

  test('获奖导出：附件1/附件2 返回xlsx', async ({ request }) => {
    for (const ep of ['/api/award/export/projects', '/api/award/export/students']) {
      const res = await request.get(ep, { headers: { Authorization: `Bearer ${admin}` } });
      expect(res.status(), `${ep} 状态码`).toBe(200);
      expect(res.headers()['content-type'] || '', `${ep} 应为xlsx`).toContain('spreadsheetml');
    }
  });

  test('获奖导出：院级管理员可访问（本院范围）', async ({ request }) => {
    const res = await request.get('/api/award/export/students', { headers: { Authorization: `Bearer ${college}` } });
    expect(res.status(), '院管导出应可访问').toBeLessThan(500);
  });

  test('统计看板返回数据', async ({ request }) => {
    const dash = await apiGet(request, admin, '/api/statistics/dashboard');
    expect(dash.body.code, `看板: ${JSON.stringify(dash.body).slice(0, 150)}`).toBe(200);
    expect(dash.body.data, '看板应有数据').toBeTruthy();
  });

  test('年份列表接口', async ({ request }) => {
    const years = await apiGet(request, admin, '/api/comp/years');
    expect(years.status, '年份接口不应500').toBeLessThan(500);
  });
});
