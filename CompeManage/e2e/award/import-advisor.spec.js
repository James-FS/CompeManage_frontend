import { test, expect } from 'playwright-test-coverage'
import * as XLSX from 'xlsx'
import { mockAwardSession } from '../helpers/award-mock'

// award/import.vue 指导教师选择器定向覆盖：
// 打开/搜索（防抖）/分页/每页条数/添加去重/移除/姓名补充失败横幅与重试

const TEACHERS = Array.from({ length: 15 }, (_, i) => ({
  id: 100 + i,
  username: `T2023${String(10 + i)}`,
  name: i === 0 ? '何老师' : `教师${i}`,
  role_code: i % 2 ? 'award_advisor' : 'teacher',
  college: '计算机学院',
}))

const HEADERS = ['序号', '学号', '学生姓名', '所属学院', '所在专业', '参赛项目名称', '获奖时间（年/月）', '获奖类别', '获奖等级', '指导教师工号', '备注']

function excelBuffer(advisor = '') {
  const wb = XLSX.utils.book_new()
  const rows = [
    HEADERS,
    [1, '00123', '学生甲', '学院甲', '专业甲', '导入项目', '2026-10', '国家级', '一等奖', advisor, '备注'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '获奖录入')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
}

async function setup(page, opts = {}) {
  const state = await mockAwardSession(page)
  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const req = route.request(), url = new URL(req.url())
    const p = url.pathname
    if (p === '/api/award/advisors/lookup') {
      if (opts.lookupFail) {
        await route.fulfill({ json: { code: 500, message: '教师信息服务不可用' } })
        return
      }
      const body = req.postDataJSON()
      const list = TEACHERS.filter((t) => (body.usernames || []).includes(t.username))
      await route.fulfill({ json: { code: 200, message: 'success', data: { list } } })
      return
    }
    if (p === '/api/reg/user/list') {
      if (opts.advisorListFail) {
        await route.fulfill({ json: { code: 500, message: '教师列表不可用' } })
        return
      }
      const search = url.searchParams.get('search') || ''
      const pageNo = Number(url.searchParams.get('page') || 1)
      const size = Number(url.searchParams.get('page_size') || 10)
      let list = TEACHERS
      if (search) list = TEACHERS.filter((t) => t.name.includes(search) || t.username.includes(search))
      await route.fulfill({ json: { code: 200, message: 'success', data: { list: list.slice((pageNo - 1) * size, pageNo * size), total: list.length } } })
      return
    }
    await route.fallback()
  })
  await page.goto('/#/award/import/1')
  await page.locator('input[type=file]').setInputFiles({
    name: '新模板.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: excelBuffer(opts.advisor || ''),
  })
  await expect(page.locator('.preview-table .el-table__body tbody tr')).toHaveCount(1)
  return state
}

function advisorDialog(page) {
  return page.getByRole('dialog', { name: '选择指导老师' })
}

// ==================== 选择器全流程 ====================

test('指导老师选择器：搜索添加、已添加禁用、移除后可重选', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: '选择指导老师', exact: true }).click()
  const dialog = advisorDialog(page)
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(10)

  // 防抖搜索
  await dialog.getByPlaceholder('搜索教师姓名或工号').fill('何')
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(1)
  await expect(dialog.locator('.el-table__body tr').first()).toContainText('何老师')

  // 添加 → 行内按钮变已添加（禁用）
  await dialog.locator('.el-table__body tr').first().getByRole('button', { name: '添加', exact: true }).click()
  await expect(dialog.locator('.el-table__body tr').first().getByRole('button', { name: '已添加' })).toBeDisabled()

  // 完成 → 预览行显示 tag
  await dialog.getByRole('button', { name: '完成' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('.preview-table').getByText('何老师（T202310）')).toBeVisible()

  // 重开弹窗：已添加状态保留
  await page.locator('.advisor-tag-name').click()
  await expect(advisorDialog(page).getByRole('button', { name: '已添加' })).toBeDisabled()
  await advisorDialog(page).getByRole('button', { name: '完成' }).click()

  // 关闭 tag → 移除导师
  await page.locator('.advisor-selection .el-tag__close').click()
  await expect(page.getByRole('button', { name: '选择指导老师', exact: true })).toBeVisible()
})

// ==================== 分页 / 每页条数 / 列表失败 ====================

test('指导老师弹窗分页翻页与列表失败提示', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: '选择指导老师', exact: true }).click()
  const dialog = advisorDialog(page)

  // 翻页（15 人 / 每页 10）
  await dialog.locator('.advisor-pagination .btn-next').click()
  await expect(dialog.locator('.el-table__body tr')).toHaveCount(5)

  await dialog.getByRole('button', { name: '完成' }).click()

  // 列表失败 → 错误提示
  await page.route((url) => url.pathname === '/api/reg/user/list', (route) =>
    route.fulfill({ json: { code: 500, message: '教师列表不可用' } }))
  await page.locator('.advisor-tag-name').count() // 无 tag 时直接重开
  await page.getByRole('button', { name: '选择指导老师', exact: true }).click()
  await expect(page.locator('.el-message').filter({ hasText: '教师列表不可用' }).first()).toBeVisible()
})

// ==================== 姓名补充失败横幅与重试 ====================

test('指导教师姓名补充失败显示横幅，重试后恢复', async ({ page }) => {
  await setup(page, { advisor: 'T202310', lookupFail: true })
  // 横幅出现
  await expect(page.getByText('部分教师姓名暂未加载')).toBeVisible()
  await expect(page.getByRole('button', { name: '重试' })).toBeVisible()

  // 重试（此时 lookup 恢复成功）→ 横幅消失、姓名补全
  await page.route((url) => url.pathname === '/api/award/advisors/lookup', (route) =>
    route.fulfill({ json: { code: 200, message: 'success', data: { list: [TEACHERS[0]] } } }))
  await page.getByRole('button', { name: '重试' }).click()
  await expect(page.getByText('部分教师姓名暂未加载')).not.toBeVisible()
  await expect(page.locator('.preview-table').getByText('何老师（T202310）')).toBeVisible()
})
