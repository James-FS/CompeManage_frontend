# 项目规范

## 技术栈

- **框架**: Vue 3 (Composition API)
- **构建工具**: Vite 7
- **UI 组件库**: Element Plus 2
- **状态管理**: Pinia 3
- **路由**: Vue Router 4 (Hash 模式)
- **HTTP 客户端**: Axios
- **图表**: ECharts 6
- **表格/Excel**: ExcelJS, xlsx, file-saver

## 代码风格

通过 Prettier 配置，遵循以下规则：

- 无分号 (`semi: false`)
- 单引号 (`singleQuote: true`)
- 行宽 100 字符 (`printWidth: 100`)

```bash
npm run format  # 格式化代码
```

## 目录结构

```
src/
├── api/           # API 接口封装
├── assets/        # 静态资源
├── components/    # 公共组件
├── layouts/       # 布局组件 (MainLayout, EmptyLayout)
├── router/        # 路由配置
├── stores/        # Pinia 状态管理
├── utils/         # 工具函数
├── views/         # 页面视图
│   ├── award/     # 获奖管理
│   ├── competition/  # 赛事管理
│   ├── notice/    # 通知管理
│   ├── register/  # 报名管理
│   ├── review/    # 专家评审
│   ├── statistics/  # 数据统计
│   └── summary/   # 赛事总结
```

## 路由规范

- 使用 Hash 模式 (`createWebHashHistory`)
- 路由路径使用 kebab-case (如 `/competition/list`)
- 页面组件使用 PascalCase (如 `CompetitionList`)
- 动态路由参数通过 `props: true` 传递

### 路由 Meta 字段

```js
{
  title: '页面标题',           // 页面标题
  roles: ['school_admin'],    // 允许访问的角色
  parent: 'ParentRouteName',  // 面包屑父路由
  activeMenu: '/xxx',         // 侧边栏高亮路径
  hidden: true                // 不在侧边栏显示
}
```

## API 规范

- API 集中定义在 `src/api/index.js`
- 使用 `@/utils/request` 的 `get`, `post`, `put`, `del` 方法
- 后端接口代理到 `http://localhost:8080`

```js
import { api } from '@/api'

// GET
api.getCompetitionList(params)

// POST
api.createCompetition(data)

// PUT
api.updateCompetition(id, data)

// DELETE
api.deleteCompetition(id)
```

## 状态管理

- 使用 Pinia 的 Composition API 风格
- 用户状态存储在 `src/stores/user.js`
- Token 和用户信息存储在 localStorage

## 开发服务器

- 端口: `5219`
- 代理:
  - `/api` → `http://localhost:8080`
  - `/static` → `http://localhost:8080`

```bash
npm run dev   # 启动开发服务器
npm run build # 生产构建
```

## 角色系统

| 角色 | 说明 |
|------|------|
| `school_admin` | 校级管理员 |
| `college_admin` | 院级管理员 |
| `competition_manager` | 赛事负责人 |
| `student` | 学生 |

## Mock 用户 (开发环境)

| 用户名 | 密码 | 角色 |
|--------|------|------|
| T2023001 | 123 | school_admin |
| T2023002 | 123 | college_admin |
| T2023003 | 123 | competition_manager |
| S2024001 | 123 | student |


## Playwright 自动化测试规范 (E2E Testing)

### 环境与目录
- **测试框架**: 使用 Playwright (Chromium)。
- **存储位置**: `/e2e/测试模块名文件夹`。
- **文件命名**: `[功能模块].spec.js` (例如 `registration.spec.js`)。
- **基础 URL**: 默认使用 `http://localhost:5219` (或当前 Vite 运行端口)。

### 核心业务逻辑测试要求参考
针对“竞赛报名”逻辑，编写测试时必须覆盖以下场景：

#### A. 联动选择逻辑 (Cascade Selection)
- **动作**: 改变“赛道”选择器的值。
- **预期**: 
  1. “赛题”选择器的可选列表必须立即更新。
  2. 原有的“赛题”选中值必须被清空（触发 `watch` 逻辑）。
- **断言方法**: 使用 `await expect(subTrackLocator).toHaveValue('')` 验证清空动作。

#### 数据回显逻辑 (Data Hydration)
- **场景**: 模拟从后端加载已保存的报名字符串（格式如 `"软件赛道 / Web开发"`）。
- **校验点**: 
  1. 验证 `parseSavedTrackValue` 函数是否正确执行。
  2. 验证两个独立的 `el-select` 组件是否分别显示了正确的拆解值。
- **断言方法**: 避免仅检查 DOM 文本，优先检查 Input 的 `value` 或 `placeholder` 状态。

### 5.3 编写技术准则
- **选择器策略 (Selectors)**:
  - 严禁使用动态生成的 ID 或过于深层的 CSS 路径。
  - 优先使用 `page.getByPlaceholder()` 或 `page.getByRole()`，增加测试的可读性和稳定性。
  - 针对 Element Plus 组件，使用属性选择器定位：`page.locator('.el-select')`。
- **异步处理**:
  - 在检查回显前，必须使用 `await page.waitForResponse()` 确保后端 API (`/api/registration/detail`) 已成功返回。
  - 针对组件渲染，使用 `await page.waitForSelector()` 避免由于异步加载导致的元素未发现错误。
- **Mock 与鉴权**:
  - 测试开始前，通过 `page.addInitScript` 在 `localStorage` 中注入模拟的 `token`。
  - 模拟接口数据时，确保 JSON 结构与 `models/registration.go` 定义的字段完全一致。

### AI 辅助审查指令 (Prompting)
当 Claude 介入测试编写时，请遵循：
1. "在编写新测试前，先读取 `src/views/` 下对应的 `.vue` 文件，确认 `v-model` 绑定的变量名。"
2. "审查测试失败原因时，请优先对比 `claude.md` 中的数据结构定义与实际拦截到的网络请求载荷。"
3. "如果页面存在 Loading 遮罩，请在操作前添加处理逻辑，等待遮罩消失。"

### 测试失败可能原因(需规避)
1.API 验证失败 - 页面加载后立即调用后端 API /api/comp/list，但 mock token 不是真实后端签发的，被拒绝返回空数据或错误
2.路由守卫可能未放行 - 虽然 localStorage 有 token，但 Vue 应用可能需要通过 API 验证 token 的有效性才能完成初始化
3.Pinia store 状态未就绪 - addInitScript 设置 localStorage 后，Vue 应用刷新时 Pinia store 的 restoreState() 可能在 API 请求之后才执行