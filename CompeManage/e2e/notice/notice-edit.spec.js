import { test, expect } from 'playwright-test-coverage'

// notice/edit.vue 定向覆盖：新建发布链路、创建失败/ID缺失、上传三分支、
// 缺赛事ID、编辑模式更新与发布失败

async function setup(page, opts = {}) {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'notice-edit-test')
    localStorage.setItem('role', 'school_admin')
    localStorage.setItem('userInfo', JSON.stringify({ id: 1, name: '管理员', username: 'T2023001' }))
  })
  const state = { created: undefined, updated: undefined, published: 0 }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/notice/comp/create') {
      if (opts.createFail) {
        await route.fulfill({ json: { code: 500, message: '创建服务不可用' } })
        return
      }
      state.created = true
      await route.fulfill({
        json: { code: 200, message: 'success', data: opts.noId ? {} : { notice: { id: 88 } } },
      })
      return
    }
    if (p === '/api/notice/88' && req.method() === 'PUT') {
      state.updated = true
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p === '/api/notice/88/publish') {
      if (opts.publishFail) {
        await route.fulfill({ json: { code: 500, message: '发布服务不可用' } })
        return
      }
      state.published += 1
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    if (p === '/api/notice/88' && req.method() === 'GET') {
      await route.fulfill({ json: { code: 200, message: 'success', data: { notice: {
        title: '待编辑标题', content: '待编辑正文', competition_detail_id: 7, attachment: 'http://mock/a.pdf',
      } } } })
      return
    }
    if (p === '/api/upload') {
      if (opts.uploadFail) {
        await route.fulfill({ status: 500, json: { code: 500, message: '上传失败' } })
        return
      }
      if (opts.uploadBizFail) {
        await route.fulfill({ json: { code: 500, msg: '业务上传失败' } })
        return
      }
      await route.fulfill({ json: { code: 200, message: 'success', data: { url: 'http://mock/new-attach.pdf' } } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: { capabilities: {} } } })
  })
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

async function fillForm(page, title = '发布测试通知') {
  await page.getByPlaceholder('在此输入通知标题').fill(title)
  await page.getByPlaceholder('在此撰写通知正文...').fill('通知正文内容')
}

test('新建通知：填写→创建→发布成功', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/#/notice/edit/0?compID=7')
  await fillForm(page)
  await page.getByRole('button', { name: /确认发布/ }).click()
  await expect.poll(() => state.published).toBe(1)
  // 发布成功 → router.back()（无历史 → about:blank）；toast 会被导航销毁，以导航为成功语义
  await page.waitForURL((u) => u.href === 'about:blank', { timeout: 5000 })
})

test('创建失败与通知ID缺失分支', async ({ page }) => {
  // 创建失败 → toast
  await setup(page, { createFail: true })
  await page.goto('/#/notice/edit/0?compID=7')
  await fillForm(page)
  await page.getByRole('button', { name: /确认发布/ }).click()
  await toast(page, /创建服务不可用|创建通知失败/)

  // 无 ID → 无法发布
  await setup(page, { noId: true })
  await page.goto('/#/notice/edit/0?compID=7')
  await fillForm(page)
  await page.getByRole('button', { name: /确认发布/ }).click()
  await toast(page, '未获取到通知ID，无法发布')
})

test('上传附件三分支：失败/业务失败/成功拼接', async ({ page }) => {
  // 上传 HTTP 失败
  await setup(page, { uploadFail: true })
  await page.goto('/#/notice/edit/0?compID=7')
  await fillForm(page)
  await page.locator('input[type=file]').setInputFiles({
    name: '附件.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf'),
  })
  await page.getByRole('button', { name: /确认发布/ }).click()
  await toast(page, /网络错误|服务器内部错误/)

  // 上传业务失败（code!=200）
  await setup(page, { uploadBizFail: true })
  await page.goto('/#/notice/edit/0?compID=7')
  await fillForm(page)
  await page.locator('input[type=file]').setInputFiles({
    name: '附件.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf'),
  })
  await page.getByRole('button', { name: /确认发布/ }).click()
  await toast(page, /上传失败/)
})

test('缺赛事ID拦截', async ({ page }) => {
  await setup(page)
  await page.goto('/#/notice/edit/0')
  await fillForm(page)
  await page.getByRole('button', { name: /确认发布/ }).click()
  await toast(page, '缺少赛事ID')
})

test('编辑模式：详情回显与更新保存', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/#/notice/edit/88')
  await expect(page.getByPlaceholder('在此输入通知标题')).toHaveValue('待编辑标题')
  await expect(page.getByText('附件1')).toBeVisible()

  await page.getByPlaceholder('在此输入通知标题').fill('编辑后的标题')
  await page.getByRole('button', { name: /确认发布/ }).click()
  await expect.poll(() => state.published).toBe(1)
  await page.waitForURL((u) => u.href === 'about:blank', { timeout: 5000 })
})
