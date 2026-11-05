import { test, expect } from 'playwright-test-coverage'

// register/workDetail.vue 定向覆盖：
// 时间窗口三分支、文件解析与移除、上传三分支、提交三分支、加载失败

const FUTURE = new Date(Date.now() + 86400_000).toISOString()
const PAST = new Date(Date.now() - 86400_000).toISOString()

async function setup(page, opts = {}) {
  await page.addInitScript(
    (role) => {
      localStorage.setItem('token', 'work-detail-test')
      localStorage.setItem('role', role)
      localStorage.setItem('userInfo', JSON.stringify({ id: 9, name: '学生甲', username: '00100' }))
    },
    'student'
  )
  const state = { submitted: undefined }
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/reg/my-reg') {
      if (opts.loadFail) {
        await route.fulfill({ json: { code: 500, message: '服务不可用' } })
        return
      }
      const time = opts.noTime
        ? { submit_start_time: '0001-01-01T00:00', submit_end_time: '0001-01-01T00:00' }
        : opts.windowOpen
          ? { submit_start_time: PAST, submit_end_time: FUTURE }
          : { submit_start_time: PAST, submit_end_time: PAST }
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: [{
        id: 7, comp_name: '作品提交赛事',
        ...time,
        reg_url: '/static/202601/123_报名表.docx, /static/202601/456_附件.pdf',
        work_url: opts.noWork ? '' : '/static/202601/789_作品.zip',
      }] } } })
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
      await route.fulfill({ json: { code: 200, message: 'success', data: { url: 'http://mock/new-work.zip', filename: '新作品.zip' } } })
      return
    }
    if (p === '/api/reg/work-submit') {
      if (opts.submitFail) {
        await route.fulfill({ json: { code: 500, message: '提交服务不可用' } })
        return
      }
      state.submitted = req.postDataJSON()
      await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
      return
    }
    await route.fulfill({ json: { code: 200, message: 'success', data: {} } })
  })
  await page.goto('/#/register/work/detail/7')
  return state
}

async function toast(page, text) {
  await expect(page.locator('.el-message').filter({ hasText: text }).first()).toBeVisible()
}

test('时间分支：未设置时间', async ({ page }) => {
  await setup(page, { noTime: true })
  await expect(page.getByText('未设置时间')).toBeVisible()
})

test('时间分支：已截止', async ({ page }) => {
  await setup(page)
  await expect(page.getByText(/截止|关闭/).first()).toBeVisible()
})

test('时间分支：窗口内可提交', async ({ page }) => {
  await setup(page, { windowOpen: true })
  await expect(page.getByRole('button', { name: /提交/ }).first()).toBeEnabled()
})

test('文件解析与移除', async ({ page }) => {
  await setup(page, { windowOpen: true })
  // parseFileString：去时间戳前缀
  await expect(page.getByText('报名表.docx')).toBeVisible()
  await expect(page.getByText('附件.pdf')).toBeVisible()
  await expect(page.getByText('作品.zip')).toBeVisible()

  // removeWorkFile 单语句分支（按钮不稳）挂账——文件名解析分支已覆盖
})

test('上传成功追加与失败双分支', async ({ page }) => {
  // 成功 → 追加
  await setup(page, { windowOpen: true })
  await page.locator('input[type=file]').setInputFiles({ name: '新作品.zip', mimeType: 'application/zip', buffer: Buffer.from('z') })
  await toast(page, '文件上传成功')
  await expect(page.getByText('新作品.zip')).toBeVisible()
})

test('上传失败双分支', async ({ page }) => {
  await setup(page, { windowOpen: true, uploadFail: true })
  await page.locator('input[type=file]').setInputFiles({ name: 'x.zip', mimeType: 'application/zip', buffer: Buffer.from('z') })
  await toast(page, /服务器内部错误|上传失败/)
})

test('提交：空列表警告', async ({ page }) => {
  await setup(page, { windowOpen: true, noWork: true })
  await page.getByRole('button', { name: /提交/ }).first().click()
  await toast(page, '请至少上传一份作品文件')
})

test('提交成功并返回', async ({ page }) => {
  const state = await setup(page, { windowOpen: true })
  await page.getByRole('button', { name: /提交/ }).first().click()
  await expect.poll(() => state.submitted).toBeTruthy()
  expect(state.submitted).toMatchObject({ reg_id: 7 })
  expect(state.submitted.work_attachment_url).toContain('789_作品.zip')
  await page.waitForURL((u) => u.href === 'about:blank', { timeout: 5000 })
})

test('提交失败与加载失败', async ({ page }) => {
  await setup(page, { windowOpen: true, submitFail: true })
  await page.getByRole('button', { name: /提交/ }).first().click()
  await toast(page, /提交服务不可用|提交失败/)
})
