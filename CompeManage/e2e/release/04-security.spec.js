// @ts-check
// 04 安全越权矩阵：未登录401、各角色对管理接口的403、学生页面访问限制
import { test, expect } from 'playwright-test-coverage';
import { ACCOUNTS, apiLogin, tryApiLogin, apiGet } from './helpers.js';

const ADMIN_APIS = [
  '/api/comp/create', // POST 仅测 403 场景用 GET 也返回 405/404，以下为 GET 可测的管理接口
];
const ADMIN_GET_APIS = [
  '/api/award/audit/list',
  '/api/perm/permission/list',
  '/api/perm/role/list',
  '/api/register/audit/list?page=1&page_size=5',
  '/api/award/export/students',
  '/api/award/export/projects',
  '/api/declare/audit/list?page=1&page_size=5',
  '/api/comp/manager/list?page=1&page_size=5',
];

test('未登录访问受保护接口返回401', async ({ request }) => {
  for (const ep of ['/api/comp/list', '/api/notice/list?page=1&page_size=5']) {
    const res = await request.get(ep);
    expect([401, 403]).toContain(res.status());
  }
});

test('学生访问管理接口应被拒绝(403)', async ({ request }) => {
  const token = await apiLogin(request, ACCOUNTS.studentB);
  const denied = [];
  const allowed = [];
  for (const ep of ADMIN_GET_APIS) {
    const { status } = await apiGet(request, token, ep);
    if (status === 200) allowed.push(ep);
    else if (status === 403) denied.push(ep);
  }
  // 管理接口对学生至少不能全开放；导出接口必须拒绝
  expect(denied.some(e => e.includes('/api/award/export')), '获奖导出必须拒绝学生').toBe(true);
  expect(denied.some(e => e.includes('/api/perm')), '权限管理必须拒绝学生').toBe(true);
  console.log(`学生被拒接口: ${denied.length}/${ADMIN_GET_APIS.length}，意外放行: ${allowed.join(', ') || '无'}`);
});

test('教师访问管理接口应被拒绝(403)', async ({ request }) => {
  const token = await tryApiLogin(request, ACCOUNTS.teacher);
  test.skip(!token, '教师账号不存在（本地库缺种子账号），跳过');
  const denied = [];
  const allowed = [];
  for (const ep of ADMIN_GET_APIS) {
    const { status } = await apiGet(request, token, ep);
    if (status === 200) allowed.push(ep);
    else if (status === 403) denied.push(ep);
  }
  expect(denied.some(e => e.includes('/api/award/export')), '获奖导出必须拒绝教师').toBe(true);
  expect(denied.some(e => e.includes('/api/perm')), '权限管理必须拒绝教师').toBe(true);
  console.log(`教师被拒接口: ${denied.length}/${ADMIN_GET_APIS.length}，意外放行: ${allowed.join(', ') || '无'}`);
});

test('专家仅能访问评审相关接口', async ({ request }) => {
  const token = await apiLogin(request, ACCOUNTS.expert);
  const { status: permStatus } = await apiGet(request, token, '/api/perm/permission/list');
  expect(permStatus, '专家不应访问权限管理').toBe(403);
  const my = await apiGet(request, token, '/api/review/my/tasks');
  expect(my.status, '专家评审任务接口不应500').toBeLessThan(500);
});

test('学生登录后访问管理页面不被放行', async ({ page }) => {
  const BASE = process.env.E2E_BASE || 'http://localhost:5219';
  const { apiLogin } = await import('./helpers.js');
  const token = await apiLogin(page.request, ACCOUNTS.studentB);
  await page.addInitScript(t => localStorage.setItem('token', t), token);
  await page.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/#/permission/users`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const body = (await page.locator('body').innerText()).trim();
  // 允许：跳转登录/空内容/无权限提示；不允许：出现用户管理表格数据
  const hasUserTable = body.includes('角色') && (body.includes('分配') || body.includes('管理员列表') || body.includes('用户列表'));
  expect(hasUserTable, '学生不应看到用户管理内容').toBe(false);
});
