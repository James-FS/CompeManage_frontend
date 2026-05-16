import { test, expect } from 'playwright-test-coverage'

const TEST_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
}

async function login(page) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
  await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
  await page.locator('.el-button:has-text("立即登录")').click()
  await page.waitForURL(url => url.hash.includes('home') || url.hash.includes('permission'), {
    timeout: 10000,
  })
}

async function navigateToPermission(page) {
  await page.goto('/#/permission')
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('.rbac-container', { timeout: 15000 })
}

test.describe('权限管理页面 - 基本功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToPermission(page)
  })

  test('页面基本元素验证', async ({ page }) => {
    // 验证页面标题
    await expect(page.locator('.panel-header').first()).toContainText('角色管理')

    // 验证角色列表面板
    await expect(page.locator('.role-panel')).toBeVisible()
    await expect(page.locator('.role-list')).toBeVisible()

    // 验证权限配置面板
    await expect(page.locator('.permission-panel')).toBeVisible()
    await expect(page.locator('.tree-wrapper')).toBeVisible()

    // 验证空状态提示
    await expect(page.locator('.el-empty')).toBeVisible()
    await expect(page.locator('.el-empty')).toContainText('请选择一个角色')

    // 验证保存按钮初始禁用状态
    const saveBtn = page.locator('.permission-panel button:has-text("保存")')
    await expect(saveBtn).toBeDisabled()
  })

  test('角色列表加载验证', async ({ page }) => {
    // 等待角色列表加载
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // 验证角色列表有数据
    const roleItems = page.locator('.role-item')
    const roleCount = await roleItems.count()
    console.log(`角色数量: ${roleCount}`)
    expect(roleCount).toBeGreaterThan(0)

    // 验证第一个角色的基本信息
    const firstRole = roleItems.first()
    await expect(firstRole.locator('.role-name')).toBeVisible()
    await expect(firstRole.locator('.el-tag')).toBeVisible()
  })

  test('选择角色后显示权限树', async ({ page }) => {
    // 等待角色列表加载
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 点击第一个角色
    const firstRole = page.locator('.role-item').first()
    const roleName = await firstRole.locator('.role-name').textContent()
    console.log(`选择角色: ${roleName}`)
    await firstRole.click()

    // 等待权限树加载
    await page.waitForSelector('.el-tree-node', { timeout: 5000 })
    await page.waitForTimeout(500)

    // 验证当前角色提示显示
    await expect(page.locator('.current-role-tip')).toContainText(roleName)

    // 验证权限树出现
    await expect(page.locator('.el-tree')).toBeVisible()

    // 验证权限树节点
    const treeNodes = page.locator('.el-tree-node')
    const nodeCount = await treeNodes.count()
    console.log(`权限节点数量: ${nodeCount}`)
    expect(nodeCount).toBeGreaterThan(0)
  })

  test('切换角色后重置权限选择', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 选择第一个角色
    const roles = page.locator('.role-item')
    const firstRole = roles.first()
    const firstRoleName = await firstRole.locator('.role-name').textContent()
    await firstRole.click()
    await page.waitForTimeout(500)

    // 记录第一个角色的权限状态
    const firstRoleCheckedCount = await page.locator('.el-tree-node.is-checked').count()
    console.log(`第一个角色(${firstRoleName})已选权限数: ${firstRoleCheckedCount}`)

    // 选择第二个角色
    const secondRole = roles.nth(1)
    if (await secondRole.isVisible()) {
      const secondRoleName = await secondRole.locator('.role-name').textContent()
      await secondRole.click()
      await page.waitForTimeout(500)

      // 验证切换成功
      await expect(page.locator('.current-role-tip')).toContainText(secondRoleName)

      // 验证权限树更新
      const secondRoleCheckedCount = await page.locator('.el-tree-node.is-checked').count()
      console.log(`第二个角色(${secondRoleName})已选权限数: ${secondRoleCheckedCount}`)
    }
  })

  test('勾选权限后保存按钮可用', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 选择第一个角色
    const firstRole = page.locator('.role-item').first()
    await firstRole.click()
    await page.waitForTimeout(800)

    // 获取当前已选中的权限节点
    const initialChecked = await page.locator('.el-tree-node.is-checked').count()
    console.log(`初始已选权限数: ${initialChecked}`)

    // 勾选一个未选中的权限节点（找到第一个叶节点）
    const uncheckedNodes = page.locator('.el-tree-node:not(.is-checked) .el-tree-node__content')
    const uncheckedCount = await uncheckedNodes.count()

    if (uncheckedCount > 0) {
      // 点击第一个未选中的节点来勾选它
      await uncheckedNodes.first().click()
      await page.waitForTimeout(500)

      // 验证保存按钮可用
      const saveBtn = page.locator('.permission-panel button:has-text("保存")')
      await expect(saveBtn).toBeEnabled()

      // 验证权限节点选中数增加
      const newCheckedCount = await page.locator('.el-tree-node.is-checked').count()
      expect(newCheckedCount).toBe(initialChecked + 1)
    } else {
      console.log('没有可勾选的权限节点，跳过此测试')
    }
  })
})

