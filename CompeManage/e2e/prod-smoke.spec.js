// @ts-check
// 生产环境冒烟测试：登录 + 各模块页面加载
const PROD = 'https://xkjs.gzhu.edu.cn';
const ADMIN = { user: '900001', pass: 'Pw@yy03' };

import { test, expect } from 'playwright-test-coverage';

test('登录冒烟测试', async ({ page }) => {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(`${PROD}/#/login?method=password`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'e2e/artifacts/01-login-page.png', fullPage: true });

  // 打印页面关键信息，便于后续编写精确选择器
  const inputs = await page.locator('input').all();
  console.log(`输入框数量: ${inputs.length}`);
  for (const input of inputs) {
    console.log(`  input: type=${await input.getAttribute('type')} placeholder=${await input.getAttribute('placeholder')}`);
  }
  const buttons = await page.locator('button').all();
  console.log(`按钮数量: ${buttons.length}`);
  for (const b of buttons) {
    console.log(`  button: ${JSON.stringify(await b.textContent())}`);
  }
  console.log(`页面标题: ${await page.title()}`);
  console.log(`控制台错误: ${errors.length ? errors.join(' | ') : '无'}`);
});
