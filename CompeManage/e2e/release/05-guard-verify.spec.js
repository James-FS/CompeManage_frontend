// @ts-check
// 验证学生视角的管理页面拦截（补 roles 后）+ 管理员不受影响
import { test, expect } from 'playwright-test-coverage';

const BASE = 'http://localhost:5219';

async function login(page, username, password) {
  await page.goto(`${BASE}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.getByPlaceholder('管理员用户名').fill(username);
  await page.getByPlaceholder('密码').fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  for (let i = 0; i < 15; i++) {
    if (!page.url().includes('/login')) break;
    await page.waitForTimeout(1000);
  }
}

test('学生访问获奖管理页面被拦截且不再出现"加载列表失败"', async ({ page }) => {
  test.setTimeout(120000);
  await login(page, '900006', 'Pw@yy03');
  const cases = [
    ['/award/list', '校赛填报'],
    ['/award/audit', '填报审核'],
    ['/award/audit/detail/8', '审核详情'],
    ['/award/import/3', '导入名单'],
  ];
  for (const [path, label] of cases) {
    await page.goto(`${BASE}/#${path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const body = (await page.locator('body').innerText()).trim();
    const url = page.url();
    // 守卫应已把人留在 /home 或上一页，而不是停在目标管理页
    expect(url, `${label}: 学生应被守卫拦截，实际停在 ${url}`).not.toContain(path.replace(/\/\d+$/, ''));
    expect(body, `${label}: 不应出现"加载列表失败"`).not.toContain('加载列表失败');
    console.log(`✓ ${label} → 拦截于 ${url}`);
  }
});

test('管理员访问获奖管理页面不受影响', async ({ page }) => {
  test.setTimeout(120000);
  await login(page, '900001', 'Pw@yy03');
  await page.goto(`${BASE}/#/award/list`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const body = (await page.locator('body').innerText()).trim();
  expect(page.url()).toContain('/award/list');
  expect(body.length, '管理员校赛填报页应正常渲染').toBeGreaterThan(30);
  expect(body).not.toContain('加载列表失败');
  console.log('✓ 管理员校赛填报页正常');
});
