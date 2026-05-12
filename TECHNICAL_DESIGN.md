# GMAT 个人学习系统技术方案文档

版本：v0.2  
状态：MVP 收敛版  
目标：先实现无 AI/OCR 也能使用的个人 GMAT 学习系统，再逐步接入截图、OCR、DeepSeek 和推荐能力

## 1. 技术目标

第一版技术方案必须服务于一个基础可用闭环：

手动录题 -> Supabase 入库 -> 题库列表 -> 题目详情 -> 练习记录 -> 错题标记 -> 基础看板 -> 跨设备同步。

OCR/AI 识别、AI 错题分析和练习推荐保留，但后置到基础功能稳定之后。系统不得因为没有 DeepSeek API key 或 OCR Provider 而无法使用。

## 2. MVP 优先级

1. 第一优先级：手动录题、题库保存、练习记录、错题统计、基础看板。
2. 第二优先级：截图上传和预览。
3. 第三优先级：OCR/AI 识别。
4. 第四优先级：AI 错题分析和练习推荐。

技术约束：

- MVP 必须保证无 AI/OCR 也可使用。
- 任何 AI/OCR 功能不得阻塞手动录题、题库、练习记录和基础看板。
- 第一版不允许把 AI 作为唯一入口。
- `LLM_MODEL` 不得在代码中写死，只能从环境变量读取。
- `OCR_PROVIDER` 默认是 `manual`。

## 3. 推荐技术栈

### 3.1 应用框架

- Next.js App Router。
- TypeScript。
- React Server Components + Client Components。
- Route Handlers 作为后端接口。

### 3.2 UI 技术栈

- Tailwind CSS。
- shadcn/ui。
- lucide-react。
- Recharts。

UI 规范：

- 页面采用左侧导航 + 主内容卡片布局。
- 首页首屏必须展示今日建议、总题数、正确率、最近 7 天练习量、Top 薄弱点、最近错题和快捷按钮。
- 所有表单必须有 loading、success、error、empty state。
- 所有列表必须有 empty state。

### 3.3 数据与文件存储

- Supabase Postgres：存储题目、练习记录、错题标签、统计数据来源、AI 分析和推荐。
- Supabase Storage：存储题目截图和解析截图。

长期保存规则：

- 所有数据库结构变更必须通过 migration。
- 用户上传图片只存 Storage path，不把 base64 存入数据库。
- 后续需要支持 JSON/CSV 导出。
- README 必须说明如何备份 Supabase 数据。

### 3.4 AI 服务

基础功能稳定后再接入 DeepSeek API。

- DeepSeek 使用 OpenAI-compatible Chat Completions 形式接入。
- 通过环境变量配置 `LLM_PROVIDER`、`LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL`。
- `LLM_MODEL` 只从环境变量读取，不在代码里写死。
- 截图识别不直接假设 DeepSeek 官方 API 具备图片输入能力，采用“独立 OCR -> DeepSeek 文本结构化解析”的两段式方案。
- `OCR_PROVIDER` 默认是 `manual`。

用途：

- OCR：从截图中提取题干、选项、答案和解析文本。
- DeepSeek：把 OCR 文本整理成题目 JSON，生成错题分析、薄弱点总结和推荐说明。

### 3.5 部署

- GitHub：托管代码。
- Vercel：部署 Web 应用。
- Supabase：托管数据库和图片存储。

访问控制：

- 本地运行可以不登录。
- 线上部署至少预留 `APP_ACCESS_PASSWORD` 环境变量。
- `APP_ACCESS_PASSWORD` 只是轻量防误访问，不是正式多用户安全方案。
- 后续如需正式安全，使用 Supabase Auth 或其他认证方案。

## 4. 系统架构

### 4.1 MVP 架构

```text
Browser
  |
  | Manual Question Form / Attempts / Dashboard
  v
Next.js Frontend
  |
  | Route Handlers
  v
Next.js Backend
  |
  | Supabase Server Client
  v
Supabase Postgres
```

### 4.2 截图与 AI 增强架构

