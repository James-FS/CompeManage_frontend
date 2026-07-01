# 学科竞赛管理系统

面向高校学科竞赛全流程管理的 Web 系统，覆盖赛事目录、学院申报、报名配置、学生报名、报名审核、作品提交、专家评审、获奖填报、赛事总结、数据统计和角色权限管理等业务环节。

线上演示地址：

```text
http://1.117.230.218/
```

> 演示环境使用公开 demo 账号和 README 演示数据。后端 `demo-deploy` 分支已关闭 DataHall 外部数据同步，不会自动拉取真实学生、教职工或组织机构数据。

## 演示账号

| 角色 | 用户名 | 密码 | 说明 |
| --- | --- | --- | --- |
| 校级管理员 | `T2023001` | `123` | 拥有全量管理权限，适合演示大部分后台能力 |
| 院级管理员 | `T2023002` | `123` | 负责学院侧竞赛申报、报名审核等流程 |
| 赛事负责人 | `T2023003` | `123` | 负责赛事管理、报名配置、报名审核等 |
| 学生 | `S2024001` | `123` | 参与报名、作品提交、获奖补录等学生侧流程 |
| 专家 | `E2023001` | `123` | 参与专家评审相关流程 |
| 访客 | `guest` | `123` | 无权限账号，用于测试权限拦截 |

登录页默认展示统一身份认证入口；演示时点击“管理员账号登录”可使用上方账号密码登录。

## 已跑通的演示闭环

本 README 中的截图不是静态 mock 页面。已在 `http://1.117.230.218/` 上真实执行了一轮核心业务闭环，操作过程截图保存在 `docs/operation-images`，完整图文记录见：

[docs/demo-operation-log.md](docs/demo-operation-log.md)

本次闭环包含：

1. 校级管理员登录。
2. 查询并选择赛事负责人。
3. 创建一条 README 演示赛事目录。
4. 配置报名规则、作品提交时间、奖项层级和赛道。
5. 学生账号登录。
6. 学生提交报名信息。
7. 管理员查看报名审核列表。
8. 管理员通过报名审核。
9. 学生提交作品材料链接。
10. 学生提交获奖补录。
11. 管理员查看获奖审核列表。
12. 管理员通过获奖审核。
13. 将演示赛事调整为已结束状态。
14. 管理员填写赛事总结草稿。

为保证流程可复现，仓库提供了自动化脚本。它会在演示站点写入一组 README 演示数据，并按业务动作依次截图：

```bash
cd CompeManage_frontend/CompeManage
node scripts/capture-demo-operation-flow.mjs
```

如只需要刷新功能页巡览截图，可单独运行 `node scripts/capture-readme-screenshots.mjs`。

## 操作过程截图

以下截图按真实演示动作顺序生成，展示的是流程推进时的页面状态。完整说明见 [docs/demo-operation-log.md](docs/demo-operation-log.md)。

### 登录、创建赛事与报名配置

<p>
  <img src="docs/operation-images/01-login-filled.png" alt="校级管理员填写账号密码" width="49%">
  <img src="docs/operation-images/03-competition-created-list.png" alt="创建赛事后查看赛事目录" width="49%">
</p>

<p>
  <img src="docs/operation-images/04-registration-config-detail.png" alt="配置报名规则" width="49%">
  <img src="docs/operation-images/05-student-registration-list.png" alt="学生查看可报名赛事" width="49%">
</p>

### 学生报名、审核与作品提交

<p>
  <img src="docs/operation-images/06-student-registration-status.png" alt="学生提交报名后查看报名状态" width="49%">
  <img src="docs/operation-images/07-admin-registration-pending.png" alt="管理员查看待审核报名" width="49%">
</p>

<p>
  <img src="docs/operation-images/08-admin-registration-approved.png" alt="管理员通过报名审核" width="49%">
  <img src="docs/operation-images/09-student-work-submitted.png" alt="学生提交作品后查看作品入口" width="49%">
</p>

### 获奖补录、总结与统计

<p>
  <img src="docs/operation-images/12-admin-award-pending.png" alt="管理员查看待审核获奖补录" width="49%">
  <img src="docs/operation-images/13-admin-award-approved.png" alt="管理员通过获奖审核" width="49%">
</p>

