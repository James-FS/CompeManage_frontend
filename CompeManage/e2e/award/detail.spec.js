import { test, expect } from 'playwright-test-coverage'
import * as XLSX from 'xlsx'
import fs from 'node:fs/promises'
import { mockAwardSession } from '../helpers/award-mock.js'
test('团队共享编辑、成员编辑权限和逐学生导出', async ({ page }) => {
  await mockAwardSession(page, 'college_admin')
  await page.goto('/#/award/detail/1')
  await expect(page.getByText('1 个团队项目 · 2 名获奖学生')).toBeVisible()
  await page.getByRole('button', { name: '修改获奖信息' }).click()
  const teamDialog = page.getByRole('dialog', { name: '修改获奖信息' })
  await teamDialog.locator('input').first().fill('修改后的项目')
  await teamDialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(page.getByText('修改后的项目', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /学生甲、学生乙/ }).click()
  const memberDialog = page.getByRole('dialog', { name: '获奖成员', exact: true })
  await expect(memberDialog.getByRole('button', { name: '编辑', exact: true })).toHaveCount(1)
  await memberDialog.getByRole('button', { name: '编辑', exact: true }).click()
  const editDialog = page.getByRole('dialog', { name: '修改成员信息' })
  await editDialog.locator('textarea').fill('已修改备注')
  await editDialog.getByRole('button', { name: '保存', exact: true }).click()
  await expect(editDialog).toBeHidden()
  await expect(memberDialog.getByText('已修改备注')).toBeVisible()
  await page.screenshot({ path: 'test-results/award-members.png', fullPage: true })
  await memberDialog.locator('.el-dialog__headerbtn').click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出 Excel', exact: true }).click()
  const download = await downloadPromise
  const workbook = XLSX.read(await fs.readFile(await download.path()), { type: 'buffer' })
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: false })
  expect(data[0]).toContain('所在专业')
  expect(data[0]).not.toContain('承办单位')
  expect(data).toHaveLength(3)
  expect(data[1][1]).toBe('00123')
})