```text
Browser
  |
  | Upload / Paste Screenshot
  v
Next.js Frontend
  |
  | Route Handlers
  v
Next.js Backend
  |         |
  |         | OCR API / Manual OCR
  |         v
  |      OCR Provider
  |
  |         | DeepSeek Chat API
  |         v
  |      DeepSeek
  |
  | Supabase Server Client
  v
Supabase Postgres + Storage
```

### 4.3 关键原则

- 手动录题是第一入口。
- 前端不直接持有 Supabase service role key。
- 数据写入通过 Next.js 后端接口完成。
- 截图先上传到 Storage，再保存 Storage path 和图片元数据。
- OCR/AI 识别结果先进入待确认状态。
- 用户确认后才写入正式题目表。
- AI 输出必须经过 JSON schema 校验。
- DeepSeek 或 OCR 调用失败时，系统仍保留手动录入、练习记录和基础看板能力。

## 5. 环境变量

`.env.local` 最小配置：

```bash
NEXT_PUBLIC_APP_NAME="GMAT Study Agent"
APP_ACCESS_PASSWORD=""
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="server-only-service-role-key"
SUPABASE_STORAGE_BUCKET="gmat-screenshots"
MAX_UPLOAD_MB="10"
LLM_PROVIDER="deepseek"
LLM_BASE_URL="https://api.deepseek.com"
LLM_API_KEY=""
LLM_MODEL=""
OCR_PROVIDER="manual"
OCR_API_BASE_URL=""
OCR_API_KEY=""
```

注意：

- `SUPABASE_SERVICE_ROLE_KEY` 只能在服务端使用。
- 不要把 `.env.local` 提交到 GitHub。
- 本地可以让 `APP_ACCESS_PASSWORD` 为空。
- 线上部署必须预留 `APP_ACCESS_PASSWORD`，用于轻量防误访问。
- `LLM_MODEL` 为空时，AI 功能应显示未配置状态，但不能影响手动录题。
- `OCR_PROVIDER="manual"` 表示默认不自动 OCR，用户可手动录入或校对。

## 6. 数据模型

### 6.1 questions

用于存储正式题目。

字段：

- `id`：UUID。
- `section`：`quant`、`verbal`、`data_insights`。
- `question_type`。
- `stem`：题干。
- `choices`：JSON 数组。
- `correct_answer`。
- `explanation`。
- `knowledge_tags`：JSON 数组。
- `source`：`manual`、`screenshot`、`ocr`。
- `created_at`。
- `updated_at`。

### 6.2 attempts

用于记录每次作答。

字段：

- `id`：UUID。
- `question_id`。
- `user_answer`。
- `correct_answer`。
- `is_correct`。
- `time_spent_seconds`。
- `error_tags`：JSON 数组。
- `note`。
- `attempted_at`。
- `created_at`。

### 6.3 screenshot_assets

用于记录题目截图和解析截图。第 6 次验收实现。

字段：

- `id`：UUID。
- `question_id`：可为空，允许先上传后关联。
- `asset_type`：`question` 或 `explanation`。
- `storage_path`：Supabase Storage 路径。
- `mime_type`。
- `file_size`。
- `sort_order`。
- `created_at`。

禁止：

- 不得把图片 base64 存入数据库。

### 6.4 import_sessions

用于记录 OCR/AI 识别流程。第 7 次验收实现。

字段：

- `id`：UUID。
- `status`：`uploaded`、`recognizing`、`pending_confirmation`、`confirmed`、`failed`。
- `source`：`upload`、`paste`、`drag_drop`。
- `recognition_result`：AI 识别 JSON。
- `error_message`。
- `created_at`。
- `updated_at`。

### 6.5 mistake_analyses

用于记录 AI 错题分析。第 8 次验收实现。

字段：

- `id`：UUID。
- `question_id`。
- `attempt_id`。
- `error_categories`：JSON 数组。
- `weakness_tags`：JSON 数组。
- `where_wrong`。
- `why_wrong`。
- `improvement_advice`。
- `review_priority`：`low`、`medium`、`high`。
- `rule_result`：规则分析 JSON。
- `llm_result`：LLM 分析 JSON。
- `created_at`。

### 6.6 recommendations