<p>
  <img src="docs/operation-images/15-summary-edit-draft.png" alt="管理员填写赛事总结" width="49%">
  <img src="docs/operation-images/16-statistics-after-flow.png" alt="数据统计看板反映业务数据" width="49%">
</p>

## 功能概览

### 赛事管理

- 赛事目录浏览、筛选、详情查看。
- 校级管理员创建赛事、编辑赛事、批量导入、删除、恢复。
- 院级管理员发起赛事申报，校级管理员进行申报审核。
- 赛事负责人、年份、学院等维度的数据查询。

### 报名管理

- 根据赛事配置报名规则，包括个人/团队模式、人数限制、指导老师、赛道/赛题、附件材料、奖项规则等。
- 学生提交报名信息，支持负责人、队员、指导老师和附件材料。
- 管理端进行报名审核、驳回后重新提交。
- 支持作品提交与作品审核链路。

### 获奖填报

- 管理端按赛事维护获奖填报入口。
- 支持获奖名单模板导出和 Excel 导入。
- 学生可进行获奖补录，管理端完成填报审核、批量通过或批量驳回。

### 专家评审

- 管理端选择竞赛、分配专家评审任务。
- 专家侧查看评审任务和作品材料，提交评审结果。
- 管理端查看评审进度、汇总评审结果。

### 赛事总结与数据统计

- 赛事结束后填写总结、上传总结附件、查看总结详情。
- 数据看板汇总赛事数量、报名情况、获奖情况、学院分布等统计指标。

### 通知与权限

- 通知公告管理与详情查看。
- 基于 RBAC 的角色权限配置，支持校级管理员、院级管理员、赛事负责人、老师、学生、专家、访客等角色。
- 后端接口使用 JWT 鉴权，并在业务接口层做权限校验。

## 功能页巡览截图

截图由线上演示站点通过 Playwright 自动生成，保存在 `docs/images`。

### 登录与首页

<p>
  <img src="docs/images/01-login.png" alt="登录页" width="49%">
  <img src="docs/images/02-home-dashboard.png" alt="首页总览" width="49%">
</p>

### 赛事管理

<p>
  <img src="docs/images/03-competition-list.png" alt="赛事目录" width="49%">
  <img src="docs/images/04-competition-create.png" alt="新增赛事" width="49%">
</p>

<p>
  <img src="docs/images/05-competition-audit.png" alt="赛事审核" width="49%">
  <img src="docs/images/16-notice-list.png" alt="通知列表" width="49%">
</p>

### 报名与作品

<p>
  <img src="docs/images/06-registration-list.png" alt="赛事报名" width="49%">
  <img src="docs/images/07-registration-settings.png" alt="报名设置" width="49%">
</p>

<p>
  <img src="docs/images/08-registration-audit.png" alt="报名审核" width="49%">
  <img src="docs/images/09-work-audit.png" alt="作品审核" width="49%">
</p>

### 获奖、总结、统计

<p>
  <img src="docs/images/10-award-report.png" alt="获奖填报" width="49%">
  <img src="docs/images/11-award-audit.png" alt="填报审核" width="49%">
</p>

<p>
  <img src="docs/images/12-summary.png" alt="赛事总结" width="49%">
  <img src="docs/images/13-statistics.png" alt="数据汇总" width="49%">
</p>

### 专家评审与权限

<p>
  <img src="docs/images/14-review.png" alt="专家评审" width="49%">
  <img src="docs/images/15-permission.png" alt="权限管理" width="49%">
</p>

### 学生侧流程

<p>
  <img src="docs/images/17-student-registration.png" alt="学生报名入口" width="32%">
  <img src="docs/images/18-student-work.png" alt="学生作品提交" width="32%">
  <img src="docs/images/19-student-awards.png" alt="学生竞赛中心" width="32%">
</p>

## 业务主流程

```text
校级管理员维护赛事目录
        |
        v
院级管理员发起赛事申报 -> 校级管理员审核
        |
        v
赛事负责人配置报名规则
        |
        v
学生报名并提交材料 -> 管理端报名审核
        |
        v
学生提交作品 -> 管理端作品审核
        |
        v
专家评审 -> 管理端确认结果
        |
        v
获奖填报/学生补录 -> 获奖审核
        |
        v
赛事总结 -> 数据统计看板
```

## 技术栈

### 前端

- Vue 3
- Vite 7
- Vue Router 4
- Pinia
- Element Plus
- Axios
- ECharts
- ExcelJS / xlsx
- Playwright

