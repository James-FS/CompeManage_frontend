import { test, expect } from '@playwright/test'
import * as XLSX from 'xlsx'
import { mockAwardSession } from '../helpers/award-mock.js'
const headers = ['序号', '学号', '学生姓名', '所属学院', '所在专业', '参赛项目名称', '获奖时间（年/月）', '获奖类别', '获奖等级', '备注']
function excelBuffer() {
  const wb = XLSX.utils.book_new()
  const rows = [headers, ['示例', '0000', '示例学生'], [1, '00123', '学生甲', '学院甲', '专业甲', '跨院项目', '2026-10', '国际级', '一等奖', '备注'], [], ['说明：1. 获奖类别'], ['2. 获奖等级'], ['3. 一行一个学生']]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '获奖录入')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })
}
test('Excel解析排除说明、保留学号文本，并可新增和提交', async ({ page }) => {
  const state = await mockAwardSession(page)
  await page.goto('/#/award/import/1')
  await page.locator('input[type=file]').setInputFiles({ name: '新模板.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: excelBuffer() })
  const rows = page.locator('.el-table__body tbody tr')
  await expect(rows).toHaveCount(1)
  await expect(rows.first().locator('input').first()).toHaveValue('00123')
  await page.getByRole('button', { name: '新增一条', exact: true }).click()
  await expect(rows).toHaveCount(2)
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  await expect(page.getByText('学号不能为空', { exact: true })).toBeVisible()
  await expect(page.getByText('1 行需要修正；本批数据未写入，请根据下方提示修改后重新提交。', { exact: true })).toBeVisible()
  await rows.nth(1).getByRole('button').click()
  await expect(rows).toHaveCount(1)
  await page.locator('.el-table__body-wrapper .el-scrollbar__wrap').evaluate(el => { el.scrollLeft = 0 })
  await page.locator('.import-page').evaluate(el => el.scrollIntoView({ block: 'start' }))
  await page.screenshot({ path: 'test-results/award-import-validation.png', fullPage: true })
  await page.getByRole('button', { name: '提交导入', exact: true }).click()
  await expect(page).toHaveURL(/award\/detail\/1/)
  expect(state.getSubmitted().rows).toHaveLength(1)
  expect(state.getSubmitted().rows[0].student_id).toBe('00123')
})

test('学生补录重复记录时显示服务端提示', async ({ page }) => {
  await mockAwardSession(page, 'student')
  await page.addInitScript(() => sessionStorage.setItem('resubmitAward', JSON.stringify({
    comp_id: 1,
    award_level: '省级二等奖',
    award_name: '二等奖',
    award_time: '2026-10-12T00:00:00+08:00',
    advisor_info: [{ id: 11, username: 'T001', name: '张老师', college: '学院甲' }],
    team_name: '已有导入项目',
    proof_url: '/uploads/e2e-certificate.pdf',
    members: [{
      is_leader: true,
      name: '测试学生',
      stu_id: 'S2024001',
      phone: '13800000000',
      email: 'student@example.com',
      college: '学院甲',
    }],
  })))
  await page.goto('/#/award/student/declare?comp_id=1&comp_name=校验赛事')
  await page.getByRole('button', { name: '确认提交' }).click()
  await expect(page.locator('.el-message--error').filter({ hasText: '记录已存在' })).toBeVisible()
})

test('校管理员在校赛填报列表调整全局导入设置', async ({ page }) => {
  await mockAwardSession(page)
  await page.goto('/#/award/list')
  await page.getByRole('button', { name: '导入设置' }).click()
  const dialog = page.getByRole('dialog', { name: '导入设置' })
  await expect(dialog).toBeVisible()
  const dialogSwitch = dialog.getByRole('switch') // aria-checked 挂在内层 input[role=switch] 上
  await expect(dialogSwitch).toBeEnabled()
  await expect(dialogSwitch).toHaveAttribute('aria-checked', 'false')
  await dialog.locator('.el-switch').click()
  await expect(dialogSwitch).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByText('已更新所有赛事的报名要求，历史获奖不受影响')).toBeVisible()
})
test('导入页所有角色只读展示报名要求，校管可跳转调整', async ({ page }) => {
  await mockAwardSession(page)
  await page.goto('/#/award/import/1')
  await expect(page.getByRole('switch')).toHaveCount(0)
  await expect(page.getByText('当前报名要求：无需报名')).toBeVisible()
  await page.getByRole('button', { name: '去调整' }).click()
  await expect(page).toHaveURL(/award\/list/)
  await page.goto('/#/award/import/1')
  await page.getByRole('button', { name: '新增一条', exact: true }).click()
  await expect(page.locator('.el-table__body tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: '清空', exact: true }).click()
  await expect(page.locator('.el-table__body tbody tr')).toHaveCount(0)
})
test('院管理员只读报名要求，旧模板明确提示', async ({ page }) => {
  await mockAwardSession(page, 'college_admin')
  await page.goto('/#/award/import/1')
  await expect(page.getByRole('switch')).toHaveCount(0)
  await expect(page.getByText('当前报名要求：无需报名')).toBeVisible()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['奖项等级', '负责人']]), '旧模板')
  await page.locator('input[type=file]').setInputFiles({ name: '旧模板.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) })
  await expect(page.getByText(/请下载新版模板/)).toBeVisible()
  await expect(page.locator('.el-table__body tbody tr')).toHaveCount(0)
})