用于记录推荐任务。第 8 次验收实现。

字段：

- `id`：UUID。
- `recommendation_type`：`today`、`drill`、`review`。
- `title`。
- `description`。
- `reason`。
- `related_tags`：JSON 数组。
- `related_question_ids`：JSON 数组。
- `status`：`pending`、`done`、`ignored`。
- `created_at`。
- `updated_at`。

## 7. API 设计

### 7.1 手动创建题目

`POST /api/questions`

用途：

- 创建题目。
- 可选同时创建首次练习记录。
- 不依赖 AI/OCR。

请求：

```json
{
  "question": {
    "section": "quant",
    "questionType": "Data Sufficiency",
    "stem": "question stem",
    "choices": ["A", "B", "C", "D", "E"],
    "correctAnswer": "C",
    "explanation": "",
    "knowledgeTags": ["algebra"],
    "source": "manual"
  },
  "attempt": {
    "userAnswer": "A",
    "isCorrect": false,
    "timeSpentSeconds": 120,
    "errorTags": ["审题遗漏"],
    "note": "missed condition 2"
  }
}
```

### 7.2 获取题库

`GET /api/questions`

查询参数：

- `section`
- `questionType`
- `knowledgeTag`
- `isWrong`
- `keyword`

### 7.3 获取题目详情

`GET /api/questions/{id}`

返回：

- 题目。
- 作答历史。
- 截图素材。
- 后续 AI 分析。

### 7.4 创建练习记录

`POST /api/questions/{id}/attempts`

用途：

- 为已有题目新增一次作答记录。
- 更新错题统计来源。
- 不依赖 AI。

### 7.5 获取错题本

`GET /api/mistakes`

查询参数：

- `section`
- `questionType`
- `knowledgeTag`
- `errorTag`

### 7.6 获取基础看板

`GET /api/dashboard`

返回：

- 今日建议。
- 总题数。
- 正确率。
- 最近 7 天练习量。
- Top 薄弱点。
- 最近错题。

### 7.7 上传截图

`POST /api/screenshots`

第 6 次验收实现。

用途：

- 接收题目截图或解析截图。
- 上传到 Supabase Storage。
- 只保存 Storage path。

### 7.8 OCR + AI 识别截图

`POST /api/import-sessions/{id}/recognize`

第 7 次验收实现。

用途：

- 调用 OCR 抽象层从截图提取文本。
- 调用 DeepSeek 把 OCR 文本整理为待确认题目结构。
- 不写入正式题库。

### 7.9 AI 错题分析和推荐

第 8 次验收实现。

- `POST /api/questions/{id}/analyze`
- `GET /api/recommendations`
- `PATCH /api/recommendations/{id}`

要求：

- AI 不可用时返回明确未配置状态。
- AI 不可用不得影响基础统计。
- AI 输出必须经过结构化校验。

## 8. 前端交互设计

### 8.1 基础布局

- `AppSidebar`：左侧导航。
- `MainShell`：主内容容器。
- `MetricCard`：看板指标卡。
- `EmptyState`、`LoadingState`、`ErrorState`、`SuccessState`：统一状态组件。

### 8.2 手动录题组件

- `QuestionForm`：科目、题型、题干、选项、正确答案、知识点标签。
- `AttemptForm`：我的答案、是否正确、耗时、错因标签、备注。
- `TagInput`：知识点和错因标签。
- `SaveActions`：保存题目、保存并继续、清空。

保存前必须满足：

- 科目不能为空。
- 题型不能为空。
- 题干不能为空。
- 正确答案不能为空。
- 我的答案不能为空。
- 是否正确必须明确。

### 8.3 题库与错题本组件

- `QuestionTable`。
- `QuestionFilters`。
- `MistakeFilters`。
- `QuestionDetailPanel`。
- `AttemptHistory`。

筛选要求：

- 题库按科目、题型、知识点、是否错题筛选。
- 错题本按科目、题型、知识点、错因筛选。

### 8.4 看板组件

- `TodaySuggestionCard`。
- `TotalQuestionsCard`。
- `AccuracyCard`。
- `SevenDayPracticeChart`。
- `WeaknessList`。
- `RecentMistakesList`。
- `QuickActions`。

