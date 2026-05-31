const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const config = require('../config');

const dbPath = path.resolve(__dirname, '..', '..', config.db.path);
const dbDir = path.dirname(dbPath);

let db = null;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  fs.mkdirSync(dbDir, { recursive: true });

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  return db;
}

/** 执行 SELECT，返回 { columns, rows } */
async function query(sql, params = []) {
  const d = await getDb();
  const stmt = d.prepare(sql);
  if (params.length) stmt.bind(params);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  const columns = stmt.getColumnNames();
  stmt.free();
  return { columns, rows, rowCount: rows.length };
}

/** 执行非 SELECT 语句，返回 changes 数 */
async function run(sql, params = []) {
  const d = await getDb();
  d.run(sql, params);
  const changes = d.getRowsModified();
  return { changes };
}

/** 获取最后插入的 rowid */
function lastInsertRowId() {
  if (!db) return 0;
  const result = db.exec('SELECT last_insert_rowid() AS id');
  return result[0]?.values[0]?.[0] || 0;
}

function saveToDisk() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function close() {
  if (!db) return;
  saveToDisk();
  db.close();
  db = null;
}

module.exports = { getDb, query, run, lastInsertRowId, saveToDisk, close };
