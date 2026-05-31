const { create: createLLM } = require('../llm/factory');
const { buildContext } = require('./context-builder');
const { parse: ruleParse, buildQuery, detectWriteIntent } = require('./rule-engine');
const { getDb, saveToDisk } = require('../db/connection');
const { guard } = require('../middleware/sql-guard');
const log = require('../utils/logger');

const llm = createLLM();
const MAX_RETRIES = 2;

// LLM 上下文缓存（5分钟）
let cachedContext = null;
let contextTimestamp = 0;
const CONTEXT_TTL = 5 * 60 * 1000;

async function getContext() {
  if (cachedContext && (Date.now() - contextTimestamp < CONTEXT_TTL)) return cachedContext;
  cachedContext = await buildContext();
  contextTimestamp = Date.now();
  log.info('engine', 'LLM 上下文已刷新');
  return cachedContext;
}

// 缓存层（快速模式用）
const cache = {};
const CACHE_TTL = 30 * 60 * 1000;
const CACHE_MAX = 200;

function cacheGet(nl) {
  const key = nl.trim().toLowerCase();
  const entry = cache[key];
  if (entry && (Date.now() - entry.time < CACHE_TTL)) return entry.result;
  delete cache[key];
  return null;
}

function cacheSet(nl, result) {
  const key = nl.trim().toLowerCase();
  cache[key] = { result, time: Date.now() };
  const keys = Object.keys(cache);
  if (keys.length > CACHE_MAX) {
    const oldest = keys.sort((a, b) => cache[a].time - cache[b].time)[0];
    delete cache[oldest];
  }
}

// ---- 模式路由 ----
// fast:  规则引擎 → 缓存
// smart: 直接 LLM（智能理解 + SQL 生成 + 选型建议）

async function query(naturalLanguage, options = {}) {
  const start = Date.now();
  const mode = options.mode || 'fast';
  log.info('engine', `查询 [${mode}] "${naturalLanguage.substring(0, 80)}"`);

  // === AI 模式：规则查询 + LLM 建议 ===
  if (mode === 'smart') {
    return await smartQuery(naturalLanguage, options, start);
  }

  // === 快速模式：规则 → 缓存 ===
  const ruleResult = ruleParse(naturalLanguage);

  if (ruleResult.matched) {
    const sql = buildQuery(ruleResult);
    log.info('engine', `规则命中: ${ruleResult.explanation}`, { sql: sql.substring(0, 120) });
    guard(sql);
    const result = await executeSql(sql, 'SELECT');
    cacheSet(naturalLanguage, { sql, explanation: ruleResult.explanation, type: 'SELECT' });
    return { ...result, sql, explanation: ruleResult.explanation, type: 'SELECT', source: 'rule', elapsed: Date.now() - start };
  }

  const cached = cacheGet(naturalLanguage);
  if (cached) {
    log.info('engine', '缓存命中', { sql: cached.sql.substring(0, 120) });
    guard(cached.sql);
    const result = await executeSql(cached.sql, cached.type);
    return { ...result, sql: cached.sql, explanation: cached.explanation, type: cached.type, source: 'cache', elapsed: Date.now() - start };
  }

  log.info('engine', '快速模式无结果');
  return {
    columns: [], rows: [], rowCount: 0, affectedRows: null,
    sql: '', explanation: '规则和缓存均未命中',
    type: 'SELECT', source: 'none', elapsed: Date.now() - start,
    suggestion: '试试切换到 AI 智能搜索模式，或换个更具体的描述。如：封装名、分类名、制造商、料号。',
  };
}

// ---- AI 模式：规则优先 + LLM 增强 ----

