require('dotenv').config();

module.exports = {
  db: {
    path: process.env.DB_PATH || './data/pcb_bom.db',
  },
  llm: {
    provider: process.env.LLM_PROVIDER || 'claude',
    model: process.env.LLM_MODEL || 'claude-sonnet-4-6',
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    },
  },
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
  },
};
