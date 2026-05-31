const config = require('../config');

/**
 * 根据 LLM_PROVIDER 环境变量返回对应的 LLM 实例
 * 上层代码只依赖 interface.js 定义的方法签名
 */
function create() {
  const provider = config.llm.provider;

  switch (provider) {
    case 'claude':
      return require('./claude');
    case 'openai':
      return require('./openai');
    case 'deepseek':
      return require('./deepseek');
    default:
      throw new Error(`不支持的 LLM 提供商: ${provider}，可选值: claude | openai | deepseek`);
  }
}

module.exports = { create };
