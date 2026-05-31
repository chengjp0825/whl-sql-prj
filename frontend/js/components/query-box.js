/**
 * 搜索栏组件
 */
const QueryBox = {
  init() {
    this.input = document.getElementById('nlInput');
    this.btn = document.getElementById('btnQuery');

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submit();
      }
    });

    this.btn.addEventListener('click', () => this.submit());

    // 提示芯片
    document.querySelectorAll('.hint-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        this.input.value = chip.dataset.text;
        this.submit();
      });
    });
  },

  submit() {
    const text = this.input.value.trim();
    if (!text) return;
    App.handleQuery(text);
  },
};
