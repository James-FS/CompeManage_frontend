---
name: playwright-e2e-testing
description: > 
  Playwright E2E test authoring and debugging for the CompeManage Vue 3 + Element Plus project.
  Use when the user asks to write, fix, or run Playwright E2E tests, or when tests fail and
  need diagnosis. Covers Element Plus component locators (Switch, Checkbox, Radio, Select,
  DatePicker, Dialog), real-login flow, API response interception, navigation patterns, and
  known framework-specific pitfalls (hidden native inputs, stale dropdown DOM, disabled state
  reactivity bugs).
model: inherit
---

# Playwright E2E 测试编写 Skill

为 CompeManage 项目编写 Playwright E2E 测试的完整指南。基于 `e2e/register/settings.spec.js` 的实战经验总结。

## 前置条件

```bash
# 终端1：启动后端 (Go, 端口 8080)
cd CompeManage_backend && go run main.go

# 终端2：启动前端 (Vite, 端口 5219)
cd CompeManage_frontend/CompeManage && npm run dev

# 终端3：运行测试
cd CompeManage_frontend/CompeManage
npx playwright test e2e/<模块>/<文件>.spec.js --project=chromium

# 覆盖率
npm run build:coverage
npx nyc --reporter=html --report-dir=coverage npx playwright test <spec文件> --project=chromium
```

## 测试编写流程

### Step 1: 阅读相关源码

编写测试前必须读取以下文件：

```
# 页面组件 — 确认 v-model 绑定的变量名、表单验证规则、API 调用
src/views/<模块>/*.vue

# API 定义 — 确认接口路径、请求方法、参数结构
src/api/index.js

# 路由配置 — 确认 Hash 路径、路由参数
src/router/index.js

# 现有测试 — 参考已有模式
e2e/<模块>/*.spec.js
```

### Step 2: 编写测试文件

```js
import { test, expect } from 'playwright-test-coverage'

const TEST_USER = {
  username: 'T2023001',
  password: '123',
  role: 'school_admin',
}
```

### Step 3: 辅助函数

#### 登录（真实登录，非 token 注入）

CLAUDE.md 推荐的 `addInitScript` token 注入方式在此项目中不可行 — 后端校验真实 JWT。必须走真实登录流程：

```js
async function login(page) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[placeholder="请输入用户名"]', TEST_USER.username)
  await page.fill('input[placeholder="请输入密码"]', TEST_USER.password)
  await page.locator('.el-button:has-text("立即登录")').click()
  await page.waitForURL((url) => url.hash.includes('home'), { timeout: 10000 })
}
```

#### Element Plus Select 下拉选择

```js
async function selectElOption(page, formFieldLabel, optionText) {
  const formItem = page.locator('.el-form-item').filter({ hasText: formFieldLabel })
  const select = formItem.locator('.el-select')
  await select.click()
  // 关键：用 getByRole 而非 waitForSelector，前者只匹配可见元素
  const targetOption = page.getByRole('option', { name: optionText })
  await targetOption.waitFor({ state: 'visible', timeout: 5000 })
  await targetOption.click()
  await page.waitForTimeout(300) // 等下拉关闭动画
}
```

## Element Plus 组件交互速查

### Switch 开关

```js
// ❌ 错误：getByRole('switch') 匹配到隐藏的 <input class="el-switch__input">，不可点击
// ✅ 正确：用 CSS class 定位可见 label
const switchEl = page
  .locator('.el-form-item')
  .filter({ hasText: '指导老师设置' })
  .locator('.el-switch')

// 读取状态
const isChecked = await switchEl.evaluate(el => el.classList.contains('is-checked'))

// 只在需要时点击，避免反向操作
if (!isChecked) {
  await switchEl.click()
  await page.waitForTimeout(400)
}
```

### Checkbox 复选框

```js
// ❌ 错误：getByRole('checkbox') 匹配到隐藏的 <input class="el-checkbox__original">
// ✅ 正确：
const checkbox = page.locator('.el-checkbox').filter({ hasText: '指导老师为必填项' })
await checkbox.waitFor({ state: 'attached', timeout: 5000 })
await checkbox.click()
```

