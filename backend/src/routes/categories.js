const express = require('express');
const router = express.Router();
const categoryService = require('../services/category-service');

/**
 * GET /api/categories
 * 获取分类列表（可选 tree 参数返回树形）
 */
router.get('/', async (req, res, next) => {
  try {
    if (req.query.format === 'tree') {
      const tree = await categoryService.tree();
      return res.json(tree);
    }
    const list = await categoryService.list();
    res.json(list);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/categories
 * 新增分类
 */
router.post('/', async (req, res, next) => {
  try {
    const category = await categoryService.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
