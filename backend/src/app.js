require('dotenv').config();

const express = require('express');
const cors = require('cors');
const config = require('./config');
const errorHandler = require('./middleware/error-handler');
const { close } = require('./db/connection');

const queryRouter = require('./routes/query');
const componentsRouter = require('./routes/components');
const categoriesRouter = require('./routes/categories');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/query', queryRouter);
app.use('/api/components', componentsRouter);
app.use('/api/categories', categoriesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', provider: config.llm.provider, model: config.llm.model });
});

app.use(errorHandler);

const server = app.listen(config.server.port, () => {
  console.log(`PCB BOM 后端服务已启动: http://localhost:${config.server.port}`);
  console.log(`LLM 提供商: ${config.llm.provider} / ${config.llm.model}`);
  console.log(`数据库文件: ${config.db.path}`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭...');
  close();
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  close();
  server.close(() => process.exit(0));
});

module.exports = app;