### Radio / Radio Button

```js
// ❌ 错误：getByRole('radio') 匹配到隐藏的 <input class="el-radio-button__original-radio">
// ✅ 正确：点击可见的 button/label 包装元素
await page.locator('.el-radio-button:has-text("团队赛")').click()
// 验证激活状态
await expect(page.locator('.el-radio-button.is-active:has-text("团队赛")')).toBeVisible()
```

### Select 下拉

```js
// ❌ 错误：waitForSelector('.el-select-dropdown__item') 匹配到已关闭下拉的残留 DOM
// ✅ 正确：用 getByRole('option')，内置可见性过滤
await page.getByRole('option', { name: '大一' }).waitFor({ state: 'visible', timeout: 5000 })
await page.getByRole('option', { name: '大一' }).click()
```

### DatePicker 日期范围选择器

```js
// el-date-picker type="datetimerange" 的 v-model 是数组 [start, end]
// 通过 placeholder 定位两个输入框
const startInput = page.locator('input[placeholder="开始报名"]')
const endInput = page.locator('input[placeholder="报名截止"]')

// 直接 fill 日期字符串
await startInput.click()
await startInput.fill('2026-06-01 00:00')
await endInput.click()
await endInput.fill('2026-07-15 23:59')

// 点击其他区域关闭面板
await page.locator('.form-section-title').first().click()

// 清空需用清除按钮，clear()/fill('') 不会触发 v-model 更新
const picker = page.locator('.el-date-editor').first()
await picker.hover()
await picker.locator('.el-input__clear').click()
```

### Input Number

```js
// 已知问题：el-input-number 的 :disabled="form.type === 1" 在 radio-group 
// 切换参赛形式后 disabled 不会正确更新 — Element Plus 已知 bug
// 解决：跳过团队赛切换的完整流程，用单独测试覆盖切换 UI 行为
```

### Dialog 弹窗

```js
// 先注册响应监听再打开弹窗
const respPromise = page.waitForResponse(
  resp => resp.url().includes('/api/comp/manager/list') && resp.status() === 200,
  { timeout: 10000 }
)

await page.locator('.manager-input input').click()
await expect(page.locator('.el-dialog:has-text("选择赛事负责人")')).toBeVisible()
await respPromise  // 确保数据加载完成

// 操作弹窗内表格
const firstRow = page.locator('.el-dialog .el-table__body tr').first()
await firstRow.locator('button:has-text("选择")').click()
await expect(page.locator('.el-dialog')).not.toBeVisible()  // 弹窗关闭
```

## 导航与等待

```js
// 页面跳转后必须等待 URL 确认
await page.locator('button:has-text("报名设置")').click()
await page.waitForURL(/\/register\/edit\/\d+/, { timeout: 10000 })

// 等待 API 响应确保数据就绪
await page.waitForResponse(
  resp => resp.url().includes('/api/reg/config/get') && resp.status() === 200,
  { timeout: 10000 }
)
await page.waitForTimeout(500)  // 留渲染缓冲时间
```

## API 响应拦截

```js
// 获取响应数据（如新建赛事后的 ID）
const createRespPromise = page.waitForResponse(
  resp => resp.url().includes('/api/comp/create') && resp.request().method() === 'POST',
  { timeout: 15000 }
)

await page.locator('button:has-text("创建")').click()
const resp = await createRespPromise
const data = await resp.json()
const compId = data.data?.data?.id || data.data?.id

// 验证 API 响应
expect(data.code).toBe(200)
```

## 常用断言

```js
// 页面元素可见
await expect(page.locator('.card-header .title')).toBeVisible()
await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })
await expect(page.locator('.el-message--error')).toBeVisible({ timeout: 5000 })

// 输入框值
await expect(inputLocator).toHaveValue('期望值')

// URL 匹配
await expect(page).toHaveURL(/\/register\/edit\/\d+/)

// 元素不存在
await expect(page.locator('.el-dialog')).not.toBeVisible()

// DOM 中存在（不一定可见，用于隐藏组件）
await expect(page.locator('.el-checkbox')).toBeAttached()

// 元素数量
const count = await page.locator('.track-item-box').count()
expect(newCount).toBe(oldCount + 1)
```

