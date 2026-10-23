// @ts-check
// 调试登录流程
import { test } from 'playwright-test-coverage';
import fs from 'fs';

const PROD = 'https://xkjs.gzhu.edu.cn';

test('调试登录', async ({ page }) => {
  fs.mkdirSync('e2e/artifacts', { recursive: true });
  page.on('response', r => {
    if (r.url().includes('/api/') && !r.ok()) console.log(`[API ${r.status()}] ${r.request().method()} ${r.url()}`);
  });

  await page.goto(`${PROD}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.waitForTimeout(500);
  await page.getByPlaceholder('管理员用户名').fill('900001');
  await page.getByPlaceholder('密码').fill('Pw@yy03');
  await page.screenshot({ path: 'e2e/artifacts/before-login.png' });
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'e2e/artifacts/after-login.png', fullPage: true });
  console.log(`当前URL: ${page.url()}`);
  const text = (await page.locator('body').innerText()).slice(0, 300).replace(/\n+/g, ' / ');
  console.log(`页面内容: ${text}`);
  // 无论如何保存状态
  await page.context().storageState({ path: 'e2e/artifacts/admin-state.json' });
});
