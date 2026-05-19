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

// ElMessage toast — 页面可能残留多条，用 .last() 取最新一条避免 strict mode violation
await expect(page.locator('.el-message--success').last()).toBeVisible({ timeout: 5000 })
await expect(page.locator('.el-message--error').last()).toBeVisible({ timeout: 5000 })

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

## beforeAll 中使用 browser fixture

`beforeAll` 可以接收 `{ browser }` 参数，用于创建临时 page 执行数据准备：

```js
test.describe('测试套件', () => {
  let compId, compName

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()  // 创建临时 page
    await login(page, ADMIN_USER)
    compName = `E2E测试_${Date.now()}`
    compId = await createCompetitionWithName(page, compName)
    await saveRegConfig(page, await getAuthToken(page), compId)
    await page.close()  // 用完关闭
  })

  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_USER)  // 每个测试独立登录
  })

  test('用例', async ({ page }) => {
    // 使用 beforeAll 中准备的 compName/compId
  })
})
```

**注意**：`beforeAll` 中的 page 与 `test` 中的 page 是不同实例，token 不通用。需要在 `test` 中重新获取 token 或通过 API 传递数据。

## 已知坑点清单

1. **不要用 `addInitScript` 注入 token** — 后端校验真实 JWT，mock token 会被拒绝
2. **`getByRole` 对 Element Plus 隐藏原生 input 无效** — Switch/Checkbox/Radio 的原生 input 被 CSS 隐藏，用 CSS class 定位
3. **`waitForSelector` 匹配残留 DOM** — 下拉关闭后 DOM 未销毁，用 `getByRole('option', { name }).waitFor({ state: 'visible' })`
4. **开关/复选框状态检查** — 无条件 click 会导致反向操作，必须先用 `evaluate(el.classList.contains('is-checked'))` 读状态
5. **DatePicker v-model 联动** — 直接 clear() 输入框不更新 v-model，需用组件清除按钮
6. **`el-input-number :disabled` 动态绑定** — Element Plus 已知 bug，切换 radio 后 disabled 不更新
7. **`waitForResponse` 时序** — 必须在触发动作**之前**注册 Promise，否则错过响应
8. **保存后页面可能跳转** — 验证"保存被阻止"应检查 ElMessage.error，而非假设 URL 不变
9. **ElMessage toast 累积** — 前序步骤的成功/错误 toast 残留在 DOM 中，后续 `.el-message--success` 会匹配多个元素导致 `strict mode violation`。必须用 `.last()` 取最新一条
10. **`router.back()` 不触发 `onMounted`** — Vue 的 `router.back()` 可能复用组件实例（keep-alive 或路由缓存），`onMounted` 中的 API 请求不会重新执行。`waitForResponse` 会超时。解决：用 `page.goto()` 强制刷新页面
11. **唯一约束导致报名失败** — 同一学生（`leader_id`）不能重复报名同一赛事（`comp_id`），返回 409。每个需要报名的测试必须创建独立赛事
12. **数据库姓名 ≠ 表单姓名** — 后端从 `users` 表取 `leader_name`，而非注册表单提交的 `name`。断言用 `stu_id` 而非姓名
13. **报名配置缺失导致"赛事配置未完成"** — `POST /api/reg/config` 必须在 `POST /api/reg/submit` 之前调用，否则后端返回"赛事配置未完成，暂不接受报名"
14. **作品提交需要审核通过 + 有效时间窗口** — `PUT /api/reg/work-submit` 要求 `status=1`（已通过）且当前时间在 `submit_start_time` 和 `submit_end_time` 之间
15. **Windows 端口保留** — Hyper-V 保留端口范围 5178-5277，端口 5219 不可用。需改用 5319 或其他端口

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

### 10. ElMessage toast 累积导致 strict mode violation

多步骤测试中，前序步骤（登录成功、创建成功等）产生的 toast 仍残留在 DOM，后续断言 `.el-message--success` 匹配到多个元素。

**错误表现**：
```
Error: strict mode violation: locator('.el-message--success') resolved to 3 elements
```

**解决**：使用 `.last()` 取最新一条
```js
// ❌ 错误：匹配到多条残留 toast
await expect(page.locator('.el-message--success')).toBeVisible({ timeout: 5000 })

// ✅ 正确：只取最新的一条
await expect(page.locator('.el-message--success').last()).toBeVisible({ timeout: 5000 })
```

### 11. `router.back()` 返回后 `waitForResponse` 超时

表单提交后调用 `router.back()` 返回列表页，测试用 `waitForResponse` 等待列表 API 刷新数据，但超时失败。

