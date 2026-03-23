import Database from 'better-sqlite3'
import { join } from 'path'
import { createHash } from 'crypto'

const DEFAULT_CATEGORIES = [
  { id: 'food', name: '餐饮', icon: 'pi-shopping-cart', type: 'expense', color: '#ff9500' },
  { id: 'transport', name: '交通', icon: 'pi-car', type: 'expense', color: '#007aff' },
  { id: 'shopping', name: '购物', icon: 'pi-tag', type: 'expense', color: '#ff2d55' },
  { id: 'entertainment', name: '娱乐', icon: 'pi-star', type: 'expense', color: '#af52de' },
  { id: 'medical', name: '医疗', icon: 'pi-heart', type: 'expense', color: '#ff3b30' },
  { id: 'education', name: '教育', icon: 'pi-book', type: 'expense', color: '#5ac8fa' },
  { id: 'housing', name: '住房', icon: 'pi-home', type: 'expense', color: '#4cd964' },
  { id: 'other_expense', name: '其他支出', icon: 'pi-ellipsis-h', type: 'expense', color: '#8e8e93' },
  { id: 'salary', name: '工资', icon: 'pi-briefcase', type: 'income', color: '#34c759' },
  { id: 'bonus', name: '奖金', icon: 'pi-gift', type: 'income', color: '#30d158' },
  { id: 'investment', name: '投资', icon: 'pi-chart-line', type: 'income', color: '#64d2ff' },
  { id: 'other_income', name: '其他收入', icon: 'pi-plus-circle', type: 'income', color: '#30d158' },
]

