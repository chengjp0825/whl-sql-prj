/**
 * 主应用逻辑
 */
const App = {
  currentSql: '',
  pendingWrite: null, // { sql, type, explanation }

  async init() {
    QueryBox.init();
    ResultTable.init();
    FormModal.init();
    this._initFilters();
    this._initButtons();
    this._initModals();
    await this.refresh();
  },

  // ---- 过滤器栏 ----

  async _initFilters() {
    // 加载分类下拉（仅一级分类）
    try {
      const cats = await api.listCategories();
      const topCats = cats.filter((c) => !c.parent_id);
      const catSelect = document.getElementById('filterCategory');
      topCats.forEach((c) => {
        catSelect.innerHTML += `<option value="${c.category_id}">${c.category_code} - ${c.category_name}</option>`;
      });
    } catch (_) {}

    // 加载封装下拉（从物料去重）
    try {
      const data = await api.listComponents({ pageSize: 1000 });
      const fps = [...new Set(data.rows.map((r) => r.footprint_name).filter(Boolean))].sort();
      const fpSelect = document.getElementById('filterFootprint');
      fps.forEach((f) => {
        fpSelect.innerHTML += `<option value="${f}">${f}</option>`;
      });
    } catch (_) {}
  },

  _initButtons() {
    document.getElementById('btnRefresh').addEventListener('click', () => this.refresh());
    document.getElementById('btnAdd').addEventListener('click', () => FormModal.showCreate());
    document.getElementById('btnCategories').addEventListener('click', () => this._showCategories());
    document.getElementById('btnFilter').addEventListener('click', () => this._applyFilters());
    document.getElementById('btnFilterReset').addEventListener('click', () => this._resetFilters());
  },

  async _applyFilters() {
    const params = {};
    const fp = document.getElementById('filterFootprint').value;
    const cat = document.getElementById('filterCategory').value;
    const mfg = document.getElementById('filterMfg').value.trim();
    const stockMin = document.getElementById('filterStockMin').value;
    const stockMax = document.getElementById('filterStockMax').value;

    if (fp) params.footprint_name = fp;
    if (cat) params.category_id = cat;
    if (mfg) params.manufacturer = mfg;

    try {
      const data = await api.listComponents(Object.assign(params, { pageSize: 100 }));
      ResultTable.renderList(data);
      this.showStatus(`过滤器 · ${data.rowCount} 条结果`, 'success');
    } catch (err) {
      this.showStatus(err.message, 'error');
    }
  },

  _resetFilters() {
    document.getElementById('filterFootprint').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterMfg').value = '';
    document.getElementById('filterStockMin').value = '';
    document.getElementById('filterStockMax').value = '';
    this.refresh();
  },

  // ---- 弹窗初始化 ----

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
        App._showCategories();
        e.target.reset();
      } catch (err) {
        App.showStatus(err.message, 'error');
      }
    });
    // 写操作确认弹窗
    document.getElementById('confirmClose').addEventListener('click', () => {
      document.getElementById('confirmOverlay').classList.add('hidden');
    });
    document.getElementById('confirmCancel').addEventListener('click', () => {
      document.getElementById('confirmOverlay').classList.add('hidden');
    });
    document.getElementById('confirmOk').addEventListener('click', () => this._executeWrite());
  },

  // ---- 写操作确认 ----

  _showConfirm(data) {
    this.pendingWrite = data;
    document.getElementById('confirmDesc').textContent = data.explanation || 'AI 生成的写操作';
    document.getElementById('confirmMeta').textContent =
      `类型: ${data.type} · 预计影响: ${data.estimatedRows || '?'} 行 · 来源: ${data.source || 'llm'}`;
    document.getElementById('confirmSql').textContent = data.sql;
    document.getElementById('confirmOverlay').classList.remove('hidden');
  },

  async _executeWrite() {
    if (!this.pendingWrite) return;
    try {
      const result = await api.executeQuery(this.pendingWrite.sql, this.pendingWrite.type);
      document.getElementById('confirmOverlay').classList.add('hidden');
      this.showStatus(`✅ ${result.message}`, 'success');
      this.pendingWrite = null;
      this.refresh();
    } catch (err) {
      this.showStatus(err.message, 'error');
    }
  },

  // ---- 自然语言查询 ----

  async handleQuery(text) {
    this.showStatus('查询中...', '');
    try {
      const result = await api.nlQuery(text);

      // 写操作预览
      if (result.requiresConfirmation) {
        this._showConfirm(result);
        return;
      }

      this.currentSql = result.sql;

      // 来源标记
      const srcLabel = { rule: '规则命中', cache: '缓存命中', llm: 'LLM' }[result.source] || result.source;
      const srcClass = result.source;
      this.showStatus(
        `${result.explanation || '查询完成'} · <span class="status-source ${srcClass}">${srcLabel}</span> · ${result.elapsed}ms` +
        ` — <a href="#" id="showSql">查看SQL</a>`,
        'success'
      );
      document.getElementById('showSql').addEventListener('click', () => this._showSql(result.sql));

      ResultTable.render(result);
    } catch (err) {
      this.showStatus(err.message, 'error');
    }
  },

  // 刷新列表
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

  async handleEdit(id) { FormModal.showEdit(id); },

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

document.addEventListener('DOMContentLoaded', () => App.init());
