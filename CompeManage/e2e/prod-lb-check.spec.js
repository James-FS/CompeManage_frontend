// @ts-check
// 浏览器内重复请求检查负载均衡稳定性
import { test } from 'playwright-test-coverage';

const PROD = 'https://xkjs.gzhu.edu.cn';

test('负载均衡稳定性', async ({ page }) => {
  await page.goto(`${PROD}/#/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const cookies = await page.context().cookies();
  console.log('Cookies:', cookies.map(c => `${c.name}=${c.value.slice(0, 20)}`).join('; ') || '无');

  // 清除 cookie 再测
  await page.context().clearCookies();
  console.log('--- 清除Cookie后 ---');
  for (let i = 0; i < 10; i++) {
    const r = await page.evaluate(async () => {
      const resp = await fetch('/api/college/list', { cache: 'no-store' });
      const t = await resp.text();
      return { status: resp.status, type: resp.headers.get('content-type'), body: t.slice(0, 60) };
    });
    console.log(`#${i + 1}: ${r.status} ${r.type} ${r.body.replace(/\n/g, '')}`);
    await page.waitForTimeout(300);
  }
});
