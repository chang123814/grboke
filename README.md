# AI 创作者个人博客（grboke）

一个前后端分离的个人博客网站，面向 AI 艺术创作场景，包含作品集展示、提示词编辑工具、博客系统与后台管理。

## 功能概览

- **作品集（Portfolio）**
  - 作品列表 / 分类筛选
  - 支持设置「首页代表作品」（`is_featured`）用于首页轮播展示
  - 支持封面图 + 多图（`extra_images`）

- **提示词编辑器（Prompt Editor）**
  - 快速拼接提示词元素
  - 本地“优化提示词”逻辑
  - 提示词模板保存 / 加载

- **博客系统（Blog）**
  - 文章列表、详情
  - 阅读量（访问详情自动 +1）
  - 点赞
  - 评论

- **后台管理（/admin）**
  - 作品管理（新增/编辑/删除、上传封面与更多图片、设置首页代表作品）
  - 博客管理（新增/编辑/删除）
  - 个人资料管理（站点昵称、简介、联系方式等）

## 技术栈

- **前端**：React 18 + Vite + TailwindCSS
- **路由**：React Router v6
- **动画**：Framer Motion
- **图标**：Lucide React
- **HTTP 客户端**：Axios
- **后端**：Node.js（ESM）+ Express
- **数据库**：MySQL（`mysql2/promise`）
- **图片处理**：Sharp（上传时生成缩略图）

## 运行要求

- Node.js 18+（建议）
- 可用的 MySQL 数据库（本地或云数据库均可）

## 快速开始

### 1) 安装依赖

在项目根目录执行：

```bash
npm run install:all
```

### 2) 配置后端环境变量

复制示例文件并填写实际配置：

- 示例：`backend/.env.example`
- 实际：`backend/.env`

`backend/.env` 需要至少包含：

- `DB_HOST`：MySQL 主机
- `DB_PORT`：MySQL 端口（默认 3306）
- `DB_USER`：用户名
- `DB_PASSWORD`：密码
- `DB_NAME`：数据库名
- `ADMIN_PASSWORD`：后台管理员密码（用于 `/admin` 登录与受保护接口）
- `PORT`：后端端口（可选，默认 5000）

注意：`.env` 已被 `.gitignore` 忽略，不应提交到仓库。

### 3) 启动开发环境

```bash
npm run dev
```

- 前端：http://localhost:3000
- 后端：http://localhost:5000

前端开发服务器已在 `frontend/vite.config.js` 中配置代理：请求 `/api/*` 会转发到后端。

### 4) 构建前端

```bash
npm run build
```

（该命令仅构建前端 `frontend/`；后端需自行部署运行。）

## 数据库初始化说明

后端启动时会自动：

- 创建所需数据表（若不存在）
- 当表为空时插入示例数据（作品、文章、个人资料等）

主要表：

- `portfolios`
- `blog_posts`
- `comments`
- `prompt_templates`
- `site_profile`
- `images`（存储原图与缩略图的二进制数据）

## 管理员鉴权说明

- 后端使用 `ADMIN_PASSWORD` 作为简单的管理员鉴权口令。
- 前端后台页面（`/admin`）登录成功后，会把口令存到 `localStorage`，并在请求头中携带：
  - `x-admin-token: <ADMIN_PASSWORD>`

说明：该方式适用于个人站点的轻量管理，不等同于完整的生产级鉴权体系。

## API 概览

> 说明：以下“需要管理员”的接口，要求请求头携带 `x-admin-token`，其值必须等于后端环境变量 `ADMIN_PASSWORD`。

### 管理员
- `POST /api/admin/login`：管理员登录（校验 `ADMIN_PASSWORD`，通过后返回 `{ ok: true }`）

### 作品集
- `GET /api/portfolios`：获取作品列表（公开）
  - 支持：`?category=xxx`、`?featured=true`、`?limit=3`
- `POST /api/portfolios`：新增作品（需要管理员）
- `PUT /api/portfolios/:id`：更新作品（需要管理员）
- `DELETE /api/portfolios/:id`：删除作品（需要管理员）

### 博客
- `GET /api/posts`：文章列表（公开，支持 `?category=xxx`、`?limit=10`）
- `GET /api/posts/:id`：文章详情（公开；访问会自动增加 `views`）
- `POST /api/posts`：发布文章（需要管理员）
- `PUT /api/posts/:id`：更新文章（需要管理员）
- `DELETE /api/posts/:id`：删除文章（需要管理员）
- `POST /api/posts/:id/like`：点赞（公开）

### 评论
- `GET /api/posts/:id/comments`：获取评论（公开）
- `POST /api/posts/:id/comments`：发表评论（公开）

### 提示词模板
- `GET /api/prompt-templates`：获取模板列表（公开）
- `POST /api/prompt-templates`：保存模板（公开）

### 个人资料
- `GET /api/profile`：获取个人资料（公开）
- `PUT /api/profile`：更新个人资料（需要管理员）

### 图片（上传入库 + 读取）
- `POST /api/upload-image`：上传图片（需要管理员；生成缩略图并写入 `images` 表）
- `GET /api/images/:id`：读取原图（公开）
- `GET /api/images/:id/thumb`：读取缩略图（公开，jpeg）
- `GET /api/images/:id/download`：下载原图（公开）

### 需要管理员的接口清单（汇总）

- `POST /api/portfolios`
- `PUT /api/portfolios/:id`
- `DELETE /api/portfolios/:id`
- `POST /api/posts`
- `PUT /api/posts/:id`
- `DELETE /api/posts/:id`
- `PUT /api/profile`
- `POST /api/upload-image`

## 生产部署建议

### 推荐方式：同域部署（前端静态站 + 反向代理到后端）

由于前端请求使用相对路径（例如 `axios.get('/api/posts')`），生产环境最省心的做法是：

- 前端构建后以静态文件方式部署（例如 Nginx、Caddy、OSS/CDN 等）
- 同一域名下将 `/api/*` 反向代理到后端服务

这样无需改前端代码，也能避免跨域问题。

### 后端部署要点

- 使用进程管理器（PM2 / systemd / Docker）守护 `backend/server.js`
- 配置环境变量（建议通过服务器环境变量或部署平台配置，不要写进仓库）
  - `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`
  - `ADMIN_PASSWORD`（务必设置强密码）
  - `PORT`（对外监听端口）
- 数据库：确保目标 MySQL 已创建 `DB_NAME` 指定的数据库，并允许后端主机访问

### 跨域部署（不同域名）

如果前端与后端不在同一域名/端口：

- 后端已启用 `cors()`，可按需收紧允许的来源（当前是默认放开）
- 前端需要把 Axios 请求指向后端完整地址（当前代码未配置 `baseURL`），否则会请求到前端域名下的 `/api`

建议仍然优先采用“同域 + 反向代理”的方式。


## 项目结构

```text
grboke/
├── frontend/              # 前端（React + Vite）
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   └── package.json
├── backend/               # 后端（Express + MySQL）
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── package.json           # 根脚本（并行启动前后端）
└── .gitignore
```