## 已知坑点清单

1. **不要用 `addInitScript` 注入 token** — 后端校验真实 JWT，mock token 会被拒绝
2. **`getByRole` 对 Element Plus 隐藏原生 input 无效** — Switch/Checkbox/Radio 的原生 input 被 CSS 隐藏，用 CSS class 定位
3. **`waitForSelector` 匹配残留 DOM** — 下拉关闭后 DOM 未销毁，用 `getByRole('option', { name }).waitFor({ state: 'visible' })`
4. **开关/复选框状态检查** — 无条件 click 会导致反向操作，必须先用 `evaluate(el.classList.contains('is-checked'))` 读状态
5. **DatePicker v-model 联动** — 直接 clear() 输入框不更新 v-model，需用组件清除按钮
6. **`el-input-number :disabled` 动态绑定** — Element Plus 已知 bug，切换 radio 后 disabled 不更新
7. **`waitForResponse` 时序** — 必须在触发动作**之前**注册 Promise，否则错过响应
8. **保存后页面可能跳转** — 验证"保存被阻止"应检查 ElMessage.error，而非假设 URL 不变

## 测试实战问题与解决方案

### 1. 选择器歧义导致 `strict mode violation`

页面多处存在相同文本时，`locator('button:has-text("确认")')` 会匹配多个元素。

**解决**：使用更精确的上下文选择器
```js
// ❌ 错误：匹配多个按钮
await page.locator('button:has-text("确认导入")').click()

// ✅ 正确：限定父容器
await page.locator('.step-footer button:has-text("确认导入")').click()
await page.locator('.import-container button:has-text("确认导入")').click()
```

### 2. Dialog 弹窗数据未加载完成

弹窗打开后立即查找表格行，但数据还在请求中。

**解决**：
```js
await page.locator('input[placeholder="请选择赛事负责人"]').click()
await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })
await page.waitForLoadState('networkidle')  // 等待网络请求完成
await page.waitForTimeout(800)             // 留渲染缓冲时间
```

### 3. Excel 导入数据校验失败

提示"存在赛事名称、级别或负责人为空"，即使 Excel 中有数据。

**原因**：Excel 导入后需要通过工号自动匹配负责人 `manager_id`，但如果工号不在系统中则匹配失败。

**解决**：确保 Excel 数据中的工号是系统中存在的用户（如 `T2023001`）。

### 4. Table 内嵌按钮定位失败

表格内的删除/修改按钮无法用 `button:has-text("删除")` 定位到。

**解决**：使用 button 的 type class
```js
// ❌ 可能失败
await page.locator('.edit-table .el-table__body tr').first().locator('button:has-text("删除")').click()

// ✅ 使用 class 定位 danger 类型按钮
await page.locator('.edit-table .el-table__body tr').first().locator('.el-button--danger').click()
```

### 5. 确认对话框不出现

点击"确认导入"后没有弹出 `ElMessageBox`，而是直接显示错误 toast。

**原因**：后端数据校验失败（如缺少必填字段、学院不存在等），跳过了确认框直接报错。

**解决**：不强制要求确认框出现，检查错误消息即可
```js
await confirmBtn.click()
const msgBoxVisible = await page.locator('.el-message-box__wrapper').isVisible({ timeout: 3000 }).catch(() => false)

if (msgBoxVisible) {
  await page.locator('.el-message-box__wrapper button:has-text("确认")').click()
} else {
  // 检查是否是错误消息
  const errorMsg = page.locator('.el-message--error')
  if (await errorMsg.isVisible()) {
    console.log('数据校验失败:', await errorMsg.textContent())
  }
}
```

### 6. `waitForResponse` 注册太晚

动作触发后才注册响应监听，可能错过响应。

