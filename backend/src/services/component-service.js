const { query, run, lastInsertRowId } = require('../db/connection');

const componentService = {
  async list(page = 1, pageSize = 20, filters = {}) {
    const offset = (page - 1) * pageSize;
    const where = [];
    const params = [];

    if (filters.category_id) {
      where.push('(cl.category_id = ? OR cc.parent_id = ?)');
      params.push(filters.category_id, filters.category_id);
    }
    if (filters.footprint_name) {
      where.push('cl.footprint_name LIKE ?');
      params.push(`%${filters.footprint_name}%`);
    }
    if (filters.manufacturer) {
      where.push('cl.manufacturer LIKE ?');
      params.push(`%${filters.manufacturer}%`);
    }
    if (filters.keyword) {
      where.push('(cl.internal_pn LIKE ? OR cl.description LIKE ?)');
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
      SELECT cl.*, cc.category_name
      FROM component_library cl
      LEFT JOIN component_category cc ON cl.category_id = cc.category_id
      ${whereClause}
      ORDER BY cl.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const result = await query(sql, [...params, pageSize, offset]);
    return { rows: result.rows, rowCount: result.rowCount };
  },

  async getById(componentId) {
    const sql = `
      SELECT cl.*, cc.category_name
      FROM component_library cl
      LEFT JOIN component_category cc ON cl.category_id = cc.category_id
      WHERE cl.component_id = ?
    `;
    const result = await query(sql, [componentId]);
    return result.rows[0] || null;
  },

  async create(data) {
    const fields = [];
    const values = [];
    const placeholders = [];

    const allowed = [
      'internal_pn', 'category_id', 'description', 'footprint_name',
      'symbol_name', 'spec_json', 'manufacturer', 'manufacturer_pn',
      'supplier', 'supplier_pn', 'unit_price', 'currency',
      'price_date', 'stock_qty', 'datasheet_url', 'remark',
    ];

    for (const key of allowed) {
      if (data[key] !== undefined && data[key] !== null) {
        fields.push(key);
        values.push(typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
        placeholders.push('?');
      }
    }

    if (!fields.length) throw new Error('没有可插入的数据');

    const sql = `
      INSERT INTO component_library (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;

    await run(sql, values);
    const id = lastInsertRowId();
    return this.getById(id);
  },

  async update(componentId, data) {
    const sets = [];
    const values = [];

    const allowed = [
      'category_id', 'description', 'footprint_name', 'symbol_name',
      'spec_json', 'manufacturer', 'manufacturer_pn', 'supplier',
      'supplier_pn', 'unit_price', 'currency', 'price_date',
      'stock_qty', 'datasheet_url', 'remark',
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key]);
      }
    }

    if (!sets.length) throw new Error('没有可更新的数据');

    sets.push(`updated_at = datetime('now')`);
    values.push(componentId);

    const sql = `
      UPDATE component_library
      SET ${sets.join(', ')}
      WHERE component_id = ?
    `;

    await run(sql, values);
    return this.getById(componentId);
  },

  async remove(componentId) {
    const component = await this.getById(componentId);
    if (!component) return null;

    await run(`DELETE FROM component_library WHERE component_id = ?`, [componentId]);
    return component;
  },
};

module.exports = componentService;
