const OpenAI = require('openai');
const config = require('../config');

const client = new OpenAI({
  apiKey: config.llm.deepseek.apiKey,
  baseURL: config.llm.deepseek.baseURL,
});

/**
 * DeepSeek 实现：不依赖 tool_choice（DeepSeek 部分模型不支持），
 * 通过 system prompt 强制输出 JSON，解析后提取 SQL
 */
async function nl2sql(naturalLanguage, schemaContext, options = {}) {
  const model = options.model || config.llm.model;

  const resp = await client.chat.completions.create({
    model,
    max_tokens: 2048,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `你是一个专业的PCB元器件数据库助手。根据用户的自然语言和数据库结构定义，生成正确的SQLite SQL语句。

## 数据库结构
${schemaContext}

## 规则
1. 只生成一条SQL语句，不要用事务或多条语句
2. **必须使用 SQLite 语法**，NOT PostgreSQL！
3. JSON字段查询：使用 json_extract(spec_json, '$.key')，不要用 -> 或 ->> 或 @>
4. 字符串模糊匹配用 LIKE
5. 不需要 RETURNING 子句，SQLite 不支持
6. 日期函数用 date('now') 和 datetime('now')

## 输出格式
你必须严格按以下 JSON 格式输出，不要输出任何其他内容：

{"sql": "生成的SQL语句", "explanation": "简要解释", "type": "SELECT|INSERT|UPDATE|DELETE"}

只输出这一行 JSON，不要用 markdown 代码块包裹。`,
      },
      {
        role: 'user',
        content: `请将以下自然语言转换为 SQLite SQL：\n${naturalLanguage}`,
      },
    ],
  });

  const content = resp.choices[0]?.message?.content?.trim() || '';

  // 尝试解析 JSON
  try {
    // 去除可能的 markdown 代码块包裹
    let jsonStr = content;
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    if (parsed.sql && parsed.type) {
      return {
        sql: parsed.sql,
        explanation: parsed.explanation || '',
        type: parsed.type,
      };
    }
  } catch (_) {
    // 非 JSON 格式，尝试从文本中提取 SQL
  }

  // 回退：尝试从响应中提取 SQL
  const sqlMatch = content.match(/```sql?\s*\n?([\s\S]*?)```/i) ||
                   content.match(/```\s*\n?([\s\S]*?)```/i);
  if (sqlMatch) {
    return {
      sql: sqlMatch[1].trim(),
      explanation: '从文本中提取',
      type: guessType(sqlMatch[1]),
    };
  }

  // 最后尝试：整段当作 SQL
  const trimmed = content.trim();
  if (/^\s*(SELECT|INSERT|UPDATE|DELETE)\b/i.test(trimmed)) {
    return {
      sql: trimmed,
      explanation: '从文本中提取',
      type: guessType(trimmed),
    };
  }

  throw new Error(`DeepSeek 返回格式异常: ${content.substring(0, 200)}`);
}

function guessType(sql) {
  if (/^\s*SELECT\b/i.test(sql)) return 'SELECT';
  if (/^\s*INSERT\b/i.test(sql)) return 'INSERT';
  if (/^\s*UPDATE\b/i.test(sql)) return 'UPDATE';
  if (/^\s*DELETE\b/i.test(sql)) return 'DELETE';
  return 'SELECT';
}

module.exports = { nl2sql };