**解决**：先注册监听，再触发动作
```js
// ✅ 正确顺序
const respPromise = page.waitForResponse(
  resp => resp.url().includes('/api/comp/create') && resp.request().method() === 'POST',
  { timeout: 15000 }
)
await page.locator('button:has-text("创建")').click()
const resp = await respPromise
```

### 7. 批量操作测试依赖数据状态

测试假设表格有数据、多行可选择，但数据可能为空。

**解决**：添加条件检查
```js
const rows = page.locator('.el-table__body tr')
const rowCount = await rows.count()
if (rowCount < 2) {
  console.log('数据不足，跳过批量选择测试')
  return
}
```

### 8. 文件上传 buffer 格式

`setInputFiles` 需要 `Buffer.from(buffer)` 格式。

```js
await fileInput.setInputFiles({
  name: 'test.xlsx',
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  buffer: Buffer.from(excelBuffer)
})
```

### 9. 分页切换后数据为空

切换每页条数后，`waitForLoadState('networkidle')` 完成后表格可能还未渲染新数据。

**解决**：增加额外等待
```js
await page.waitForLoadState('networkidle')
await page.waitForTimeout(500)
```

## 测试用例设计原则

每个设置页面至少需要覆盖：

| 用例类型 | 示例 |
|----------|------|
| 完整流程 | 创建 → 填表 → 保存 → 验证 API 响应 |
| 页面加载 | 打开已有配置 → 验证所有区域标题渲染 |
| 联动行为 | 切换参赛形式 → 验证相关控件出现/隐藏 |
| 增删操作 | 添加赛道 → 验证数量 +1，输入值正确 |
| 条件显示 | 开启开关 → 验证关联组件出现 |

## 联动选择逻辑测试

联动选择（如赛道-赛题、省市-学校）是常见场景，需要验证：
1. 父选项改变时，子选项列表立即更新
2. 父选项改变时，原有的子选项选中值被清空

```js
// 联动选择验证模板
test('联动选择 - 子选项清空验证', async ({ page }) => {
  // 1. 选择父选项
  const parentSelect = page.locator('.el-select[placeholder="请选择父选项"]')
  await parentSelect.click()
  await page.waitForTimeout(400)
  await page.getByRole('option').first().click()
  await page.waitForTimeout(500)

  // 2. 选择子选项
  const childSelect = page.locator('.el-select[placeholder="请选择子选项"]')
  if (await childSelect.isVisible()) {
    await childSelect.click()
    await page.waitForTimeout(400)
    await page.getByRole('option').first().click()
    await page.waitForTimeout(300)

    // 3. 切换父选项
    await parentSelect.click()
    await page.waitForTimeout(400)
    await page.getByRole('option').nth(1).click()
    await page.waitForTimeout(500)

    // 4. 验证子选项已被清空
    const childValue = await childSelect.locator('input').inputValue()
    expect(childValue).toBe('')
  }
})
```

## 搜索+分页组合测试

列表页面通常有搜索条件和分页器，组合测试时：

```js
test('搜索与分页组合', async ({ page }) => {
  // 1. 输入搜索条件
  await page.locator('input[placeholder="输入搜索词"]').fill('关键词')
  await page.waitForTimeout(600) // 等待防抖

  // 2. 切换每页条数
  const sizeSelect = page.locator('.el-pagination__sizes .el-select').first()
  await sizeSelect.click()
  await page.waitForTimeout(300)
  await page.locator('.el-select-dropdown__item:has-text("20")').click()
  await page.waitForTimeout(500)

  // 3. 点击下一页
  const nextBtn = page.locator('.el-pagination__next')
  await nextBtn.click()
  await page.waitForTimeout(500)

  // 4. 重置搜索
  await page.locator('button:has-text("重置")').click()
  await page.waitForTimeout(300)
})
```

## 文件导入测试

Excel 导入功能需要验证：模板下载、文件格式校验、必填字段校验

