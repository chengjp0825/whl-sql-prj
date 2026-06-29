/**
 * build_report.js — PCB 元器件库管理助手 课程设计报告 组装脚本
 *
 * 读取项目源码和 Mermaid 图表，组装符合中文学术论文规范的 .docx 报告。
 *
 * 用法: node build_report.js
 * 输出: ../PCB元器件库管理助手-课程设计报告.docx
 */

import {
  P, PR, run, H1, H2, H3, CODE, TABLE, TAB_CAPTION,
  IMG, FIG_CAPTION, REF, REF_HEADING, buildDocx,
} from './docx-kit.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ========================
// 读取源码片段
// ========================

function readSrc(relPath) {
  const fullPath = join(__dirname, '..', relPath);
  return readFileSync(fullPath, 'utf-8');
}

// ========================
// 标题页
// ========================

const TITLE_BLOCK = [
  P('', { indent: false, alignment: 'center' }),
  P('', { indent: false, alignment: 'center' }),
  P('', { indent: false, alignment: 'center' }),
  P('PCB 元器件库管理助手', { indent: false, bold: true, alignment: 'center' }),
  P('——基于 AI Agent 的电子元器件物料管理平台', { indent: false, alignment: 'center' }),
  P('', { indent: false, alignment: 'center' }),
  P('课 程 设 计 报 告', { indent: false, bold: true, alignment: 'center' }),
  P('', { indent: false, alignment: 'center' }),
  P('', { indent: false, alignment: 'center' }),
  P('技术栈: Node.js + Express + SQLite + AI Agent', { indent: false, alignment: 'center' }),
  P('', { indent: false, alignment: 'center' }),
  P('2026 年 6 月', { indent: false, alignment: 'center' }),
];

// ========================
// 一、课程设计的目的和需求
// ========================

const CH1 = [
  H1('一、课程设计的目的和需求'),

  H2('1.1 课程设计背景'),
  P('在电子硬件产品开发过程中，元器件物料清单（Bill of Materials, BOM）管理是核心环节之一。传统方式下，硬件工程师需要记忆大量元器件参数（封装、阻值、容值、制造商、供应商等），并通过手动方式在 Excel 或 ERP 系统中维护物料数据。这种方式存在以下痛点：'),
  P('（1）查询效率低——硬件工程师需要熟悉 SQL 或数据库查询语法，或者依赖专门的物料管理人员协助查询，沟通成本高。'),
  P('（2）数据分散——元器件信息分散在数据手册、供应商网站、历史项目文件中，缺乏统一的结构化管理。'),
  P('（3）选型困难——面对成百上千种元器件，如何选择合适的型号、评估替代方案，依赖工程师个人经验积累。'),
  P('（4）门槛高——小型团队或个人开发者缺乏企业级 PLM/ERP 系统，物料管理停留在手工阶段。'),

  H2('1.2 课程设计目的'),
  P('本课程设计旨在综合运用数据库系统概论、Web 应用开发、人工智能等课程知识，设计并实现一个面向硬件工程师的 PCB 元器件库管理助手。具体目标包括：'),
  P('（1）掌握数据库设计全流程——从需求分析、概念结构设计（E-R 模型）、逻辑结构设计（关系模式）到物理结构设计（DDL 与索引优化），完整实践数据库系统的设计方法论。'),
  P('（2）理解并实现 NL2SQL 技术——将自然语言处理（NLP）与数据库查询相结合，设计三层查询引擎（规则引擎 → 缓存 → LLM），使非技术用户能够通过中文自然语言操作数据库。'),
  P('（3）实践全栈 Web 开发——采用前后端分离架构，后端使用 Node.js + Express + SQLite，前端使用原生 HTML/CSS/JS 实现单页面应用（SPA），理解 RESTful API 设计与前后端交互模式。'),
  P('（4）探索 AI Agent 开发范式——集成大语言模型（LLM），实现智能 SQL 生成与选型建议，实践 Prompt Engineering、工具调用（Tool Use / Function Calling）等 AI 开发技术。'),

  H2('1.3 系统功能概述'),
  P('本系统是一个基于 Web 的 PCB 电子元器件物料管理平台，核心功能包括：'),
  P('（1）自然语言智能查询——硬件工程师使用中文描述需求（如 "0805封装 10KΩ 贴片电阻"），系统自动转换为 SQL 并在数据库中执行，返回匹配结果。'),
  P('（2）物料全生命周期管理——支持元器件的增删改查（CRUD），包括内部料号、封装、制造商、供应商、价格、库存等完整信息字段。'),
  P('（3）分类树形管理——支持多级分类体系（如电阻 → 贴片电阻 / 插件电阻），灵活扩展分类层级。'),
  P('（4）AI 智能选型建议——在 AI 模式下，LLM 分析查询结果并给出专业选型建议，帮助工程师快速决策。'),
  P('（5）写操作安全防护——通过 SQL Guard 中间件（4 层防线）和前端二次确认机制，确保数据库写操作的安全性。'),
  P('（6）多 LLM 提供商支持——通过工厂模式统一接口，可无缝切换 Claude / OpenAI / DeepSeek 等不同大模型。'),
];

// ========================
// 二、需求分析
// ========================

