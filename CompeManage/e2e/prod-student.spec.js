// @ts-check
// 学生角色测试：登录 + 学生可访问页面
import { test, expect } from 'playwright-test-coverage';
import fs from 'fs';

const PROD = 'https://xkjs.gzhu.edu.cn';
const STUDENT = { user: '900006', pass: 'Pw@yy03' };

let loginOk = false;
test.beforeAll(async ({ browser }) => {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.goto(`${PROD}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.getByPlaceholder('管理员用户名').fill(STUDENT.user);
  await page.getByPlaceholder('密码').fill(STUDENT.pass);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  for (let i = 0; i < 20; i++) {
    if (!page.url().includes('/login')) { loginOk = true; break; }
    await page.waitForTimeout(1000);
  }
  if (loginOk) {
    fs.mkdirSync('e2e/artifacts', { recursive: true });
    await page.context().storageState({ path: 'e2e/artifacts/student-state.json' });
  }
  await ctx.close();
});

test.use({ storageState: 'e2e/artifacts/student-state.json' });

test('学生登录成功', async () => {
  expect(loginOk, '学生账号应能登录').toBe(true);
});

// 学生可访问页面
const PAGES = [
  ['首页', '/home'],
  ['赛事列表', '/competition/list'],
  ['报名页面', '/register'],
  ['我的作品', '/register/work'],
  ['我的获奖', '/award/student'],
];

for (const [name, path] of PAGES) {
  test(`学生页面：${name} (${path})`, async ({ page }) => {
    test.skip(!loginOk, '学生登录失败，跳过');
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    const apiErrors = [];
    page.on('response', r => {
      if (r.status() >= 400 && r.url().includes('/api/')) apiErrors.push(`${r.status()} ${r.url()}`);
    });
    // 已知良性 403：学生无 declare:list 权限，首页"我的待办"调用 /api/declare/my/pending
    // 必然 403，但前端 home.vue 已 try/catch 兜底显示 0，页面功能正常（待学长优化）
    const KNOWN_BENIGN = ['/api/declare/my/pending'];

    await page.goto(`${PROD}/#${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const bodyText = (await page.locator('body').innerText()).trim();
    expect(bodyText.length, '页面内容不应为空').toBeGreaterThan(20);

    const slug = path.replace(/\//g, '_');
    await page.screenshot({ path: `e2e/artifacts/student${slug}.png`, fullPage: true });

    if (errors.length) console.log(`[JS错误] ${name}: ${errors.join(' | ')}`);
    const realErrors = apiErrors.filter(e => !KNOWN_BENIGN.some(p => e.includes(p)));
    if (apiErrors.length) console.log(`[API错误] ${name}: ${apiErrors.slice(0, 5).join(' | ')}`);
    expect(errors, '页面不应有JS异常').toHaveLength(0);
    expect(realErrors, 'API请求不应失败').toHaveLength(0);
  });
}
