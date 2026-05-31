# Changelog

## v1.0.0 (2026-05-31)

### v1.4 — 种子数据扩充 + 文档规范化
- 种子数据扩充到 27 条物料、13 个分类、14 家制造商
- 完整 README.md（架构/快速开始/功能/API/开发指南）
- 前后端分别添加 CLAUDE.md 和 SPEC.md
- README 架构图和文件树精简

### v1.3 — AI 搜索模式 + LLM 上下文增强 + UI 专业化
- 搜索栏新增「快速/AI」双模式切换
- AI 模式：规则→缓存→LLM + 专业选型建议
- 空结果 + AI 建议时醒目橙色提示框 + 免责声明
- LLM 上下文从 ~500 字升级到 ~3700 字（完整 schema + 样本数据）
- UI 重写：暖灰色系 + 精炼靛蓝 + Inter 字体 + 多层阴影
- `/simplify` 4 agent 审查修复（死代码/性能/事件泄漏）
- 查询时禁用所有按钮 + 加载动画

### v1.2 — 三层查询引擎 + 过滤器栏 + 写安全
- 规则引擎：7 类正则匹配（封装/分类/制造商/库存/料号/价格/模糊搜索）
- 缓存层：内存 KV，TTL 30min，上限 200 条
- LLM 兜底：规则和缓存均未命中才调用
- 分类父子匹配：查一级分类自动包含子分类物料
- 过滤器栏：封装/分类/制造商/库存范围筛选
- 写操作安全：INSERT/UPDATE/DELETE 弹窗确认
- 状态栏显示来源 + 耗时

### v1.1 — PostgreSQL → SQLite 迁移
- 数据库从 PostgreSQL/pg 迁移到 SQLite/sql.js
- 零外部依赖，DB 文件存项目目录，git clone 即用

### v1.0 — MVP
- Node.js + Express + SQLite 后端
- 原生 HTML/CSS/JS 前端
- NL2SQL：Claude/OpenAI/DeepSeek 三模型切换
- 物料 CRUD + 分类管理
- SQL 安全校验
