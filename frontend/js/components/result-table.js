/**
 * 结果表格组件
 */
const ResultTable = {
  init() {
    this.table = document.getElementById('resultTable');
    this.thead = this.table.querySelector('thead');
    this.tbody = this.table.querySelector('tbody');
    this.emptyState = document.getElementById('emptyState');
    this.emptyMsg = this.emptyState.querySelector('p');
    this.title = document.getElementById('resultTitle');
    this.meta = document.getElementById('resultMeta');
  },

  /** 渲染查询结果 (NL Query) */
  render(result) {
    this.title.textContent = result.type === 'SELECT' ? '查询结果' : '操作结果';
    this.meta.textContent = result.rowCount != null ? `${result.rowCount} 行` : '';

    if (!result.rows || !result.rows.length) {
      this._showEmpty('未找到符合条件的记录');
      return;
    }

    const rows = result.rows.map((obj) => result.columns.map((col) => obj[col]));
    this._renderTable(result.columns, rows);
  },

  /** 渲染列表 (CRUD API) */
  renderList(data) {
    this.title.textContent = '物料列表';
    this.meta.textContent = `${data.rowCount} 个物料`;

    if (!data.rows || !data.rows.length) {
      this._showEmpty('暂无物料数据，请先新增物料');
      return;
    }

    const columns = [
      'component_id', 'internal_pn', 'top_category_code', 'description',
      'footprint_name', 'manufacturer', 'unit_price', 'stock_qty',
    ];
    const colLabels = {
      component_id: 'ID', internal_pn: '内部料号', top_category_code: '分类',
      description: '描述', footprint_name: '封装', manufacturer: '制造商',
      unit_price: '单价', stock_qty: '库存',
    };

    // 构建行数据，库存低于50的加 stock-low 样式类
    const labeledCols = columns.map((c) => colLabels[c] || c);
    const rows = data.rows.map((r, i) => {
      const cells = columns.map((c) => {
        if (c === 'unit_price') return r[c] != null ? Number(r[c]).toFixed(4) : '-';
        if (c === 'stock_qty') return r[c] != null ? r[c] : 0;
        return r[c] != null ? String(r[c]) : '';
      });
      return { cells, rowId: r.component_id, stockLow: r.stock_qty != null && r.stock_qty < 50 };
    });

    this.emptyState.style.display = 'none';
    this.table.style.display = '';

    this.thead.innerHTML = `<tr>${labeledCols.map((c) => `<th>${c}</th>`).join('')}<th class="col-actions">操作</th></tr>`;

    const stockIdx = columns.indexOf('stock_qty');
    this.tbody.innerHTML = rows.map(({ cells, rowId, stockLow }, i) => {
      return `
        <tr data-id="${rowId || ''}">
          ${cells.map((cell, ci) =>
            `<td title="${cell || ''}"${ci === stockIdx && stockLow ? ' class="stock-low"' : ''}>${cell || ''}</td>`
          ).join('')}
          <td class="col-actions">
            <button class="btn-sm btn-edit" data-id="${rowId || ''}">编辑</button>
            <button class="btn-sm btn-danger btn-delete" data-id="${rowId || ''}">删除</button>
          </td>
        </tr>`;
    }).join('');

    this.tbody.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', () => App.handleEdit(parseInt(btn.dataset.id)));
    });
    this.tbody.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', () => App.handleDelete(parseInt(btn.dataset.id)));
    });
  },

  _renderTable(columns, rows) {
    this.emptyState.style.display = 'none';
    this.table.style.display = '';

    this.thead.innerHTML = `<tr>${columns.map((c) => `<th>${c}</th>`).join('')}<th class="col-actions">操作</th></tr>`;

    this.tbody.innerHTML = rows.map((row, i) => {
      return `
        <tr>
          ${row.map((cell) => `<td title="${cell ?? ''}">${cell ?? ''}</td>`).join('')}
        </tr>`;
    }).join('');
  },

  _showEmpty(msg) {
    this.table.style.display = 'none';
    this.emptyState.style.display = '';
    if (this.emptyMsg) this.emptyMsg.textContent = msg;
  },
};