async function smartQuery(nl, options, start) {
  const schemaContext = await getContext();

  // 1. 写操作意图：跳过规则引擎，直接 LLM
  const writeIntent = detectWriteIntent(nl);

  // 2. 非写操作：先走规则引擎
  let ruleResult = { matched: false };
  if (!writeIntent) {
    ruleResult = ruleParse(nl);
  }

  if (ruleResult.matched) {
    const sql = buildQuery(ruleResult);
    log.info('engine', `AI: 规则命中 → 执行 + LLM 建议`, { sql: sql.substring(0, 100) });
    guard(sql);
    const result = await executeSql(sql, 'SELECT');

    // 空结果跳过 LLM
    if (result.rowCount === 0) {
      return { ...result, sql, explanation: ruleResult.explanation, type: 'SELECT', source: 'rule', elapsed: Date.now() - start };
    }

    // LLM 分析结果给建议
    const enhancePrompt = `用户查询：「${nl}」\n查询结果：共 ${result.rowCount} 条数据。\n请分析结果并给出选型建议。如果结果较多，建议如何进一步筛选；如果结果较少，建议替代方案。\n只输出建议文字，不要SQL。`;
    try {
      const llmStart = Date.now();
      const suggestion = await llm.nl2sql(enhancePrompt, schemaContext, options);
      log.aiResponse(suggestion.suggestion || suggestion.explanation || '(空)', Date.now() - llmStart);
      return {
        ...result, sql, explanation: ruleResult.explanation, type: 'SELECT',
        source: 'rule', suggestion: suggestion.suggestion || suggestion.explanation || '',
        elapsed: Date.now() - start,
      };
    } catch (_) {
      return { ...result, sql, explanation: ruleResult.explanation, type: 'SELECT', source: 'rule', elapsed: Date.now() - start };
    }
  }

  // 3. 规则未命中：LLM 生成 SQL
  log.info('engine', 'AI: 规则未命中 → LLM 生成 SQL');
  log.aiRequest(nl, options.model || process.env.LLM_MODEL || 'unknown', schemaContext.length);
  const llmStart = Date.now();
  let llmResult = await llm.nl2sql(nl, schemaContext, options);
  log.aiResponse(JSON.stringify(llmResult), Date.now() - llmStart);
  let lastSql = llmResult.sql;
  guard(lastSql);

  // 写操作：不执行，返回预览
  if (llmResult.type !== 'SELECT') {
    log.info('engine', 'LLM 写操作，等待确认', { sql: lastSql.substring(0, 100) });
    return {
      columns: [], rows: [], rowCount: 0, affectedRows: null,
      sql: lastSql, explanation: llmResult.explanation,
      type: llmResult.type, source: 'llm',
      suggestion: llmResult.suggestion || null,
      elapsed: Date.now() - start,
    };
  }

  // SELECT：执行
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await executeSql(lastSql, llmResult.type);
      log.info('engine', `LLM 查询成功 · ${result.rowCount} 条`);
      return {
        ...result, sql: lastSql, explanation: llmResult.explanation,
        type: llmResult.type, source: 'llm',
        suggestion: llmResult.suggestion || null,
        elapsed: Date.now() - start,
      };
    } catch (err) {
      log.warn('engine', `SQL错误，重试 ${attempt + 1}/${MAX_RETRIES}`, { error: err.message });
      if (attempt < MAX_RETRIES - 1) {
        llmResult = await llm.nl2sql(`修正SQL错误。\nSQL: ${lastSql}\n错误: ${err.message}`, schemaContext, options);
        guard(llmResult.sql);
        lastSql = llmResult.sql;
      } else {
        throw new Error(`SQL执行失败（已重试${MAX_RETRIES}次）: ${err.message}`);
      }
    }
  }
}

// ---- SQL 执行 ----

async function executeSql(sql, type) {
  const d = await getDb();
  let columns = [], rows = [], rowCount = 0, affectedRows = null;

  if (type === 'SELECT') {
    const execResult = d.exec(sql);
    if (execResult.length > 0) {
      columns = execResult[0].columns;
      rows = execResult[0].values.map((vals) => {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = vals[i]; });
        return obj;
      });
      rowCount = rows.length;
    }
  } else {
    d.run(sql);
    affectedRows = d.getRowsModified();
    rowCount = affectedRows;
  }

  saveToDisk();
  return { columns, rows, rowCount, affectedRows };
}

module.exports = { query };
