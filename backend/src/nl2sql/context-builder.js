const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/connection');

/**
 * 构建 LLM 上下文：
 * 1. 完整的 CREATE TABLE 语句（直接从 schema.sql 读取）
 * 2. 数据库中的实际样本数据（分类列表、封装列表、物料样本）
 */

async function buildContext() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

  const db = await getDb();

  // 分类列表（含父子关系）
  const categories = db.exec(
    `SELECT cc.category_id, cc.category_code, cc.category_name, p.category_code AS parent_code
     FROM component_category cc
     LEFT JOIN component_category p ON cc.parent_id = p.category_id
     ORDER BY cc.parent_id IS NULL DESC, cc.sort_order`
  );

  // 封装列表
  const footprints = db.exec(
    `SELECT DISTINCT footprint_name FROM component_library WHERE footprint_name IS NOT NULL ORDER BY footprint_name`
  );

  // 制造商列表
  const manufacturers = db.exec(
    `SELECT DISTINCT manufacturer FROM component_library WHERE manufacturer IS NOT NULL ORDER BY manufacturer`
  );

  // 物料样本（前10条）
  const samples = db.exec(
    `SELECT component_id, internal_pn, description, footprint_name, manufacturer,
            manufacturer_pn, unit_price, stock_qty, spec_json
     FROM component_library LIMIT 10`
  );

  // 统计
  const stats = db.exec(
    `SELECT COUNT(*) AS total FROM component_library`
  );

  return buildPrompt(schemaSQL, categories, footprints, manufacturers, samples, stats);
}

function buildPrompt(schemaSQL, categories, footprints, manufacturers, samples, stats) {
  const catRows = categories[0]?.values || [];
  const fpRows = footprints[0]?.values || [];
  const mfgRows = manufacturers[0]?.values || [];
  const sampleRows = samples[0] || { columns: [], values: [] };
  const totalCount = stats[0]?.values[0]?.[0] || 0;

  return `你是一个专业的PCB电子元器件数据库查询助手。你直接操作一个真实的SQLite数据库。

## 数据库 Schema
以下是完整的建表语句：
\`\`\`sql
${schemaSQL}
\`\`\`

## 当前数据库内容概览

### 物料分类（共${catRows.length}个）
${catRows.map((r) => `- ${r[1]} (${r[2]})` + (r[3] ? ` → 父分类: ${r[3]}` : ' [顶级]')).join('\n')}

### 已有封装类型（共${fpRows.length}种）
${fpRows.map((r) => r[0]).join(', ')}

### 已有制造商（共${mfgRows.length}家）
${mfgRows.map((r) => r[0]).join(', ')}

### 物料总数：${totalCount} 条

### 物料样本（前10条）：
${sampleRows.columns.join(' | ')}
${'─'.repeat(60)}
${sampleRows.values.map((row) => row.map((v) => {
  if (v === null) return '';
  const s = String(v);
  return s.length > 30 ? s.substring(0, 28) + '..' : s;
}).join(' | ')).join('\n')}

## 查询规则
1. 只生成一条 SQLite SQL 语句
2. 使用 json_extract(spec_json, '$.key') 查询 JSON 字段
3. 分类查询用 category_code，注意父子分类关系：
   - 查一级分类时也包含其子分类（通过 ccp.category_code 匹配父级）
   - 例如查"电阻"应匹配 category_code='RES' OR parent category_code='RES'
4. 用 LIKE 做模糊匹配
5. 不要用 RETURNING 子句
6. 日期用 date('now') / datetime('now')
7. 涉及分类的查询必须 JOIN component_category 表
8. 如果用户的问题无法用数据库回答，生成一条返回空结果的通用查询，并在 suggestion 中说明原因

## 输出格式
严格按以下 JSON 格式输出，不要任何其他内容：
{"sql":"SQL语句","explanation":"简要说明","type":"SELECT|INSERT|UPDATE|DELETE","suggestion":"专业建议"}

### suggestion 字段说明
- 如果查询有结果：分析结果，给出选型建议、替代方案、注意事项
- 如果查询无结果：建议可以尝试的关键词、替代物料、放宽条件的方向
- 如果是设计类问题（如"STM32配什么LDO"）：结合你的电子工程知识给出具体推荐
- 简单查询（仅查库存/价格等）suggestion 可留空`;
}

module.exports = { buildContext };