const CH2 = [
  H1('二、需求分析'),

  H2('2.1 功能需求'),
  P('根据 PCB 元器件管理的实际业务场景，系统需要满足以下功能需求：'),

  H3('2.1.1 自然语言查询（NL2SQL）'),
  P('用户通过中文描述查询需求，系统自动解析意图并生成 SQL。支持的查询维度包括：封装规格（如 0805、SOIC-8）、元器件分类（如电阻、电容、MCU）、制造商（如 TI、Yageo）、库存范围（如 "库存低于 50"）、价格范围（如 "单价 < 5 元"）、内部料号精准匹配。系统提供两种查询模式：快速模式（规则引擎 + 缓存，零成本）和 AI 智能模式（LLM 兜底 + 选型建议）。'),

  H3('2.1.2 物料管理（CRUD）'),
  P('支持元器件信息的完整生命周期管理。查询：按分类、封装、制造商等维度筛选，支持分页浏览。新增：录入元器件完整信息（料号、分类、封装、规格参数、制造商/供应商、价格、库存等）。编辑：修改已有元器件信息。删除：移除过时或错误的元器件记录。'),

  H3('2.1.3 分类管理'),
  P('支持多级树形分类结构（如电阻 → 贴片电阻 / 插件电阻），可动态新增子分类。分类查询支持父子包含关系：查询 "电阻" 时自动包含其所有子分类下的元器件。'),

  H3('2.1.4 AI 选型建议'),
  P('在 AI 智能模式下，当规则引擎命中并返回查询结果后，系统调用 LLM 对结果进行分析：若结果较多，建议进一步筛选条件；若结果较少，建议替代方案或相似物料。'),

  H3('2.1.5 写操作安全防护'),
  P('所有通过 AI 生成的写操作 SQL（INSERT/UPDATE/DELETE）不直接执行，先经过 SQL Guard 四层安全校验，再返回 SQL 预览给前端。用户需在弹窗中确认后方可执行。'),

  H2('2.2 非功能需求'),
  P('系统还需满足以下非功能性需求：'),
  TAB_CAPTION('表1 系统非功能需求'),
  TABLE(
    ['需求类型', '指标', '说明'],
    [
      ['性能', '规则引擎 < 1ms', '基于正则匹配，本地计算，无需网络'],
      ['性能', '缓存命中 < 1ms', '内存键值对，30 分钟 TTL，最大 200 条'],
      ['性能', 'LLM 响应 1-3s', 'AI 模式网络调用，取决于 API 延迟'],
      ['可用性', '零安装客户端', '纯 Web 界面，浏览器即可访问'],
      ['安全性', '4 层 SQL 防御', 'DDL 禁止 / 多语句 / DELETE WHERE / UPDATE WHERE'],
      ['可扩展性', '工厂模式', 'LLM 提供商可插拔切换，无需修改业务代码'],
      ['可维护性', '前端零框架', '原生 HTML/CSS/JS，无构建工具，无 npm 依赖'],
    ],
    [15, 25, 60],
  ),

  H2('2.3 数据需求分析'),
  P('系统核心数据实体包括两类：'),
  P('（1）元器件分类（component_category）——采用树形结构存储多级分类信息，每个分类具有唯一编码（如 RES、CAP、IC），通过 parent_id 实现自引用父子关系。'),
  P('（2）元器件物料（component_library）——存储每一个元器件的完整信息，包括内部料号、分类归属、封装、制造商、供应商、价格、库存、规格参数等 20 个字段。通过 category_id 关联到分类表。'),
];

// ========================
// 三、概念结构设计
// ========================

const CH3 = [
  H1('三、概念结构设计'),

  H2('3.1 实体分析'),
  P('通过对系统需求的分析，识别出以下核心实体：'),

  H3('3.1.1 元器件分类（Category）'),
  P('描述元器件的类别归属。分类采用树形层级结构，如 "电阻 → 贴片电阻" 和 "电阻 → 插件电阻"。每个分类具有唯一编码（category_code），用于规则引擎的关键词映射。分类实体包含属性：分类 ID、父分类 ID（自引用）、分类名称、分类编码、排序序号、创建时间、更新时间。'),

  H3('3.1.2 元器件（Component）'),
  P('描述仓库中每一个具体的电子元器件物料。包含从封装到供应商的完整信息链条。元器件实体包含属性：元器件 ID、内部料号（唯一标识）、分类 ID（外键）、描述、封装名称、符号名称、规格参数 JSON、制造商名称、制造商料号、供应商名称、供应商料号、单价、币种、价格日期、库存数量、数据手册链接、来源项目 ID、备注、创建人、时间戳。'),

  H2('3.2 实体联系分析'),
  P('实体之间存在以下联系：'),
  P('（1）分类自引用联系：一个分类可以有多个子分类，一个子分类只能属于一个父分类。这是 component_category 实体内部的 1:N 递归联系。'),
  P('（2）分类与元器件联系：一个分类下可以包含多个元器件，一个元器件只能属于一个分类。这是 component_category 与 component_library 之间的 1:N 二元联系。'),

  H2('3.3 E-R 图'),
  P('根据上述实体和联系分析，绘制系统 E-R 图如下。图中使用 UML 类图风格表示实体属性，其中 PK 表示主键，FK 表示外键，UK 表示唯一键。'),
  FIG_CAPTION('图1 元器件库管理助手 E-R 图'),
  IMG('er-diagram.png'),

  H2('3.4 概念模型说明'),
  P('分类实体采用自引用的树形结构设计，其优势在于：'),
  P('（1）灵活扩展——可动态增加任意深度的分类层级，如未来可扩展为 "无源器件 → 电阻 → 贴片电阻 → 精密电阻" 四级分类。'),
  P('（2）查询高效——规则引擎按一级分类编码匹配，通过两次 LEFT JOIN 即可同时查询该分类及其所有子分类下的元器件。'),
  P('（3）数据完整——外键约束（ON DELETE SET NULL）确保删除分类时不会级联删除元器件，保护物料数据安全。'),
];

// ========================
// 四、逻辑结构设计
// ========================

