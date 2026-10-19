# CompeManage 前端

Vue 3 单页应用，为学科竞赛管理系统提供赛事、报名、作品、评审、获奖、通知、总结、统计和权限管理界面。前端负责交互和路由呈现，业务授权及数据范围由后端接口校验。

## 技术栈与环境

- Vue 3、Vue Router 4（Hash 模式）、Pinia
- Vite 7、Element Plus、Axios
- ECharts、ExcelJS、SheetJS
- Playwright（端到端测试）
- Node.js `^20.19.0 || >=22.12.0`

## 安装与启动

进入 `CompeManage` 子目录后执行：

```bash
npm install
npm run dev
```

开发服务器默认地址为 `http://localhost:5219`，启动后会打开登录页。Vite 将 `/api` 和 `/static` 请求代理到 `http://localhost:8080`；需同时运行后端才能使用业务数据。

生产构建和本地预览：

```bash
npm run build
npm run preview
```

预览服务器也使用 5219 端口，并配置了相同的 API 和静态资源代理。正式部署时应由部署环境提供正确的 API 路由和认证服务地址。

## npm 脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 构建生产静态文件到 `dist/` |
| `npm run build:coverage` | 生成插桩构建，用于覆盖率流程 |
| `npm run preview` | 本地预览构建结果 |
| `npm run format` | 使用 Prettier 格式化 `src/` |
| `npm run test` | 运行默认 Playwright E2E 配置 |
| `npm run test:award-flow` | 使用赛事获奖流程专用配置运行测试 |
| `npm run test:coverage` | 构建覆盖率版本并运行 Playwright/NYC 覆盖率流程 |

默认 Playwright 配置使用 Chromium、`e2e/` 目录、5219 端口和本地 preview 服务。运行 E2E 前应先按测试环境要求准备后端与测试数据。其他场景的 Playwright 配置文件包括 `playwright.college-manager.config.js`、`playwright.award.config.js`、`playwright.registration.config.js` 和 `playwright.release.config.js`。

## 目录结构

```text
CompeManage/
├── src/
│   ├── api/          # 后端 API 封装
│   ├── assets/       # 静态资源和全局样式
│   ├── components/   # 公共组件
│   ├── layouts/      # 页面布局
│   ├── router/       # 路由及导航守卫
│   ├── stores/       # Pinia 状态管理
│   ├── utils/        # 请求、格式化和业务工具
│   └── views/        # 赛事、报名、获奖等业务页面
├── e2e/              # Playwright 端到端测试
├── public/           # 无需构建处理的静态资源
├── package.json
├── vite.config.js
└── playwright.config.js
```

## 业务页面

- **赛事**：赛事目录、新建和编辑、赛事申报及申报审核。
- **报名**：报名设置、报名与作品审核、学生报名和作品提交。
- **获奖**：获奖填报、导入、数据导出、学生获奖查看/补录和审核。
- **评审**：任务管理、评审进度与结果、专家评审工作台。
- **其他**：赛事总结、数据统计、通知、角色权限和用户管理。

## 认证与角色

登录和角色由后端提供。前端登录后保存 JWT，并通过 Axios 请求拦截器发送 `Authorization: Bearer <token>`；收到 401 后清理登录态并返回登录页面。生产环境可通过后端 CAS 统一身份认证流程登录。

界面支持的角色包括 `school_admin`、`college_admin`、`competition_manager`、`teacher`、`student`、`expert` 和 `guest`。菜单和页面路由根据角色及权限展示；接口仍须以后端权限判断为准。仓库中的登录快速填充信息属于前端开发辅助数据，不代表数据库中一定存在相同账号。

## 请求与日期

- Axios 统一处理 API 请求，默认超时 10 秒。
- 请求携带 Bearer Token；业务响应通常使用 `code`、`message`、`data` 字段。
- 文件上传通过 `multipart/form-data`。
- 需要发送到后端的日期按业务接口要求格式化；后端时间字段采用 Go 可解析的时间格式。

根目录[项目 README](../README.md)介绍整体启动步骤；后端配置和部署说明见[后端 README](../CompeManage_backend/README.md)。
