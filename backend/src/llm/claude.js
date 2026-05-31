const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

const client = new Anthropic({ apiKey: config.llm.anthropic.apiKey });

/**
 * Claude 实现：使用 Tool Use 返回结构化 SQL（SQLite 语法）
 */
async function nl2sql(naturalLanguage, schemaContext, options = {}) {
  const model = options.model || config.llm.model;

  const resp = await client.messages.create({
    model,
    max_tokens: 2048,
    system: `你是一个专业的PCB元器件数据库助手。根据用户的自然语言和数据库结构定义，生成正确的SQLite SQL语句。

## 数据库结构
${schemaContext}

## 规则
1. 只生成一条SQL语句，不要用事务或多条语句
2. **必须使用 SQLite 语法**，NOT PostgreSQL！
3. JSON字段查询：使用 json_extract(spec_json, '$.key')，不要用 -> 或 ->> 或 @>
4. 字符串模糊匹配用 LIKE（SQLite 中 LIKE 默认不区分大小写）
5. 不需要 RETURNING 子句，SQLite 不支持
6. 日期函数用 date('now') 和 datetime('now')
7. INSERT 语句的值直接写在 VALUES 中，不要用参数化占位符`,
    messages: [
      {
        role: 'user',
        content: `请将以下自然语言转换为 SQLite SQL：\n${naturalLanguage}`,
      },
    ],
    tools: [
      {
        name: 'write_sql',
        description: '生成并返回一条 SQLite SQL 语句',
        input_schema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              description: '生成的 SQLite SQL 语句',
            },
            explanation: {
              type: 'string',
              description: '对SQL的简要解释',
            },
            type: {
              type: 'string',
              enum: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
              description: 'SQL语句类型',
            },
          },
          required: ['sql', 'explanation', 'type'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'write_sql' },
  });

  for (const block of resp.content) {
    if (block.type === 'tool_use' && block.name === 'write_sql') {
      return {
        sql: block.input.sql,
        explanation: block.input.explanation,
        type: block.input.type,
      };
    }
  }

  throw new Error('Claude 未返回 write_sql 工具调用');
}

module.exports = { nl2sql };
