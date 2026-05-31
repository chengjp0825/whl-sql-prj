# Backend — PCB 元器件库 API

## 技术栈
- Node.js + Express
- SQLite (sql.js · 纯 JS，零本地依赖)
- LLM 多模型：DeepSeek / Claude / OpenAI（通过 factory 切换）

## 项目约定

### 数据库
- 数据库文件：`data/pcb_bom.db`（自动生成，git 追踪）
- Schema：`src/db/schema.sql`
- 连接：`src/db/connection.js` — 通过 `getDb()` 获取 sql.js 实例，`saveToDisk()` 持久化
- SQLite 语法：用 `?` 占位符，`json_extract()` 查 JSON，`LIKE` 模糊匹配

### LLM
- 工厂模式：`src/llm/factory.js` → 根据 `LLM_PROVIDER` 环境变量选择实现
- 接口：`nl2sql(naturalLanguage, schemaContext, options)` → `{ sql, explanation, type, suggestion }`
- 新增提供商：在 `src/llm/` 下新建文件，实现 `nl2sql`，factory 加分支

### NL2SQL 引擎
- `engine.js`：三层路由（规则 → 缓存 → LLM）
- `rule-engine.js`：7 类正则匹配（封装/分类/制造商/库存/料号/价格/模糊搜索）
- 扩展规则：编辑 `rule-engine.js` 中的 `CATEGORY_MAP` 和各正则常量
- `context-builder.js`：动态构建 LLM 上下文（schema + 样本数据），5 分钟缓存

### 路由
- `POST /api/query` — NL 查询，body: `{ question, mode }`
- `POST /api/query/execute` — 确认执行写操作 SQL
- `CRUD /api/components` — 物料管理
- `GET/POST /api/categories` — 分类管理

### 安全
- `sql-guard.js`：禁止 DDL / 多语句 / 无 WHERE 的 DELETE 和 UPDATE
- 写操作需前端二次确认（通过 `/api/query/execute` 端点）

### 日志
- `utils/logger.js`：`log.info(tag, msg, data)` / `.warn()` / `.error()` / `.debug()`
- 设置 `LOG_LEVEL=debug` 查看详细日志（包括 LLM 返回内容）

## 命令
```bash
npm run migrate   # 建表
npm run seed      # 注入 27 条种子数据
npm start         # 启动服务 :3000
```