const CH4 = [
  H1('四、逻辑结构设计'),

  H2('4.1 E-R 图向关系模型的转换'),
  P('根据 E-R 图向关系模型的转换规则，将概念模型转换为关系模式：'),
  P('（1）实体转换为关系模式：每个实体对应一个关系模式（表），实体名作为关系名，实体属性作为关系模式的属性，实体标识符作为主键。因此 component_category 和 component_library 各为一个独立关系模式。'),
  P('（2）1:N 联系与关系模式合并：由于分类与元器件之间为 1:N 联系，可将 "1" 端（component_category）的主键 category_id 作为外键放入 "N" 端（component_library）的关系模式中。'),
  P('（3）自引用联系的转换：分类的父子关系通过在 component_category 中设置 parent_id 外键实现，该外键引用自身的主键 category_id。'),

  H2('4.2 关系模式定义'),
  P('根据转换规则，定义以下关系模式（主键用下划线标识，外键用波浪线标识）：'),

  P('关系模式 1：component_category（元器件分类表）', { bold: true, indent: false }),
  P('component_category (category_id, parent_id, category_name, category_code, sort_order, created_at, updated_at)', { bold: true }),
  P('其中 category_id 为主键，parent_id 为外键，引用自身 category_id。'),

  P('关系模式 2：component_library（元器件库表）', { bold: true, indent: false }),
  P('component_library (component_id, internal_pn, category_id, description, footprint_name, symbol_name, spec_json, manufacturer, manufacturer_pn, supplier, supplier_pn, unit_price, currency, price_date, stock_qty, datasheet_url, source_project_id, remark, created_by, created_at, updated_at)', { bold: true }),
  P('其中 component_id 为主键，internal_pn 为候选键（UNIQUE），category_id 为外键，引用 component_category(category_id)。'),

  H2('4.3 函数依赖与范式分析'),
  P('对上述关系模式进行函数依赖分析：'),
  P('（1）component_category 关系模式中，存在函数依赖：category_id → (parent_id, category_name, category_code, sort_order, created_at, updated_at)。category_id 是唯一的决定因素，所有非主属性完全函数依赖于主键，不存在传递依赖，满足第三范式（3NF）。'),
  P('（2）component_library 关系模式中，存在函数依赖：component_id → (internal_pn, category_id, description, ...)，且 internal_pn → (component_id, category_id, description, ...)。component_id 和 internal_pn 均为候选键，所有非主属性完全函数依赖于任一候选键，不存在部分依赖和传递依赖，满足 BCNF。'),
  P('（3）spec_json 字段存储规格参数的 JSON 字符串（如 {"resistance":"10KΩ","tolerance":"±5%"}），从规范化角度看存在一定的冗余风险。但考虑到不同元器件类型的规格参数差异极大（电阻有阻值/精度/功率，电容有容值/耐压/材质，IC 有工作电压/频率/封装等），使用 JSON 字段可以避免为每种元器件类型建立独立子表，在灵活性和规范化之间取得平衡。'),

  H2('4.4 完整性约束'),
  TAB_CAPTION('表2 数据库完整性约束一览'),
  TABLE(
    ['约束类型', '约束对象', '约束内容', '实现方式'],
    [
      ['实体完整性', 'component_category', 'category_id 为主键，唯一且非空', 'PRIMARY KEY AUTOINCREMENT'],
      ['实体完整性', 'component_library', 'component_id 为主键，唯一且非空', 'PRIMARY KEY AUTOINCREMENT'],
      ['参照完整性', 'component_library.category_id', '必须引用已存在的分类', 'FOREIGN KEY ... REFERENCES ... ON DELETE SET NULL'],
      ['参照完整性', 'component_category.parent_id', '必须引用已存在的分类或为 NULL', 'FOREIGN KEY ... REFERENCES ... ON DELETE SET NULL'],
      ['用户定义完整性', 'component_library.internal_pn', '内部料号必须唯一', 'UNIQUE NOT NULL'],
      ['用户定义完整性', 'component_category.category_name', '分类名称不可为空', 'NOT NULL'],
      ['用户定义完整性', 'component_category.category_code', '分类编码不可为空', 'NOT NULL'],
      ['用户定义完整性', 'component_library.spec_json', '默认值 {}', "DEFAULT '{}'"],
      ['用户定义完整性', 'component_library.unit_price', '默认值 0', 'DEFAULT 0'],
      ['用户定义完整性', 'component_library.stock_qty', '默认值 0', 'DEFAULT 0'],
      ['用户定义完整性', 'component_library.currency', "默认值 'CNY'", "DEFAULT 'CNY'"],
    ],
    [18, 28, 30, 24],
  ),

  H2('4.5 数据字典'),
  TAB_CAPTION('表3 component_category 数据字典'),
  TABLE(
    ['字段名', '类型', '长度', '允许空', '默认值', '说明'],
    [
      ['category_id', 'INTEGER', '-', '否', 'AUTO', '分类主键ID'],
      ['parent_id', 'INTEGER', '-', '是', 'NULL', '父分类ID (NULL=顶级)'],
      ['category_name', 'TEXT', '-', '否', '-', '分类名称 (如 电阻)'],
      ['category_code', 'TEXT', '-', '否', '-', '分类编码 (如 RES)'],
      ['sort_order', 'INTEGER', '-', '是', '0', '排序序号'],
      ['created_at', 'TEXT', '-', '是', "datetime('now')", '创建时间'],
      ['updated_at', 'TEXT', '-', '是', "datetime('now')", '更新时间'],
    ],
    [18, 14, 10, 12, 20, 26],
  ),
  P(''),
  TAB_CAPTION('表4 component_library 数据字典'),
  TABLE(
    ['字段名', '类型', '长度', '允许空', '默认值', '说明'],
    [
      ['component_id', 'INTEGER', '-', '否', 'AUTO', '元器件主键ID'],
      ['internal_pn', 'TEXT', '-', '否', '-', '内部料号 (UNIQUE)'],
      ['category_id', 'INTEGER', '-', '是', 'NULL', '分类ID (FK)'],
      ['description', 'TEXT', '-', '是', 'NULL', '物料描述'],
      ['footprint_name', 'TEXT', '-', '是', 'NULL', 'PCB封装名称'],
      ['symbol_name', 'TEXT', '-', '是', 'NULL', '原理图符号名称'],
      ['spec_json', 'TEXT', '-', '是', "'{}'", '规格参数JSON'],
      ['manufacturer', 'TEXT', '-', '是', 'NULL', '制造商名称'],
      ['manufacturer_pn', 'TEXT', '-', '是', 'NULL', '制造商料号 MPN'],
      ['supplier', 'TEXT', '-', '是', 'NULL', '供应商名称'],
      ['supplier_pn', 'TEXT', '-', '是', 'NULL', '供应商料号 SPN'],
      ['unit_price', 'REAL', '-', '是', '0', '单价(元)'],
      ['currency', 'TEXT', '-', '是', "'CNY'", '币种'],
      ['price_date', 'TEXT', '-', '是', 'NULL', '价格日期'],
      ['stock_qty', 'INTEGER', '-', '是', '0', '库存数量'],
      ['datasheet_url', 'TEXT', '-', '是', 'NULL', '数据手册链接'],
      ['source_project_id', 'INTEGER', '-', '是', 'NULL', '来源项目ID'],
      ['remark', 'TEXT', '-', '是', 'NULL', '备注'],
      ['created_by', 'INTEGER', '-', '是', 'NULL', '创建用户ID'],
      ['created_at', 'TEXT', '-', '是', "datetime('now')", '创建时间'],
      ['updated_at', 'TEXT', '-', '是', "datetime('now')", '更新时间'],
    ],
    [18, 14, 8, 10, 18, 32],
  ),
];

// ========================
// 五、物理结构设计
// ========================

