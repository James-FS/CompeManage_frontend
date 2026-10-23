// @ts-check
// 对比管理员/学生 token 请求同一接口
import { test } from 'playwright-test-coverage';

const PROD = 'https://xkjs.gzhu.edu.cn';
const ADMIN_TOKEN = ''; // 填入后运行

test('对比API权限', async ({ page }) => {
  // 管理员登录拿 token
  await page.goto(`${PROD}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.getByPlaceholder('管理员用户名').fill('900001');
  await page.getByPlaceholder('密码').fill('Pw@yy03');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForTimeout(5000);
  const adminStorage = JSON.parse(await page.evaluate(() => JSON.stringify(localStorage)));
  const adminToken = adminStorage.token;

  // 无 token 请求
  const noToken = await page.evaluate(async () => {
    const r = await fetch('/api/comp/list?page=1&page_size=10');
    return { status: r.status, type: r.headers.get('content-type'), body: (await r.text()).slice(0, 120) };
  });
  console.log('无token:', JSON.stringify(noToken));

  // 管理员 token 请求
  const admin = await page.evaluate(async ({ token }) => {
    const r = await fetch('/api/comp/list?page=1&page_size=10', { headers: { Authorization: `Bearer ${token}` } });
    return { status: r.status, type: r.headers.get('content-type'), body: (await r.text()).slice(0, 120) };
  }, { token: adminToken });
  console.log('管理员token:', JSON.stringify(admin));

  // 学生 token（之前提取的）
  const studentToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxNCwidXNlcm5hbWUiOiI5MDAwMDYiLCJyb2xlX2NvZGUiOiJzdHVkZW50IiwiaXNzIjoiY29tcGVfYmFja2VuZCIsImV4cCI6MTc4OTU0MjE4MiwiaWF0IjoxNzg5NDU1NzgyfQ.6F9pI6zckx5yEFzsHE53dH6yOsqHEtWJ1NE6ebhAK0s';
  const student = await page.evaluate(async ({ token }) => {
    const r = await fetch('/api/comp/list?page=1&page_size=10', { headers: { Authorization: `Bearer ${token}` } });
    return { status: r.status, type: r.headers.get('content-type'), body: (await r.text()).slice(0, 120) };
  }, { token: studentToken });
  console.log('学生token:', JSON.stringify(student));
});
