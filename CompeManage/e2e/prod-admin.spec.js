// @ts-check
// 管理员全模块页面测试：登录 → 遍历各模块 → 检查渲染与控制台错误
import { test, expect } from 'playwright-test-coverage';
import fs from 'fs';

const PROD = 'https://xkjs.gzhu.edu.cn';
const ADMIN = { user: '900001', pass: 'Pw@yy03' };

let testInfoStore;
test.beforeAll(async ({ browser }) => {
  // 登录一次，保存状态供所有用例复用
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.goto(`${PROD}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.getByPlaceholder('管理员用户名').fill(ADMIN.user);
  await page.getByPlaceholder('密码').fill(ADMIN.pass);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  // 等待跳转离开登录页（hash 路由，轮询 URL）
  for (let i = 0; i < 20; i++) {
    if (!page.url().includes('/login')) break;
    await page.waitForTimeout(1000);
  }
  if (page.url().includes('/login')) throw new Error(`登录失败，仍在登录页: ${page.url()}`);
  fs.mkdirSync('e2e/artifacts', { recursive: true });
  await page.context().storageState({ path: 'e2e/artifacts/admin-state.json' });
  await ctx.close();
});

test.use({ storageState: 'e2e/artifacts/admin-state.json' });

// 管理员可访问的模块页面
const PAGES = [
  ['首页', '/home'],
  ['数据看板', '/statistics/dashboard'],
  ['赛事目录', '/competition/list'],
  ['赛事申报', '/competition/declare'],
  ['赛事审核', '/competition/audit'],
  ['报名审核', '/register/audit'],
  ['作品审核', '/register/work-audit'],
  ['获奖列表', '/award/list'],
  ['获奖审核', '/award/audit'],
  ['评审管理', '/review'],
  ['通知列表', '/notice/list'],
  ['赛事总结', '/summary/summary-list'],
  ['用户管理', '/permission/users'],
];

for (const [name, path] of PAGES) {
  test(`模块：${name} (${path})`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    // 401/500 等 API 错误也记录
    const apiErrors = [];
    page.on('response', r => {
      if (r.status() >= 400 && r.url().includes('/api/')) apiErrors.push(`${r.status()} ${r.url()}`);
    });

    await page.goto(`${PROD}/#${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // 页面不应崩溃白屏：有内容渲染
    const bodyText = (await page.locator('body').innerText()).trim();
    expect(bodyText.length, '页面内容不应为空').toBeGreaterThan(20);
    expect(bodyText).not.toContain('Cannot read'); // JS 崩溃痕迹

    const slug = path.replace(/\//g, '_');
    await page.screenshot({ path: `e2e/artifacts/admin${slug}.png`, fullPage: true });

    if (errors.length) console.log(`[JS错误] ${name}: ${errors.join(' | ')}`);
    if (apiErrors.length) console.log(`[API错误] ${name}: ${apiErrors.slice(0, 5).join(' | ')}`);
    expect(errors, '页面不应有JS异常').toHaveLength(0);
    expect(apiErrors, 'API请求不应失败').toHaveLength(0);
  });
}