const CH5 = [
  H1('五、物理结构设计'),

  H2('5.1 数据库管理系统选择'),
  P('本系统选用 SQLite 作为数据库管理系统（DBMS），通过 sql.js（SQLite 编译为 WebAssembly 的纯 JavaScript 实现）在 Node.js 环境中运行。选型理由如下：'),
  P('（1）零安装部署——sql.js 是纯 JavaScript/WASM 实现，无需安装任何本地数据库软件或驱动程序，仅需 npm install 即可运行，大幅降低了环境配置复杂度。'),
  P('（2）嵌入式架构——SQLite 是嵌入式数据库，与应用程序运行在同一进程中，无需独立的数据库服务器进程，适合小型团队和个人开发者使用。'),
  P('（3）数据便携性——整个数据库存储为单个 .db 文件，可直接通过 Git 版本管理、备份迁移或分享，对于 MVP 阶段的种子数据管理尤为便利。'),
  P('（4）完整 SQL 支持——SQLite 支持标准 SQL 语法，包括 JOIN、子查询、聚合函数、JSON 函数（json_extract）等，能够满足物料管理系统的查询需求。'),
  P('（5）性能充足——对于当前 27 条种子数据和预计 < 10 万条物料的规模，SQLite 的查询性能完全满足需求。规则引擎匹配 < 1ms，SQLite 内存查询 < 5ms。'),
  P('局限性：SQLite 采用文件锁而非行级锁，写并发能力有限；不支持网络访问，仅限本地进程使用。这些限制对于当前单用户/小团队的 BOM 管理场景影响可忽略，未来若需升级为多用户服务端场景，可迁移至 PostgreSQL。'),

  H2('5.2 索引设计'),
  P('索引设计遵循 "高频查询字段优先、外键必建、避免过度索引" 的原则：'),
  TAB_CAPTION('表5 数据库索引设计'),
  TABLE(
    ['索引名', '所属表', '索引字段', '索引类型', '设计理由'],
    [
      ['idx_category_parent', 'component_category', 'parent_id', 'B-Tree', '分类树查询：按parent_id查子分类 (高频)'],
      ['idx_component_category_id', 'component_library', 'category_id', 'B-Tree', '按分类查元器件 (高频, FK)'],
      ['idx_component_footprint', 'component_library', 'footprint_name', 'B-Tree', '按封装筛选 (高频, 规则引擎)'],
      ['idx_component_manufacturer', 'component_library', 'manufacturer', 'B-Tree', '按制造商筛选 (高频, 规则引擎)'],
      ['idx_component_supplier', 'component_library', 'supplier', 'B-Tree', '按供应商筛选 (中频)'],
      ['idx_component_internal_pn', 'component_library', 'internal_pn', 'UNIQUE B-Tree', '料号精准匹配 + 唯一约束'],
    ],
    [28, 22, 18, 16, 16],
  ),

  H2('5.3 物理存储估算'),
  P('根据当前种子数据和预计增长规模，对数据库存储进行估算：'),
  P('（1）component_category 表——当前 13 条记录（7 个一级分类 + 6 个二级分类），每条约 120 字节（含索引开销约 200 字节），总占用约 2.6 KB。预计未来扩展至 50 条分类，总占用 < 10 KB。'),
  P('（2）component_library 表——当前 27 条种子物料，每条约 500 字节（含所有字段和索引开销约 800 字节），总占用约 22 KB。预计未来扩展至 10 万条物料，总占用约 80 MB（含索引）。'),
  P('（3）6 个索引——每个 B-Tree 索引占用约为表数据的 10%~30%，以 10 万条物料估算，索引总占用约 30 MB。'),
  P('（4）总计——当前数据库约 40 KB；预计满载（10 万条物料 + 50 条分类 + 索引）约 110 MB，SQLite 在该规模下运行流畅。'),

  H2('5.4 DDL 语句'),
  P('以下为完整的数据库建表 DDL 语句：'),
  CODE(readSrc('backend/src/db/schema.sql')),
];

// ========================
// 六、系统功能实现与测试
// ========================

