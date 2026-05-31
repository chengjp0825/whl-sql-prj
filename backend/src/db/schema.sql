-- PCB元器件库 MVP 核心表
-- SQLite

PRAGMA foreign_keys = ON;

-- 1. 物料分类表（树形结构）
CREATE TABLE IF NOT EXISTS component_category (
    category_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id       INTEGER REFERENCES component_category(category_id) ON DELETE SET NULL,
    category_name   TEXT NOT NULL,
    category_code   TEXT NOT NULL,
    sort_order      INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
);

-- 2. 元器件库表
CREATE TABLE IF NOT EXISTS component_library (
    component_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    internal_pn         TEXT NOT NULL UNIQUE,
    category_id         INTEGER REFERENCES component_category(category_id) ON DELETE SET NULL,
    description         TEXT,
    footprint_name      TEXT,
    symbol_name         TEXT,
    spec_json           TEXT DEFAULT '{}',
    manufacturer        TEXT,
    manufacturer_pn     TEXT,
    supplier            TEXT,
    supplier_pn         TEXT,
    unit_price          REAL DEFAULT 0,
    currency            TEXT DEFAULT 'CNY',
    price_date          TEXT,
    stock_qty           INTEGER DEFAULT 0,
    datasheet_url       TEXT,
    source_project_id   INTEGER,
    remark              TEXT,
    created_by          INTEGER,
    created_at          TEXT DEFAULT (datetime('now')),
    updated_at          TEXT DEFAULT (datetime('now'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_component_category_id    ON component_library(category_id);
CREATE INDEX IF NOT EXISTS idx_component_footprint      ON component_library(footprint_name);
CREATE INDEX IF NOT EXISTS idx_component_manufacturer    ON component_library(manufacturer);
CREATE INDEX IF NOT EXISTS idx_component_supplier        ON component_library(supplier);
CREATE INDEX IF NOT EXISTS idx_component_internal_pn     ON component_library(internal_pn);
CREATE INDEX IF NOT EXISTS idx_category_parent           ON component_category(parent_id);