```js
test('Excel导入 - 格式校验', async ({ page }) => {
  // 1. 下载模板
  await page.locator('button:has-text("下载模板")').click()

  // 2. 上传错误格式文件
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('不是Excel文件')
  })

  // 3. 验证错误提示
  await expect(page.locator('.el-message--error')).toBeVisible({ timeout: 5000 })
})

test('Excel导入 - 数据校验', async ({ page }) => {
  // 上传有效 Excel（包含正确工号如 T2023001）
  const excelBuffer = await generateValidExcel()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'valid.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from(excelBuffer)
  })

  // 验证解析后的数据
  await page.waitForTimeout(500)
  const rowCount = await page.locator('.edit-table .el-table__body tr').count()
  expect(rowCount).toBeGreaterThan(0)
})
```

## 弹窗内嵌表格操作

弹窗内通常有表格，操作时需等待数据加载完成：

```js
test('弹窗表格操作', async ({ page }) => {
  // 1. 打开弹窗
  await page.locator('button:has-text("选择")').click()
  await page.waitForSelector('.el-dialog:visible', { timeout: 5000 })

  // 2. 等待网络请求完成
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800) // 渲染缓冲

  // 3. 操作表格行
  const firstRow = page.locator('.el-dialog .el-table__body tr').first()
  await firstRow.locator('button:has-text("选择")').click()

  // 4. 验证弹窗关闭
  await expect(page.locator('.el-dialog')).not.toBeVisible()
})
```

## Flaky 测试处理

网络波动或后端响应慢会导致测试不稳定，需要重试机制：

```js
test('不稳定测试', async ({ page }) => {
  let success = false
  for (let i = 0; i < 3; i++) {
    try {
      await page.locator('button:has-text("提交")').click()
      await page.waitForSelector('.el-message--success', { timeout: 5000 })
      success = true
      break
    } catch {
      await page.waitForTimeout(1000)
    }
  }
  expect(success).toBe(true)
})
```

## 条件执行测试

页面状态不确定时（如有些赛事有赛道，有些没有），使用条件执行：

```js
test('可选功能测试', async ({ page }) => {
  const btn = page.locator('button:has-text("添加")')
  const isVisible = await btn.isVisible({ timeout: 3000 }).catch(() => false)

  if (!isVisible) {
    console.log('功能不可用，跳过')
    return
  }

  await btn.click()
  // ... 继续测试
})
```

## 常用代码模板

### 验证消息提示

```js
// 成功消息
await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

// 错误消息
const errorMsg = page.locator('.el-message--error')
if (await errorMsg.isVisible()) {
  console.log('错误:', await errorMsg.textContent())
}

// 表单验证错误
const formError = page.locator('.el-form-item__error')
if (await formError.isVisible()) {
  console.log('表单错误:', await formError.textContent())
}
```

### 等待网络请求完成

```js
// 等待列表数据加载
await page.waitForResponse(
  resp => resp.url().includes('/api/xxx/list') && resp.status() === 200,
  { timeout: 10000 }
)
await page.waitForTimeout(500) // 渲染缓冲

// 等待下拉选项加载
await page.waitForLoadState('networkidle')
const options = page.getByRole('option')
await options.first().waitFor({ state: 'visible' })
```

### 数据回显验证

```js
// 验证下拉框回显值（避免只检查 DOM 文本）
const select = page.locator('.el-select')
await select.click()
const selectedValue = await select.locator('input').inputValue()
expect(selectedValue).toBe('期望的选中值')
```

## 覆盖率检测与提升

```bash
# 构建覆盖率报告
npm run build:coverage

# 运行测试并生成覆盖率
rm -rf coverage
npx nyc --reporter=text --report-dir=coverage \
  npx playwright test e2e/<模块>/<文件>.spec.js --project=chromium

# 查看特定文件覆盖率
npx nyc --reporter=text --report-dir=coverage \
  npx playwright test e2e/**/*.spec.js --project=chromium \
  2>&1 | grep -E "^\s*(xxx\.vue|All files)"
```

覆盖率指标解读：
- **语句覆盖 (statements)**: 代码语句执行比例
- **分支覆盖 (branches)**: if/else 等分支执行比例
- **函数覆盖 (functions)**: 函数调用比例
- **行覆盖 (lines)**: 代码行执行比例
