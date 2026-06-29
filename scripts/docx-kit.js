/**
 * docx-kit.js — 学术课程设计报告 .docx 生成助手
 *
 * 封装 docx npm 包，提供符合中文学术论文排版规范的高级 API。
 *
 * 排版规范：
 *   - 正文: 宋体 + Times New Roman, 小四 (12pt), 单倍行距, 首行缩进 2 字符
 *   - 一级标题: 四号 (14pt) 加粗
 *   - 二级标题: 四号 (14pt) 不加粗
 *   - 三级标题: 小四 (12pt) 加粗
 *   - 代码: Consolas 五号 (10pt), 灰底
 *   - 表格: 三线表 (顶/底线粗 1.5pt, 表头下线细 0.75pt), 五号 (10pt)
 *   - 参考文献: 五号, 悬挂缩进
 *   - 图片: 最大宽度 460px, 居中
 */

import {
  Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType,
  PageBreak, ImageRun, TableLayoutType, SectionType,
} from 'docx';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIGURES_DIR = join(__dirname, 'diagrams');

// ========================
// 字体 / 字号常量 (单位: 半磅 half-points)
// ========================

export const FONT_OBJ = {
  body: '宋体',
  bodyWest: 'Times New Roman',
  code: 'Consolas',
  heading: '宋体',
  headingWest: 'Times New Roman',
};

export const SIZE_BODY  = 24;   // 小四 = 12pt
export const SIZE_HEAD  = 28;   // 四号 = 14pt
export const SIZE_TABLE = 20;   // 五号 = 10pt (实际用 21 半磅 = 10.5pt)
export const SIZE_CODE  = 20;   // 五号 = 10pt

// 单倍行距 (twips)
const LINE_SPACING = 276;       // 12pt * 20 twips/pt ≈ 240, 加一点余量
const HEAD_LINE_SPACING = 312;  // 标题行距稍大

// 首行缩进 2 字符 (12pt * 2 * 20 = 480 twips)
const FIRST_LINE_INDENT = 480;

// A4 页边距 (twips): 上下 2.54cm, 左右 3.17cm
// 1cm = 567 twips
const MARGIN_TOP    = 1440; // 2.54 * 567 ≈ 1440
const MARGIN_BOTTOM = 1440;
const MARGIN_LEFT   = 1800; // 3.17 * 567 ≈ 1797 → round to 1800
const MARGIN_RIGHT  = 1800;

// 图片最大尺寸 (EMU @96dpi), 宽高双约束确保不溢出 A4 版心
// A4 可用宽度 ≈ 5,274,310 EMU (8306 twips), 可用高度 ≈ 8,863,330 EMU (13958 twips)
const MAX_IMAGE_WIDTH_EMU = 3429000;   // 360px, 约占版心 65%
const MAX_IMAGE_HEIGHT_EMU = 7000000;  // ~7.66 inch, 留足图标题空间

// ========================
// 内部 helper
// ========================

/**
 * 创建 TextRun (带字体配置)
 */
export function run(text, options = {}) {
  const {
    bold = false,
    italics = false,
    size = SIZE_BODY,
    fontName = null,
    fontNameWest = null,
    color = null,
    code = false,
    heading = false,
    highlight = false,
  } = options;

  return new TextRun({
    text: String(text),
    bold,
    italics,
    size: code ? SIZE_CODE : (heading ? size : size),
    font: {
      name: code ? 'Consolas' : (fontName || (heading ? FONT_OBJ.heading : FONT_OBJ.body)),
      nameAscii: code ? 'Consolas' : (fontNameWest || FONT_OBJ.bodyWest),
      nameHAnsi: code ? 'Consolas' : (fontName || (heading ? FONT_OBJ.heading : FONT_OBJ.body)),
    },
    color: color || (highlight ? '1a56db' : (heading ? '000000' : undefined)),
  });
}

/**
 * 创建居中 TextRun (图/表标题用)
 */
function captionRun(text, bold = false) {
  return new TextRun({
    text: String(text),
    bold,
    size: SIZE_TABLE,
    font: { name: FONT_OBJ.body, nameAscii: FONT_OBJ.bodyWest, nameHAnsi: FONT_OBJ.body },
  });
}

// ========================
// 公开 API
// ========================

/** 正文段落 (首行缩进 2 字符, 两端对齐) */
export function P(text, options = {}) {
  const { bold = false, indent = true, alignment = AlignmentType.JUSTIFIED } = options;
  return new Paragraph({
    children: [run(text, { bold })],
    spacing: { line: LINE_SPACING },
    indent: indent ? { firstLine: FIRST_LINE_INDENT } : undefined,
    alignment,
  });
}

/** 混合格式段落 (传入 TextRun 数组) */
export function PR(runs, options = {}) {
  const { indent = true, alignment = AlignmentType.JUSTIFIED } = options;
  return new Paragraph({
    children: Array.isArray(runs) ? runs : [runs],
    spacing: { line: LINE_SPACING },
    indent: indent ? { firstLine: FIRST_LINE_INDENT } : undefined,
    alignment,
  });
}

/** 一级标题 (四号加粗) */
export function H1(text) {
  return new Paragraph({
    children: [run(text, { bold: true, size: SIZE_HEAD, heading: true })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 240, line: HEAD_LINE_SPACING },
  });
}

/** 二级标题 (四号不加粗) */
export function H2(text) {
  return new Paragraph({
    children: [run(text, { bold: true, size: SIZE_HEAD, heading: true })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 160, line: HEAD_LINE_SPACING },
  });
}