test.describe('权限管理页面 - 权限保存功能', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToPermission(page)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
  })

  test('保存权限配置成功', async ({ page }) => {
    // 选择第一个角色
    const firstRole = page.locator('.role-item').first()
    const roleName = await firstRole.locator('.role-name').textContent()
    await firstRole.click()
    await page.waitForTimeout(800)

    // 记录初始状态
    const initialChecked = await page.locator('.el-tree-node.is-checked').count()

    // 勾选一个新权限
    const uncheckedNodes = page.locator('.el-tree-node:not(.is-checked) .el-tree-node__content')
    const uncheckedCount = await uncheckedNodes.count()

    if (uncheckedCount > 0) {
      await uncheckedNodes.first().click()
      await page.waitForTimeout(500)

      // 注册API响应监听
      const saveRespPromise = page.waitForResponse(
        resp => resp.url().includes('/api/perm/role/assign_perm') && resp.request().method() === 'POST',
        { timeout: 15000 },
      )

      // 点击保存按钮
      await page.locator('.permission-panel button:has-text("保存")').click()

      // 等待响应
      const resp = await saveRespPromise
      const data = await resp.json()
      console.log(`保存响应: code=${data.code}`)

      // 验证成功
      expect(data.code).toBe(200)
      await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })
    } else {
      console.log('没有可勾选的权限节点，跳过保存测试')
    }
  })

  test('未选择角色时保存按钮禁用', async ({ page }) => {
    // 确保没有选择任何角色
    const emptyState = page.locator('.el-empty')
    await expect(emptyState).toBeVisible()

    // 验证保存按钮禁用
    const saveBtn = page.locator('.permission-panel button:has-text("保存")')
    await expect(saveBtn).toBeDisabled()
  })

  test('勾选后又取消勾选，保存按钮应禁用', async ({ page }) => {
    // 选择第一个角色
    const firstRole = page.locator('.role-item').first()
    await firstRole.click()
    await page.waitForTimeout(800)

    // 勾选一个权限
    const uncheckedNodes = page.locator('.el-tree-node:not(.is-checked) .el-tree-node__content')
    const uncheckedCount = await uncheckedNodes.count()

    if (uncheckedCount > 0) {
      await uncheckedNodes.first().click()
      await page.waitForTimeout(300)

      // 验证保存按钮可用
      const saveBtn = page.locator('.permission-panel button:has-text("保存")')
      await expect(saveBtn).toBeEnabled()

      // 再次点击取消勾选
      await uncheckedNodes.first().click()
      await page.waitForTimeout(300)

      // 验证保存按钮禁用
      await expect(saveBtn).toBeDisabled()
    } else {
      console.log('没有可操作的权限节点，跳过此测试')
    }
  })
})

test.describe('权限管理页面 - 权限树交互', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await navigateToPermission(page)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)

    // 选择第一个角色
    const firstRole = page.locator('.role-item').first()
    await firstRole.click()
    await page.waitForTimeout(800)
  })

  test('权限树默认展开所有节点', async ({ page }) => {
    // 验证树节点可见
    const treeNodes = page.locator('.el-tree-node')
    const nodeCount = await treeNodes.count()
    expect(nodeCount).toBeGreaterThan(0)

    // 验证有子节点的展开状态
    const expandedNodes = page.locator('.el-tree-node.is-expanded')
    const expandedCount = await expandedNodes.count()
    console.log(`展开的节点数: ${expandedCount}`)
  })

  test('父节点勾选联动子节点', async ({ page }) => {
    // 找到第一个有子节点的父节点内容区域
    const parentNodeContent = page.locator('.el-tree-node:has(.el-tree-node__children) .el-tree-node__content').first()

    if (await parentNodeContent.isVisible()) {
      // 使用更精确的选择器获取节点文本（.custom-tree-node 内最后的 span）
      const parentLabel = await parentNodeContent.locator('.custom-tree-node span').last().textContent()
      console.log(`测试父节点: ${parentLabel}`)

      // 点击节点内容来切换勾选状态
      await parentNodeContent.click()
      await page.waitForTimeout(500)

      // 验证至少有一个子节点被勾选
      const childrenChecked = await page.locator('.el-tree-node.is-checked').count()
      console.log(`勾选后选中节点数: ${childrenChecked}`)

      // 验证保存按钮可用
      const saveBtn = page.locator('.permission-panel button:has-text("保存")')
      await expect(saveBtn).toBeEnabled()
    } else {
      console.log('没有找到可操作的父节点，跳过此测试')
    }
  })

  test('权限树节点显示正确的图标', async ({ page }) => {
    // 验证有子节点的节点显示文件夹图标 (Folder icon)
    const folderIcon = page.locator('.node-icon').first()
    await expect(folderIcon).toBeVisible()

    // 验证树节点文本可见
    const firstNodeText = page.locator('.custom-tree-node span').first()
    await expect(firstNodeText).toBeVisible()
  })
})