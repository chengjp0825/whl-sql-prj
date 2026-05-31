const { query, run, lastInsertRowId } = require('../db/connection');

const categoryService = {
  async tree() {
    const result = await query(
      `SELECT * FROM component_category
       ORDER BY parent_id IS NULL DESC, sort_order, category_id`
    );
    const map = {};
    const roots = [];
    for (const row of result.rows) {
      map[row.category_id] = { ...row, children: [] };
    }
    for (const row of result.rows) {
      if (row.parent_id && map[row.parent_id]) {
        map[row.parent_id].children.push(map[row.category_id]);
      } else {
        roots.push(map[row.category_id]);
      }
    }
    return roots;
  },

  async list() {
    return (await query(`
      SELECT cc.*, p.category_name AS parent_name
      FROM component_category cc
      LEFT JOIN component_category p ON cc.parent_id = p.category_id
      ORDER BY cc.parent_id IS NULL DESC, cc.sort_order, cc.category_id
    `)).rows;
  },

  async create(data) {
    await run(
      `INSERT INTO component_category (parent_id, category_name, category_code, sort_order)
       VALUES (?, ?, ?, ?)`,
      [data.parent_id || null, data.category_name, data.category_code, data.sort_order || 0]
    );

    const id = lastInsertRowId();
    return (await query(`
      SELECT cc.*, p.category_name AS parent_name
      FROM component_category cc
      LEFT JOIN component_category p ON cc.parent_id = p.category_id
      WHERE cc.category_id = ?
    `, [id])).rows[0];
  },
};

module.exports = categoryService;
