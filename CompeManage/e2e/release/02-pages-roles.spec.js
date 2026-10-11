// @ts-check
// 02 多角色页面冒烟：每个角色可访问的核心页面，检查渲染/JS异常/API失败
import { test, expect } from '@playwright/test';
import { ACCOUNTS, smokePage } from './helpers.js';

const BASE = process.env.E2E_BASE || 'http://localhost:5219';

// 各角色页面清单
const ROLE_PAGES = [
  {
    key: 'school-admin', account: ACCOUNTS.schoolAdmin,
    pages: [
      ['首页', '/home'], ['数据看板', '/statistics/dashboard'], ['赛事目录', '/competition/list'],
      ['赛事申报', '/competition/declare'], ['赛事审核', '/competition/audit'], ['报名审核', '/register/audit'],
      ['作品审核', '/register/work-audit'], ['获奖列表', '/award/list'], ['获奖审核', '/award/audit'],
      ['评审管理', '/review'], ['通知列表', '/notice/list'], ['赛事总结', '/summary/summary-list'], ['用户管理', '/permission/users'],
    ],
  },
  {
    key: 'college-admin', account: ACCOUNTS.collegeAdmin,
    pages: [
      ['首页', '/home'], ['赛事目录', '/competition/list'], ['赛事申报', '/competition/declare'],
      ['获奖列表', '/award/list'], ['通知列表', '/notice/list'],
    ],
  },
  {
    key: 'comp-manager', account: ACCOUNTS.compManager,
    pages: [['首页', '/home'], ['赛事目录', '/competition/list'], ['报名审核', '/register/audit'], ['获奖列表', '/award/list']],
  },
  {
    key: 'teacher', account: ACCOUNTS.teacher,
    pages: [['首页', '/home'], ['赛事目录', '/competition/list']],
  },
  {
    key: 'student', account: ACCOUNTS.studentB,
    pages: [['首页', '/home'], ['赛事列表', '/competition/list'], ['报名页', '/register'], ['我的作品', '/register/work'], ['我的获奖', '/award/student']],
  },
  {
    key: 'expert', account: ACCOUNTS.expert,
    pages: [['首页', '/home'], ['专家评审', '/review/expert']],
  },
]

for (const { key, account, pages } of ROLE_PAGES) {
  test.describe.serial(`角色页面冒烟：${account.label}`, () => {
    let storageState;

    test(`前置：${account.label}登录`, async ({ request }) => {
      const { apiLogin } = await import('./helpers.js');
      try {
        storageState = await apiLogin(request, account);
        expect(storageState, '应获得token').toBeTruthy();
      } catch (e) {
        // 本地库可能缺该角色种子账号（生产重建后会有），记录并跳过该角色其余用例
        console.log(`[release] ${account.label} 登录不可用，跳过该角色: ${e.message.slice(0, 100)}`);
        storageState = null;
        test.skip(true, `${account.username} 账号不可用`);
      }
    });

    for (const [name, path] of pages) {
      test(`${account.label}·${name}(${path})`, async ({ page }) => {
        test.skip(!storageState, `${account.username} 账号不可用，跳过`);
        // 先以 API 登录换取 token，再注入 localStorage 走 UI
        const token = storageState || (await apiLogin(page.request, account));
        await page.addInitScript(t => {
          localStorage.setItem('token', t);
          localStorage.setItem('role', '');
        }, token);
        await page.goto(`${BASE}/#/login`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
        // 通过登录页跳转 home 让前端完成初始化，再导航到目标页
        await page.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        const { issues } = await smokePage(page, path, { name, shotPrefix: `${key}-` });
        expect(issues, `${account.label} ${name} 页面异常:\n${issues.join('\n')}`).toHaveLength(0);
      });
    }
  });
}
