/**
 * 规则引擎 — 用正则匹配常见 NL 查询模式，<1ms 生成 SQL
 *
 * 返回: { matched: true, conditions: [...], explanation: '...' }
 *   或  { matched: false }
 */

// 分类关键词 → category_code（仅一级分类）
const CATEGORY_MAP = [
  { keys: ['电阻', '贴片电阻', '插件电阻', 'SMD电阻', '片式电阻', '排阻', '电阻阵列'], code: 'RES' },
  { keys: ['电容', '贴片电容', 'SMD电容', '电解电容', '钽电容', '陶瓷电容', 'MLCC'], code: 'CAP' },
  { keys: ['ic', '集成电路', '芯片', 'mcu', '单片机', 'ldo', 'soc', '运放', '放大器', '稳压器'], code: 'IC' },
  { keys: ['连接器', '接插件', '排针', '排母', '端子', '接线端子'], code: 'CONN' },
  { keys: ['电感', '磁珠'], code: 'IND' },
  { keys: ['二极管', 'led', '稳压管', 'tvs'], code: 'DIO' },
  { keys: ['三极管', 'mos管', 'mosfet', '晶体管'], code: 'TRA' },
  { keys: ['晶振', '振荡器', 'oscillator'], code: 'CRY' },
];

// 封装匹配：\b 边界避免把料号中的数字误识别为封装（如 LTM4644 中的 4644）
const FOOTPRINT_RE = /\b(\d{4,5}[_-]?[A-Za-z]?|[A-Za-z]+-\d+[A-Za-z]?(-\d+)?|SOT-\d+(-\d+)?|SOIC-\d+|LQFP-\d+|BGA-\d+|QFN-\d+|DFN-\d+|SOP-\d+|TO-\d+)\b/gi;

// 内部料号匹配：字母-数字-字母格式
const INTERNAL_PN_RE = /([A-Z]{2,5}-\d{4,5}-[\w.]+(?:-\d+%)?)/gi;

// 库存比较
const STOCK_RE = /库存\s*(低于|小于|大于|>=|<=|>|<|=)\s*(\d+)/i;

// 价格比较
const PRICE_RE = /(单价|价格)\s*(低于|小于|大于|>=|<=|>|<|=|：)\s*(\d+\.?\d*)\s*(元?)/i;

// 制造商：英文字母大写组合
const MANUFACTURER_RE = /(TI|Yageo|Murata|Samsung|STMicroelectronics|ST|TDK|AVX|KEMET|Panasonic|Würth|Infineon|ADI|Maxim|Microchip|NXP|ON Semiconductor|Vishay|TE Connectivity|Molex|Hirose|JST)\b/gi;

/**
 * 解析自然语言，提取查询条件
 */
function parse(nl) {
  const conditions = [];
  const explanations = [];
  const raw = nl.trim();

  // 1. 封装
  const footprintMatches = [];
  let m;
  FOOTPRINT_RE.lastIndex = 0;
  while ((m = FOOTPRINT_RE.exec(raw)) !== null) {
    footprintMatches.push(m[0]);
  }
  // 去重
  const uniqueFps = [...new Set(footprintMatches)];
  for (const fp of uniqueFps) {
    conditions.push(`cl.footprint_name LIKE '%${fp}%'`);
    explanations.push(`封装=${fp}`);
  }

  // 2. 分类（仅一级分类，"贴片电阻"→RES，"电容"→CAP）
  //    多个分类用 OR 连接（"电阻和电容" → RES OR CAP）
  const lower = raw.toLowerCase();
  const catCodes = [];
  const catNames = [];
  for (const cat of CATEGORY_MAP) {
    const hit = cat.keys.some((k) => lower.includes(k.toLowerCase()));
    if (hit) {
      catCodes.push(`(cc.category_code = '${cat.code}' OR ccp.category_code = '${cat.code}')`);
      catNames.push(cat.keys[0]);
    }
  }
  if (catCodes.length > 0) {
    conditions.push('(' + catCodes.join(' OR ') + ')');
    explanations.push(`分类=${catNames.join('/')}`);
  }

  // 3. 制造商
  const mfgMatches = [];
  MANUFACTURER_RE.lastIndex = 0;
  while ((m = MANUFACTURER_RE.exec(raw)) !== null) {
    mfgMatches.push(m[0]);
  }
  const uniqueMfgs = [...new Set(mfgMatches)];
  for (const mfg of uniqueMfgs) {
    if (!conditions.some((c) => c.includes(`cl.manufacturer = '${mfg}'`))) {
      conditions.push(`cl.manufacturer = '${mfg}'`);
      explanations.push(`制造商=${mfg}`);
    }
  }

  // 4. 库存比较
  const stockMatch = raw.match(STOCK_RE);
  if (stockMatch) {
    const op = normalizeOp(stockMatch[1]);
    const val = stockMatch[2];
    conditions.push(`cl.stock_qty ${op} ${val}`);
    explanations.push(`库存${stockMatch[1]}${val}`);
  }

  // 5. 价格比较
  const priceMatch = raw.match(PRICE_RE);
  if (priceMatch) {
    const op = normalizeOp(priceMatch[2]);
    const val = priceMatch[3];
    conditions.push(`cl.unit_price ${op} ${val}`);
    explanations.push(`价格${priceMatch[2]}${val}元`);
  }

  // 6. 内部料号
  const pnMatches = [];
  INTERNAL_PN_RE.lastIndex = 0;
  while ((m = INTERNAL_PN_RE.exec(raw)) !== null) {
    pnMatches.push(m[0]);
  }
  const uniquePns = [...new Set(pnMatches)];
  for (const pn of uniquePns) {
    conditions.push(`cl.internal_pn LIKE '%${pn}%'`);
    explanations.push(`料号=${pn}`);
  }


  if (conditions.length === 0) {
    return { matched: false };
  }

  return {
    matched: true,
    conditions,
    explanation: explanations.join(', '),
  };
}

/**
 * 根据解析结果构建完整 SQL
 */
function buildQuery(parseResult) {
  if (!parseResult.matched) return null;

  const where = parseResult.conditions.join(' AND ');
  return `SELECT cl.*, cc.category_name
FROM component_library cl
LEFT JOIN component_category cc ON cl.category_id = cc.category_id
LEFT JOIN component_category ccp ON cc.parent_id = ccp.category_id
WHERE ${where}
ORDER BY cl.updated_at DESC
LIMIT 100`;
}

// ---- helpers ----

function normalizeOp(op) {
  const map = {
    '低于': '<', '小于': '<', '大于': '>',
    '>=': '>=', '<=': '<=', '=': '=',
  };
  return map[op] || op;
}

const WRITE_INTENT_RE = /修改|更新|删除|新增|添加|改一下|改掉|改成|删掉|去掉|加上|补充/;
function detectWriteIntent(nl) { return WRITE_INTENT_RE.test(nl); }

module.exports = { parse, buildQuery, detectWriteIntent };
