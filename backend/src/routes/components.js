const express = require('express');
const router = express.Router();
const componentService = require('../services/component-service');

/**
 * GET /api/components
 * 分页查询物料列表
 */
router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, category_id, footprint_name, manufacturer, keyword, stock_min, stock_max } = req.query;
    const result = await componentService.list(
      parseInt(page) || 1,
      parseInt(pageSize) || 20,
      { category_id, footprint_name, manufacturer, keyword, stock_min, stock_max }
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/components/:id
 * 查询单个物料
 */
router.get('/:id', async (req, res, next) => {
  try {
    const component = await componentService.getById(parseInt(req.params.id));
    if (!component) {
      return res.status(404).json({ error: '物料不存在' });
    }
    res.json(component);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/components
 * 新增物料
 */
router.post('/', async (req, res, next) => {
  try {
    const component = await componentService.create(req.body);
    res.status(201).json(component);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: '内部料号已存在' });
    }
    next(err);
  }
});

/**
 * PUT /api/components/:id
 * 更新物料
 */
router.put('/:id', async (req, res, next) => {
  try {
    const component = await componentService.update(parseInt(req.params.id), req.body);
    if (!component) {
      return res.status(404).json({ error: '物料不存在' });
    }
    res.json(component);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/components/:id
 * 删除物料
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const component = await componentService.remove(parseInt(req.params.id));
    if (!component) {
      return res.status(404).json({ error: '物料不存在' });
    }
    res.json({ message: '删除成功', component });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
