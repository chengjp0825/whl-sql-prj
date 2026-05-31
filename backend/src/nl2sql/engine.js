const { create: createLLM } = require('../llm/factory');
const { buildSchemaContext } = require('./schema-context');
const { getDb, saveToDisk } = require('../db/connection');
const { guard } = require('../middleware/sql-guard');

const llm = createLLM();
const MAX_RETRIES = 2;

/**
 * 处理自然语言查询
 */
async function query(naturalLanguage, options = {}) {
  const schemaContext = buildSchemaContext();

  // 1. 调用 LLM 生成 SQL
  let result = await llm.nl2sql(naturalLanguage, schemaContext, options);
  let lastSql = result.sql;

  // 2. 安全校验
  guard(lastSql);

  // 3. 执行 SQL（自动重试）
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const d = await getDb();
      let columns = [];
      let rows = [];
      let rowCount = 0;
      let affectedRows = null;

      if (result.type === 'SELECT') {
        const execResult = d.exec(lastSql);
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
        d.run(lastSql);
        affectedRows = d.getRowsModified();
        rowCount = affectedRows;
      }

      saveToDisk();

      return {
        sql: lastSql,
        explanation: result.explanation,
        type: result.type,
        columns,
        rows,
        rowCount,
        affectedRows,
      };
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        const fixPrompt = `以下SQLite SQL执行出错，请修正。\nSQL: ${lastSql}\n错误: ${err.message}\n请返回修正后的SQL。注意使用SQLite语法！`;
        result = await llm.nl2sql(fixPrompt, schemaContext, options);
        guard(result.sql);
        lastSql = result.sql;
      } else {
        throw new Error(`SQL执行失败（已重试${MAX_RETRIES}次）: ${err.message}\n最后SQL: ${lastSql}`);
      }
    }
  }
}

module.exports = { query };
