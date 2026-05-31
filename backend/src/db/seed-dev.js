const { getDb, saveToDisk, close } = require('./connection');

async function seed() {
  const db = await getDb();

  // 幂等：已有数据则跳过
  let count = db.exec("SELECT COUNT(*) AS c FROM component_category");
  if (count[0].values[0][0] > 0) {
    console.log('已有数据，跳过种子插入');
    close();
    return;
  }

  // ========== 分类（一级 + 二级，共 13 个） ==========
  const cats = [
    // 一级分类
    [null, 'RES',    '电阻',     1],
    [null, 'CAP',    '电容',     2],
    [null, 'IC',     '集成电路', 3],
    [null, 'CONN',   '连接器',   4],
    [null, 'DIO',    '二极管',   5],
    [null, 'IND',    '电感/磁珠',6],
    [null, 'CRY',    '晶振',     7],
    // 二级分类
    [1,    'RES-SMD','贴片电阻', 1],
    [1,    'RES-TH', '插件电阻', 2],
    [2,    'CAP-SMD','贴片电容', 1],
    [2,    'CAP-ELEC','电解电容',2],
    [3,    'IC-MCU', 'MCU/MPU',  1],
    [3,    'IC-PWR', '电源管理', 2],
  ];

  for (const c of cats) {
    db.run("INSERT INTO component_category (parent_id, category_code, category_name, sort_order) VALUES (?, ?, ?, ?)", c);
  }

  // ========== 元器件（25 条） ==========
  const now = new Date().toISOString().substring(0, 10);
  const sql = `INSERT INTO component_library
    (internal_pn, category_id, description, footprint_name, manufacturer, manufacturer_pn,
     spec_json, unit_price, currency, price_date, stock_qty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CNY', ?, ?)`;

  const parts = [
    // ---- 贴片电阻 (5) ----
    ['RES-0805-10K-5%',    8, '贴片电阻 10KΩ ±5% 1/8W',           '0805_L',   'Yageo',     'RC0805FR-0710KL',  '{"resistance":"10KΩ","tolerance":"±5%","power":"1/8W"}',              0.012, now, 500],
    ['RES-0603-1K-1%',     8, '贴片电阻 1KΩ ±1% 1/10W',           '0603_C',   'Samsung',   'RC1608F1001CS',    '{"resistance":"1KΩ","tolerance":"±1%","power":"1/10W"}',              0.008, now, 30],
    ['RES-0402-100R-5%',   8, '贴片电阻 100Ω ±5% 1/16W',          '0402_A',   'Yageo',     'RC0402JR-07100RL', '{"resistance":"100Ω","tolerance":"±5%","power":"1/16W"}',             0.005, now, 2000],
    ['RES-1206-4K7-1%',    8, '贴片电阻 4.7KΩ ±1% 1/4W',          '1206',     'Panasonic', 'ERJ-8ENF4701V',    '{"resistance":"4.7KΩ","tolerance":"±1%","power":"1/4W"}',             0.035, now, 300],
    ['RES-0805-0R-5%',     8, '贴片电阻 0Ω ±5% 跳线',             '0805_L',   'Yageo',     'RC0805JR-070RL',   '{"resistance":"0Ω","tolerance":"±5%","type":"jumper"}',              0.006, now, 1000],

    // ---- 贴片电容 (4) ----
    ['CAP-0603-100nF-10%', 10,'贴片电容 100nF ±10% 16V X7R',       '0603_C',   'Murata',    'GRM188R71C104KA01','{"capacitance":"100nF","tolerance":"±10%","voltage":"16V","dielectric":"X7R"}',0.025,now,800],
    ['CAP-0805-10uF-10%',  10,'贴片电容 10µF ±10% 25V X5R',        '0805_L',   'TDK',       'C2012X5R1E106K',  '{"capacitance":"10µF","tolerance":"±10%","voltage":"25V","dielectric":"X5R"}', 0.08,now,400],
    ['CAP-1206-22uF-20%',  10,'贴片电容 22µF ±20% 16V X7R',        '1206',     'Samsung',   'CL31B226KPHNNNE', '{"capacitance":"22µF","tolerance":"±20%","voltage":"16V","dielectric":"X7R"}', 0.15,now,250],
    ['CAP-0603-1uF-10%',   10,'贴片电容 1µF ±10% 10V X5R',         '0603_C',   'Murata',    'GRM188R61A105KA61','{"capacitance":"1µF","tolerance":"±10%","voltage":"10V","dielectric":"X5R"}',  0.03,now,600],

    // ---- 电解电容 (2) ----
    ['CAP-ELEC-100uF-20%', 11,'铝电解电容 100µF ±20% 25V',          'D6.3xH7.7','Panasonic', 'EEE-FK1E101P',     '{"capacitance":"100µF","tolerance":"±20%","voltage":"25V","type":"电解"}',   0.12,now,180],
    ['CAP-ELEC-470uF-20%', 11,'铝电解电容 470µF ±20% 16V',          'D8xH10',   'Nichicon',  'UHE1C471MPD',      '{"capacitance":"470µF","tolerance":"±20%","voltage":"16V","type":"电解"}',   0.22,now,90],

    // ---- MCU (2) ----
    ['IC-STM32F103-001',   12,'ARM Cortex-M3 MCU 64KB Flash LQFP-48','LQFP-48',  'STMicroelectronics','STM32F103C8T6','{"core":"Cortex-M3","flash":"64KB","sram":"20KB","freq":"72MHz","pkg":"LQFP-48"}',2.50,now,150],
    ['IC-ESP32-WROOM',     12,'ESP32-WROOM-32E WiFi+BLE MCU',        'SMD-38',   'Espressif', 'ESP32-WROOM-32E',  '{"core":"Xtensa LX6","flash":"4MB","sram":"520KB","wifi":"y","ble":"4.2"}',14.0,now,80],

    // ---- 电源管理 (3) ----
    ['IC-LDO-3V3-SOT23',   13,'LDO 3.3V 500mA SOT-23-5',            'SOT-23-5', 'TI',        'TPS7A0533PDBVR',  '{"type":"LDO","vout":"3.3V","iout":"500mA","dropout":"200mV","pkg":"SOT-23-5"}',0.45,now,320],
    ['IC-LDO-1V8-SOT23',   13,'LDO 1.8V 300mA SOT-23-5',            'SOT-23-5', 'TI',        'TPS79318DBVR',     '{"type":"LDO","vout":"1.8V","iout":"300mA","dropout":"150mV","pkg":"SOT-23-5"}',0.32,now,260],
    ['IC-DCDC-5V-SOIC8',   13,'DC-DC降压 5V 3A SOIC-8',             'SOIC-8',   'TI',        'TPS54331DR',       '{"type":"DC-DC","vout":"5V","iout":"3A","vin":"3.5~28V","freq":"570kHz","pkg":"SOIC-8"}',1.20,now,110],

    // ---- 其他 IC (3) ----
    ['IC-OPAMP-SOT23-5',   3, '双路运放 10MHz SOT-23-5',            'SOT-23-5', 'TI',        'OPA2376AIDBVR',    '{"type":"OpAmp","ch":"2","gbw":"10MHz","vos":"25µV","pkg":"SOT-23-5"}',0.85,now,200],
    ['IC-FLASH-SOIC8',     3, 'SPI NOR Flash 16Mbit SOIC-8',         'SOIC-8',   'Winbond',   'W25Q16JVSNIQ',     '{"type":"Flash","size":"16Mbit","iface":"SPI","vdd":"3.3V","pkg":"SOIC-8"}',0.55,now,350],
    ['IC-LEVEL-TSSOP14',   3, '4通道电平转换 1.8~5.5V TSSOP-14',     'TSSOP-14', 'TI',        'TXB0104PWR',       '{"type":"LevelShifter","ch":"4","va":"1.2~3.6V","vb":"1.65~5.5V","pkg":"TSSOP-14"}',0.68,now,140],

    // ---- 二极管 (3) ----
    ['DIO-TVS-5V-SOD123',  5, 'TVS二极管 5V 200W SOD-123',           'SOD-123',  'Nexperia',  'PESD5V0S1BA',      '{"type":"TVS","vbr":"5.8V","vc":"12V","ppp":"200W","pkg":"SOD-123"}', 0.09,now,500],
    ['DIO-SCHOTTKY-40V',   5, '肖特基二极管 40V 1A SOD-123',          'SOD-123',  'Nexperia',  'PMEG4010EH',       '{"type":"Schottky","vr":"40V","if":"1A","vf":"0.43V","pkg":"SOD-123"}',0.07,now,700],
    ['DIO-LED-RED-0603',   5, '红色LED 0603 20mA',                    '0603_LED', 'Wurth',     '150060RS75000',    '{"type":"LED","color":"Red","wl":"625nm","if":"20mA","vf":"2.0V","pkg":"0603"}',0.15,now,1000],

    // ---- 电感/磁珠 (2) ----
    ['IND-BEAD-0603-600R', 6, '铁氧体磁珠 600Ω@100MHz 1.5A 0603',    '0603_C',   'TDK',       'MMZ1608Y601B',     '{"type":"Bead","z":"600Ω@100MHz","idc":"1.5A","dcr":"0.1Ω","pkg":"0603"}',0.035,now,900],
    ['IND-PWR-4R7-4x4',    6, '功率电感 4.7µH 3.5A 4x4mm SMD',       'L4x4',     'Wurth',     '74437324047',      '{"type":"Power","l":"4.7µH","idc":"3.5A","dcr":"35mΩ","pkg":"4x4mm"}',0.28,now,220],

    // ---- 晶振 (2) ----
    ['CRY-8M-3225',        7, '晶振 8MHz ±10ppm 3225 SMD',           '3225',     'Abracon',   'ABM8-8.000MHZ-B2-T','{"type":"Crystal","freq":"8MHz","tol":"±10ppm","cl":"18pF","pkg":"3225"}',0.42,now,180],
    ['CRY-32K-3215',       7, '晶振 32.768kHz ±20ppm 3215 SMD',      '3215',     'Abracon',   'ABS07-32.768KHZ-T','{"type":"Crystal","freq":"32.768kHz","tol":"±20ppm","cl":"12.5pF","pkg":"3215"}',0.35,now,250],

    // ---- 连接器 (1) ----
    ['CONN-HEADER-2x5',    4, '排针 2x5P 2.54mm 直插',               'HDR-2x5',  'Molex',     '22-28-4100',       '{"type":"PinHeader","pins":10,"pitch":"2.54mm","dir":"Straight"}',0.18,now,400],
  ];

  for (const p of parts) {
    db.run(sql, p);
  }

  saveToDisk();

  const catsC = db.exec("SELECT COUNT(*) AS c FROM component_category");
  const compsC = db.exec("SELECT COUNT(*) AS c FROM component_library");

  console.log(`种子数据完成: ${catsC[0].values[0][0]} 分类, ${compsC[0].values[0][0]} 物料`);
  close();
}

seed().catch(e => { console.error('种子插入失败:', e.message); close(); process.exit(1); });
