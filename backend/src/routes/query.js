const express = require('express');
const router = express.Router();
const { query: nlQuery } = require('../nl2sql/engine');

/**
 * POST /api/query
 * 自然语言查询入口
 * Body: { question: "帮我查一下0805封装的电阻" }
 */
router.post('/', async (req, res, next) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: '请输入查询内容' });
    }

    const result = await nlQuery(question.trim());

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