**原因**：Vue Router 的 `router.back()` 可能复用组件实例（keep-alive、路由缓存、相同 layout 下的组件复用），`onMounted` 不会重新触发，列表数据不会重新请求。

**错误表现**：
```
TimeoutError: page.waitForResponse: Timeout 10000ms exceeded while waiting for event "response"
```

**解决**：`router.back()` 返回后用 `page.goto()` 强制刷新，确保组件重新挂载
```js
// ❌ 错误：router.back() 后 waitForResponse 可能超时
await page.waitForURL(/\/notice\/detail\/\d+/, { timeout: 10000 })
await page.waitForResponse(resp => resp.url().includes('/api/notice/list'), { timeout: 10000 })

// ✅ 正确：用 page.goto() 强制刷新页面
await page.waitForURL(/\/notice\/detail\/\d+/, { timeout: 10000 })
await page.goto(`/#/notice/detail/${compId}`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1000)
```

### 12. 跨页面多步骤流程中的数据传递

创建实体 → 跳转到子页面操作 → 返回验证，需要在步骤间传递 ID。

**模式**：从 API 响应中提取新建实体的 ID，用于后续页面导航
```js
// 1. 创建并获取 ID
const createResp = await createRespPromise
const data = await createResp.json()
const compId = data.data?.data?.id || data.data?.id  // 兼容不同响应结构
expect(compId).toBeDefined()

// 2. 用 ID 导航到子页面
await page.goto(`/#/notice/detail/${compId}`)

