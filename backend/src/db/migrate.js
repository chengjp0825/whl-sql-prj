const fs = require('fs');
const path = require('path');
const { getDb, close } = require('./connection');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('正在执行数据库迁移...');

  try {
    const db = await getDb();
    db.run(sql);
    const data = db.export();
    const dbPath = path.resolve(__dirname, '..', '..', './data/pcb_bom.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, Buffer.from(data));
    console.log('数据库迁移完成');
  } catch (err) {
    console.error('数据库迁移失败:', err.message);
    process.exit(1);
  } finally {
    close();
  }
}

migrate();
