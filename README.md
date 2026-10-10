# 学科竞赛管理系统 - 前端

基于 Vue 3 的学科竞赛管理平台前端，包含 9 个业务模块、约 40 个页面，支持赛事发布、报名、作品提交、专家评审、获奖管理、数据统计等功能。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 (Composition API) |
| 构建工具 | Vite 7 |
| UI 组件库 | Element Plus 2 |
| 状态管理 | Pinia 3 |
| 路由 | Vue Router 4 (Hash 模式) |
| HTTP 客户端 | Axios |
| 图表 | ECharts 6 |
| Excel 处理 | ExcelJS + SheetJS (xlsx) |
| CSS 预处理 | SCSS |
| E2E 测试 | Playwright |
| 代码格式化 | Prettier |

## 环境要求

- Node.js `^20.19.0 || >=22.12.0`
- npm（随 Node.js 安装）

## 快速开始

```bash
cd CompeManage

# 安装依赖
npm install

# 启动开发服务器（端口 5219）
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

开发模式下，`/api` 和 `/static` 请求自动代理到 `http://localhost:8080`（Go 后端）。

## 可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产环境构建 |
| `npm run preview` | 预览生产构建 |
| `npm run format` | Prettier 格式化代码 |
| `npm run test` | 运行 Playwright E2E 测试 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |

## 项目结构

```
CompeManage/
├── src/
│   ├── api/                  # API 接口封装
│   │   └── index.js          # 所有接口统一导出
│   ├── assets/               # 静态资源与全局样式
│   │   └── global.css        # CSS 变量与全局样式
│   ├── components/           # 公共组件
│   │   ├── Header.vue        # 顶部导航栏
│   │   └── Sidebar.vue       # 侧边菜单栏
│   ├── layouts/              # 布局组件
│   │   ├── MainLayout.vue    # 主布局（侧边栏 + 面包屑 + 内容区）
│   │   └── EmptyLayout.vue   # 空布局（登录、通知等全屏页面）
│   ├── router/               # 路由配置
│   │   └── index.js          # 路由定义与导航守卫
│   ├── stores/               # Pinia 状态管理
│   │   └── user.js           # 用户状态（登录、权限）
│   ├── utils/                # 工具函数
│   │   ├── request.js        # Axios 实例与拦截器
│   │   ├── format.js         # 日期格式化 (dayjs)
│   │   ├── competition.js    # 竞赛业务常量与状态映射
│   │   ├── debounce.js       # 防抖函数
│   │   ├── transform.js      # 对象键名转换（驼峰→下划线）
│   │   └── validators.js     # 表单校验规则
│   ├── views/                # 页面视图
│   │   ├── home.vue          # 首页
│   │   ├── login.vue         # 登录页
│   │   ├── competition/      # 赛事管理 (5 个页面)
│   │   ├── register/         # 报名管理 (11 个页面)
│   │   ├── award/            # 获奖管理 (7 个页面)
│   │   ├── review/           # 专家评审 (6 个页面)
│   │   ├── summary/          # 赛事总结 (3 个页面)
│   │   ├── statistics/       # 数据统计
│   │   ├── notice/           # 通知管理 (4 个页面)
│   │   └── permission/       # 权限管理
│   ├── App.vue               # 根组件
│   └── main.js               # 应用入口
├── public/                   # 静态资源
│   ├── gzhu.png              # 网站 favicon
│   ├── gzhu2.png             # 顶部导航 logo
│   └── gzhu3.png             # 登录页 logo
├── e2e/                      # Playwright E2E 测试
│   ├── helpers/              # 测试辅助函数 (auth.js)
│   ├── competition/          # 赛事管理测试
│   ├── register/             # 报名管理测试
│   ├── award/                # 获奖管理测试
│   ├── notice/               # 通知管理测试
│   ├── summary/              # 赛事总结测试
│   ├── dashboard/            # 数据统计测试
│   ├── permission/           # 权限管理测试
│   └── flow/                 # 端到端流程测试
├── index.html                # 入口 HTML
├── vite.config.js            # Vite 配置
├── playwright.config.js      # Playwright 配置
├── .prettierrc.json          # Prettier 配置
└── package.json
```