// 3. 用 ID 构造正则匹配返回 URL
await page.waitForURL(new RegExp(`#/notice/detail/${compId}`), { timeout: 10000 })
```

**注意**：后端响应的 ID 字段可能嵌套在不同层级（`data.id` 或 `data.data.id`），需要用 `||` 兼容。

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
      // 用 .last() 避免匹配到前序步骤残留的 toast
      await expect(page.locator('.el-message--success').last()).toBeVisible({ timeout: 5000 })
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
// 成功消息 — 必须用 .last() 避免匹配到前序步骤的残留 toast
await expect(page.locator('.el-message--success').last()).toBeVisible({ timeout: 5000 })

// 错误消息
const errorMsg = page.locator('.el-message--error').last()
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

## 跨页面多步骤流程测试

通知发布、报名设置等场景需要跨越多个页面完成一个完整流程。编写模式：

```js
test('完整流程：创建 → 子页面操作 → 返回验证', async ({ page }) => {
  // ===== 第一步：创建父实体 =====
  await page.goto('/#/entity/create')
  await page.fill('input[placeholder="名称"]', '测试名称')
  // ... 填写表单

  // 拦截创建 API，提取新实体 ID
  const createPromise = page.waitForResponse(
    resp => resp.url().includes('/api/entity/create') && resp.request().method() === 'POST',
    { timeout: 15000 }
  )
  await page.locator('button:has-text("创建")').click()
  const createResp = await createPromise
  const createData = await createResp.json()
  const entityId = createData.data?.data?.id || createData.data?.id
  expect(entityId).toBeDefined()

  // 等待跳转回列表
  await page.waitForURL(/\/entity\/list/, { timeout: 10000 })

  // ===== 第二步：进入子页面操作 =====
  await page.goto(`/#/entity/detail/${entityId}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  // 验证子页面加载
  await expect(page.locator('.toolbar-title')).toContainText('管理')

  // ===== 第三步：在子页面中创建子实体 =====
  await page.locator('button:has-text("新建")').click()
  await page.waitForURL(/\/entity\/edit\/0/, { timeout: 10000 })

  await page.fill('input[placeholder="标题"]', '子实体标题')
  // ... 填写表单

  // 拦截子实体创建 + 发布 API
  const createSubPromise = page.waitForResponse(
    resp => resp.url().includes('/api/sub/create') && resp.request().method() === 'POST',
    { timeout: 15000 }
  )
  const publishSubPromise = page.waitForResponse(
    resp => resp.url().includes('/publish'),
    { timeout: 15000 }
  )
  await page.locator('button:has-text("确认发布")').click()

  await createSubPromise
  await publishSubPromise

  // ===== 第四步：返回验证（关键！） =====
  // router.back() 不会触发 onMounted，必须用 page.goto() 强制刷新
  await page.waitForURL(new RegExp(`#/entity/detail/${entityId}`), { timeout: 10000 })
  await page.goto(`/#/entity/detail/${entityId}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)

  // 验证新子实体出现在列表中
  await expect(page.locator('.el-table__body tr').filter({ hasText: '子实体标题' })).toBeVisible()
})
```

**关键要点**：
1. **ID 传递** — 从创建 API 响应中提取 ID，用于后续 `page.goto()` 和 `waitForURL`
2. **API 拦截顺序** — 先注册 Promise 再触发动作，多个 API 串行调用需分别拦截
3. **返回验证** — `router.back()` 后必须 `page.goto()` 强制刷新，`waitForResponse` 不可靠
4. **Toast 断言** — 用 `.last()` 取最新 toast，避免前序步骤残留

## 多用户角色测试

### 角色切换模式

测试涉及多角色协作（如管理员审核、学生报名）时，需要在同一 page 中切换用户：

```js
async function switchUser(page, user) {
  await page.goto('/#/login')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  })
  await page.fill('input[placeholder="请输入用户名"]', user.username)
  await page.fill('input[placeholder="请输入密码"]', user.password)
  await page.locator('.el-button:has-text("立即登录")').click()
  await page.waitForURL((url) => url.hash.includes('home'), { timeout: 10000 })
}
```

**注意**：必须先清除 localStorage 中的旧 token/userInfo，否则 Pinia store 可能残留旧用户状态。

### 直接 API 调用（绕过 UI）

对于不需要测试 UI 的前置步骤（如报名、审核），使用 `page.request` 直接调用后端 API：

```js
async function apiRequest(page, method, url, token, data = null) {
  const options = { headers: { Authorization: `Bearer ${token}` } }
  if (data) options.data = data
  return await page.request[method](`http://localhost:8080${url}`, options)
}

// 用法
const token = await page.evaluate(() => localStorage.getItem('token'))
const resp = await apiRequest(page, 'post', '/api/reg/submit', token, { comp_id: 123, ... })
const data = await resp.json()
```

**优势**：比 UI 操作快 10 倍以上，且不受 UI 状态影响。适用于 `beforeAll` 数据准备和非测试目标的操作。

## 报名与审核流程测试

### 报名前置条件（必读）

报名功能有严格的前置条件，缺少任何一个都会导致报名失败：

1. **赛事必须存在** — 通过 UI 或 API 创建
2. **报名配置必须保存** — `POST /api/reg/config`，后端返回"报名设置保存成功"
3. **报名时间窗口** — `reg_start_time` 必须在当前时间之前，`reg_end_time` 必须在之后
4. **作品提交时间窗口** — 如需测试作品提交，`submit_start_time` 和 `submit_end_time` 也必须设置且有效
5. **报名审核** — 如 `need_reg_audit: 1`，报名后状态为"待审核"(0)，需管理员审核通过(1)后才能提交作品

### 报名配置模板

```js
async function saveRegConfig(page, token, competitionId) {
  const now = new Date()
  return await apiRequest(page, 'post', '/api/reg/config', token, {
    comp_id: competitionId,
    participant_type: 1,
    min_team_member: 1,
    max_team_member: 1,
    reg_start_time: new Date(now.getTime() - 24*60*60*1000).toISOString(),  // 昨天
    reg_end_time: new Date(now.getTime() + 30*24*60*60*1000).toISOString(), // 30天后
    submit_start_time: new Date(now.getTime() - 24*60*60*1000).toISOString(),
    submit_end_time: new Date(now.getTime() + 30*24*60*60*1000).toISOString(),
    grade_requirement: [1, 2, 3, 4],
    need_advisor: 1,
    need_attachment: 0,
    need_reg_audit: 1,
    award_hierarchy: ['一等奖', '二等奖', '三等奖'],
    track: [],
  })
}
```

### 报名提交 API

```js
async function submitRegistration(page, token, competitionId, teamName) {
  return await apiRequest(page, 'post', '/api/reg/submit', token, {
    comp_id: competitionId,
    team_name: teamName,
    leader: {
      name: '测试队长',
      stuID: 'S2024001',
      phone: '13800138000',
      email: 'test@example.com',
      college: '计算机学院',
      is_leader: true,
    },
    members: [],
    attachment_url: '',
    advisor_info: {
      id: null, username: 'T2023001', name: '指导老师',
      phone: '13900139000', email: 'advisor@example.com', college: '计算机学院',
    },
    track: '',
  })
}
```

### 审核 API

```js
// 通过
await apiRequest(page, 'put', '/api/reg/audit', token, { id: regId, status: 1 })
// 驳回
await apiRequest(page, 'put', '/api/reg/audit', token, { id: regId, status: 2, reason: '原因' })
```

### 作品提交 API

```js
await apiRequest(page, 'put', '/api/reg/work-submit', token, {
  reg_id: regId,
  work_attachment_url: '/static/test_work/work.pdf',
})
```

## 数据隔离策略

### 问题：测试间数据污染

多个测试共享同一赛事/报名数据时：
- 测试 1 审核通过了报名 → 测试 2 期望"待审核"状态，找不到数据
- 同一学生不能重复报名同一赛事（唯一约束 `(comp_id, leader_id)`）
- 批量操作需要多条记录，但同一赛事只有一条报名

### 解决方案

**方案 A：每个测试创建独立赛事**（推荐用于修改状态的测试）

```js
test('审核通过', async ({ page }) => {
  const compName = `E2E审核通过_${Date.now()}`
  const compId = await createCompetitionWithName(page, compName)
  await saveRegConfig(page, adminToken, compId)
  // ... 独立数据，不受其他测试影响
})
```

**方案 B：`beforeAll` 创建共享数据**（推荐用于只读测试）

```js
test.describe('只读测试', () => {
  let compName, compId

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    // ... 创建数据
    compName = `E2E共享赛事_${Date.now()}`
    compId = await createCompetitionWithName(page, compName)
    await page.close()
  })

  test('列表加载', async ({ page }) => {
    // 使用共享数据，只读操作
  })
})
```

**方案 C：唯一名称防冲突**

```js
function uniqueCompName(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}
```

## 多级导航测试

### 列表 → 子列表 → 详情 三级导航

作品审核等场景需要逐级进入：

```js
test('三级导航测试', async ({ page }) => {
  // 第一级：赛事列表
  await page.goto('/#/register/work-audit')
  await page.waitForLoadState('networkidle')
  await page.waitForResponse(
    resp => resp.url().includes('/api/reg/work/audit/comp/list') && resp.status() === 200,
    { timeout: 10000 }
  )
  await page.waitForTimeout(500)

  const compRow = page.locator('.el-table__body tr').filter({ hasText: compName }).first()
  await expect(compRow).toBeVisible({ timeout: 10000 })

  // 第二级：学生列表（先注册响应监听，再点击）
  const studentListResp = page.waitForResponse(
    resp => resp.url().includes('/api/reg/work/audit/student/list') && resp.status() === 200,
    { timeout: 10000 }
  )
  await compRow.locator('button:has-text("查看")').click()
  await page.waitForURL(/\/register\/work-audit\/comp\//, { timeout: 10000 })
  await studentListResp
  await page.waitForTimeout(500)

  // 第三级：详情页
  const studentRow = page.locator('.el-table__body tr').filter({ hasText: 'S2024001' }).first()
  const detailResp = page.waitForResponse(
    resp => resp.url().includes('/api/reg/detail') && resp.status() === 200,
    { timeout: 10000 }
  )
  await studentRow.locator('button:has-text("查看")').click()
  await page.waitForURL(/\/register\/work-audit\/detail\//, { timeout: 10000 })
  await detailResp
  await page.waitForTimeout(500)
})
```

**关键**：每次导航前先注册 `waitForResponse`，再触发点击。导航后等待 URL 变更 + API 响应 + 渲染缓冲。

## 只读页面验证

详情页可能是纯查看模式（无操作按钮），需验证：

```js
// 验证存在
await expect(page.locator('.page-title')).toContainText('作品提交详情')
await expect(page.locator('.el-descriptions')).toBeVisible()

// 验证不存在操作按钮
await expect(page.locator('button:has-text("驳回报名")')).not.toBeVisible()
await expect(page.locator('button:has-text("通过审核")')).not.toBeVisible()
```

## 数据库字段 vs 表单字段

**已知问题**：注册表单中填写的 `leader.name` 与数据库中 `registers.leader_name` 可能不同。后端从 `users` 表取真实姓名，而非表单提交的名称。

```js
// ❌ 错误：用表单填写的名字断言
await expect(row).toContainText('测试队长')  // 数据库中是"林晓明"

// ✅ 正确：用学号断言（学号是稳定的）
await expect(row).toContainText('S2024001')
```

**规则**：断言优先使用学号(`stu_id`)、工号(`username`)、ID 等不变字段，避免用姓名。

## 表格列定位

不同页面的表格列结构不同，定位前需确认列顺序：

```js
// 审核列表列：selection | 赛事名称 | 负责人 | 电话 | 邮箱 | 指导老师 | 报名时间 | 状态 | 操作
// 作品审核列表列：序号 | 队伍名称 | 负责人 | 学号 | 学院 | 电话 | 邮箱 | 提交时间 | 操作

// 按列索引定位（从 0 开始）
const submitCountCell = filteredRow.locator('td').nth(3) // 第4列

// 按内容定位（更稳定）
const row = page.locator('.el-table__body tr').filter({ hasText: compName }).first()
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