export function createDb(userDataPath) {
  const dbPath = join(userDataPath, 'jizhang.db')
  const db = new Database(dbPath)

  db.pragma('journal_mode = WAL')

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT 'pi-circle',
      type TEXT NOT NULL,
      color TEXT DEFAULT '#888888'
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      category_id TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fund_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      prepaid REAL DEFAULT 0,
      prepaid_used REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS downstreams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER DEFAULT NULL,
      name TEXT NOT NULL,
      ledger_types TEXT DEFAULT '["funds"]',
      prepaid REAL DEFAULT 0,
      prepaid_used REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS funds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER DEFAULT NULL,
      card_no TEXT NOT NULL,
      card_date TEXT NOT NULL,
      cvv TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '未完成',
      in_amount REAL DEFAULT 0,
      in_rate REAL DEFAULT 1,
      out_amount REAL DEFAULT 0,
      out_rate REAL DEFAULT 1,
      date TEXT DEFAULT '',
      record_date TEXT DEFAULT '',
      out_date TEXT DEFAULT '',
      out_to TEXT DEFAULT '',
      currency TEXT DEFAULT 'USD',
      settled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // Migrations for existing databases missing newer columns
  try { db.exec('ALTER TABLE funds ADD COLUMN group_id INTEGER DEFAULT NULL') } catch(e) {}
  try { db.exec("ALTER TABLE funds ADD COLUMN date TEXT DEFAULT ''") } catch(e) {}
  try { db.exec("ALTER TABLE funds ADD COLUMN record_date TEXT DEFAULT ''") } catch(e) {}
  try { db.exec("ALTER TABLE funds ADD COLUMN out_date TEXT DEFAULT ''") } catch(e) {}
  try { db.exec("ALTER TABLE funds ADD COLUMN out_to TEXT DEFAULT ''") } catch(e) {}
  try { db.exec("ALTER TABLE funds ADD COLUMN currency TEXT DEFAULT 'USD'") } catch(e) {}
  try { db.exec("ALTER TABLE funds ADD COLUMN settled INTEGER DEFAULT 0") } catch(e) {}
  try { db.exec("ALTER TABLE funds ADD COLUMN downstream_id INTEGER DEFAULT NULL") } catch(e) {}
  try { db.exec("ALTER TABLE fund_groups ADD COLUMN prepaid REAL DEFAULT 0") } catch(e) {}
  try { db.exec("ALTER TABLE fund_groups ADD COLUMN prepaid_used REAL DEFAULT 0") } catch(e) {}
  try { db.exec("ALTER TABLE fund_groups DROP COLUMN prepaid_offset") } catch(e) {}
  try { db.exec('ALTER TABLE downstreams ADD COLUMN group_id INTEGER DEFAULT NULL') } catch(e) {}
  try { db.exec(`ALTER TABLE downstreams ADD COLUMN ledger_types TEXT DEFAULT '["funds"]'`) } catch(e) {}
  try { db.exec(`UPDATE downstreams SET ledger_types = '["funds"]' WHERE ledger_types IS NULL OR ledger_types = ''`) } catch(e) {}
  try { db.exec('ALTER TABLE downstreams ADD COLUMN enabled INTEGER DEFAULT 1') } catch(e) {}
  try { db.exec('UPDATE downstreams SET enabled = 1 WHERE enabled IS NULL') } catch(e) {}

  try {
    db.exec("UPDATE funds SET status = '已完成' WHERE IFNULL(settled, 0) = 1")
    db.exec("UPDATE funds SET status = '待出账' WHERE IFNULL(out_amount, 0) = 0 AND IFNULL(settled, 0) = 0")
    db.exec("UPDATE funds SET status = '待结算' WHERE IFNULL(settled, 0) = 0 AND IFNULL(out_amount, 0) > 0")
  } catch(e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Seed categories if empty
  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get()
  if (catCount.c === 0) {
    const insert = db.prepare('INSERT OR IGNORE INTO categories (id, name, icon, type, color) VALUES (?, ?, ?, ?, ?)')
    for (const cat of DEFAULT_CATEGORIES) {
      insert.run(cat.id, cat.name, cat.icon, cat.type, cat.color)
    }
  }

  return {
    getAllRecords() {
      return db.prepare('SELECT * FROM records ORDER BY date DESC, created_at DESC').all()
    },
    getRecordsByMonth(year, month) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`
      return db.prepare("SELECT * FROM records WHERE date LIKE ? ORDER BY date DESC, created_at DESC").all(`${prefix}%`)
    },
    addRecord({ type, amount, category_id, date, note }) {
      const stmt = db.prepare('INSERT INTO records (type, amount, category_id, date, note) VALUES (?, ?, ?, ?, ?)')
      const result = stmt.run(type, amount, category_id, date, note || '')
      return db.prepare('SELECT * FROM records WHERE id = ?').get(result.lastInsertRowid)
    },
    deleteRecord(id) {
      db.prepare('DELETE FROM records WHERE id = ?').run(id)
      return { ok: true }
    },
    updateRecord(id, { type, amount, category_id, date, note }) {
      db.prepare('UPDATE records SET type=?, amount=?, category_id=?, date=?, note=? WHERE id=?')
        .run(type, amount, category_id, date, note || '', id)
      return db.prepare('SELECT * FROM records WHERE id = ?').get(id)
    },
    getAllCategories() {
      return db.prepare('SELECT * FROM categories').all()
    },
    // Funds
    getAllFunds() {
      return db.prepare('SELECT * FROM funds ORDER BY created_at DESC').all()
    },
    getFundsByGroup(groupId) {
      if (groupId === null) return db.prepare('SELECT * FROM funds WHERE group_id IS NULL ORDER BY created_at DESC').all()
      return db.prepare('SELECT * FROM funds WHERE group_id = ? ORDER BY created_at DESC').all(groupId)
    },
    getFundsByDateRange(startDate, endDate) {
      return db.prepare('SELECT * FROM funds WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC').all(startDate, endDate + ' 23:59:59')
    },
    addFund({ group_id, card_no, card_date, cvv, status, in_amount, in_rate, out_amount, out_rate, record_date, currency }) {
      const stmt = db.prepare('INSERT INTO funds (group_id, card_no, card_date, cvv, status, in_amount, in_rate, out_amount, out_rate, record_date, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      const result = stmt.run(group_id || null, card_no, card_date, cvv, status, in_amount || 0, in_rate || 1, out_amount || 0, out_rate || 1, record_date || '', currency || 'USD')
      return db.prepare('SELECT * FROM funds WHERE id = ?').get(result.lastInsertRowid)
    },
    updateFundOut(id, { out_amount, out_rate, out_date, out_to, status, downstream_id, settled }) {
      db.prepare('UPDATE funds SET out_amount=?, out_rate=?, out_date=?, out_to=?, status=?, downstream_id=?, settled=? WHERE id=?')
        .run(out_amount, out_rate, out_date || '', out_to || '', status || '待出账', downstream_id ?? null, settled ?? 0, id)
      return db.prepare('SELECT * FROM funds WHERE id = ?').get(id)
    },
    updateFundSettled(id, settled) {
      db.prepare(`UPDATE funds SET settled = ?, status = CASE WHEN ? = 1 THEN '已完成' WHEN out_amount > 0 THEN '待结算' ELSE '待出账' END WHERE id = ?`).run(settled ? 1 : 0, settled ? 1 : 0, id)
      return db.prepare('SELECT * FROM funds WHERE id = ?').get(id)
    },
    batchUpdateSettled(ids, settled) {
      const stmt = db.prepare(`UPDATE funds SET settled = ?, status = CASE WHEN ? = 1 THEN '已完成' WHEN out_amount > 0 THEN '待结算' ELSE '待出账' END WHERE id = ?`)
      const run = db.transaction((list) => { for (const id of list) stmt.run(settled ? 1 : 0, settled ? 1 : 0, id) })
      run(ids)
      return { ok: true, count: ids.length }
    },
    deleteFund(id) {
      db.prepare('DELETE FROM funds WHERE id = ?').run(id)
      return { ok: true }
    },
    addFundsBatch(rows) {
      const stmt = db.prepare('INSERT INTO funds (group_id, card_no, card_date, cvv, status, in_amount, in_rate, out_amount, out_rate, record_date, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      const insertMany = db.transaction((items) => {
        for (const r of items) {
          stmt.run(r.group_id || null, r.card_no, r.card_date, r.cvv, r.status, r.in_amount || 0, r.in_rate || 1, r.out_amount || 0, r.out_rate || 1, r.record_date || '', r.currency || 'USD')
        }
      })
      insertMany(rows)
      return { count: rows.length }
    },
    // Fund groups
    getAllFundGroups() {
      return db.prepare('SELECT * FROM fund_groups ORDER BY created_at ASC').all()
    },
    addFundGroup(name) {
      const result = db.prepare('INSERT INTO fund_groups (name) VALUES (?)').run(name)
      return db.prepare('SELECT * FROM fund_groups WHERE id = ?').get(result.lastInsertRowid)
    },
    renameFundGroup(id, name) {
      db.prepare('UPDATE fund_groups SET name = ? WHERE id = ?').run(name, id)
      return db.prepare('SELECT * FROM fund_groups WHERE id = ?').get(id)
    },
    updateGroupPrepaid(id, prepaid) {
      db.prepare('UPDATE fund_groups SET prepaid = prepaid + ? WHERE id = ?').run(prepaid, id)
      return db.prepare('SELECT * FROM fund_groups WHERE id = ?').get(id)
    },
    addGroupPrepaidUsed(groupId, amount) {
      db.prepare('UPDATE fund_groups SET prepaid_used = prepaid_used + ? WHERE id = ?').run(amount, groupId)
      return db.prepare('SELECT * FROM fund_groups WHERE id = ?').get(groupId)
    },
    deleteFundGroup(id) {
      db.prepare('UPDATE funds SET group_id = NULL WHERE group_id = ?').run(id)
      db.prepare('DELETE FROM fund_groups WHERE id = ?').run(id)
      return { ok: true }
    },
    // Downstreams
    getAllDownstreams() {
      return db.prepare('SELECT * FROM downstreams ORDER BY created_at ASC').all()
    },
    addDownstream(name, ledgerTypesJson) {
      const lt = ledgerTypesJson && String(ledgerTypesJson).trim() ? ledgerTypesJson : '["funds"]'
      const result = db.prepare('INSERT INTO downstreams (name, ledger_types) VALUES (?, ?)').run(name, lt)
      return db.prepare('SELECT * FROM downstreams WHERE id = ?').get(result.lastInsertRowid)
    },
    updateDownstream(id, name, ledgerTypesJson) {
      const lt = ledgerTypesJson && String(ledgerTypesJson).trim() ? ledgerTypesJson : '["funds"]'
      db.prepare('UPDATE downstreams SET name = ?, ledger_types = ? WHERE id = ?').run(name, lt, id)
      return db.prepare('SELECT * FROM downstreams WHERE id = ?').get(id)
    },
    setDownstreamEnabled(id, enabled) {
      db.prepare('UPDATE downstreams SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id)
      return db.prepare('SELECT * FROM downstreams WHERE id = ?').get(id)
    },
    deleteDownstream(id) {
      db.prepare('UPDATE funds SET downstream_id = NULL WHERE downstream_id = ?').run(id)
      db.prepare('DELETE FROM downstreams WHERE id = ?').run(id)
      return { ok: true }
    },
    addDownstreamPrepaid(id, amount) {
      db.prepare('UPDATE downstreams SET prepaid = prepaid + ? WHERE id = ?').run(amount, id)
      return db.prepare('SELECT * FROM downstreams WHERE id = ?').get(id)
    },
    addDownstreamPrepaidUsed(id, amount) {
      db.prepare('UPDATE downstreams SET prepaid_used = prepaid_used + ? WHERE id = ?').run(amount, id)
      return db.prepare('SELECT * FROM downstreams WHERE id = ?').get(id)
    },
    // Lock password
    hasLockPassword() {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'lock_password'").get()
      return !!row
    },
    setLockPassword(plaintext) {
      const hash = createHash('sha256').update(plaintext).digest('hex')
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('lock_password', ?)").run(hash)
      return { ok: true }
    },
    verifyLockPassword(plaintext) {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'lock_password'").get()
      if (!row) return false
      return row.value === createHash('sha256').update(plaintext).digest('hex')
    },
    removeLockPassword() {
      db.prepare("DELETE FROM settings WHERE key = 'lock_password'").run()
      return { ok: true }
    },
  }
}
