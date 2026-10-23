// @ts-check
// 最终排查：学生403的完整响应头
import { test } from 'playwright-test-coverage';

const PROD = 'https://xkjs.gzhu.edu.cn';

test('403响应头排查', async ({ page }) => {
  // 登录学生
  await page.goto(`${PROD}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.getByPlaceholder('管理员用户名').fill('900006');
  await page.getByPlaceholder('密码').fill('Pw@yy03');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForTimeout(5000);
  const token = JSON.parse(await page.evaluate(() => JSON.stringify(localStorage))).token;

  // 学生token请求 comp/list，打印全部响应头
  const r = await page.evaluate(async ({ token }) => {
    const resp = await fetch('/api/comp/list?page=1&page_size=10', {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    const headers = {};
    resp.headers.forEach((v, k) => { headers[k] = v; });
    return { status: resp.status, headers, body: (await resp.text()).slice(0, 60) };
  }, { token });
  console.log('状态:', r.status);
  console.log('响应头:', JSON.stringify(r.headers, null, 2));

  // 学生token请求其他接口对比
  for (const ep of ['/api/notice/list?page=1&page_size=10', '/api/college/list']) {
    const r2 = await page.evaluate(async ({ ep, token }) => {
      const resp = await fetch(ep, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      return { status: resp.status, type: resp.headers.get('content-type'), body: (await resp.text()).slice(0, 80) };
    }, { ep, token });
    console.log(`${ep}: ${r2.status} ${r2.type} ${r2.body.replace(/\n/g, '')}`);
  }
});
