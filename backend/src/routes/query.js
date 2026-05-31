const express = require('express');
const router = express.Router();
const { query: nlQuery } = require('../nl2sql/engine');
const { getDb, saveToDisk } = require('../db/connection');
const { guard } = require('../middleware/sql-guard');

/**
 * POST /api/query
 * 自然语言查询入口（三层引擎：规则 → 缓存 → LLM）
 *
 * 写操作（INSERT/UPDATE/DELETE）不直接执行，返回预览让前端弹确认窗
 */
router.post('/', async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: '请输入查询内容' });
    }

    const result = await nlQuery(question.trim());

    // 写操作预览
    if (result.type !== 'SELECT') {
      return res.json({
        status: 'preview',
        requiresConfirmation: true,
        sql: result.sql,
        explanation: result.explanation,
        type: result.type,
        source: result.source,
        elapsed: result.elapsed,
        estimatedRows: result.rowCount,
      });
    }

    res.json({
      status: 'ok',
      sql: result.sql,
      explanation: result.explanation,
      type: result.type,
      source: result.source,
      elapsed: result.elapsed,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/query/execute
 * 执行已确认的 SQL（写操作二次确认后调用）
 */
router.post('/execute', async (req, res, next) => {
  try {
    const { sql, type } = req.body;

    if (!sql) {
      return res.status(400).json({ error: '缺少 SQL' });
    }

    // 再次安全校验
    guard(sql);

    const d = await getDb();
    let affectedRows = 0;

    if (type === 'SELECT') {
      const result = d.exec(sql);
      return res.json({ status: 'ok', type: 'SELECT', rows: result[0]?.values || [] });
    } else {
      d.run(sql);
      affectedRows = d.getRowsModified();
      saveToDisk();
    }

    res.json({
      status: 'ok',
      type: type || 'UPDATE',
      affectedRows,
      message: `操作成功，影响 ${affectedRows} 行`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
