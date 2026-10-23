// @ts-check
// 探测管理员登录流程
import { test, expect } from 'playwright-test-coverage';

const PROD = 'https://xkjs.gzhu.edu.cn';

test('探测登录流程', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(`${PROD}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // 点击"管理员账号登录"切换到账号密码表单
  await page.getByRole('button', { name: /管理员账号登录/ }).click();
  await page.waitForTimeout(1500);

  const inputs = await page.locator('input:visible').all();
  console.log(`可见输入框数量: ${inputs.length}`);
  for (const input of inputs) {
    console.log(`  input: type=${await input.getAttribute('type')} placeholder=${await input.getAttribute('placeholder')}`);
  }
  const buttons = await page.locator('button:visible').all();
  for (const b of buttons) {
    console.log(`  button: ${JSON.stringify((await b.textContent())?.trim())}`);
  }
  await page.screenshot({ path: 'e2e/artifacts/02-admin-login-form.png', fullPage: true });
  console.log(`控制台错误: ${errors.length ? errors.join(' | ') : '无'}`);
});
