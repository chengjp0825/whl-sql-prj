const fs = require('fs');
const path = require('path');

const levels = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = levels[process.env.LOG_LEVEL] || levels.info;

const logDir = path.resolve(__dirname, '..', '..', 'logs');
fs.mkdirSync(logDir, { recursive: true });

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function todayFile(prefix) {
  const d = new Date();
  const name = prefix
    ? `${prefix}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.log`
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.log`;
  return path.join(logDir, name);
}

function writeFile(file, line) {
  try { fs.appendFileSync(file, line + '\n', 'utf-8'); } catch (_) {}
}

// ---- 通用日志 ----

function log(level, tag, msg, data) {
  if (levels[level] < currentLevel) return;
  const prefix = `[${ts()}] [${level.toUpperCase()}] [${tag}]`;
  const line = data !== undefined
    ? `${prefix} ${msg} ${typeof data === 'object' ? JSON.stringify(data) : data}`
    : `${prefix} ${msg}`;
  console.log(line);
  writeFile(todayFile(''), line);
}

// ---- AI 专用日志（独立文件） ----

function aiLog(level, msg) {
  const line = `[${ts()}] [${level.toUpperCase()}] ${msg}`;
  console.log(`\n${line}`);
  writeFile(todayFile('ai'), line);
}

module.exports = {
  debug: (tag, msg, data) => log('debug', tag, msg, data),
  info: (tag, msg, data) => log('info', tag, msg, data),
  warn: (tag, msg, data) => log('warn', tag, msg, data),
  error: (tag, msg, data) => log('error', tag, msg, data),

  // AI 日志
  aiRequest: (userInput, model, promptLen) =>
    aiLog('REQ', `用户: ${userInput}\n模型: ${model} | 上下文: ${promptLen} 字符`),

  aiResponse: (rawContent, durationMs) =>
    aiLog('RES', `耗时: ${durationMs}ms\n${rawContent}\n${'─'.repeat(40)}`),

  aiError: (userInput, errMsg) =>
    aiLog('ERR', `用户: ${userInput}\n错误: ${errMsg}`),
};
