/**
 * 将数据库 schema 序列化为 LLM 可读的文本上下文
 */
function buildSchemaContext() {
  return `## 数据表结构（SQLite）

### component_category（物料分类表 - 树形结构）
| 字段 | 类型 | 说明 |
|------|------|------|
| category_id | INTEGER PK AUTOINCREMENT | 分类ID |
| parent_id | INTEGER FK | 父分类ID，NULL=顶级 |
| category_name | TEXT | 分类名称，如"电阻"、"贴片电阻" |
| category_code | TEXT | 分类编码，如 RES、CAP、IC |

### component_library（元器件库表）
| 字段 | 类型 | 说明 |
|------|------|------|
| component_id | INTEGER PK AUTOINCREMENT | 元器件ID |
| internal_pn | TEXT UNIQUE | 内部料号，如 RES-0805-10K-5% |
| category_id | INTEGER FK | 分类ID → component_category |
| description | TEXT | 物料描述 |
| footprint_name | TEXT | PCB封装名称，如 0805_L、SOIC-8 |
| symbol_name | TEXT | 原理图符号名称 |
| spec_json | TEXT | 规格参数JSON，如 {"resistance":"10KΩ","tolerance":"±5%"} |
| manufacturer | TEXT | 制造商名称 |
| manufacturer_pn | TEXT | 制造商料号 MPN |
| supplier | TEXT | 供应商名称 |
| supplier_pn | TEXT | 供应商料号 SPN |
| unit_price | REAL | 单价(元) |
| currency | TEXT | 币种，默认 CNY |
| price_date | TEXT | 价格日期 |
| stock_qty | INTEGER | 库存数量 |
| datasheet_url | TEXT | 数据手册链接 |
| remark | TEXT | 备注 |

## 表关系
- component_library.category_id → component_category.category_id (FK)
- category 自引用树形结构: parent_id → category_id

## SQLite JSON 查询语法（重要！）
- json_extract(spec_json, '$.resistance') = '10KΩ'
- json_extract(spec_json, '$.tolerance') LIKE '%±5%'
- json_extract(spec_json, '$.voltage') LIKE '%3.3V%'
- 不要用 -> 或 ->> 操作符，那是 PostgreSQL 语法！
- 不要用 @> 操作符！`;
}

module.exports = { buildSchemaContext };
