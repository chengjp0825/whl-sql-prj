# PCB 元器件库管理助手

AI Agent 驱动的 PCB 电子元器件物料管理平台。用户通过自然语言描述需求，系统自动转换为 SQL 并执行，支持物料查询、增删改、分类管理和 AI 智能选型建议。

## 架构

前端（原生 HTML/CSS/JS）通过 HTTP 调用 Express API，后端三层查询引擎处理自然语言 → SQLite 执行。

**查询链路**：规则引擎(<1ms) → 内存缓存 → LLM(AI模式)。规则命中直接出结果，未命中走缓存，缓存未命中才调 AI。AI 模式额外返回选型建议。

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- 无需安装数据库（SQLite 内嵌）

### 1. 安装

```bash
git clone <repo>
cd pcb-bom

# 后端
cd backend
npm install
copy .env.example .env   # 编辑 .env，填入 LLM API Key

# 前端
cd ../frontend
npm install
```

### 2. 注入种子数据

```bash
cd backend
npm run migrate    # 建表
npm run seed       # 注入 25 条示例物料（13 个分类）
```

### 3. 启动

```bash
# 终端 1：后端
cd backend
npm start          # http://localhost:3000

# 终端 2：前端
cd frontend
npm start          # http://localhost:3001
```

浏览器打开 `http://localhost:3001`。

### 4. 配置 LLM

编辑 `backend/.env`：

```env
# 推荐：DeepSeek（性价比高）
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-chat
DEEPSEEK_API_KEY=sk-你的密钥

# 或 Claude
# LLM_PROVIDER=claude
# ANTHROPIC_API_KEY=sk-ant-你的密钥

# 或 OpenAI 兼容接口
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-你的密钥
# OPENAI_BASE_URL=https://api.openai.com/v1
```

## 功能

### 搜索模式

| 模式 | 说明 | 速度 | 适用场景 |
|------|------|------|----------|
| **快速** | 规则引擎 + 缓存，不调 AI | <10ms | 日常查询："0805电阻"、"库存<50" |
| **AI** | 规则 → 缓存 → LLM，附带专业建议 | 1-3s | 复杂问题："STM32搭配什么LDO"、"FPGA外围器件推荐" |

### 自然语言查询

| 输入 | 匹配方式 | 生成 SQL |
|------|----------|----------|
| `0805封装电阻` | 规则：封装=0805 + 分类=RES | `WHERE footprint_name LIKE '%0805%' AND ... = 'RES'` |
| `电阻和电容` | 规则：多分类 OR | `WHERE (... = 'RES' OR ... = 'CAP')` |
| `库存低于50` | 规则：库存比较 | `WHERE stock_qty < 50` |
| `TI IC 单价<5元` | 规则：制造商+分类+价格 | 三条件 AND |
| `STM32 3.3V供电方案` | AI 模式：LLM 理解 + 建议 | 智能 SELECT + 选型建议 |

### 左侧筛选栏

- **浏览**：全部物料 / 低库存（<50）- 实时角标
- **分类树**：点击即筛选，自动包含子分类
- **高级筛选**：封装下拉 + 分类下拉 + 制造商 + 库存范围 → 组合 API 查询

### 物料管理

- 表格内操作：编辑 / 删除
- 弹窗表单：新增 / 编辑全部字段
- 分类管理：增删分类，支持父子树形结构
- AI 写操作：LLM 生成的 INSERT/UPDATE/DELETE 需弹窗确认后执行

### 安全机制

| 防护 | 说明 |
|------|------|
| 禁止 DDL | DROP / TRUNCATE / ALTER 等直接拒绝 |
| 禁止多语句 | 防止 SQL 注入拼接 |
| DELETE 必须带 WHERE | 防止误删全表 |
| UPDATE 必须带 WHERE | 防止误改全表 |
| 写操作二次确认 | LLM 生成的写操作弹窗预览 SQL |

## 数据库

### 数据表（SQLite）

| 表 | 说明 | MVP 状态 |
|----|------|----------|
| `component_category` | 物料分类树（父-子） | ✅ |
| `component_library` | 元器件库（料号/封装/规格/价格/库存） | ✅ |
| `footprint_library` | 封装库索引 | 🔜 后续 |
| `footprint_file` | 封装文件管理 | 🔜 后续 |
| `pcb_project` | PCB 工程管理 | 🔜 后续 |
| `sys_user` | 用户管理 | 🔜 后续 |

### 种子数据（25 条）