const CH6 = [
  H1('六、系统功能实现与测试'),

  H2('6.1 系统总体架构'),
  P('系统采用前后端分离的三层架构：表示层（前端 SPA）、应用层（Express API）、数据层（SQLite）。各层之间通过 HTTP/JSON 协议通信，前端运行在 3001 端口，后端运行在 3000 端口，通过 CORS 解决跨域访问。'),
  FIG_CAPTION('图2 系统架构图'),
  IMG('architecture.png'),
  P('各层职责如下：'),
  P('（1）表示层（前端 SPA）——原生 HTML/CSS/JS 实现的单页面应用。包含三个核心组件：QueryBox（搜索输入组件）、ResultTable（结果表格组件）、FormModal（表单弹窗组件）。通过全局 App 对象管理应用状态，API 层统一封装 fetch 请求。'),
  P('（2）应用层（Express API）——提供 RESTful 接口，包含 4 组路由：/api/query（自然语言查询）、/api/query/execute（写操作执行）、/api/components（物料 CRUD）、/api/categories（分类管理）。核心业务逻辑位于 NL2SQL 引擎和服务层。'),
  P('（3）数据层（SQLite via sql.js）——嵌入式数据库，运行在 Node.js 进程内存中，通过 saveToDisk() 定期持久化到磁盘文件。数据库连接通过懒加载单例模式管理，自动启用外键约束。'),

  H2('6.2 NL2SQL 查询引擎实现'),
  P('NL2SQL 查询引擎是本系统的核心技术模块，实现从中文自然语言到 SQL 语句的自动转换。引擎采用三层架构设计：'),

  H3('6.2.1 三层查询架构'),
  FIG_CAPTION('图3 NL2SQL 查询流程图'),
  IMG('nl2sql-flow.png'),
  P('第一层——规则引擎（Rule Engine）：基于正则表达式的模式匹配器，覆盖约 80% 的常见查询。实现 6 类匹配器：封装匹配器（匹配 0805、SOIC-8 等 8 种封装模式）、分类匹配器（中文关键词到分类编码的映射，如 "电阻"→RES、"贴片电容"→CAP）、制造商匹配器（匹配 20 个知名制造商名称）、库存比较器（解析 "库存低于 50" 等条件）、价格比较器（解析 "单价 < 5 元" 等条件）、内部料号匹配器（匹配 RES-0805-10K-5% 格式）。规则引擎响应时间 < 1ms。'),
  P('第二层——缓存层（Cache Layer）：内存键值对缓存，以原始查询文本为键（小写化），TTL 为 30 分钟，最大容量 200 条。缓存命中时直接返回上次查询结果，响应时间 < 1ms。'),
  P('第三层——LLM 兜底（LLM Fallback）：当规则引擎和缓存均未命中时（仅 AI 模式），调用大语言模型生成 SQL。LLM 上下文包含完整数据库 Schema、样本数据（前 10 条物料）和 7 组 Few-shot 示例，总计约 3700 字符。LLM 生成 SELECT 语句后执行并支持最多 2 次重试（SQL 语法错误时自动修正）。对于写操作（INSERT/UPDATE/DELETE），LLM 生成的 SQL 不直接执行，而是返回预览等待用户确认。LLM 响应时间约 1-3 秒。'),

  H3('6.2.2 两种查询模式'),
  P('快速模式（fast）：规则引擎 → 缓存。两层均未命中则返回空结果，提示用户切换 AI 模式或换个描述。零 AI API 调用，零成本。'),
  P('AI 智能模式（smart）：规则优先 → LLM 增强。若规则命中，执行 SQL 后由 LLM 分析结果并生成选型建议（如进一步筛选方向、替代方案推荐）。若规则未命中，直接由 LLM 生成 SQL 并执行。写操作意图检测后直接路由到 LLM 处理。'),

  H3('6.2.3 规则引擎核心代码'),
  P('规则引擎的 6 类正则匹配器定义：'),
  CODE(`// === 规则引擎核心：6 类正则匹配器 ===

// 1. 分类关键词映射
const CATEGORY_MAP = [
  { keys: ['电阻','贴片电阻','插件电阻',...], code: 'RES' },
  { keys: ['电容','贴片电容','电解电容',...], code: 'CAP' },
  { keys: ['ic','集成电路','mcu','单片机',...], code: 'IC' },
  // ... 共 8 个一级分类
];

// 2. 封装匹配 (0805, SOIC-8, SOT-23-5 等)
const FOOTPRINT_RE = /\\b(\\d{4,5}...|[A-Za-z]+-\\d+...)/gi;

// 3. 制造商匹配 (TI, Yageo, Murata 等 20 个)
const MANUFACTURER_RE = /(TI|Yageo|Murata|Samsung|ST|...)\\b/gi;

// 4. 库存比较 (库存低于50, 库存大于100)
const STOCK_RE = /库存\\s*(低于|小于|大于|...)\\s*(\\d+)/i;

// 5. 价格比较 (单价<5元, 价格低于10)
const PRICE_RE = /(单价|价格)\\s*(低于|小于|...)\\s*(\\d+\\.?\\d*)/i;

// 6. 内部料号匹配 (RES-0805-10K-5%)
const INTERNAL_PN_RE = /([A-Z]{2,5}-\\d{4,5}-[\\w.]+)/gi;`),

  H2('6.3 安全防护机制'),
  P('系统通过 SQL Guard 中间件和前端二次确认机制，构建多层安全防线：'),
  FIG_CAPTION('图4 写操作安全流程图'),
  IMG('write-safety-flow.png'),
  P('SQL Guard 中间件实现 4 层防线：'),
  P('第 1 层——DDL 禁令：使用正则表达式 /\b(DROP\s+(TABLE|DATABASE|...)|TRUNCATE|ALTER\s+(TABLE|...)|...)\b/i 检测并拒绝所有 DDL 和管理类语句（DROP、TRUNCATE、ALTER、CREATE、GRANT、REVOKE 等），防止 LLM 生成危险的数据库结构变更操作。'),
  P('第 2 层——多语句禁令：检测 SQL 中是否包含分号后紧跟非空白内容（/;\\s*(?=\\S)/），防止 SQL 注入攻击——攻击者可能构造 "SELECT ...; DROP TABLE ..." 等多语句攻击。'),
  P('第 3 层——DELETE 必须带 WHERE：若 SQL 以 DELETE 开头但不包含 WHERE 子句，则拒绝执行，防止 AI 误生成全表删除操作。'),
  P('第 4 层——UPDATE 必须带 WHERE：若 SQL 以 UPDATE 开头但不包含 WHERE 子句，则拒绝执行，防止全表数据被意外覆盖。'),
  P('此外，前端二次确认机制要求：所有 AI 生成的写操作 SQL 先以预览模式（status: "preview", requiresConfirmation: true）返回前端，用户需在确认弹窗中审阅 SQL 内容后点击"确认执行"，才通过 /api/query/execute 端点真正执行。该端点在执行前会再次调用 guard() 函数进行安全校验。'),

  H3('6.3.1 SQL Guard 核心代码'),
  CODE(`// === SQL Guard 中间件核心逻辑 ===

// 1. DDL 禁令关键词
const FORBIDDEN_KEYWORDS = /\\b(DROP\\s+(TABLE|DATABASE|SCHEMA|INDEX|...)
  |TRUNCATE|ALTER\\s+(TABLE|...)|GRANT|REVOKE
  |CREATE\\s+(DATABASE|SCHEMA|INDEX|...)|VACUUM|REINDEX)\\b/i;

// 2. 多语句检测
const MULTI_STATEMENT = /;\\s*(?=\\S)/;

function guard(sql) {
  if (FORBIDDEN_KEYWORDS.test(sql))
    throw new Error('禁止执行 DDL / 管理类 SQL 操作');
  if (MULTI_STATEMENT.test(sql.trim()))
    throw new Error('禁止执行多条 SQL 语句');
  if (/^\\s*DELETE\\b/i.test(sql.trim()) && !/\\bWHERE\\b/i.test(sql.trim()))
    throw new Error('DELETE 语句必须包含 WHERE 条件');
  if (/^\\s*UPDATE\\b/i.test(sql.trim()) && !/\\bWHERE\\b/i.test(sql.trim()))
    throw new Error('UPDATE 语句必须包含 WHERE 条件');
}`),

  H2('6.4 API 接口设计'),
  P('系统提供 9 个 RESTful API 接口：'),
  TAB_CAPTION('表6 API 接口一览'),
  TABLE(
    ['方法', '路径', '功能', '说明'],
    [
      ['POST', '/api/query', '自然语言查询', 'Body: {question, mode}。返回查询结果或写操作预览'],
      ['POST', '/api/query/execute', '执行已确认SQL', 'Body: {sql, type}。写操作二次确认后调用'],
      ['GET', '/api/components', '物料列表', '支持分页(page,pageSize)和多维筛选'],
      ['GET', '/api/components/:id', '物料详情', '返回单个元器件完整信息(含分类名)'],
      ['POST', '/api/components', '新增物料', 'Body: 元器件字段JSON。校验internal_pn唯一性'],
      ['PUT', '/api/components/:id', '更新物料', 'Body: 要更新的字段。自动更新updated_at'],
      ['DELETE', '/api/components/:id', '删除物料', '删除前校验记录存在'],
      ['GET', '/api/categories', '分类列表', '?format=tree 返回树形结构'],
      ['POST', '/api/categories', '新增分类', 'Body: {parent_id, category_name, category_code, sort_order}'],
    ],
    [8, 28, 18, 46],
  ),
  P(''),
  P('核心查询接口实现：'),
  CODE(`// POST /api/query — 自然语言查询入口
router.post('/', async (req, res, next) => {
  const { question, mode } = req.body;
  if (!question || !question.trim())
    return res.status(400).json({ error: '请输入查询内容' });

  const result = await nlQuery(question.trim(),
    { mode: mode || 'fast' });

  // 写操作预览 (不直接执行)
  if (result.type !== 'SELECT') {
    return res.json({
      status: 'preview',
      requiresConfirmation: true,
      sql: result.sql,
      explanation: result.explanation,
      type: result.type,
      source: result.source,
      elapsed: result.elapsed,
    });
  }

  // 查询结果直接返回
  res.json({
    status: 'ok',
    sql: result.sql,
    explanation: result.explanation,
    type: result.type,
    source: result.source,
    elapsed: result.elapsed,
    suggestion: result.suggestion || '',
    columns: result.columns,
    rows: result.rows,
    rowCount: result.rowCount,
  });
});`),

  H2('6.5 前端实现'),
  P('前端采用原生 HTML/CSS/JS 实现单页面应用（SPA），不依赖任何前端框架或构建工具。核心设计决策：'),
  P('（1）组件化设计——三个核心组件（QueryBox 搜索栏、ResultTable 结果表格、FormModal 表单弹窗）各自封装为独立模块，通过全局 App 对象进行通信和数据共享。'),
  P('（2）API 封装层——所有后端请求通过统一的 api.request() 方法，提供 api.nlQuery()、api.listComponents()、api.createComponent() 等语义化方法。'),
  P('（3）两种渲染模式——ResultTable 组件支持两种渲染模式：NL 查询结果模式（动态列，根据 SQL 返回的 columns 自适应表头）和 CRUD 列表模式（固定列，含操作按钮）。库存低于 50 的物料行自动高亮为红色。'),
  P('（4）写操作确认流程——AI 生成的写操作 SQL 在前端弹窗中展示（SQL 默认折叠），用户确认后调用 /api/query/execute 执行。已保留"撤销"能力——执行前可取消。'),
  P('（5）CSS 变量系统——使用 CSS 自定义属性定义色调、间距、阴影等设计令牌，实现统一的暖灰色系 + 靛蓝色强调色的视觉风格。'),

  H2('6.6 系统测试'),
  P('针对系统核心功能设计了以下测试用例：'),
  TAB_CAPTION('表7 系统功能测试用例'),
  TABLE(
    ['编号', '测试项', '输入', '预期结果', '实际结果'],
    [
      ['T1', '规则引擎-封装查询', '"0805封装 电阻"', '返回封装含0805的电阻', '通过, source=rule'],
      ['T2', '规则引擎-分类查询', '"贴片电容"', '返回分类为电容的物料', '通过, 含子分类'],
      ['T3', '规则引擎-制造商查询', '"TI 电源芯片"', '返回TI的电源管理IC', '通过'],
      ['T4', '规则引擎-库存筛选', '"库存低于100"', '返回 stock_qty < 100', '通过'],
      ['T5', '规则引擎-价格筛选', '"单价<1元 电容"', '返回 unit_price<1的电容', '通过'],
      ['T6', '规则引擎-料号查询', '"RES-0805-10K-5%"', '精准匹配该料号', '通过'],
      ['T7', '快速模式-未命中', '"最便宜的电阻"', '返回空 + 切换提示', '通过, source=none'],
      ['T8', 'AI模式-智能查询', '"适合3.3V供电的LDO"', 'LLM 生成 SQL + 建议', '通过, source=llm'],
      ['T9', '写操作-新增', '"新增一个电容"', '预览确认 → 执行', '通过, 需确认'],
      ['T10', '写操作-修改价格', '"把RES-001价格改成0.5"', '预览确认 → 执行', '通过, 需确认'],
      ['T11', 'SQL Guard-DDL拦截', 'LLM误生成 DROP TABLE', '被SQL Guard拒绝', '通过, 返回错误'],
      ['T12', '物料CRUD-新增', 'POST /api/components', '物料成功创建', '通过, 201'],
      ['T13', '物料CRUD-更新', 'PUT /api/components/:id', '字段更新 + updated_at', '通过'],
      ['T14', '物料CRUD-删除', 'DELETE /api/components/:id', '物料成功删除', '通过'],
      ['T15', '分类管理-树形', 'GET /api/categories?format=tree', '返回嵌套树结构', '通过'],
    ],
    [8, 18, 24, 24, 26],
  ),
];

