const fs = require('fs');
const path = require('path');

const levels = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = levels[process.env.LOG_LEVEL] || levels.info;

// 日志文件：backend/logs/YYYY-MM-DD.log
const logDir = path.resolve(__dirname, '..', '..', 'logs');
fs.mkdirSync(logDir, { recursive: true });

function todayLogFile() {
  const d = new Date();
  return path.join(logDir, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.log`);
}

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function log(level, tag, msg, data) {
  if (levels[level] < currentLevel) return;

  const prefix = `[${ts()}] [${level.toUpperCase()}] [${tag}]`;
  const line = data !== undefined
    ? `${prefix} ${msg} ${typeof data === 'object' ? JSON.stringify(data) : data}`
    : `${prefix} ${msg}`;

  // 终端输出
  console.log(line);

  // 写入本地文件
  try {
    fs.appendFileSync(todayLogFile(), line + '\n', 'utf-8');
  } catch (_) { /* 写文件失败不影响运行 */ }
}

module.exports = {
  debug: (tag, msg, data) => log('debug', tag, msg, data),
  info: (tag, msg, data) => log('info', tag, msg, data),
  warn: (tag, msg, data) => log('warn', tag, msg, data),
  error: (tag, msg, data) => log('error', tag, msg, data),
};