| 分类 | 条目 | 示例 |
|------|------|------|
| 电阻 | 5 | 0805 10KΩ 5%, 0603 1KΩ 1%, 0402 100Ω, 1206 4.7KΩ, 0805 0Ω |
| 电容 | 6 | 0603 100nF, 0805 10µF, 1206 22µF, 0603 1µF, 100µF 电解, 470µF 电解 |
| MCU | 2 | STM32F103C8T6, ESP32-WROOM-32E |
| 电源 IC | 3 | LDO 3.3V, LDO 1.8V, DC-DC 5V 3A |
| 其他 IC | 3 | 运放 OPA2376, SPI Flash W25Q16, 电平转换 TXB0104 |
| 二极管 | 3 | TVS 5V, 肖特基 40V, 红色 LED |
| 电感 | 2 | 铁氧体磁珠 600Ω, 功率电感 4.7µH |
| 晶振 | 2 | 8MHz 3225, 32.768kHz 3215 |
| 连接器 | 1 | 排针 2x5P 2.54mm |

制造商覆盖：Yageo, Samsung, Panasonic, Murata, TDK, Nichicon, ST, Espressif, TI, Winbond, Nexperia, Wurth, Abracon, Molex

## 项目结构

```
├── backend/
│   ├── src/
│   │   ├── app.js              # Express 入口
│   │   ├── config/             # DB + LLM 配置
│   │   ├── db/                 # schema / 连接 / migrate / seed
│   │   ├── llm/                # Claude / OpenAI / DeepSeek 实现 + factory
│   │   ├── nl2sql/             # 查询引擎 / 规则引擎 / LLM 上下文
│   │   ├── routes/             # query / components / categories
│   │   ├── services/           # 业务逻辑
│   │   ├── middleware/         # SQL 安全 + 错误处理
│   │   └── utils/              # 日志
│   ├── data/pcb_bom.db         # SQLite 数据库（自动生成）
│   └── .env.example
│
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── app.js              # 主逻辑
        ├── api.js              # API 封装
        └── components/         # 搜索栏 / 表格 / 弹窗
```

## API 文档

### `POST /api/query`

自然语言查询（三层引擎）。

```json
// Request
{ "question": "0805封装电阻", "mode": "fast" }

// Response (SELECT)
{
  "status": "ok",
  "sql": "SELECT ...",
  "explanation": "封装=0805, 分类=电阻",
  "type": "SELECT",
  "source": "rule",
  "elapsed": 3,
  "suggestion": "",
  "columns": ["component_id", "internal_pn", ...],
  "rows": [...],
  "rowCount": 5
}
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `question` | string | 自然语言查询 |
| `mode` | `"fast"` \| `"smart"` | 快速模式（默认）/ AI 模式 |

| 响应字段 | 说明 |
|----------|------|
| `source` | `"rule"` / `"cache"` / `"llm"` / `"none"` |
| `suggestion` | AI 模式下的专业建议（空结果时更突出） |
| `requiresConfirmation` | 写操作预览标志 |

### `POST /api/query/execute`

执行已确认的写操作 SQL。

```json
// Request
{ "sql": "UPDATE component_library SET ...", "type": "UPDATE" }

// Response
{ "status": "ok", "type": "UPDATE", "affectedRows": 12, "message": "操作成功，影响 12 行" }
```

### `GET /api/components`

分页查询物料列表。

| 参数 | 说明 |
|------|------|
| `page`, `pageSize` | 分页 |
| `category_id` | 分类筛选（含子分类） |
| `footprint_name` | 封装筛选 |
| `manufacturer` | 制造商筛选 |
| `stock_min`, `stock_max` | 库存范围 |

### `POST /api/components`

新增物料。

### `PUT /api/components/:id`

更新物料。

### `DELETE /api/components/:id`

删除物料。

### `GET /api/categories?format=tree`

获取分类列表（平铺 / 树形）。

### `POST /api/categories`

新增分类。

## 开发

```bash
# 后端 - 调试模式（详细日志）
cd backend
$env:LOG_LEVEL='debug'; npm start

# 重置数据库
rm data/pcb_bom.db && npm run migrate && npm run seed

# 前端 - 开发服务器
cd frontend
npm start    # http://localhost:3001
```

### 添加新 LLM 提供商

1. `backend/src/llm/` 下新建文件（如 `qwen.js`）
2. 实现 `nl2sql(naturalLanguage, schemaContext, options)` → `{ sql, explanation, type, suggestion }`
3. `factory.js` 添加 `case 'qwen'` 分支
4. `config/index.js` 和 `.env.example` 添加对应配置

### 扩展规则引擎

编辑 `backend/src/nl2sql/rule-engine.js`：

- `CATEGORY_MAP`：分类关键词 → 编码
- `FOOTPRINT_RE`：封装名称正则
- `MANUFACTURER_RE`：制造商正则
- `STOCK_RE` / `PRICE_RE`：比较表达式

## 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Node.js + Express |
| 数据库 | SQLite (sql.js · 纯 JS，零安装) |
| 前端 | 原生 HTML/CSS/JS（零框架依赖） |
| LLM | DeepSeek / Claude / OpenAI（可切换） |
| 查询 | 规则引擎（正则） + 内存缓存 + LLM |

## License

MIT
