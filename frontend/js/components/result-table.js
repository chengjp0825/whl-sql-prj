/**
 * 结果表格组件
 */
const ResultTable = {
  init() {
    this.table = document.getElementById('resultTable');
    this.thead = this.table.querySelector('thead');
    this.tbody = this.table.querySelector('tbody');
    this.emptyState = document.getElementById('emptyState');
    this.title = document.getElementById('resultTitle');
    this.meta = document.getElementById('resultMeta');
  },

  /** 渲染查询结果 */
  render(result) {
    this.title.textContent = result.type === 'SELECT' ? '查询结果' : '操作结果';
    this.meta.textContent = result.rowCount != null ? `${result.rowCount} 行` : '';

    if (!result.rows || !result.rows.length) {
      this._showEmpty('未找到符合条件的记录');
      return;
    }

    // 将对象数组转为值数组（和 renderList 保持一致）
    const rows = result.rows.map((obj) => result.columns.map((col) => obj[col]));
    this._renderTable(result.columns, rows);
  },

  /** 渲染列表（从 CRUD API） */
  renderList(data) {
    this.title.textContent = '物料列表';
    this.meta.textContent = `${data.rowCount} 个物料`;

    if (!data.rows || !data.rows.length) {
      this._showEmpty('暂无物料数据，请先新增物料');
      return;
    }

    // 选择哪些列展示（简化）
    const columns = [
      'component_id', 'internal_pn', 'category_name', 'description',
      'footprint_name', 'manufacturer', 'unit_price', 'stock_qty',
    ];
    const colLabels = {
      component_id: 'ID', internal_pn: '内部料号', category_name: '分类',
      description: '描述', footprint_name: '封装', manufacturer: '制造商',
      unit_price: '单价', stock_qty: '库存',
    };

    const rows = data.rows.map((r) => columns.map((c) => {
      if (c === 'unit_price') return r[c] != null ? Number(r[c]).toFixed(4) : '-';
      if (c === 'stock_qty') return r[c] != null ? r[c] : 0;
      return r[c] != null ? String(r[c]) : '';
    }));

    this._renderTable(
      columns.map((c) => colLabels[c] || c),
      rows,
      { rowId: (row) => data.rows[row]?.component_id }
    );

    // 高亮库存
    this.tbody.querySelectorAll('tr').forEach((tr, i) => {
      const stock = data.rows[i]?.stock_qty;
      if (stock != null && stock < 50) {
        const stockCell = tr.querySelector('td:last-child');
        if (stockCell) stockCell.classList.add('stock-low');
      }
    });
  },

  _renderTable(columns, rows, opts = {}) {
    this.emptyState.style.display = 'none';
    this.table.style.display = '';

    // 表头
    this.thead.innerHTML = `
      <tr>${columns.map((c) => `<th>${c}</th>`).join('')}<th class="col-actions">操作</th></tr>
    `;

    // 表体
    this.tbody.innerHTML = rows.map((row, i) => {
      const rowId = opts.rowId ? opts.rowId(i) : null;
      return `
        <tr data-id="${rowId || ''}">
          ${row.map((cell) => {
            if (cell && typeof cell === 'object') {
              return `<td><code>${JSON.stringify(cell)}</code></td>`;
            }
            return `<td title="${cell || ''}">${cell || ''}</td>`;
          }).join('')}
          <td class="col-actions">
            <button class="btn-sm btn-edit" data-id="${rowId || ''}">编辑</button>
            <button class="btn-sm btn-danger btn-delete" data-id="${rowId || ''}">删除</button>
          </td>
        </tr>
      `;
    }).join('');

    // 绑定操作按钮
    this.tbody.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', () => App.handleEdit(parseInt(btn.dataset.id)));
    });
    this.tbody.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', () => App.handleDelete(parseInt(btn.dataset.id)));
    });
  },

  _showEmpty(msg) {
    this.table.style.display = 'none';
    this.emptyState.style.display = '';
    this.emptyState.querySelector('p').textContent = msg;
  },
};