// ========================
// 七、分析与总结
// ========================

const CH7 = [
  H1('七、分析与总结'),

  H2('7.1 系统特点与创新'),
  P('本系统在设计理念和技术实现上具有以下特点和创新：'),
  P('（1）自然语言驱动——打破传统物料管理系统的 SQL 门槛，硬件工程师无需学习数据库查询语言，用中文即可完成复杂查询和数据维护，降低了使用门槛。'),
  P('（2）三层查询引擎——创新的规则引擎 + 缓存 + LLM 三层架构，在查询精度、响应速度和运行成本之间取得平衡：规则引擎覆盖 80% 常见查询（< 1ms）、缓存避免重复 LLM 调用（< 1ms）、LLM 处理长尾复杂查询（1-3s）。'),
  P('（3）多 LLM 工厂模式——通过统一的 nl2sql() 接口和多态工厂模式，无缝切换 Claude / OpenAI / DeepSeek，各提供商遵循不同的实现策略（工具调用 vs 函数调用 vs JSON 模式），证明了 AI Agent 架构的良好解耦性。'),
  P('（4）四层安全防护——SQL Guard 中间件从 DDL 禁令到 WHERE 强制校验逐层把关，结合前端二次确认机制，有效防止 LLM 误生成危险 SQL 导致的数据灾难。'),
  P('（5）零依赖可移植——前端零框架、后端零本地数据库（sql.js 纯 JS）、数据库单文件存储，整个系统仅需 Node.js + npm install 即可在任何平台运行。'),

  H2('7.2 存在的不足'),
  P('在开发和实际体验中，也发现系统存在以下不足：'),
  P('（1）规则引擎覆盖有限——当前仅覆盖 6 类查询模式（封装/分类/制造商/库存/价格/料号），对于更复杂的语义（如 "耐压大于 16V 的钽电容"、"推荐替代 Yageo RC0805 的国产电阻"）无法通过规则引擎匹配，必须依赖 LLM。'),
  P('（2）LLM 响应不稳定——不同 LLM 提供商生成的 SQL 质量有波动，偶发语法错误（如 SQLite 不支持的 PostgreSQL 语法），需要通过重试机制兜底。部分查询可能产生非预期的 SQL 结构。'),
  P('（3）前端交互待优化——当前搜索为单次问答模式，不支持多轮对话式的渐进筛选（如 "先找电阻 → 只要 0805 的 → 价格低于 1 元的"）。写操作确认流程未提供 SQL 编辑能力，用户只能全部接受或拒绝。'),
  P('（4）缺少用户认证——系统未实现用户登录和权限管理，所有操作无需身份验证，无法区分不同用户的数据和操作记录。category_library 表中的 created_by 字段预留但未使用。'),
  P('（5）数据规模有限——种子数据仅 27 条物料、13 个分类，虽然可以通过 LLM 和 CRUD 接口灵活扩充，但缺少批量导入功能（如从 Excel/CSV 导入）。'),
  P('（6）测试覆盖不足——未建立自动化测试框架（单元测试/集成测试），所有测试依赖手动验证，随着功能迭代增加，回归验证成本将显著上升。'),

  H2('7.3 改进方向'),
  P('基于以上分析，未来可从以下方向持续改进：'),
  P('（1）规则引擎增强——扩展更多查询模式，如规格参数匹配（利用 spec_json 字段和 json_extract 函数）、替代料推荐（基于 footprint_name + spec_json 的相似度匹配）、日期范围筛选。'),
  P('（2）多轮对话支持——引入对话状态管理，将单次查询模式升级为上下文的渐进式筛选对话，支持 "然后"、"再"、"除了...还有" 等连贯语义。'),
  P('（3）数据库扩展——实现 Request.txt 中规划的 footprint_library（封装库）、pcb_project（项目管理）、sys_user（用户管理）等扩展表，完善系统功能矩阵。'),
  P('（4）Excel/CSV 导入——增加批量导入功能，支持从立创商城、DigiKey 等平台的导出文件直接导入物料数据。'),
  P('（5）用户认证与权限——实现 JWT 登录认证，区分管理员和普通用户权限，created_by 字段关联实际用户。'),
  P('（6）自动化测试——引入 Vitest 或 Jest 测试框架，为规则引擎、SQL Guard、CRUD 服务编写单元测试，为核心查询流程编写集成测试。'),
  P('（7）数据库升级——当数据量和并发需求增长后，可从 SQLite 迁移到 PostgreSQL，利用行级锁、全文搜索、更丰富的 JSON 操作等高级特性。'),
];

