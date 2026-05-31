/**
 * NL2SQL 引擎 Few-shot 示例
 * 所有示例使用 SQLite 语法
 */

function buildFewShots() {
  return [
    {
      role: 'user',
      content: '帮我查一下0805封装、10KΩ、±5%精度的贴片电阻有哪些？',
    },
    {
      role: 'assistant',
      content: `SELECT cl.component_id, cl.internal_pn, cl.description, cl.footprint_name,
       cl.manufacturer, cl.manufacturer_pn, cl.unit_price, cl.stock_qty
FROM component_library cl
JOIN component_category cc ON cl.category_id = cc.category_id
WHERE cl.footprint_name = '0805_L'
  AND json_extract(cl.spec_json, '$.resistance') = '10KΩ'
  AND json_extract(cl.spec_json, '$.tolerance') = '±5%'
  AND cc.category_code = 'RES';`,
    },
    {
      role: 'user',
      content: '新增一个物料：内部料号CAP-0603-100nF-10%，分类是电容，封装0603_C，描述是"贴片电容 100nF ±10% 16V"，制造商Murata，制造商料号GRM188R71C104KA01',
    },
    {
      role: 'assistant',
      content: `INSERT INTO component_library (internal_pn, category_id, description, footprint_name, manufacturer, manufacturer_pn, spec_json)
SELECT 'CAP-0603-100nF-10%', cc.category_id,
       '贴片电容 100nF ±10% 16V', '0603_C', 'Murata', 'GRM188R71C104KA01',
       '{"capacitance":"100nF","tolerance":"±10%","voltage":"16V"}'
FROM component_category cc
WHERE cc.category_code = 'CAP';`,
    },
    {
      role: 'user',
      content: '把内部料号RES-0805-10K-5%的单价更新为0.015元，价格日期是今天',
    },
    {
      role: 'assistant',
      content: `UPDATE component_library
SET unit_price = 0.015,
    price_date = date('now'),
    updated_at = datetime('now')
WHERE internal_pn = 'RES-0805-10K-5%';`,
    },
    {
      role: 'user',
      content: '删除内部料号TEMP-001',
    },
    {
      role: 'assistant',
      content: `DELETE FROM component_library
WHERE internal_pn = 'TEMP-001';`,
    },
    {
      role: 'user',
      content: '库里有没有SOT-23-5封装、3.3V输出的LDO？',
    },
    {
      role: 'assistant',
      content: `SELECT cl.component_id, cl.internal_pn, cl.description, cl.footprint_name,
       cl.manufacturer, cl.manufacturer_pn, cl.unit_price, cl.stock_qty
FROM component_library cl
JOIN component_category cc ON cl.category_id = cc.category_id
WHERE cl.footprint_name = 'SOT-23-5'
  AND json_extract(cl.spec_json, '$.output_voltage') LIKE '%3.3V%'
  AND cc.category_code = 'IC';`,
    },
    {
      role: 'user',
      content: '查一下TI公司生产的、所有IC物料',
    },
    {
      role: 'assistant',
      content: `SELECT cl.component_id, cl.internal_pn, cl.description, cl.footprint_name,
       cl.manufacturer, cl.manufacturer_pn, cl.unit_price, cl.stock_qty
FROM component_library cl
JOIN component_category cc ON cl.category_id = cc.category_id
WHERE cl.manufacturer = 'TI'
  AND cc.category_code = 'IC';`,
    },
    {
      role: 'user',
      content: '有哪些物料库存低于安全库存（假设安全库存为50）？',
    },
    {
      role: 'assistant',
      content: `SELECT component_id, internal_pn, description, footprint_name,
       manufacturer, stock_qty, unit_price
FROM component_library
WHERE stock_qty < 50
ORDER BY stock_qty ASC;`,
    },
  ];
}

module.exports = { buildFewShots };
