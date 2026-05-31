const { getDb, saveToDisk, close } = require('./connection');

async function seed() {
  const db = await getDb();

  // 检查已有数据
  let count = db.exec("SELECT COUNT(*) AS c FROM component_category");
  if (count[0].values[0][0] > 0) {
    console.log('已有数据，跳过种子插入');
    close();
    return;
  }

  // 分类
  db.run("INSERT INTO component_category (category_code, category_name, sort_order) VALUES ('RES', '电阻', 1)");
  db.run("INSERT INTO component_category (category_code, category_name, sort_order) VALUES ('CAP', '电容', 2)");
  db.run("INSERT INTO component_category (category_code, category_name, sort_order) VALUES ('IC', '集成电路', 3)");
  db.run("INSERT INTO component_category (category_code, category_name, sort_order) VALUES ('CONN', '连接器', 4)");
  db.run("INSERT INTO component_category (parent_id, category_code, category_name, sort_order) VALUES (1, 'RES-SMD', '贴片电阻', 1)");
  db.run("INSERT INTO component_category (parent_id, category_code, category_name, sort_order) VALUES (1, 'RES-TH', '插件电阻', 2)");
  db.run("INSERT INTO component_category (parent_id, category_code, category_name, sort_order) VALUES (2, 'CAP-SMD', '贴片电容', 1)");

  // 元器件
  db.run(
    "INSERT INTO component_library (internal_pn, category_id, description, footprint_name, manufacturer, manufacturer_pn, spec_json, unit_price, stock_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['RES-0805-10K-5%', 5, '贴片电阻 10KΩ ±5% 1/8W', '0805_L', 'Yageo', 'RC0805FR-0710KL',
     '{"resistance":"10KΩ","tolerance":"±5%","power":"1/8W"}', 0.012, 500]
  );
  db.run(
    "INSERT INTO component_library (internal_pn, category_id, description, footprint_name, manufacturer, manufacturer_pn, spec_json, unit_price, stock_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['RES-0603-1K-1%', 5, '贴片电阻 1KΩ ±1% 1/10W', '0603_C', 'Samsung', 'RC1608F1001CS',
     '{"resistance":"1KΩ","tolerance":"±1%","power":"1/10W"}', 0.008, 30]
  );
  db.run(
    "INSERT INTO component_library (internal_pn, category_id, description, footprint_name, manufacturer, manufacturer_pn, spec_json, unit_price, stock_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['CAP-0603-100nF-10%', 7, '贴片电容 100nF ±10% 16V', '0603_C', 'Murata', 'GRM188R71C104KA01',
     '{"capacitance":"100nF","tolerance":"±10%","voltage":"16V"}', 0.025, 800]
  );
  db.run(
    "INSERT INTO component_library (internal_pn, category_id, description, footprint_name, manufacturer, manufacturer_pn, spec_json, unit_price, stock_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ['IC-STM32F103-001', 3, 'ARM Cortex-M3 MCU', 'LQFP-48', 'STMicroelectronics', 'STM32F103C8T6',
     '{"core":"Cortex-M3","flash":"64KB","frequency":"72MHz"}', 2.50, 150]
  );

  saveToDisk();

  const cats = db.exec("SELECT COUNT(*) AS c FROM component_category");
  const comps = db.exec("SELECT COUNT(*) AS c FROM component_library");

  console.log(`种子数据插入完成: ${cats[0].values[0][0]} 个分类, ${comps[0].values[0][0]} 个物料`);

  close();
}

seed().catch(e => { console.error('种子插入失败:', e.message); close(); process.exit(1); });
