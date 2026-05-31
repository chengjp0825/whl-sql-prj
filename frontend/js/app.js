/**
 * 主应用逻辑
 */
const App = {
  pendingWrite: null,
  allCategories: [],
  allComponents: [],
  _categoryCounts: null,
  searchMode: 'fast',

  async init() {
    QueryBox.init();
    ResultTable.init();
    FormModal.init();
    this._initModeToggle();
    this._initSidebar();
    this._initButtons();
    this._initModals();
    await this._loadData();
    // 事件委托：动态生成的 #showSql 点击冒泡到 statusBar
    document.getElementById('statusBar').addEventListener('click', (e) => {
      if (e.target.id === 'showSql') { e.preventDefault(); this._showSql(this._latestSql); }
    });
  },

  // ---- 搜索模式 ----

  _initModeToggle() {
    const searchBtn = document.getElementById('btnQuery');
    document.querySelectorAll('.mode-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-option').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.searchMode = btn.dataset.mode;
        // 按钮文字 + 免责声明
        searchBtn.textContent = this.searchMode === 'smart' ? 'AI 搜索' : '搜索';
        const dis = document.getElementById('aiDisclaimer');
        if (this.searchMode === 'smart') dis.classList.remove('hidden');
        else dis.classList.add('hidden');
      });
    });
  },

  // ---- 侧边栏 ----

  _initSidebar() {
    document.querySelector('[data-action="all"]').addEventListener('click', (e) => {
      e.preventDefault();
      this._setActiveNav('all');
      this._applySidebarFilter(null);
    });
    document.querySelector('[data-action="low-stock"]').addEventListener('click', (e) => {
      e.preventDefault();
      this._setActiveNav('low-stock');
      this._filterByParams({ stock_max: 50 });
    });
  },

  _setActiveNav(action) {
    document.querySelectorAll('.side-link').forEach((el) => el.classList.remove('active'));
    // 匹配 data-action（静态链接）或 data-cat（动态分类链接）
    const el = document.querySelector(`[data-action="${action}"]`) || document.querySelector(`[data-cat="${action.replace('cat-', '')}"]`);
    if (el) el.classList.add('active');
  },

  _renderSidebarCategories() {
    const container = document.getElementById('sidebarCategories');
    if (!this._categoryCounts) this._precomputeCategoryCounts();
    const topCats = this.allCategories.filter((c) => !c.parent_id);
    container.innerHTML = topCats.map((c) =>
      `<li><a href="#" class="side-link" data-cat="${c.category_id}" data-code="${c.category_code}">
        ${c.category_name}
        <span class="side-count">${this._categoryCounts.get(c.category_id) || 0}</span>
      </a></li>`
    ).join('');

    container.querySelectorAll('.side-link').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this._setActiveNav('cat-' + el.dataset.cat);
        this._applySidebarFilter(el.dataset.cat);
      });
    });
  },

  _precomputeCategoryCounts() {
    // 一次遍历替代 O(N×M)：构建 childMap + countMap
    const childMap = new Map();
    for (const c of this.allCategories) {
      if (c.parent_id) {
        if (!childMap.has(c.parent_id)) childMap.set(c.parent_id, []);
        childMap.get(c.parent_id).push(c.category_id);
      }
    }
    const countMap = new Map();
    for (const comp of this.allComponents) {
      const ids = [comp.category_id, ...(childMap.get(comp.category_id) || [])];
      for (const id of ids) {
        countMap.set(id, (countMap.get(id) || 0) + 1);
      }
    }
    this._categoryCounts = new Map();
    for (const cat of this.allCategories) {
      this._categoryCounts.set(cat.category_id, countMap.get(cat.category_id) || 0);
    }
  },

  _applySidebarFilter(categoryId) {
    if (!categoryId) {
      this.refresh();
      return;
    }
    this._filterByParams({ category_id: categoryId });
  },

  // ---- 数据加载 ----

  async _loadData() {
    try {
      const [compData, cats] = await Promise.all([
        api.listComponents({ pageSize: 1000 }),
        api.listCategories(),
      ]);
      this.allComponents = compData.rows || [];
      this.allCategories = cats || [];
      this._categoryCounts = null;
      this._renderSidebarCategories();
      this._initFilterDropdowns();
      this._updateLowStockBadge();
      // 渲染表格
      ResultTable.renderList({ rows: this.allComponents, rowCount: this.allComponents.length });
      this.showStatus('', '');
    } catch (err) {
      this.showStatus(`加载失败: ${err.message}（请检查后端是否已启动）`, 'error');
    }
  },

  _updateLowStockBadge() {
    const count = this.allComponents.filter((c) => c.stock_qty != null && c.stock_qty < 50).length;
    document.getElementById('lowStockCount').textContent = count;
  },

  _initFilterDropdowns() {
    const catSelect = document.getElementById('filterCategory');
    const topCats = this.allCategories.filter((c) => !c.parent_id);
    catSelect.innerHTML += topCats.map((c) =>
      `<option value="${c.category_id}">${c.category_code} - ${c.category_name}</option>`
    ).join('');

    const fps = [...new Set(this.allComponents.map((r) => r.footprint_name).filter(Boolean))].sort();
    const fpSelect = document.getElementById('filterFootprint');
    fpSelect.innerHTML += fps.map((f) => `<option value="${f}">${f}</option>`).join('');
  },

  // ---- 按钮 ----

  _initButtons() {
    document.getElementById('btnRefresh').addEventListener('click', () => this._loadData());
    document.getElementById('btnAdd').addEventListener('click', () => FormModal.showCreate());
    document.getElementById('btnCategories').addEventListener('click', () => this._showCategories());
    document.getElementById('btnFilter').addEventListener('click', () => this._applyFilterBar());
    document.getElementById('btnFilterReset').addEventListener('click', () => this._resetFilters());
  },

  _applyFilterBar() {
    const params = {};
    const fp = document.getElementById('filterFootprint').value;
    const cat = document.getElementById('filterCategory').value;
    const mfg = document.getElementById('filterMfg').value.trim();
    const stockMin = document.getElementById('filterStockMin').value;
    const stockMax = document.getElementById('filterStockMax').value;

    if (fp) params.footprint_name = fp;
    if (cat) params.category_id = cat;
    if (mfg) params.manufacturer = mfg;
    if (stockMin) params.stock_min = stockMin;
    if (stockMax) params.stock_max = stockMax;
    this._filterByParams(params);
  },

  async _filterByParams(params) {
    try {
      const data = await api.listComponents(Object.assign(params, { pageSize: 100 }));
      ResultTable.renderList(data);
      this.showStatus(`筛选 · ${data.rowCount} 条`, 'success');
    } catch (err) { this.showStatus(err.message, 'error'); }
  },

  _resetFilters() {
    document.getElementById('filterFootprint').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterMfg').value = '';
    document.getElementById('filterStockMin').value = '';
    document.getElementById('filterStockMax').value = '';
    this._setActiveNav('all');
    this.refresh();
  },

  // ---- 弹窗 ----

  _initModals() {
    // 通用：点击遮罩关闭
    const bindOverlayClose = (overlayId, closeBtnId) => {
      document.getElementById(closeBtnId).addEventListener('click', () => this._hideModal(overlayId));
      document.getElementById(overlayId).addEventListener('click', (e) => {
        if (e.target.id === overlayId) this._hideModal(overlayId);
      });
    };
    bindOverlayClose('sqlOverlay', 'sqlClose');
    bindOverlayClose('categoryOverlay', 'categoryClose');

    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      if (!data.parent_id) data.parent_id = null;
      try {
        await api.createCategory(data);
        App.showStatus('分类添加成功', 'success');
        App._loadData(); // 重建侧边栏 + 刷新列表
        e.target.reset();
      } catch (err) { App.showStatus(err.message, 'error'); }
    });

    document.getElementById('confirmClose').addEventListener('click', () => this._hideModal('confirmOverlay'));
    document.getElementById('confirmCancel').addEventListener('click', () => this._hideModal('confirmOverlay'));
    document.getElementById('confirmOk').addEventListener('click', () => this._executeWrite());
  },

  _hideModal(id) { document.getElementById(id).classList.add('hidden'); },

  // ---- 写操作 ----

  _showConfirm(data) {
    this.pendingWrite = data;
    // 主内容：自然语言解释
    const desc = data.explanation || data.suggestion || 'AI 已生成数据库操作，请核实后确认执行';
    document.getElementById('confirmDesc').textContent = desc;
    // 副信息
    document.getElementById('confirmMeta').textContent =
      `操作类型: ${data.type} · AI 生成 · 请核实后确认`;
    // SQL 默认折叠
    document.getElementById('confirmSql').textContent = data.sql;
    document.getElementById('confirmSql').classList.add('hidden');
    const toggle = document.getElementById('confirmToggleSql');
    toggle.textContent = '查看 SQL ▸';
    toggle.onclick = (e) => {
      e.preventDefault();
      const sql = document.getElementById('confirmSql');
      if (sql.classList.contains('hidden')) {
        sql.classList.remove('hidden');
        toggle.textContent = '收起 SQL ▾';
      } else {
        sql.classList.add('hidden');
        toggle.textContent = '查看 SQL ▸';
      }
    };
    document.getElementById('confirmOverlay').classList.remove('hidden');
  },

  async _executeWrite() {
    if (!this.pendingWrite) return;
    try {
      const result = await api.executeQuery(this.pendingWrite.sql, this.pendingWrite.type);
      this._hideModal('confirmOverlay');
      this.showStatus(`✅ ${result.message}`, 'success');
      this.pendingWrite = null;
      this._loadData();
    } catch (err) { this.showStatus(err.message, 'error'); }
  },

  // ---- NL 查询 ----

  async handleQuery(text) {
    this._setLoading(true);
    this._hideSuggestion();
    try {
      const result = await api.nlQuery(text, this.searchMode);
      if (result.requiresConfirmation) { this._setLoading(false); this._showConfirm(result); return; }

      this._latestSql = result.sql;
      const srcLabel = { rule: '规则命中', cache: '缓存命中', llm: 'LLM', none: '无结果' }[result.source] || result.source;
      const isEmpty = result.rowCount === 0;

      this.showStatus(
        `<span class="status-source ${result.source || ''}">${srcLabel}</span> ${result.elapsed}ms · ${result.rowCount} 条` +
        ` · <a href="#" id="showSql">SQL</a>`,
        isEmpty ? '' : 'success'
      );

      // 带建议的空结果：明确声明 + 突出显示建议
      if (isEmpty && result.suggestion) {
        ResultTable._showEmpty('库里暂无匹配的物料');
        this._showSuggestion(result.suggestion, true);
      } else if (result.suggestion) {
        this._showSuggestion(result.suggestion, false);
      }

      if (!isEmpty) ResultTable.render(result);
    } catch (err) { this.showStatus(err.message, 'error'); }
    this._setLoading(false);
  },

  _setLoading(loading) {
    const btn = document.getElementById('btnQuery');
    const input = document.getElementById('nlInput');
    // 禁用所有操作按钮
    document.querySelectorAll('#btnQuery, #btnAdd, #btnRefresh, #btnFilter, #btnFilterReset, .hint-chip, .mode-option').forEach((el) => {
      if (loading) el.setAttribute('disabled', '');
      else el.removeAttribute('disabled');
    });
    // 搜索按钮动画
    if (loading) {
      btn.textContent = this.searchMode === 'smart' ? 'AI 思考中...' : '搜索中...';
      btn.style.opacity = '0.7';
      btn.style.pointerEvents = 'none';
      input.style.opacity = '0.6';
      this.showStatus(this.searchMode === 'smart'
        ? '<span class="loading-dot">AI 正在分析您的需求</span><span class="loading-dots"><span></span><span></span><span></span></span>'
        : '查询中...', '');
    } else {
      btn.textContent = this.searchMode === 'smart' ? 'AI 搜索' : '搜索';
      btn.style.opacity = '1';
      btn.style.pointerEvents = '';
      input.style.opacity = '1';
    }
  },

  _showSuggestion(text, prominent) {
    const box = document.getElementById('suggestionBox');
    document.getElementById('suggestionContent').textContent = text;
    const header = box.querySelector('.suggestion-header');
    header.textContent = prominent ? '库里暂无匹配物料 · AI 建议' : '💡 AI 建议';
    box.classList.remove('hidden');
    if (prominent) {
      box.classList.add('suggestion-prominent');
    } else {
      box.classList.remove('suggestion-prominent');
    }
  },

  _hideSuggestion() {
    document.getElementById('suggestionBox').classList.add('hidden');
  },

  refresh() {
    ResultTable.renderList({ rows: this.allComponents, rowCount: this.allComponents.length });
    this.showStatus('', '');
  },

  // CRUD
  async handleEdit(id) { FormModal.showEdit(id); },

  async handleDelete(id) {
    if (!confirm(`确定删除物料 #${id}？此操作不可撤销。`)) return;
    try {
      await api.deleteComponent(id);
      this.showStatus(`物料 #${id} 已删除`, 'success');
      this._loadData();
    } catch (err) { this.showStatus(err.message, 'error'); }
  },

  showStatus(msg, type) {
    const bar = document.getElementById('statusBar');
    bar.className = `status-bar ${type || ''}`;
    bar.innerHTML = msg || '';
  },

  _showSql(sql) {
    document.getElementById('sqlContent').textContent = sql;
    document.getElementById('sqlOverlay').classList.remove('hidden');
  },

  // 分类管理弹窗
  async _showCategories() {
    try {
      const cats = await api.listCategories();
      const list = document.getElementById('categoryList');
      list.innerHTML = cats.map((c) => {
        const indent = c.parent_id ? '└ ' : '';
        return `<div class="cat-row">${indent}<span class="code">${c.category_code}</span> ${c.category_name}</div>`;
      }).join('') || '<p>暂无分类</p>';

      const parentSelect = document.getElementById('categoryForm').querySelector('[name="parent_id"]');
      parentSelect.innerHTML = '<option value="">顶级分类</option>' +
        cats.map((c) => `<option value="${c.category_id}">${c.category_code} - ${c.category_name}</option>`).join('');

      document.getElementById('categoryOverlay').classList.remove('hidden');
    } catch (err) { App.showStatus('加载分类失败: ' + err.message, 'error'); }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