// ========================
// 八、大模型辅助开发方法
// ========================

const APPENDIX = [
  H1('八、大模型辅助开发方法'),

  H2('8.1 开发方法论概述'),
  P('本项目的开发全程采用 AI Agent 辅助的软件开发方法。以 Claude Code（Anthropic 的 AI 编程助手）为核心开发工具，遵循 "Plan → Execute → Review → Verify" 的开发工作流。Claude Code 并非简单的代码补全工具，而是一个能够理解项目上下文、自主调用工具（文件读写、命令执行、Git 操作）、进行多步骤推理的 AI Agent。'),
  P('在本项目的开发过程中，AI Agent 承担了以下角色：系统架构师（输出设计文档和技术方案）、全栈开发工程师（编写 Node.js/Express 后端和 HTML/CSS/JS 前端代码）、代码审查员（识别代码冗余、安全漏洞、风格一致性问题）、测试工程师（设计测试用例、分析测试结果）、技术文档撰写者（输出 SPEC、CHANGELOG、README 和本课程设计报告）。'),

  H2('8.2 AI Agent 开发工作流'),
  P('项目开发采用以下标准工作流：'),
  P('第一阶段——Plan Mode（规划模式）：在开始编码前，使用 /plan 命令进入规划模式。AI Agent 通过 Explore 子代理深度探索项目代码库，理解现有架构和代码范式，然后通过 Plan 子代理设计实现方案。方案需经人工审核批准后方可执行，确保 AI 的每个行动都在人的监督之下。'),
  P('第二阶段——Brainstorm（头脑风暴）：使用 /brainstorm 技能进行需求澄清和方案探讨。AI Agent 会主动提出多个可选技术路线（如 LLM 提供商选择 Claude vs OpenAI vs DeepSeek、前端框架 vs 原生实现），分析各自利弊，辅助开发者做出技术决策。'),
  P('第三阶段——Implementation（实现）：AI Agent 根据计划逐步执行编码任务。采用 "Editing Code" 模式进行精准修改（使用 Edit 工具而非文件覆盖，减少不必要的变化），严格遵循项目 CLAUDE.md 中定义的编码规范（风格变色龙原则、禁止过度防御编程、标准库优先等）。'),
  P('第四阶段——Code Review（代码审查）：使用 /code-review 命令对本次修改进行审查。AI Agent 从正确性、安全性、可维护性、代码重复等维度审计代码变更，提供具体修改建议。关键修改可要求 AI Agent 进行"对抗性验证"——尝试反驳自己的方案并寻找潜在缺陷。'),
  P('第五阶段——Simplify（简化）：使用 /simplify 命令扫描代码中的重复、冗余和过度设计，在不改变功能的前提下压缩代码量。例如在前端开发中，AI Agent 发现多个事件监听器重复相同的 fetch 模式，建议提取为统一的 api.request() 封装方法。'),
  P('第六阶段——Verification（验证）：使用 /verify 命令启动应用并实际测试功能是否正常工作。AI Agent 启动后端和前端服务，打开浏览器执行端到端测试，确认 API 响应正确、UI 渲染无误。'),

  H2('8.3 关键工具与技能'),
  P('本项目开发过程中使用的 AI Agent 工具与技能（Skills）：'),
  TAB_CAPTION('表8 AI Agent 开发工具与技能'),
  TABLE(
    ['工具/技能', '类型', '用途', '在本项目中的应用'],
    [
      ['/plan (Plan Mode)', '流程', '编码前设计实现方案', '设计 NL2SQL 三层引擎架构'],
      ['/brainstorm', '流程', '需求澄清与方案探讨', '讨论前端框架 vs 原生实现决策'],
      ['/code-review', '流程', '变更代码审查', '审查 SQL Guard 安全规则完整性'],
      ['/simplify', '流程', '代码简化与去重', '提取统一 api.request() 方法'],
      ['/verify', '流程', '启动应用验证功能', '端到端测试 NL2SQL 查询链路'],
      ['Explore Agent', '工具', '多文件并行探索', '理解项目结构和代码依赖关系'],
      ['Plan Agent', '工具', '生成实现方案', '输出详细的分步实现计划'],
      ['docx-report', 'Skill', '生成课程设计报告', '生成本课程设计报告 .docx 文件'],
      ['superpowers:systematic-debugging', 'Skill', '系统化调试', '排查 sql.js 兼容性问题'],
      ['superpowers:test-driven-development', 'Skill', 'TDD 开发', '为规则引擎编写测试用例'],
    ],
    [28, 10, 28, 34],
  ),

  H2('8.4 实际开发案例：NL2SQL 规则引擎的 AI 辅助开发'),
  P('以下以 NL2SQL 规则引擎的开发过程为例，展示 AI Agent 辅助开发的完整流程：'),
  P('步骤 1——需求分析（/brainstorm）。输入："硬件工程师经常用中文查询元器件，比如 0805封装 10KΩ 贴片电阻。如何设计一个能直接把这些中文转成 SQL 的查询引擎？" AI Agent 提出三种方案：①纯 LLM 方案（所有查询走 API）、②纯规则方案（正则匹配）、③混合方案（规则 + LLM），并分析各自的性能、成本和准确率 trade-off。最终选定方案③——三层架构。'),
  P('步骤 2——方案设计（/plan）。AI Agent 通过 Explore Agent 读取现有代码结构（表 Schema、已有路由、种子数据），输出三层引擎的架构设计：第一层规则引擎（6 类正则匹配器）、第二层缓存层（内存键值对 + TTL）、第三层 LLM 兜底（Claude/OpenAI/DeepSeek 工厂模式），以及两种查询模式的切换逻辑。'),
  P('步骤 3——编码实现。AI Agent 分模块逐步实现：首先编写规则引擎（rule-engine.js），定义 CATEGORY_MAP 中文到编码的映射表和 5 个正则常量；然后实现上下文构建器（context-builder.js），组装 schema + 样本数据的 LLM prompt；最后实现引擎主逻辑（engine.js），路由 fast/smart 两种模式。每步编码后进行 /code-review 审查。'),
  P('步骤 4——测试验证（/verify）。AI Agent 启动后端服务，使用 curl 模拟查询请求，验证 "0805封装 电阻" 返回正确结果（source=rule）、"适合3.3V供电的LDO" 返回 LLM 结果（source=llm）、"库存低于50" 返回筛选结果。发现并修复了分类查询未包含子分类的问题（需要在 SQL 中 LEFT JOIN 两次分类表）。'),
  P('步骤 5——简化优化（/simplify）。AI Agent 发现规则引擎的 parse() 和 smartQuery() 中存在重复的条件拼接逻辑，建议将 buildQuery() 提取为独立函数供两处复用。同时将硬编码的 5 分钟 TTL 提取为 CONTEXT_TTL 常量。'),
  P('整个开发过程从需求提出到功能可用，耗时约 4 小时（含 AI 交互等待时间），其中 AI Agent 完成了约 80% 的代码编写和 100% 的文档撰写工作。开发者主要承担需求定义、方案审查和关键决策的角色。'),

  H2('8.5 AI 辅助开发经验总结'),
  P('通过本项目全程使用 AI Agent 辅助开发的实践，总结以下经验：'),
  P('（1）先 Plan 后执行——不要直接让 AI 开始写代码。使用 Plan Mode 让 AI 先理解项目全貌（读取 CLAUDE.md、探索代码结构、理解已有范式），再设计方案。Plan 方案需经人工审查，确保方向正确后再开始实现。这避免了很多 "写了一堆代码后发现架构不对" 的问题。'),
  P('（2）CLAUDE.md 是项目的 "System Prompt"——在 CLAUDE.md 中明确定义项目的技术栈、编码规范、文件结构、命令列表等上下文信息，AI Agent 每次启动都会读取。一个详细准确的 CLAUDE.md 能显著提升 AI 的代码质量和风格一致性。本项目前后端各有一个 CLAUDE.md，总计约 100 行，投入产出比极高。'),
  P('（3）Code Review 不可省略——AI 生成的代码看起来通常"差不多对"，但可能存在边界条件遗漏（如 sql.js 的异步初始化时序）、安全漏洞（如 SQL 注入风险）、风格不一致（如混用 var/let/const）等问题。每次重要变更后运行 /code-review 是必要的质量保障。'),
  P('（4）对抗性验证——对于关键逻辑（如 SQL Guard、LLM 输出解析），直接要求 AI Agent "尝试证明这段代码有 bug"。AI 在"批判模式"下往往能发现自己在"建设模式"下忽略的问题。'),
  P('（5）AI 是工具，人是决策者——AI Agent 可以提出替代方案和技术选型建议，但最终的技术决策（选择 SQLite 还是 PostgreSQL、原生前端还是 React、规则的粒度如何划分）需要开发者根据实际业务需求、团队能力和长期规划做出判断。AI 提供信息和分析，人做选择。'),
];

