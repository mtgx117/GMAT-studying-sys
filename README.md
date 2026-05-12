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