图表使用 Recharts。

### 8.5 截图上传组件

第 6 次验收实现。

- `ScreenshotDropzone`：点击、拖拽、粘贴上传。
- `ScreenshotPreviewList`：显示题目截图和解析截图。
- `ScreenshotLinker`：关联已有题目或作为待识别素材。

### 8.6 AI/OCR 组件

第 7 次验收后实现。

- `RecognitionForm`：显示并编辑 OCR/AI 识别结果。
- `ImportActions`：重新识别、保存题目、取消。

## 9. AI/OCR 设计

AI/OCR 后置到基础功能稳定之后。

### 9.1 OCR 输出

`OCR_PROVIDER` 默认是 `manual`。如果使用外部 OCR，输出结构：

```json
{
  "text": "ocr text",
  "confidence": 0.8,
  "warnings": ["low resolution"]
}
```

### 9.2 DeepSeek 题目解析

输入：

- OCR 文本。
- 用户可选补充说明。

输出必须是 JSON：

```json
{
  "section": "quant | verbal | data_insights | unknown",
  "questionType": "string",
  "stem": "string",
  "choices": ["string"],
  "correctAnswer": "string | null",
  "explanation": "string | null",
  "knowledgeTags": ["string"],
  "confidence": 0.0,
  "needsUserInput": ["string"],
  "warnings": ["string"]
}
```

要求：

- 不确定就填 `unknown` 或 `null`。
- 不允许编造正确答案。
- 如果截图没有答案，必须把 `correctAnswer` 设为 `null`。
- 如果文本不完整，必须在 `warnings` 中说明。

### 9.3 AI 错题分析

AI 分析第 8 次验收实现。输入必须包含题目、练习记录、规则统计和用户备注。

输出必须是 JSON：

```json
{
  "whereWrong": "string",
  "whyWrong": "string",
  "weaknessTags": ["string"],
  "errorCategories": ["string"],
  "improvementAdvice": "string",
  "reviewPriority": "low | medium | high"
}
```

## 10. 数据长期保存与备份

规则：

- 所有数据库结构变更必须通过 migration。
- 不允许直接在生产数据库手动改表后不沉淀 migration。
- 用户上传图片只保存 Storage path，不把 base64 存入数据库。
- 后续需要支持 JSON/CSV 导出。
- README 必须说明如何备份 Supabase 数据。

备份要求：

- README 至少说明 Supabase Dashboard 备份入口。
- README 至少说明使用 `pg_dump` 按连接串导出数据库。
- 备份文件不得提交到 GitHub。

## 11. 部署方案

### 11.1 GitHub

仓库包含：

- Next.js 项目代码。
- Supabase SQL migration。
- `.env.example`。
- README 部署和备份说明。
- 产品和技术文档。

不提交：

- `.env.local`。
- API key。
- Supabase service role key。
- 用户上传的图片。
- 数据库备份文件。

### 11.2 Supabase

需要创建：

- 一个 Supabase 项目。
- 数据库表和索引。
- 第 6 次验收时创建 Storage bucket：`gmat-screenshots`。

建议：

- 所有数据库写入都通过服务端 API 完成。
- 不在前端暴露数据库写权限。
- 即使暂不做正式登录，也不要把 service role key 暴露给浏览器。

### 11.3 Vercel

配置：

- 连接 GitHub 仓库。
- 设置环境变量。
- 部署 Next.js 应用。
- 线上环境配置 `APP_ACCESS_PASSWORD`。

验收：

- 生产地址能打开首页。
- 能手动录题。
- 能保存练习记录。
- 换设备访问同一地址后能看到数据。

### 11.4 访问控制

本地运行可以不登录。线上部署至少预留 `APP_ACCESS_PASSWORD` 环境变量。

说明：

- 访问密码只是轻量防误访问。
- 它不是正式多用户安全方案。
- 长期使用建议增加 Supabase Auth 单用户登录。

## 12. 开发顺序

### 第 0 次验收：文档成果

实现：