## 业务模块

| 模块 | 路由前缀 | 功能 |
|------|----------|------|
| 赛事管理 | `/competition` | 赛事目录、新增/编辑赛事、赛事审核与申报 |
| 报名管理 | `/register` | 赛事报名、报名设置、报名审核、作品提交与审核 |
| 获奖管理 | `/award` | 获奖填报、获奖导入、学生获奖查看与申报、填报审核 |
| 专家评审 | `/review` | 评审任务分配、评审进度跟踪、评审结果查看、专家打分 |
| 赛事总结 | `/summary` | 赛后总结填写与查看 |
| 数据统计 | `/statistics` | 数据看板与汇总 |
| 通知管理 | `/notice` | 竞赛通知发布与查看 |
| 权限管理 | `/permission` | 角色权限分配 |

## 角色权限

系统采用基于角色的访问控制（RBAC），不同角色登录后看到的菜单和可访问的页面不同：

| 角色 | 标识 | 说明 |
|------|------|------|
| 校级管理员 | `school_admin` | 全部权限，包括权限管理、数据统计 |
| 院级管理员 | `college_admin` | 本院赛事申报、审核、获奖管理 |
| 赛事负责人 | `competition_manager` | 负责赛事的报名设置、作品审核、评审管理 |
| 学生 | `student` | 报名参赛、提交作品、查看获奖 |
| 教师 | `teacher` | 查看赛事与通知（只读） |
| 专家 | `expert` | 专家评审打分 |

## 认证方式

- **开发环境**：用户名 + 密码登录（`POST /api/login`）
- **生产环境**：CAS 统一身份认证（`/api/cas/login`），自动跳转

登录成功后，Token 存储在 `localStorage` 中，Axios 请求拦截器自动附加 `Authorization: Bearer <token>` 头。401 响应自动清除 Token 并跳转登录页。

## 开发测试账号

开发环境下，登录页提供快速填充按钮：

| 用户名 | 密码 | 角色 | 显示名称 |
|--------|------|------|----------|
| T2023001 | 123 | school_admin | 校级管理员 |
| T2023002 | 123 | college_admin | 计算机学院管理员 |
| T2023003 | 123 | competition_manager | 张老师（赛事负责人） |
| S2024001 | 123 | student | 李同学 |
| expert | 123 | expert | 王专家 |

## 设计规范

项目通过 CSS 自定义属性定义设计令牌：

| 变量 | 值 | 用途 |
|------|----|------|
| `--primary-color` | `#13C2C2` | 主色调（青色） |
| `--primary-dark` | `#08979C` | 主色调深色 |
| `--bg-color` | `#F5F7FA` | 页面背景 |
| `--primary-text` | `#303133` | 主要文字 |
| `--secondary-text` | `#909399` | 次要文字 |
| `--card-shadow` | `0 1px 5px rgba(0,0,0,0.1)` | 卡片阴影 |

## API 约定

- 请求通过 Axios 实例统一处理，超时时间 10 秒
- 响应格式遵循 `{ code, message, data }` 结构
- 401 状态码自动清除 Token 并跳转登录页
- 文件上传使用 `multipart/form-data`
- 日期传给后端时转换为 RFC3339 格式（Go 标准）

## E2E 测试

使用 Playwright 进行端到端测试，覆盖所有业务模块。

```bash
# 运行所有测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 查看测试报告
npx playwright show-report
```

测试配置：
- 浏览器：Chromium
- 并发 Worker 数：2
- 失败重试：1 次
- 基础 URL：`http://localhost:5219`
- 30 个测试文件，覆盖 8 个业务模块 + 端到端集成流程

## 代码规范

项目使用 Prettier 统一代码风格：

- 不使用分号
- 使用单引号
- 行宽 100 字符

```bash
npm run format
```

Element Plus 组件通过 `unplugin-auto-import` 和 `unplugin-vue-components` 实现自动导入，无需手动注册。

## 详细文档

- 完整前端 README：[CompeManage/README.md](CompeManage/README.md)
- 后端 README：[../CompeManage_backend/README.md](../CompeManage_backend/README.md)
- 项目规范：[../CLAUDE.md](../CLAUDE.md)
