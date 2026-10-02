/**
 * 负责人选择弹窗共享辅助
 *
 * 新版「选择负责人（教职工）」弹窗打开时不再自动加载列表（数据源为全体教职工，
 * 约万人），必须先在弹窗内输入姓名/工号搜索后才出现可选行。
 */
import { expect } from 'playwright-test-coverage'

// 默认搜索词："何" 可命中教师池测试账号 T2023012 何老师
export const DEFAULT_MANAGER_QUERY = '何'

/**
 * 在已打开的负责人弹窗中搜索并选择第一行，等待弹窗关闭
 * @param {import('@playwright/test').Page} page
 * @param {{ query?: string }} [options]
 */
export async function searchAndPickManager(page, options = {}) {
  const query = options.query || DEFAULT_MANAGER_QUERY
  const dialog = page.locator('.el-dialog:visible').first()
  const nameInput = dialog.locator('input[placeholder="输入姓名"]')
  await nameInput.waitFor({ state: 'visible', timeout: 5000 })
  await nameInput.fill(query)

  const rows = dialog.locator('.el-table__body tr')
  await rows.first().waitFor({ state: 'visible', timeout: 10000 })
  await rows.first().locator('button:has-text("选择")').click()

  await expect(dialog).not.toBeVisible({ timeout: 5000 })
}

/**
 * 打开负责人弹窗（兼容两种入口写法）并选择负责人
 * @param {import('@playwright/test').Page} page
 * @param {{ query?: string, entry?: 'input' | 'manager-input' }} [options]
 */
export async function pickManager(page, options = {}) {
  const entry = options.entry || 'input'
  if (entry === 'manager-input') {
    await page.locator('.manager-input input').click()
  } else {
    await page.locator('input[placeholder="请选择赛事负责人"]').click()
  }
  await page.locator('.el-dialog:visible').first().waitFor({ state: 'visible', timeout: 5000 })
  await searchAndPickManager(page, options)
}