### 后端

后端仓库：

```text
https://github.com/James-FS/CompeManage_backend
```

- Go 1.24
- Gin
- GORM
- MySQL 8
- Redis
- JWT
- Viper
- Docker Compose

### 部署结构

```text
Browser
   |
   | http://1.117.230.218/
   v
Nginx
   |-- /              -> /var/www/compemanage
   |-- /api/          -> 127.0.0.1:8080/api/
   |-- /health        -> 127.0.0.1:8080/health
   |
   v
Go Backend
   |-- MySQL
   |-- Redis
```

## 前端目录结构

```text
CompeManage/
├── src/
│   ├── api/          # API 封装
│   ├── assets/       # 静态资源
│   ├── components/   # 复用组件
│   ├── layouts/      # 页面布局
│   ├── router/       # 路由与角色访问控制
│   ├── stores/       # Pinia 状态管理
│   ├── utils/        # Axios 请求、工具函数
│   └── views/        # 业务页面
│       ├── award/
│       ├── competition/
│       ├── notice/
│       ├── permission/
│       ├── register/
│       ├── review/
│       ├── statistics/
│       └── summary/
├── scripts/
│   ├── capture-demo-operation-flow.mjs
│   ├── capture-readme-screenshots.mjs
│   └── run-demo-business-flow.mjs
├── vite.config.js
└── package.json
```

## 本地开发

进入前端工程目录：

```bash
cd CompeManage_frontend/CompeManage
```

安装依赖：

```bash
npm ci
```

启动开发服务：

```bash
npm run dev
```

默认端口：

```text
http://localhost:5219
```

开发环境通过 Vite proxy 将 `/api` 和 `/static` 转发到后端：

```text
http://localhost:8080
```

构建生产包：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

## 后端演示部署

后端演示分支：

```text
demo-deploy
```

该分支默认关闭 DataHall 外部同步：

```env
DATAHALL_ENABLED=false
DATAHALL_KEY=
DATAHALL_SECRET=
```

服务器部署：

```bash
cd /opt
git clone -b demo-deploy https://github.com/James-FS/CompeManage_backend.git
cd /opt/CompeManage_backend
sudo docker compose -f docker-compose.prod.yml up -d --build
```

检查后端：

```bash
sudo docker compose -f docker-compose.prod.yml ps
curl http://127.0.0.1:8080/health
sudo docker logs --tail=80 compemanage_app
```

期望日志包含：

```text
DataHall sync disabled
服务器启动：http://localhost:8080
```

## Nginx 部署

前端构建产物部署到：

```text
/var/www/compemanage
```

Nginx 示例配置：

```nginx
server {
    listen 80;
    server_name 1.117.230.218;

    root /var/www/compemanage;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080/health;
    }
}
```

启用配置：

```bash
sudo ln -sf /etc/nginx/sites-available/compemanage /etc/nginx/sites-enabled/compemanage
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 截图生成

操作过程截图脚本会访问线上演示站点，写入一组可展示的 demo 数据，并在每个关键业务节点打开对应页面截图：

```bash
cd CompeManage_frontend/CompeManage
node scripts/capture-demo-operation-flow.mjs
```

执行后会生成：

```text
docs/demo-operation-log.md
docs/operation-images/*.png
```

如果只想生成文字版操作日志，可运行：

```bash
cd CompeManage_frontend/CompeManage
node scripts/run-demo-business-flow.mjs
```

功能页巡览截图脚本会访问线上演示站点，使用 demo 账号登录并覆盖 `docs/images` 下的截图：

```bash
cd CompeManage_frontend/CompeManage
node scripts/capture-readme-screenshots.mjs
```

可通过环境变量指定站点地址和 Chrome 路径：

```bash
DEMO_BASE_URL=http://1.117.230.218 CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" node scripts/capture-demo-operation-flow.mjs
```

## 安全说明

- 演示环境使用种子账号和演示数据，禁止填入真实 DataHall 密钥。
- 生产环境应更换 `JWT_SECRET`、MySQL root 密码和 Redis 访问策略。
- MySQL、Redis 不应开放公网端口；推荐只允许容器内网或本机访问。
- 上传文件和受控下载接口需要登录与业务权限校验。
- 如使用域名和 HTTPS，可在 Nginx 层接入证书并将 CAS 回调地址改为正式域名。
