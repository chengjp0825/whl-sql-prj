/**
 * 物料新增/编辑弹窗组件
 */
const FormModal = {
  init() {
    this.overlay = document.getElementById('modalOverlay');
    this.title = document.getElementById('modalTitle');
    this.form = document.getElementById('componentForm');
    this.editId = null;

    // 按钮事件
    document.getElementById('modalClose').addEventListener('click', () => this.hide());
    document.getElementById('modalCancel').addEventListener('click', () => this.hide());
    document.getElementById('modalSubmit').addEventListener('click', () => this.submit());

    // 点击遮罩关闭
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    // 分类下拉加载
    this.loadCategories();
  },

  async loadCategories() {
    try {
      const cats = await api.listCategories();
      const select = this.form.querySelector('[name="category_id"]');
      select.innerHTML = '<option value="">请选择分类</option>';
      cats.forEach((c) => {
        select.innerHTML += `<option value="${c.category_id}">${c.category_code} - ${c.category_name}</option>`;
      });
    } catch (_) { /* 忽略分类加载失败 */ }
  },

  /** 新增模式 */
  showCreate() {
    this.editId = null;
    this.title.textContent = '新增物料';
    this.form.reset();
    this.form.querySelector('[name="internal_pn"]').disabled = false;
    this.overlay.classList.remove('hidden');
  },

  /** 编辑模式 */
  async showEdit(componentId) {
    try {
      const comp = await api.getComponent(componentId);
      this.editId = componentId;
      this.title.textContent = `编辑物料 #${componentId}`;
      this.form.querySelector('[name="internal_pn"]').disabled = true;

      const fields = [
        'internal_pn', 'category_id', 'description', 'footprint_name',
        'symbol_name', 'manufacturer', 'manufacturer_pn', 'supplier',
        'supplier_pn', 'unit_price', 'stock_qty', 'remark',
      ];
      fields.forEach((f) => {
        const el = this.form.querySelector(`[name="${f}"]`);
        if (el && comp[f] != null) {
          el.value = f === 'spec_json' && typeof comp[f] === 'object'
            ? JSON.stringify(comp[f]) : comp[f];
        }
      });

      this.overlay.classList.remove('hidden');
    } catch (err) {
      App.showStatus(err.message, 'error');
    }
  },

  hide() {
    this.overlay.classList.add('hidden');
    this.editId = null;
  },

  async submit() {
    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData.entries());

    // 清理空值
    Object.keys(data).forEach((k) => { if (data[k] === '') data[k] = null; });

    // 处理 spec_json
    if (data.spec_json) {
      try { data.spec_json = JSON.parse(data.spec_json); } catch (_) {}
    }
    if (data.unit_price) data.unit_price = parseFloat(data.unit_price);
    if (data.stock_qty) data.stock_qty = parseInt(data.stock_qty, 10);

    try {
      if (this.editId) {
        await api.updateComponent(this.editId, data);
        App.showStatus('物料更新成功', 'success');
      } else {
        if (!data.internal_pn) { App.showStatus('内部料号必填', 'error'); return; }
        await api.createComponent(data);
        App.showStatus('物料新增成功', 'success');
      }
      this.hide();
      App.refresh();
    } catch (err) {
      App.showStatus(err.message, 'error');
    }
  },
};
