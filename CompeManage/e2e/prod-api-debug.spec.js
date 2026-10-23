// @ts-check
// 提取 token 并直接调用 API 对比学生/管理员权限
import { test } from 'playwright-test-coverage';

const PROD = 'https://xkjs.gzhu.edu.cn';

test('提取token并测API', async ({ page }) => {
  // 学生登录
  await page.goto(`${PROD}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.getByPlaceholder('管理员用户名').fill('900006');
  await page.getByPlaceholder('密码').fill('Pw@yy03');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForTimeout(5000);

  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  console.log('STUDENT_LOCALSTORAGE:', storage);

  // 用学生 token 请求 comp/list
  const token = JSON.parse(storage).token || '';
  const resp = await page.evaluate(async ({ token }) => {
    const r = await fetch('/api/comp/list?page=1&page_size=10', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await r.text();
    return { status: r.status, contentType: r.headers.get('content-type'), body: text.slice(0, 300) };
  }, { token });
  console.log('STUDENT comp/list:', JSON.stringify(resp));
});
