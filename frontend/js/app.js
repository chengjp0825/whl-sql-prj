/**
 * 主应用逻辑
 */
const App = {
  currentSql: '',

  async init() {
    QueryBox.init();
    ResultTable.init();
    FormModal.init();
    this._initButtons();
    this._initModals();
    await this.refresh();
  },

  _initButtons() {
    document.getElementById('btnRefresh').addEventListener('click', () => this.refresh());
    document.getElementById('btnAdd').addEventListener('click', () => FormModal.showCreate());
    document.getElementById('btnCategories').addEventListener('click', () => this._showCategories());
  },

  _initModals() {
    // SQL 弹窗
    document.getElementById('sqlClose').addEventListener('click', () => {
      document.getElementById('sqlOverlay').classList.add('hidden');
    });
    document.getElementById('sqlOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('sqlOverlay')) {
        document.getElementById('sqlOverlay').classList.add('hidden');
      }
    });
    // 分类弹窗
    document.getElementById('categoryClose').addEventListener('click', () => {
      document.getElementById('categoryOverlay').classList.add('hidden');
    });
    document.getElementById('categoryOverlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('categoryOverlay')) {
        document.getElementById('categoryOverlay').classList.add('hidden');
      }
    });
    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      if (!data.parent_id) data.parent_id = null;
      try {
        await api.createCategory(data);
        App.showStatus('分类添加成功', 'success');
        FormModal.loadCategories();
        App._showCategories(); // refresh
        e.target.reset();
      } catch (err) {
        App.showStatus(err.message, 'error');
      }
    });
  },

  /** 处理自然语言查询 */
  async handleQuery(text) {
    this.showStatus('AI 正在分析...', '');
    try {
      const result = await api.nlQuery(text);
      this.currentSql = result.sql;

      // 显示 SQL 链接
      this.showStatus(
        `<span>${result.explanation || '查询完成'} — <a href="#" id="showSql">查看SQL</a></span>`,
        'success'
      );
      document.getElementById('showSql').addEventListener('click', () => this._showSql(result.sql));

      ResultTable.render(result);
    } catch (err) {
      this.showStatus(err.message, 'error');
    }
  },

  /** 刷新物料列表 */
  async refresh() {
    try {
      const data = await api.listComponents({ pageSize: 100 });
      ResultTable.renderList(data);
      this.showStatus('', '');
    } catch (err) {
      ResultTable.renderList({ rows: [], rowCount: 0 });
      this.showStatus(`加载失败: ${err.message}（请检查后端是否已启动）`, 'error');
    }
  },

  /** 编辑物料 */
  async handleEdit(id) {
    FormModal.showEdit(id);
  },

  /** 删除物料 */
  async handleDelete(id) {
    if (!confirm(`确定删除物料 #${id}？此操作不可撤销。`)) return;
    try {
      await api.deleteComponent(id);
      this.showStatus(`物料 #${id} 已删除`, 'success');
      this.refresh();
    } catch (err) {
      this.showStatus(err.message, 'error');
    }
  },

  /** 显示状态消息 */
  showStatus(msg, type) {
    const bar = document.getElementById('statusBar');
    bar.className = `status-bar ${type}`;
    bar.innerHTML = msg;
  },

  _showSql(sql) {
    document.getElementById('sqlContent').textContent = sql;
    document.getElementById('sqlOverlay').classList.remove('hidden');
  },

  async _showCategories() {
    try {
      const cats = await api.listCategories();
      const list = document.getElementById('categoryList');
      let html = '';
      cats.forEach((c) => {
        const indent = c.parent_id ? '<span class="indent"></span>' : '';
        html += `<div class="category-item">
          ${indent}<span class="code">${c.category_code || ''}</span>
          <span>${c.category_name || ''}</span>
        </div>`;
      });
      list.innerHTML = html || '<p>暂无分类</p>';

      // 更新分类表单的下拉
      const parentSelect = document.getElementById('categoryForm').querySelector('[name="parent_id"]');
      parentSelect.innerHTML = '<option value="">顶级分类</option>';
      cats.forEach((c) => {
        parentSelect.innerHTML += `<option value="${c.category_id}">${c.category_code} - ${c.category_name}</option>`;
      });

      document.getElementById('categoryOverlay').classList.remove('hidden');
    } catch (err) {
      App.showStatus('加载分类失败: ' + err.message, 'error');
    }
  },
};

// 启动
document.addEventListener('DOMContentLoaded', () => App.init());
