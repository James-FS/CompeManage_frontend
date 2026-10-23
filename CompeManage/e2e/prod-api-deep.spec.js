// @ts-check
// 深入排查学生 403：多个接口、重复请求
import { test } from 'playwright-test-coverage';

const PROD = 'https://xkjs.gzhu.edu.cn';
const STUDENT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxNCwidXNlcm5hbWUiOiI5MDAwMDYiLCJyb2xlX2NvZGUiOiJzdHVkZW50IiwiaXNzIjoiY29tcGVfYmFja2VuZCIsImV4cCI6MTc4OTU0MjE4MiwiaWF0IjoxNzg5NDU1NzgyfQ.6F9pI6zckx5yEFzsHE53dH6yOsqHEtWJ1NE6ebhAK0s';

test('多接口排查', async ({ page }) => {
  await page.goto(`${PROD}/#/home`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const endpoints = [
    '/api/comp/list?page=1&page_size=10',
    '/api/notice/list?page=1&page_size=10',
    '/api/award/student/my-awards',
    '/api/college/list',
  ];
  for (const ep of endpoints) {
    for (let i = 0; i < 2; i++) {
      const r = await page.evaluate(async ({ ep, token }) => {
        const resp = await fetch(ep, { headers: { Authorization: `Bearer ${token}` } });
        return { status: resp.status, type: resp.headers.get('content-type'), body: (await resp.text()).slice(0, 80) };
      }, { ep, token: STUDENT_TOKEN });
      console.log(`#${i + 1} ${ep}: ${r.status} ${r.type} ${r.body.replace(/\n/g, '')}`);
    }
  }
});
