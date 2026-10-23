// @ts-check
// 检查浏览器请求的完整响应细节
import { test } from 'playwright-test-coverage';

const PROD = 'https://xkjs.gzhu.edu.cn';

test('响应细节排查', async ({ page }) => {
  await page.goto(`${PROD}/#/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.context().clearCookies();

  const r = await page.evaluate(async () => {
    const resp = await fetch('https://xkjs.gzhu.edu.cn/api/college/list', { cache: 'no-store' });
    const t = await resp.text();
    const headers = {};
    resp.headers.forEach((v, k) => { headers[k] = v; });
    return { url: resp.url, status: resp.status, headers, body: t.slice(0, 100) };
  });
  console.log('最终URL:', r.url);
  console.log('状态:', r.status);
  console.log('响应头:', JSON.stringify(r.headers, null, 2));
  console.log('响应体:', r.body.replace(/\n/g, ' '));

  // 检查是否有 service worker
  const swState = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return '不支持';
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length ? `有${regs.length}个SW: ${regs.map(r => r.scope).join(', ')}` : '无SW';
  });
  console.log('Service Worker:', swState);
});
