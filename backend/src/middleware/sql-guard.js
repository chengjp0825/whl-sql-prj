/**
 * SQL 安全校验中间件
 * 防止 LLM 生成的危险 SQL 被执行
 */

const FORBIDDEN_KEYWORDS = /\b(DROP\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW|FUNCTION|TRIGGER|SEQUENCE|ROLE|USER)|TRUNCATE|ALTER\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW)|GRANT|REVOKE|CREATE\s+(DATABASE|SCHEMA|INDEX|VIEW|FUNCTION|TRIGGER|ROLE|USER)|VACUUM|REINDEX|CLUSTER|REFRESH)\b/i;

const MULTI_STATEMENT = /;\s*(?=\S)/;

/**
 * 校验 SQL 安全性
 * @param {string} sql
 * @throws {Error} 如果 SQL 不安全
 */
function guard(sql) {
  // 1. 检查禁止的关键字
  if (FORBIDDEN_KEYWORDS.test(sql)) {
    throw new Error('禁止执行 DDL / 管理类 SQL 操作');
  }

  // 2. 检查多语句（防止注入）
  const trimmed = sql.trim();
  if (MULTI_STATEMENT.test(trimmed)) {
    throw new Error('禁止执行多条 SQL 语句');
  }

  // 3. DELETE 必须带 WHERE
  if (/^\s*DELETE\b/i.test(trimmed) && !/\bWHERE\b/i.test(trimmed)) {
    throw new Error('DELETE 语句必须包含 WHERE 条件');
  }

  // 4. UPDATE 必须带 WHERE
  if (/^\s*UPDATE\b/i.test(trimmed) && !/\bWHERE\b/i.test(trimmed)) {
    throw new Error('UPDATE 语句必须包含 WHERE 条件');
  }
}

module.exports = { guard };