// ========================
// 九、参考文献
// ========================

const REFS = [
  H1('九、参考文献'),
  REF_HEADING(),
  REF('[1] 王珊, 萨师煊. 数据库系统概论(第5版)[M]. 北京: 高等教育出版社, 2014.'),
  REF('[2] 闪四清. SQL Server 实用简明教程[M]. 北京: 清华大学出版社, 2005.'),
  REF('[3] C. J. Date. An Introduction to Database Systems (8th Edition)[M]. Addison-Wesley, 2003.'),
  REF('[4] Express.js 官方文档[EB/OL]. https://expressjs.com/, 2024.'),
  REF('[5] SQLite 官方文档[EB/OL]. https://www.sqlite.org/docs.html, 2024.'),
  REF('[6] sql.js 项目文档[EB/OL]. https://github.com/sql-js/sql.js/, 2024.'),
  REF('[7] Anthropic. Claude API 文档[EB/OL]. https://docs.anthropic.com/, 2024.'),
  REF('[8] OpenAI. OpenAI API 文档[EB/OL]. https://platform.openai.com/docs/, 2024.'),
  REF('[9] DeepSeek. DeepSeek API 文档[EB/OL]. https://platform.deepseek.com/api-docs/, 2024.'),
  REF('[10] Mermaid.js 官方文档[EB/OL]. https://mermaid.js.org/, 2024.'),
  REF('[11] docx (npm package) — 使用 JavaScript 生成 .docx 文件[EB/OL]. https://github.com/dolanmedia/docx, 2024.'),
  REF('[12] Anthropic. Claude Code 官方文档[EB/OL]. https://docs.anthropic.com/en/docs/claude-code, 2025.'),
];

// ========================
// 组装与输出
// ========================

const chapters = [
  ...TITLE_BLOCK,
  ...CH1,
  ...CH2,
  ...CH3,
  ...CH4,
  ...CH5,
  ...CH6,
  ...CH7,
  ...APPENDIX,
  ...REFS,
];

const outputPath = join(__dirname, '..', 'PCB元器件库管理助手-课程设计报告.docx');

(async () => {
  console.log('正在生成课程设计报告...');
  console.log(`  输出路径: ${outputPath}\n`);

  await buildDocx({
    title: 'PCB 元器件库管理助手 课程设计报告',
    creator: 'PCB BOM Team',
    chapters,
    outputPath,
  });
})();
