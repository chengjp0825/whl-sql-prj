const { create: createLLM } = require('../llm/factory');
const { buildSchemaContext } = require('./schema-context');
const { parse: ruleParse, buildQuery } = require('./rule-engine');
const { getDb, saveToDisk } = require('../db/connection');
const { guard } = require('../middleware/sql-guard');
const log = require('../utils/logger');

const llm = createLLM();
const MAX_RETRIES = 2;

// ---- 缓存层 ----
const cache = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 分钟
const CACHE_MAX = 200;

function cacheGet(nl) {
  const key = nl.trim().toLowerCase();
  const entry = cache[key];
  if (entry && (Date.now() - entry.time < CACHE_TTL)) {
    return entry.result;
  }
  delete cache[key];
  return null;
}

function cacheSet(nl, result) {
  const key = nl.trim().toLowerCase();
  cache[key] = { result, time: Date.now() };
  // 超出上限清理最旧
  const keys = Object.keys(cache);
  if (keys.length > CACHE_MAX) {
    const oldest = keys.sort((a, b) => cache[a].time - cache[b].time)[0];
    delete cache[oldest];
  }
}

// ---- 三层查询 ----

/**
 * @returns {Promise<{sql, explanation, type, source, elapsed, columns, rows, rowCount, affectedRows}>}
 */
async function query(naturalLanguage, options = {}) {
  const start = Date.now();

  // === Layer 1: 规则引擎 ===
  const ruleResult = ruleParse(naturalLanguage);

  if (ruleResult.matched) {
    const sql = buildQuery(ruleResult);
    log.info('engine', `规则命中: ${ruleResult.explanation}`, { sql: sql.substring(0, 120) });
    guard(sql);
    const result = await executeSql(sql, 'SELECT');

    // 缓存规则结果
    const llmResult = { sql, explanation: ruleResult.explanation, type: 'SELECT' };
    cacheSet(naturalLanguage, llmResult);

    return {
      ...result,
      sql,
      explanation: ruleResult.explanation,
      type: 'SELECT',
      source: 'rule',
      elapsed: Date.now() - start,
    };
  }

  log.info('engine', '规则未命中，检查缓存...');

  // === Layer 2: 缓存 ===
  const cached = cacheGet(naturalLanguage);
  if (cached) {
    log.info('engine', '缓存命中', { sql: cached.sql.substring(0, 120) });
    guard(cached.sql);
    const result = await executeSql(cached.sql, cached.type);

    return {
      ...result,
      sql: cached.sql,
      explanation: cached.explanation,
      type: cached.type,
      source: 'cache',
      elapsed: Date.now() - start,
    };
  }

  log.info('engine', '缓存未命中，调用 LLM...');

  // === Layer 3: LLM ===
  const schemaContext = buildSchemaContext();
  let llmResult = await llm.nl2sql(naturalLanguage, schemaContext, options);
  let lastSql = llmResult.sql;
  guard(lastSql);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await executeSql(lastSql, llmResult.type);
      log.info('engine', `LLM 成功 · ${llmResult.explanation}`, { sql: lastSql.substring(0, 120), rows: result.rowCount });

      // LLM 结果写入缓存
      cacheSet(naturalLanguage, { sql: lastSql, explanation: llmResult.explanation, type: llmResult.type });

      return {
        ...result,
        sql: lastSql,
        explanation: llmResult.explanation,
        type: llmResult.type,
        source: 'llm',
        elapsed: Date.now() - start,
      };
    } catch (err) {
      log.warn('engine', `SQL执行失败，重试 ${attempt + 1}/${MAX_RETRIES}`, { sql: lastSql.substring(0, 120), error: err.message });
      if (attempt < MAX_RETRIES - 1) {
        const fixPrompt = `以下SQLite SQL执行出错，请修正。\nSQL: ${lastSql}\n错误: ${err.message}\n请返回修正后的SQL。注意使用SQLite语法！`;
        llmResult = await llm.nl2sql(fixPrompt, schemaContext, options);
        guard(llmResult.sql);
        lastSql = llmResult.sql;
      } else {
        throw new Error(`SQL执行失败（已重试${MAX_RETRIES}次）: ${err.message}\n最后SQL: ${lastSql}`);
      }
    }
  }
}

// ---- SQL 执行 ----

async function executeSql(sql, type) {
  const d = await getDb();
  let columns = [];
  let rows = [];
  let rowCount = 0;
  let affectedRows = null;

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
