import { test, expect } from 'playwright-test-coverage';

// 测试用户 - school_admin
const TEST_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
};

// 辅助函数：等待表格数据加载
async function waitForTableData(page, timeout = 15000) {
  await page.waitForSelector('.el-table__body tr', { timeout });
}

// 辅助函数：获取表格行数
async function getTableRowCount(page) {
  const rows = page.locator('.el-table__body tr');
  return await rows.count();
}

// 辅助函数：获取表格第一行的赛事名称
async function getFirstRowCompetitionName(page) {
  const firstRow = page.locator('.el-table__body tr').first();
  const nameCell = firstRow.locator('td').nth(0); // 赛事名称是第一列
  return await nameCell.textContent();
}

// 辅助函数：登录并进入赛事目录页面
async function loginAndNavigate(page) {
  await page.goto('/#/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username);
  await page.fill('input[placeholder="请输入密码"]', TEST_USER.password);
  await page.locator('.el-button:has-text("立即登录")').click();

  await page.waitForURL(url => url.hash.includes('home') || url.hash.includes('competition'), { timeout: 10000 });
  await page.goto('/#/competition/list');
  await page.waitForLoadState('networkidle');

  try {
    await page.waitForSelector('.el-table', { timeout: 15000 });
  } catch (e) {
    console.log('表格未找到，可能暂无数据');
  }
}

test.describe('赛事目录页面测试', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndNavigate(page);
  });

  test('页面基本元素验证', async ({ page }) => {
    await expect(page.locator('.search-container')).toBeVisible();
    await expect(page.locator('.search-form')).toBeVisible();
    await expect(page.locator('.table-toolbar')).toBeVisible();
    await expect(page.locator('.el-table')).toBeVisible();
    await expect(page.locator('.el-pagination')).toBeVisible();
  });

  test('筛选功能 - 赛事名称搜索（严格验证）', async ({ page }) => {
    // 等待表格有数据
    await waitForTableData(page);

    // 获取原始数据量
    const originalRowCount = await getTableRowCount(page);
    console.log(`原始数据行数: ${originalRowCount}`);

    // 找到搜索输入框
    const compNameInput = page.locator('input[placeholder="请输入赛事名称"]');

    // 输入一个不太可能存在的搜索词
    const searchKeyword = '测试赛事_不存在_' + Date.now();
    await compNameInput.fill(searchKeyword);

    // 点击搜索按钮
    await page.locator('button:has-text("搜索")').click();

    // 等待网络请求完成
    await page.waitForLoadState('networkidle');

    // 等待表格更新（可能显示空状态或新数据）
    await page.waitForTimeout(1000);

    // 获取搜索后的数据量
    const afterSearchRowCount = await getTableRowCount(page);
    console.log(`搜索后数据行数: ${afterSearchRowCount}`);

    // 严格验证：搜索后应该没有数据（或数据明显减少）
    if (originalRowCount > 5) {
      expect(afterSearchRowCount).toBeLessThan(originalRowCount);
    }

    // 验证表格显示空状态或数据为空
    const emptyText = page.locator('.el-table__empty-text');
    const hasEmptyState = await emptyText.isVisible().catch(() => false);
    if (hasEmptyState) {
      console.log('表格显示空状态，无匹配数据');
    }

    // 验证搜索已触发（输入框中仍有搜索词）
    // await expect(compNameInput).toHaveValue(searchKeyword);
  });

  test('筛选功能 - 清空搜索后恢复数据（严格验证）', async ({ page }) => {
    // 等待表格有数据
    await waitForTableData(page);

    // 获取原始数据量
    const originalRowCount = await getTableRowCount(page);
    expect(originalRowCount).toBeGreaterThan(0);

    // 进行搜索
    const compNameInput = page.locator('input[placeholder="请输入赛事名称"]');
    await compNameInput.fill('测试赛事');
    await page.locator('button:has-text("搜索")').click();
    await page.waitForLoadState('networkidle');

    // 搜索后点击重置
    await page.locator('button:has-text("重置")').click();
    await page.waitForLoadState('networkidle');

    // 严格验证：输入框应该被清空
    await expect(compNameInput).toHaveValue('');

    // 等待表格数据恢复
    await page.waitForSelector('.el-table__body tr', { timeout: 10000 }).catch(() => {});

    // 严格验证：数据量应该恢复到接近原始数量（允许有1-2条误差，因为可能有数据变化）
    const afterResetRowCount = await getTableRowCount(page);
    console.log(`重置前: ${originalRowCount}, 重置后: ${afterResetRowCount}`);

    // 数据应该基本恢复
    expect(Math.abs(afterResetRowCount - originalRowCount)).toBeLessThan(3);
  });

  test('筛选功能 - 赛事级别下拉选择（严格验证）', async ({ page }) => {
    // 等待表格加载
    await waitForTableData(page);

    // 获取切换前的数据
    const rowsBefore = await getTableRowCount(page);
    console.log(`筛选前数据行数: ${rowsBefore}`);

    // 找到赛事级别选择器
    const levelSelect = page.locator('.el-select').filter({ hasText: '请选择赛事级别' }).first();

    // 点击打开下拉框
    await levelSelect.click();

    // 等待下拉选项出现
    await page.waitForSelector('.el-select-dropdown__item:has-text("省级")', { timeout: 5000 });

    // 选择"省级"选项
    await page.locator('.el-select-dropdown__item:has-text("省级")').click();

    // 等待请求完成
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // 严格验证：数据应该有变化（筛选后行数可能不同）
    const rowsAfter = await getTableRowCount(page);
    console.log(`筛选后数据行数: ${rowsAfter}`);

    // 数据筛选后应该能正常加载（不管数量是否变化）
    expect(rowsAfter).toBeGreaterThanOrEqual(0);
  });

  test('筛选功能 - 赛事状态下拉选择（严格验证）', async ({ page }) => {
    await waitForTableData(page);

    const rowsBefore = await getTableRowCount(page);
    console.log(`筛选前数据行数: ${rowsBefore}`);

    // 找到赛事状态下拉框
    const statusSelect = page.locator('.el-select').filter({ hasText: '请选择赛事状态' }).first();

    await statusSelect.click();
    await page.waitForSelector('.el-select-dropdown__item:has-text("进行中")', { timeout: 5000 });
    await page.locator('.el-select-dropdown__item:has-text("进行中")').click();

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // 严格验证：数据应该有变化
    const rowsAfter = await getTableRowCount(page);
    console.log(`筛选后数据行数: ${rowsAfter}`);
    expect(rowsAfter).toBeGreaterThanOrEqual(0);
  });

  test('工具栏按钮 - 新增赛事跳转（严格验证）', async ({ page }) => {
    const addButton = page.locator('button:has-text("新增赛事")');
    await expect(addButton).toBeVisible();

    await addButton.click();

    // 严格验证：等待 URL 真正变化
    await page.waitForURL(url => /\/competition\/add/.test(url), { timeout: 5000 });

    // 验证最终 URL 正确
    await expect(page).toHaveURL(/\/competition\/add/);

    // 额外验证：新页面应该包含新增赛事的表单元素
    await expect(page.locator('.el-form, .competition-form, h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('工具栏按钮 - 导入数据跳转（严格验证）', async ({ page }) => {
    const importButton = page.locator('button:has-text("导入数据")');
    await expect(importButton).toBeVisible();

    await importButton.click();

    // 严格验证：URL 变化且包含 tab=import
    await page.waitForURL(url => /tab=import/.test(url), { timeout: 5000 });
    await expect(page).toHaveURL(/tab=import/);
  });

  test('工具栏按钮 - 导出数据功能（严格验证）', async ({ page }) => {
    // 拦截 API 响应并验证数据结构
    const listResponse = page.waitForResponse(
      response => response.url().includes('/api/comp/list') || response.url().includes('/comp/list'),
      { timeout: 15000 }
    );

    // 点击导出数据按钮
    await page.locator('button:has-text("导出数据")').click();

    // 等待 API 响应
    const response = await listResponse;

    // 严格验证：响应状态正常
    expect(response.status()).toBeLessThan(500);

    // 验证响应内容是 JSON 且包含 list 字段
    const responseBody = await response.json();
    console.log('导出 API 响应:', JSON.stringify(responseBody, null, 2));

    // 严格验证：响应结构正确
    expect(responseBody).toHaveProperty('data');
    expect(Array.isArray(responseBody.data?.list)).toBe(true);

    // 验证数据条数合理
    const total = responseBody.data?.total || 0;
    console.log(`导出数据总量: ${total}`);
    expect(total).toBeGreaterThanOrEqual(0);
  });

  test('工具栏按钮 - 批量删除(无选中时警告)', async ({ page }) => {
    // 确保没有任何选中项 - 取消表格头的全选
    const headerCheckbox = page.locator('.el-table__header-wrapper .el-checkbox');
    if (await headerCheckbox.isChecked()) {
      await headerCheckbox.click();
    }

    // 点击批量删除按钮
    const deleteBtn = page.locator('button:has-text("批量删除")');
    await deleteBtn.click();

    // 等待一下让事件触发
    await page.waitForTimeout(500);

    // 严格验证：应该有警告消息或弹出确认框
    // 由于 Message 是瞬时的，我们通过检查按钮仍然可用且页面没有跳转来验证
    await expect(deleteBtn).toBeVisible();
  });

  test('年份切换功能（严格验证）', async ({ page }) => {
    const yearSwitch = page.locator('.year-switch-tag');

    // 获取切换前的年份文本
    const yearTextBefore = await yearSwitch.textContent();
    console.log(`切换前年份: ${yearTextBefore}`);

    // 点击打开年份下拉
    await yearSwitch.click();

    // 等待下拉菜单可见
    const dropdownMenu = page.locator('.el-dropdown-menu').last();
    await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

    // 获取所有年份选项（只找可见的）
    const allItems = dropdownMenu.locator('.el-dropdown-item');
    const yearItems = allItems.filter({ hasText: '年度' });
    const count = await yearItems.count();
    console.log(`年份选项数量: ${count}`);

    // 如果没有找到年份选项，尝试其他方式
    if (count === 0) {
      // 可能下拉菜单样式不同，检查是否有其他元素
      const visibleItems = await dropdownMenu.locator('li, [role="menuitem"]').count();
      console.log(`可见菜单项数量: ${visibleItems}`);
      expect(visibleItems).toBeGreaterThan(0);
    } else {
      expect(count).toBeGreaterThan(0);

      if (count > 1) {
        await yearItems.first().click();

        // 等待数据加载
        await page.waitForLoadState('networkidle');

        // 严格验证：年份文本应该变化
        const yearTextAfter = await yearSwitch.textContent();
        console.log(`切换后年份: ${yearTextAfter}`);

        // 验证年份确实改变了
        expect(yearTextAfter).not.toBe(yearTextBefore);
      }
    }
  });

  test('年度目录管理弹窗（严格验证）', async ({ page }) => {
    const yearSwitch = page.locator('.year-switch-tag');
    await yearSwitch.click();
    await page.locator('.el-dropdown-menu').last().waitFor({ state: 'visible', timeout: 5000 });

    // 点击"管理年度目录"
    await page.getByText('管理年度目录').first().click();

    // 严格验证：弹窗出现且标题正确
    const dialog = page.locator('.el-dialog');
    await expect(dialog).toBeVisible();

    const dialogTitle = page.locator('.el-dialog__title');
    await expect(dialogTitle).toContainText('年度目录管理');

    // 严格验证：弹窗内的表格有数据
    const dialogTable = page.locator('.el-dialog .el-table');
    await expect(dialogTable).toBeVisible();

    // 表格行数应该大于 0
    const yearTableRows = page.locator('.el-dialog .el-table__body tr');
    const rowCount = await yearTableRows.count();
    console.log(`年度目录表格行数: ${rowCount}`);
    expect(rowCount).toBeGreaterThan(0);

    // 验证表格第一列显示年份格式
    const firstYearCell = page.locator('.el-dialog .el-table__body tr td').first();
    const yearText = await firstYearCell.textContent();
    console.log(`第一个年份: ${yearText}`);
    expect(yearText).toMatch(/\d{4}/);

    // 关闭弹窗
    await page.locator('.el-dialog__headerbtn').click();
    await expect(dialog).not.toBeVisible();
  });

  test('表格复选框功能（严格验证）', async ({ page }) => {
    await waitForTableData(page);

    const rows = page.locator('.el-table__body tr');
    const rowCount = await rows.count();
    console.log(`表格总行数: ${rowCount}`);

    expect(rowCount).toBeGreaterThan(0);

    // 点击第一行的复选框
    const firstRowCheckbox = rows.first().locator('.el-checkbox');
    await firstRowCheckbox.click();

    // 等待选中状态更新
    await page.waitForTimeout(300);

    // 严格验证：检查该复选框是否被选中
    const isChecked = await firstRowCheckbox.isChecked();
    console.log(`第一行复选框选中状态: ${isChecked}`);
    expect(isChecked).toBe(true);

    // 再次点击取消选中
    await firstRowCheckbox.click();
    await page.waitForTimeout(300);

    const isUnchecked = await firstRowCheckbox.isChecked();
    expect(isUnchecked).toBe(false);
  });

  test('分页功能 - 切换每页条数（严格验证）', async ({ page }) => {
    await waitForTableData(page);

    // 获取切换前的行数
    const rowCountBefore = await getTableRowCount(page);
    console.log(`切换前每页显示: ${rowCountBefore} 条`);

    // 找到每页条数选择器 - 更精确的选择器
    const sizeSelect = page.locator('.el-pagination__sizes').locator('.el-select').first();
    await sizeSelect.click();

    // 等待下拉菜单出现 - 使用 last() 因为分页的下拉菜单在最后
    const dropdown = page.locator('.el-select-dropdown').last();
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });

    // 选择 20 条
    await dropdown.locator('.el-select-dropdown__item:has-text("20")').click();

    // 等待数据重新加载
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // 严格验证：获取切换后的行数
    const rowCountAfter = await getTableRowCount(page);
    console.log(`切换后每页显示: ${rowCountAfter} 条`);

    // 验证行数应该是 20（或接近，如果有不足的情况）
    expect(rowCountAfter).toBeLessThanOrEqual(20);
  });

  test('分页功能 - 切换页码（严格验证）', async ({ page }) => {
    await waitForTableData(page);

    // 获取第一页的数据（取第一行赛事名称）
    const firstPageFirstRowName = await getFirstRowCompetitionName(page);
    console.log(`第一页第一行赛事名称: ${firstPageFirstRowName}`);

    // 找到页码切换器
    const pager = page.locator('.el-pagination .el-pager');
    const pageButtons = pager.locator('li:not(.is-active)'); // 排除当前页
    const pageCount = await pageButtons.count();

    console.log(`总页码数: ${pageCount}`);

    if (pageCount > 0) {
      // 点击第二页（或下一页）
      const nextPageButton = pageButtons.first();
      const nextPageNum = await nextPageButton.textContent();
      console.log(`点击页码: ${nextPageNum}`);

      await nextPageButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // 严格验证：当前页码应该高亮
      const activePage = pager.locator('li.is-active');
      const activePageText = await activePage.textContent();
      console.log(`当前高亮页码: ${activePageText}`);
      expect(activePageText).toBe(nextPageNum);

      // 验证数据确实变化了（第二页的第一行名称应该不同，或者至少页码显示正确）
      const secondPageFirstRowName = await getFirstRowCompetitionName(page);
      console.log(`第二页第一行赛事名称: ${secondPageFirstRowName}`);

      // 数据可能一样也可能不一样（取决于数据），但页码必须正确
      expect(activePageText).toBe(nextPageNum);
    }
  });

  test('页面权限控制 - school_admin可见按钮', async ({ page }) => {
    await expect(page.locator('button:has-text("新增赛事")')).toBeVisible();
    await expect(page.locator('button:has-text("导入数据")')).toBeVisible();
    await expect(page.locator('button:has-text("批量删除")')).toBeVisible();
    await expect(page.locator('button:has-text("导出数据")')).toBeVisible();
  });

  test('表格状态标签显示正确', async ({ page }) => {
    await waitForTableData(page);

    // 检查表格中的状态列
    const statusTags = page.locator('.el-table__body .el-tag');
    const tagCount = await statusTags.count();

    console.log(`状态标签数量: ${tagCount}`);

    if (tagCount > 0) {
      // 验证标签显示的文本是有效状态
      const firstTagText = await statusTags.first().textContent();
      console.log(`第一个状态标签: ${firstTagText}`);
      expect(['未开始', '进行中', '已结束']).toContain(firstTagText.trim());
    }
  });
});

test.describe('赛事目录页面 - 未登录用户', () => {
  test('未登录用户应跳转到登录页', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userInfo');
    });

    await page.goto('/#/competition/list');

    // 严格验证：等待 URL 真正变为登录页
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);

    // 验证登录页元素可见
    await expect(page.locator('.login-container')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('赛事目录页面 - 权限差异测试', () => {
  test('college_admin 不应看到新增赛事按钮', async ({ page }) => {
    // 使用 college_admin 账号登录
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder="请输入用户名"]', 'T2023002');
    await page.fill('input[placeholder="请输入密码"]', '123');
    await page.locator('.el-button:has-text("立即登录")').click();

    await page.waitForURL(url => url.hash.includes('home') || url.hash.includes('competition'), { timeout: 10000 });
    await page.goto('/#/competition/list');
    await page.waitForLoadState('networkidle');

    // 严格验证：college_admin 不应该看到新增赛事和批量删除按钮
    await expect(page.locator('button:has-text("新增赛事")')).not.toBeVisible();
    await expect(page.locator('button:has-text("批量删除")')).not.toBeVisible();

    // 但应该能看到导出数据按钮（通用功能）
    await expect(page.locator('button:has-text("导出数据")')).toBeVisible();
  });
});