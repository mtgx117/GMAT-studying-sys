# GMAT Study Agent

个人 GMAT 备考 Web 学习系统。当前 MVP 优先实现手动录题、题库保存、练习记录、错题统计和基础看板；截图上传、OCR/AI 识别、AI 错题分析和练习推荐后置。

## 文档入口

- `AGENTS.md`：所有 agent 的职责、边界和上下文恢复规则。
- `PRODUCT_DESIGN.md`：产品目标、页面和验收标准。
- `TECHNICAL_DESIGN.md`：技术架构、数据模型、API 和开发顺序。

## MVP 原则

- 无 AI/OCR 也必须可用。
- 手动录题是第一入口。
- AI/OCR 不能阻塞题库、练习记录、错题统计和基础看板。

## 当前阶段

当前代码对应第 1 次验收：项目可启动。

已包含：

- Next.js App Router + TypeScript 应用骨架。
- Tailwind CSS + shadcn/ui 基础结构。
- lucide-react 图标和 Recharts 占位图表。
- 左侧导航 + 主内容卡片布局。
- 首页静态占位看板：今日建议、总题数、正确率、最近 7 天练习量、Top 薄弱点、最近错题、快捷按钮。
- `.env.example` 环境变量模板。

本阶段不包含：

- Supabase 数据库、migration 或 API。
- 手动录题入库。
- OCR/AI 识别。
- 登录或线上访问密码逻辑。

首页中的数字和列表都标注为本地占位数据，后续第 2 阶段起逐步接入真实数据。

## 本地启动

前置要求：

- Node.js 20 或更新版本。
- npm。Windows PowerShell 如果拦截 `npm.ps1`，可以使用 `npm.cmd`。

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

检查命令：

```bash
npm run lint
npm run build
```

Windows PowerShell 如遇执行策略限制，可改用：

```bash
npm.cmd install
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

## 环境变量

复制 `.env.example` 作为本地参考即可。本阶段不会读取 Supabase、DeepSeek 或 OCR 配置，也不要提交 `.env.local`。

## 访问控制

本地运行可以不登录。线上部署至少预留：

```bash
APP_ACCESS_PASSWORD="your-lightweight-password"
```

这只是轻量防误访问，不是正式多用户安全方案。

## Supabase 数据备份

学习记录是核心资产，必须定期备份。

推荐方式：

1. 在 Supabase Dashboard 中使用项目的 Backups/Database 相关入口查看可用备份能力。
2. 使用 `pg_dump` 通过 Supabase Postgres 连接串导出数据库：

```bash
pg_dump "postgresql://USER:PASSWORD@HOST:PORT/postgres" --format=custom --file=gmat-study-backup.dump
```

3. 如需导出为 SQL：

```bash
pg_dump "postgresql://USER:PASSWORD@HOST:PORT/postgres" --file=gmat-study-backup.sql
```

注意：

- 不要把备份文件提交到 GitHub。
- 不要把数据库连接串、密码或 API key 写入仓库。
- 用户上传图片保存在 Supabase Storage，数据库只保存 Storage path；图片备份需要单独从 Storage 导出。
