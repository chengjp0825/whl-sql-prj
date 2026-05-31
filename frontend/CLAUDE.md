# Frontend — PCB 元器件库 UI

## 技术栈
- 原生 HTML/CSS/JS（零框架，零构建工具）
- `http-server` 做本地静态服务（端口 3001）
- 通过 fetch + CORS 调用后端 `localhost:3000/api/*`

## 项目约定

### 文件组织
- `index.html`：全部页面骨架（侧边栏 + 内容区 + 弹窗），不要拆成多个 HTML
- `css/style.css`：全局样式，CSS 变量统一管理颜色和间距
- `js/api.js`：API 封装层，所有 fetch 调用统一走 `api.request()`
- `js/app.js`：主应用逻辑（状态管理 / 事件绑定 / 侧边栏 / 模式切换）
- `js/components/`：独立 UI 组件（query-box / result-table / form-modal）

### 组件规范
- 每个组件暴露 `{ init(), 方法... }` 对象
- 组件之间通过 `App` 全局对象通信，不直接互相引用
- DOM 操作集中在组件内部，不跨组件操作 DOM

### 样式规范
- 颜色和间距全部通过 CSS 变量（`:root` 中定义）
- 用 `.btn` / `.btn-primary` / `.btn-outline` / `.btn-sm` 组合按钮样式
- 新弹窗用 `.modal-overlay > .modal` 模式，`hidden` 类控制显隐
- 状态标签用 `.status-source.rule|.cache|.llm`

### API 调用
- 所有后端请求走 `api.xxx()` 方法，不要在组件中直接 `fetch`
- 新增 API 方法时同步更新 `api.js`
- 错误统一在 App 层 `showStatus()` 显示

### 交互约定
- 搜索期间禁用所有按钮（`_setLoading(true)`）
- 写操作需弹窗确认后才调用 `/api/query/execute`
- 状态栏显示查询来源（规则/缓存/LLM）+ 耗时
- AI 建议通过 `#suggestionBox` 显示，空结果时用醒目的橙色样式

## 命令
```bash
npm install    # 安装 http-server
npm start      # 启动开发服务器 :3001
```
