/**
 * 自然语言查询输入框组件
 */
const QueryBox = {
  init() {
    this.input = document.getElementById('nlInput');
    this.btn = document.getElementById('btnQuery');

    // 回车发送
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.submit();
      }
    });

    this.btn.addEventListener('click', () => this.submit());

    // 快捷示例
    document.querySelectorAll('.example-chip').forEach((chip) => {
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