- 更新 `AGENTS.md`。
- 更新 `PRODUCT_DESIGN.md`。
- 更新 `TECHNICAL_DESIGN.md`。
- 创建或更新 `README.md`。

验收：

- 文档明确 MVP 优先级和无 AI/OCR 可用原则。

### 第 1 次验收：项目可启动

实现：

- 初始化 Next.js + TypeScript。
- 配置 Tailwind CSS + shadcn/ui + lucide-react + Recharts。
- 创建左侧导航和主内容布局。
- 创建 `.env.example`。
- 编写本地启动说明。

验收：

- 本地运行后能打开首页。

### 第 2 次验收：Supabase 数据库和手动录题入库

实现：

- 创建 Supabase migration。
- 创建 `questions` 和 `attempts` 表。
- 实现手动录题页。
- 实现 `POST /api/questions`。

验收：

- 不配置 AI/OCR 也能保存题目和首次练习记录。

### 第 3 次验收：题库列表和题目详情

实现：

- 实现题库列表页。
- 实现题目详情页。
- 实现 `GET /api/questions` 和 `GET /api/questions/{id}`。

验收：

- 能查看、筛选和进入详情。

### 第 4 次验收：练习记录和错题标记

实现：

- 实现新增练习记录接口。
- 实现练习记录展示。
- 实现基础错题本页。

验收：

- 同一道题可保存多次练习记录。
- 错题本可按科目、题型、知识点、错因筛选。

### 第 5 次验收：基础学习看板

实现：

- 实现基础统计查询。
- 实现首页看板。
- 使用 Recharts 展示最近 7 天练习量。

验收：

- 首页首屏展示今日建议、总题数、正确率、最近 7 天练习量、Top 薄弱点、最近错题和快捷按钮。

### 第 6 次验收：截图上传和预览

实现：

- 创建 Storage bucket。
- 实现截图上传接口。
- 实现截图上传和预览页面。

验收：

- 支持点击、拖拽、粘贴上传。
- 数据库只保存 Storage path。

### 第 7 次验收：OCR/AI 识别

实现：

- 实现 OCR 抽象层。
- 实现 DeepSeek 题目结构化解析。
- 实现识别结果确认表单。

验收：

- `OCR_PROVIDER` 默认 `manual`。
- `LLM_MODEL` 从环境变量读取。
- 识别失败不影响手动录题。

### 第 8 次验收：AI 错题分析和练习推荐

实现：

- 实现规则分析。
- 实现 DeepSeek 错题分析。
- 实现推荐生成。

验收：

- AI 不可用时保留基础错题统计和看板。
- AI 输出经过结构化校验。

### 第 9 次验收：部署和跨设备验证

实现：

- Vercel 部署说明。
- Supabase 初始化说明。
- `APP_ACCESS_PASSWORD` 配置说明。
- Supabase 备份说明。

验收：

- 换设备可看到同一份云端数据。
- README 说明如何备份 Supabase 数据。

## 13. 测试策略

### 13.1 单元测试

优先覆盖：

- 手动录题表单校验。
- 练习记录正确率计算。
- 错题筛选规则。
- 看板统计聚合。
- 文件类型和大小校验。
- AI JSON schema 校验。

### 13.2 集成测试

优先覆盖：

- 创建题目和首次练习记录。
- 查询题库和题目详情。
- 新增练习记录。
- 错题本筛选。
- 看板统计。
- 上传截图到 Storage。

### 13.3 端到端测试

优先覆盖：

- 手动录题。
- 查看题库。
- 查看题目详情。
- 新增练习记录。
- 查看错题本。
- 查看基础看板。

后续覆盖：

- 上传截图并预览。
- OCR/AI 识别后编辑字段。
- AI 错题分析。
- AI 推荐。

### 13.4 手工验收

每个开发阶段只做对应验收项，不提前合并多个验收目标。

## 14. 可扩展方向

- 增加 JSON/CSV 导出。
- 增加 OCR/AI 识别。
- 增加 AI 错题分析和推荐。
- 增加 Supabase Auth 单用户登录。
- 增加复习提醒。
- 增加知识点树。
- 增加考试日期倒推学习计划。
- 增加移动端 PWA。
