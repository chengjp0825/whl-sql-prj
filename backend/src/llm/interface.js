/**
 * LLM 抽象接口
 * 所有 LLM 提供商必须实现此接口
 */

/**
 * 将自然语言转换为 SQL
 * @param {string} naturalLanguage - 用户自然语言输入
 * @param {string} schemaContext - 数据库 schema 描述文本
 * @param {object} options - 可选参数
 * @param {string} options.model - 模型名称
 * @returns {Promise<{sql: string, explanation: string, type: string}>}
 */
async function nl2sql(naturalLanguage, schemaContext, options = {}) {
  throw new Error('nl2sql() must be implemented by LLM provider');
}

module.exports = { nl2sql };
