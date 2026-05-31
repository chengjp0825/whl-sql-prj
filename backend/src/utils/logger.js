/**
 * 简单日志工具
 */

const levels = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = levels[process.env.LOG_LEVEL] || levels.info;

function ts() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function log(level, tag, msg, data) {
  if (levels[level] < currentLevel) return;
  const line = `[${ts()}] [${level.toUpperCase()}] [${tag}] ${msg}`;
  if (data !== undefined) {
    console.log(line, typeof data === 'object' ? JSON.stringify(data) : data);
  } else {
    console.log(line);
  }
}

module.exports = {
  debug: (tag, msg, data) => log('debug', tag, msg, data),
  info: (tag, msg, data) => log('info', tag, msg, data),
  warn: (tag, msg, data) => log('warn', tag, msg, data),
  error: (tag, msg, data) => log('error', tag, msg, data),
};