/** 三级标题 (小四加粗) */
export function H3(text) {
  return new Paragraph({
    children: [run(text, { bold: true, size: SIZE_BODY, heading: true })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 160, after: 120, line: LINE_SPACING },
  });
}

/** 代码块 (Consolas 五号, 左对齐, 不缩进, 无背景色) */
export function CODE(text) {
  return new Paragraph({
    children: [run(text, { code: true, size: SIZE_CODE })],
    spacing: { line: 240 },
    indent: { firstLine: 0, left: 240 },
    alignment: AlignmentType.LEFT,
  });
}

/** 三线表 */
export function TABLE(headers, rows, colWidths = null) {
  const colCount = headers.length;
  const widthPercent = colWidths || headers.map(() => Math.floor(100 / colCount));

  // 表头行: 顶粗线 + 下细线
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      children: [new Paragraph({
        children: [captionRun(h, true)],
        alignment: AlignmentType.CENTER,
        spacing: { line: 240 },
      })],
      width: { size: widthPercent[i], type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 12, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
      },
      verticalAlign: 'center',
    })),
  });

  // 数据行
  const dataRows = rows.map((row, rowIdx) => {
    const isLast = rowIdx === rows.length - 1;
    return new TableRow({
      children: row.map((cell, colIdx) => new TableCell({
        children: [new Paragraph({
          children: [captionRun(String(cell))],
          alignment: AlignmentType.LEFT,
          spacing: { line: 240 },
        })],
        width: { size: widthPercent[colIdx], type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: isLast
            ? { style: BorderStyle.SINGLE, size: 12, color: '000000' }
            : { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
      })),
    });
  });

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  });
}

/** 表标题 (居中, 五号, "表X 标题" 格式) */
export function TAB_CAPTION(text) {
  return new Paragraph({
    children: [captionRun(text, true)],
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 80, line: 240 },
  });
}

/** 图标题 (居中, 五号, "图X 标题" 格式) */
export function FIG_CAPTION(text) {
  return new Paragraph({
    children: [captionRun(text, false)],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 160, line: 240 },
  });
}

/** 从 PNG buffer 读取实际像素尺寸 */
function getPngDimensions(buffer) {
  // PNG IHDR: bytes 16-19 = width (big-endian), 20-23 = height (big-endian)
  if (buffer.length < 24 || buffer[0] !== 0x89 || buffer[1] !== 0x50) return null;
  const w = buffer.readUInt32BE(16);
  const h = buffer.readUInt32BE(20);
  return { width: w, height: h };
}

/** 插入图片 (从 scripts/diagrams/ 读取, 自动保持宽高比) */
export function IMG(filename) {
  const imgPath = join(FIGURES_DIR, filename);
  if (!existsSync(imgPath)) {
    return P(`[图片缺失: ${filename}]`, { indent: false, alignment: AlignmentType.CENTER });
  }
  const imgBuffer = readFileSync(imgPath);
  const dims = getPngDimensions(imgBuffer);

  // 像素 → EMU: 1px = 9525 EMU (@96dpi)
  // 限制最大宽 300px, 高按比例缩放
  let wEmu = MAX_IMAGE_WIDTH_EMU;
  let hEmu = Math.round(MAX_IMAGE_WIDTH_EMU * 0.6);
  if (dims && dims.width > 0) {
    const ratio = dims.height / dims.width;
    const pxW = Math.min(dims.width, 300);
    wEmu = pxW * 9525;
    hEmu = Math.round(wEmu * ratio);
  }

  return new Paragraph({
    children: [
      new ImageRun({
        type: 'png',
        data: imgBuffer,
        transformation: { width: wEmu, height: hEmu },
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 40 },
  });
}

/** 参考文献条目 (五号, 悬挂缩进) */
export function REF(text) {
  return new Paragraph({
    children: [run(text, { size: SIZE_TABLE })],
    spacing: { line: 240 },
    indent: { left: 480, hanging: 480 },
  });
}

/** 参考文献标题 */
export function REF_HEADING() {
  return new Paragraph({
    children: [run('参考文献', { bold: true, size: SIZE_HEAD, heading: true })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 240 },
  });
}

/** 分页 */
export function PAGE_BREAK() {
  return new Paragraph({
    children: [new PageBreak()],
  });
}

// ========================
// 文档组装
// ========================

/**
 * 组装并输出 .docx 文件
 *
 * @param {Object} options
 * @param {string} options.title       - 文档标题
 * @param {string} options.creator     - 创建者
 * @param {Array}  options.chapters    - 内容元素数组 (Paragraph | Table)[]
 * @param {string} options.outputPath  - 输出文件路径 (绝对路径)
 */
export async function buildDocx({ title, creator, chapters, outputPath }) {
  const doc = new Document({
    creator,
    title,
    description: title,
    sections: [{
      properties: {
        page: {
          margin: {
            top: MARGIN_TOP,
            bottom: MARGIN_BOTTOM,
            left: MARGIN_LEFT,
            right: MARGIN_RIGHT,
          },
          size: {
            width: 11906,  // A4: 210mm in twips
            height: 16838, // A4: 297mm in twips
          },
        },
      },
      children: chapters,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  writeFileSync(outputPath, buffer);
  const sizeKB = (buffer.length / 1024).toFixed(1);
  console.log(`报告已生成: ${outputPath} (${sizeKB} KB)`);
}

// 重新导出 docx 的基础类型 (供 build_report.js 直接使用)
export { AlignmentType, Paragraph, TextRun, PageBreak };
