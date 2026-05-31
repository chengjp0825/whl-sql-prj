/**
 * API 请求封装
 */
const API_BASE = 'http://localhost:3000/api';

const api = {
  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    const resp = await fetch(`${API_BASE}${path}`, opts);
    const data = await resp.json();

    if (!resp.ok) {
      throw new Error(data.error || `请求失败 (${resp.status})`);
    }
    return data;
  },

  // 自然语言查询（三层引擎）
  nlQuery(question) {
    return api.request('POST', '/query', { question });
  },

  // 执行已确认的 SQL
  executeQuery(sql, type) {
    return api.request('POST', '/query/execute', { sql, type });
  },

  // 物料 CRUD
  listComponents(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return api.request('GET', `/components?${qs}`);
  },

  getComponent(id) {
    return api.request('GET', `/components/${id}`);
  },

  createComponent(data) {
    return api.request('POST', '/components', data);
  },

  updateComponent(id, data) {
    return api.request('PUT', `/components/${id}`, data);
  },

  deleteComponent(id) {
    return api.request('DELETE', `/components/${id}`);
  },

  // 分类
  listCategories(format) {
    const qs = format ? `?format=${format}` : '';
    return api.request('GET', `/categories${qs}`);
  },

  createCategory(data) {
    return api.request('POST', '/categories', data);
  },
};
