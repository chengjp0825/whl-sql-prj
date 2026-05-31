# Frontend Spec

## 概述
单页应用（SPA），原生 JS 无框架。左侧边栏（导航+筛选），右侧内容区（搜索+表格+建议）。调用后端 API 实现全部功能。

## 布局

```
┌─ Topbar (sticky) ─────────────────────────────┐
│  Logo  │         │  分类管理 │ 刷新           │
├───────────┬────────────────────────────────────┤
│ Sidebar   │  Search Bar (快速/AI 切换 + 搜索)  │
│           │  Status Bar                       │
│  浏览      │  ┌─ Suggestion Box (AI建议) ────┐ │
│  全部物料  │  └──────────────────────────────┘ │
│  低库存    │  ┌─ Toolbar (标题 + 新增按钮) ───┐ │
│           │  └──────────────────────────────┘ │
│  分类树    │  ┌─ Result Table ────────────────┐ │
│  · 电阻   │  │  ...                          │ │
│  · 电容   │  └──────────────────────────────┘ │
│           │                                    │
│  筛选面板  │                                    │
│  封装/分类 │                                    │
│  制造商    │                                    │
│  库存范围  │                                    │
└───────────┴────────────────────────────────────┘
```

## 组件

| 组件 | 文件 | 职责 |
|------|------|------|
| QueryBox | `js/components/query-box.js` | 搜索输入 + 回车/点击触发 + 提示芯片 |
| ResultTable | `js/components/result-table.js` | 表格渲染（NL 结果 / CRUD 列表）+ 空状态 |
| FormModal | `js/components/form-modal.js` | 新增/编辑物料弹窗表单 |

## 核心状态 (App 对象)

| 字段 | 说明 |
|------|------|
| `searchMode` | `"fast"` / `"smart"` |
| `allComponents` | 全量物料缓存（侧边栏计数用） |
| `allCategories` | 全量分类缓存 |
| `pendingWrite` | 待确认的写操作 |
| `_latestSql` | 最近一次查询 SQL（SQL 弹窗用） |

## 交互流程

1. **页面加载**：`_loadData()` → Promise.all(物料+分类) → 渲染侧边栏 + 表格
2. **搜索**：`handleQuery()` → 禁用按钮 → API 调用 → 恢复
3. **写操作**：API 返回 `requiresConfirmation` → 弹窗预览 → 确认 → `/execute`
4. **侧边栏点击**：全部分类调用 `refresh()`，单个分类调 `_filterByParams()`
5. **筛选面板**：`_applyFilterBar()` → 组合参数调 API
6. **分类管理**：弹窗新增后 `_loadData()` 刷新侧边栏
