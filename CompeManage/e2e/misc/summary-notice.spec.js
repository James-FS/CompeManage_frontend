import { test, expect } from 'playwright-test-coverage'

// 处女地收官：notice.vue（38 条）+ summaryView.vue（69 条）

const NOTICE = {
  title: '测试通知标题',
  content: '通知正文内容摘要',
  publish_time: '2026-06-01 10:00',
  attachment: 'http://mock/notice-attach.pdf',
}

const SUMMARY = {
  comp_name: '总结赛事甲',
  organizer: '主办方',
  undertaker: '承办方',
  college_info: { name: '计算机学院' },
  manager: '何老师',
  time_range: '2026-01-01 ~ 2026-06-01',
  summary_content: '这是赛事总结正文',
  award_stats: [
    { level: '一等奖', count: 2 },
    { level: '二等奖', count: 3 },
  ],
  expenses: [
    { usage: '差旅', amount: 1200 },
    { usage: '物料', amount: 800 },
  ],
  attachments: ['http://mock/123_总结报告.pdf', { name: '附件B.docx', url: 'http://mock/b.docx' }],
}

async function setup(page, opts = {}) {
  await page.addInitScript(
    (role) => {
      localStorage.setItem('token', 'misc-virgin-test')
      localStorage.setItem('role', role)
      localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
    },
    'school_admin'
  )
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const url = new URL(route.request().url())
    const p = url.pathname
    if (p === '/api/notice/5') {
      if (opts.noticeFail) {
        await route.fulfill({ json: { code: 500, message: '服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { notice: opts.noAttach ? { ...NOTICE, attachment: '' } : NOTICE } } })
      return
    }
    if (p === '/api/summary/7') {
      if (opts.summaryFail) {
        await route.fulfill({ json: { code: 500, message: '服务不可用' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: SUMMARY } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  return page
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('通知详情渲染与附件显隐', async ({ page }) => {
  await setup(page)
  await page.goto('/#/notice/notice/5')
  await expect(page.getByText('测试通知标题')).toBeVisible()
  await expect(page.getByText('通知正文内容摘要')).toBeVisible()
  await expect(page.getByText('2026-06-01 10:00')).toBeVisible()
  await expect(page.locator('.attachment-box')).toBeVisible()
})

test('通知无附件提示', async ({ page }) => {
  await setup(page, { noAttach: true })
  await page.goto('/#/notice/notice/5')
  await expect(page.getByText('测试通知标题')).toBeVisible()
  // 附件盒 v-if 隐藏
  await expect(page.locator('.attachment-box')).toHaveCount(0)
})

test('通知加载失败双分支', async ({ page }) => {
  await setup(page, { noticeFail: true })
  await page.goto('/#/notice/notice/5')
  await toast(page, /服务不可用|获取通知/)
})

test('总结视图：统计与明细渲染、附件文件名解析', async ({ page }) => {
  await setup(page)
  await page.goto('/#/summary/summary/view/7')
  await expect(page.getByText('总结赛事甲').first()).toBeVisible()
  await expect(page.getByText('这是赛事总结正文')).toBeVisible()
  await expect(page.getByText('一等奖').first()).toBeVisible()
  await expect(page.getByText('差旅').first()).toBeVisible()
  await expect(page.getByText('1200').first()).toBeVisible()
  // buildDisplayFileName：去时间戳前缀 + 对象形态原名
  await expect(page.getByText('总结报告.pdf')).toBeVisible()
  await expect(page.getByText('附件B.docx')).toBeVisible()
})

test('总结视图加载失败', async ({ page }) => {
  await setup(page, { summaryFail: true })
  await page.goto('/#/summary/summary/view/7')
  await toast(page, /服务不可用|加载|失败/)
})
