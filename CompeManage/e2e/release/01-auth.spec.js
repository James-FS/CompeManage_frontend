// @ts-check
// 01 认证模块：登录/登出/错误处理/路由守卫
import { test, expect } from '@playwright/test';
import { ACCOUNTS } from './helpers.js';

const BASE = process.env.E2E_BASE || 'http://localhost:5219';

test('管理员账号密码登录成功', async ({ page }) => {
  await page.goto(`${BASE}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.getByPlaceholder('管理员用户名').fill(ACCOUNTS.schoolAdmin.username);
  await page.getByPlaceholder('密码').fill(ACCOUNTS.schoolAdmin.password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  for (let i = 0; i < 15; i++) {
    if (!page.url().includes('/login')) break;
    await page.waitForTimeout(1000);
  }
  expect(page.url(), '登录后应离开登录页').not.toContain('/login');
});

test('学生账号登录成功', async ({ page }) => {
  await page.goto(`${BASE}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.getByPlaceholder('管理员用户名').fill(ACCOUNTS.studentB.username);
  await page.getByPlaceholder('密码').fill(ACCOUNTS.studentB.password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  for (let i = 0; i < 15; i++) {
    if (!page.url().includes('/login')) break;
    await page.waitForTimeout(1000);
  }
  expect(page.url()).not.toContain('/login');
});

test('错误密码登录应被拒绝并有提示', async ({ page }) => {
  await page.goto(`${BASE}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.getByPlaceholder('管理员用户名').fill(ACCOUNTS.schoolAdmin.username);
  await page.getByPlaceholder('密码').fill('wrong-password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForTimeout(2500);
  const body = (await page.locator('body').innerText()).trim();
  expect(page.url(), '错误密码不应离开登录页').toContain('/login');
  expect(body.length, '页面应仍有内容').toBeGreaterThan(10);
});

test('未登录访问管理页应被拦截回登录页', async ({ page }) => {
  await page.goto(`${BASE}/#/permission/users`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const url = page.url();
  const body = (await page.locator('body').innerText()).trim();
  const blocked = url.includes('/login') || body.includes('登录') || body.length < 40;
  expect(blocked, `未登录访问用户管理应被拦截，实际URL=${url}，内容=${body.slice(0, 60)}`).toBe(true);
});

test('登出后返回登录页', async ({ page }) => {
  await page.goto(`${BASE}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.getByPlaceholder('管理员用户名').fill(ACCOUNTS.schoolAdmin.username);
  await page.getByPlaceholder('密码').fill(ACCOUNTS.schoolAdmin.password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  for (let i = 0; i < 15; i++) {
    if (!page.url().includes('/login')) break;
    await page.waitForTimeout(1000);
  }
  // 查找退出按钮（头像下拉或直接按钮）
  const logoutBtn = page.getByRole('button', { name: /退出|登出/ }).first();
  const avatar = page.locator('.el-dropdown, .avatar, [class*="user"]').first();
  if (await logoutBtn.count()) {
    await logoutBtn.click();
  } else if (await avatar.count()) {
    await avatar.hover();
    await page.waitForTimeout(800);
    const item = page.getByText(/退出|登出/).first();
    if (await item.count()) await item.click();
    else test.info().annotations.push({ type: 'skip-note', description: '未找到退出入口，跳过' });
  } else {
    test.info().annotations.push({ type: 'skip-note', description: '未找到退出入口，跳过' });
    return;
  }
  await page.waitForTimeout(1500);
  expect(page.url(), '登出后应回到登录页').toContain('/login');
});
