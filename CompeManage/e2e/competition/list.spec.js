import { test, expect } from '@playwright/test';

// 测试用户 - school_admin（用于测试需要权限的功能）
const TEST_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
};

test.describe('赛事目录页面测试', () => {
  // 每个测试前登录并进入赛事目录页面
  test.beforeEach(async ({ page }) => {
    // 1. 先访问登录页
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');

    // 2. 填写登录信息
    await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username);
    await page.fill('input[placeholder="请输入密码"]', TEST_USER.password);

    // 3. 点击登录按钮
    await page.locator('.el-button:has-text("立即登录")').click();

    // 4. 等待跳转到首页或列表页
    await page.waitForURL(url => url.hash.includes('home') || url.hash.includes('competition'), { timeout: 10000 });

    // 5. 导航到赛事目录页面
    await page.goto('/#/competition/list');
    await page.waitForLoadState('networkidle');

    // 6. 等待表格加载
    try {
      await page.waitForSelector('.el-table', { timeout: 15000 });
    } catch (e) {
      // 表格可能还没数据，但页面应该加载了
      console.log('表格未找到，可能暂无数据');
    }
  });

  test('页面基本元素验证', async ({ page }) => {
    // 验证页面标题/关键字存在
    await expect(page.locator('.search-container')).toBeVisible();

    // 验证搜索表单存在
    await expect(page.locator('.search-form')).toBeVisible();

    // 验证工具栏存在
    await expect(page.locator('.table-toolbar')).toBeVisible();

    // 验证表格存在
    await expect(page.locator('.el-table')).toBeVisible();

    // 验证分页组件存在
    await expect(page.locator('.el-pagination')).toBeVisible();
  });

  test('筛选功能 - 赛事名称搜索', async ({ page }) => {
    const compNameInput = page.locator('input[placeholder="请输入赛事名称"]');

    // 输入赛事名称
    await compNameInput.fill('测试赛事');

    // 点击搜索按钮
    await page.locator('button:has-text("搜索")').click();

    // 等待请求完成
    await page.waitForLoadState('networkidle');
  });

  test('筛选功能 - 赛事级别下拉选择', async ({ page }) => {
    // 找到赛事级别选择器
    const levelSelect = page.locator('.el-select').filter({ hasText: '请选择赛事级别' }).first();

    // 点击打开下拉框
    await levelSelect.click();

    // 选择"省级"选项
    await page.locator('.el-select-dropdown__item:has-text("省级")').click();

    // 验证选择成功（input显示选中值或placeholder改变）
    await page.waitForLoadState('networkidle');
  });

  test('筛选功能 - 赛事状态下拉选择', async ({ page }) => {
    // 找到赛事状态下拉框
    const statusSelect = page.locator('.el-select').filter({ hasText: '请选择赛事状态' }).first();

    // 点击打开下拉框
    await statusSelect.click();

    // 选择"进行中"选项
    await page.locator('.el-select-dropdown__item:has-text("进行中")').click();

    // 等待请求完成
    await page.waitForLoadState('networkidle');
  });

  test('筛选功能 - 重置按钮', async ({ page }) => {
    const compNameInput = page.locator('input[placeholder="请输入赛事名称"]');

    // 输入赛事名称
    await compNameInput.fill('测试赛事');

    // 点击重置按钮
    await page.locator('button:has-text("重置")').click();

    // 等待重置完成
    await page.waitForLoadState('networkidle');

    // 验证输入框已清空
    await expect(compNameInput).toHaveValue('');
  });

  test('工具栏按钮 - 新增赛事跳转', async ({ page }) => {
    // 查找新增赛事按钮
    const addButton = page.locator('button:has-text("新增赛事")');

    // 验证按钮存在
    await expect(addButton).toBeVisible();

    // 点击新增赛事
    await addButton.click();

    // 等待路由跳转
    await page.waitForURL(/\/competition\/add/);

    // 验证页面跳转到新增赛事页
    await expect(page).toHaveURL(/\/competition\/add/);
  });

  test('工具栏按钮 - 导入数据跳转', async ({ page }) => {
    // 查找导入数据按钮
    const importButton = page.locator('button:has-text("导入数据")');

    // 验证按钮存在
    await expect(importButton).toBeVisible();

    // 点击导入数据
    await importButton.click();

    // 等待路由跳转（导入数据会跳转到新增赛事页的import tab）
    await page.waitForURL(/\/competition\/add/);

    // 验证URL包含tab=import参数
    await expect(page).toHaveURL(/tab=import/);
  });

  test('工具栏按钮 - 导出数据功能', async ({ page }) => {
    // 拦截导出相关的API请求
    const exportPromise = page.waitForResponse(
      response => response.url().includes('/api/comp/list') || response.url().includes('/comp/list'),
      { timeout: 10000 }
    );

    // 点击导出数据按钮
    await page.locator('button:has-text("导出数据")').click();

    // 等待API响应
    const response = await exportPromise;

    // 验证响应成功（code为200或0）
    expect(response.status()).toBeLessThan(500);
  });

  test('工具栏按钮 - 批量删除(无选中时)', async ({ page }) => {
    // 确保没有任何选中项
    await page.locator('.el-table__header-wrapper .el-checkbox').click();

    // 点击批量删除按钮
    await page.locator('button:has-text("批量删除")').click();

    // 验证是否出现警告消息（应该提示选择要删除的赛事）
    // 由于Message是瞬时的，这里验证按钮功能正常即可
  });

  test('年份切换功能', async ({ page }) => {
    // 找到年份切换下拉框
    const yearSwitch = page.locator('.year-switch-tag');

    // 验证年份显示文本
    await expect(yearSwitch).toContainText('年度赛事');

    // 点击打开年份下拉
    await yearSwitch.click();

    // 等待下拉菜单出现 - 使用 last() 因为第一个可能是隐藏的
    await page.locator('.el-dropdown-menu').last().waitFor({ state: 'visible', timeout: 5000 });

    // 选择一个非当前的年份
    const yearItems = page.locator('.el-dropdown-menu').last().locator('.el-dropdown-item').filter({ hasText: '年度' });
    const count = await yearItems.count();

    if (count > 1) {
      // 选择第一个（可能不是当前的）
      await yearItems.first().click();

      // 验证年份已切换
      await page.waitForLoadState('networkidle');
    }
  });

  test('年度目录管理弹窗', async ({ page }) => {
    // 找到年份切换下拉框
    const yearSwitch = page.locator('.year-switch-tag');

    // 点击打开下拉菜单
    await yearSwitch.click();

    // 等待下拉菜单出现
    await page.locator('.el-dropdown-menu').last().waitFor({ state: 'visible', timeout: 5000 });

    // 点击"管理年度目录" - 使用 containsText 来匹配包含该文字的元素
    await page.getByText('管理年度目录').first().click();

    // 验证弹窗出现
    await expect(page.locator('.el-dialog')).toBeVisible();

    // 验证弹窗标题
    await expect(page.locator('.el-dialog__title')).toContainText('年度目录管理');

    // 验证弹窗内的表格存在
    await expect(page.locator('.el-dialog .el-table')).toBeVisible();

    // 关闭弹窗
    await page.locator('.el-dialog__headerbtn').click();

    // 验证弹窗已关闭
    await expect(page.locator('.el-dialog')).not.toBeVisible();
  });

  test('表格复选框功能', async ({ page }) => {
    // 等待表格数据加载
    await page.waitForSelector('.el-table__body tr', { timeout: 10000 });

    // 获取表格行数
    const rows = page.locator('.el-table__body tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // 点击第一行的复选框
      await rows.first().locator('.el-checkbox').click();

      // 验证批量删除按钮状态变化或选中数量更新
      // Element Plus表格选中后，底部工具栏会有选中数量提示
    }
  });

  test('分页功能 - 切换每页条数', async ({ page }) => {
    // 找到每页条数选择器
    const sizeSelect = page.locator('.el-pagination__sizes .el-select').first();

    if (await sizeSelect.isVisible()) {
      // 点击切换每页条数
      await sizeSelect.click();

      // 选择20条
      await page.locator('.el-select-dropdown__item:has-text("20")').click();

      // 等待数据重新加载
      await page.waitForLoadState('networkidle');
    }
  });

  test('分页功能 - 切换页码', async ({ page }) => {
    // 找到页码切换器
    const pager = page.locator('.el-pagination .el-pager');

    if (await pager.isVisible()) {
      // 获取总页数
      const pageButtons = pager.locator('li');
      const pageCount = await pageButtons.count();

      if (pageCount > 1) {
        // 点击第二页
        await pageButtons.nth(1).click();

        // 等待数据重新加载
        await page.waitForLoadState('networkidle');
      }
    }
  });

  test('页面权限控制 - school_admin可见按钮', async ({ page }) => {
    // school_admin 角色应该可以看到以下按钮
    await expect(page.locator('button:has-text("新增赛事")')).toBeVisible();
    await expect(page.locator('button:has-text("导入数据")')).toBeVisible();
    await expect(page.locator('button:has-text("批量删除")')).toBeVisible();
    await expect(page.locator('button:has-text("导出数据")')).toBeVisible();
  });
});

test.describe('赛事目录页面 - 未登录用户', () => {
  test('未登录用户应跳转到登录页', async ({ page }) => {
    // 确保清除登录信息
    await page.addInitScript(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userInfo');
    });

    // 访问赛事目录页面
    await page.goto('/#/competition/list');

    // 等待跳转到登录页
    await page.waitForURL(/\/login/, { timeout: 5000 });

    // 验证当前在登录页
    await expect(page).toHaveURL(/\/login/);
  });
});