# Backend Spec

## 概述
Express API 服务，提供 PCB 元器件库的自然语言查询和 CRUD 管理。核心是三层查询引擎：正则规则 → 内存缓存 → LLM。

## 数据表

### component_category
物料分类树。`parent_id` 自引用实现父子层级。一级分类（RES/CAP/IC/CONN/DIO/IND/CRY）下挂二级子分类。

### component_library
元器件库。`internal_pn` 唯一标识物料，`spec_json` 存规格参数（阻值/容值/电压/封装等）。关联 `component_category`。

## API

### POST /api/query
自然语言查询。`mode: "fast"` 走规则+缓存，`mode: "smart"` 加 LLM + 建议。返回 `{ source, elapsed, columns, rows, suggestion }`。

### POST /api/query/execute
二次确认执行写操作 SQL。前端预览后调此端点执行。

### CRUD /api/components
分页查询（支持 `category_id/footprint_name/manufacturer/stock_min/stock_max`）、单个查询、新增、更新、删除。

### GET/POST /api/categories
平铺列表或树形（`?format=tree`），新增分类。

## 安全
- DDL 操作直接拒绝
- DELETE / UPDATE 必须带 WHERE
- 写操作需 `/api/query/execute` 确认
- CORS 允许跨域

## LLM 上下文
`context-builder.js` 动态构建：完整建表 SQL + 分类/封装/制造商列表 + 前 10 条物料样本 + 查询规则 + 输出格式。缓存 5 分钟。总长约 3700 字符。
