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
      enabled INTEGER DEFAULT 1,
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

    CREATE TABLE IF NOT EXISTS wire_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER DEFAULT NULL,
      code TEXT NOT NULL,
      amount REAL DEFAULT 0,
      name TEXT NOT NULL,
      bank TEXT DEFAULT '',
      account_number TEXT DEFAULT '',
      routing_number TEXT DEFAULT '',
      swift_code TEXT DEFAULT '',
      account_type TEXT DEFAULT '',
      address TEXT DEFAULT '',
      bank_address TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      record_date TEXT DEFAULT '',
      out_date TEXT DEFAULT '',
      out_to TEXT DEFAULT '',
      currency TEXT DEFAULT 'USD',
      status TEXT NOT NULL DEFAULT '待进账',
      in_rate REAL DEFAULT 0,
      out_amount REAL DEFAULT 0,
      out_rate REAL DEFAULT 1,
      settled INTEGER DEFAULT 0,
      downstream_id INTEGER DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wire_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      prepaid REAL DEFAULT 0,
      prepaid_used REAL DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prepaid_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_kind TEXT NOT NULL,
      ledger_type TEXT DEFAULT '',
      target_id INTEGER NOT NULL,
      target_name TEXT DEFAULT '',
      event_type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_before REAL DEFAULT 0,
      balance_after REAL DEFAULT 0,
      related_type TEXT DEFAULT '',
      related_id INTEGER DEFAULT NULL,
      note TEXT DEFAULT '',
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
  try { db.exec('ALTER TABLE wire_transfers ADD COLUMN group_id INTEGER DEFAULT NULL') } catch(e) {}
  try { db.exec("ALTER TABLE wire_transfers ADD COLUMN record_date TEXT DEFAULT ''") } catch(e) {}
  try { db.exec("ALTER TABLE wire_transfers ADD COLUMN out_date TEXT DEFAULT ''") } catch(e) {}
  try { db.exec("ALTER TABLE wire_transfers ADD COLUMN out_to TEXT DEFAULT ''") } catch(e) {}
  try { db.exec("ALTER TABLE wire_transfers ADD COLUMN currency TEXT DEFAULT 'USD'") } catch(e) {}
  try { db.exec("ALTER TABLE wire_transfers ADD COLUMN status TEXT NOT NULL DEFAULT '待进账'") } catch(e) {}
  try { db.exec("ALTER TABLE wire_transfers ADD COLUMN in_rate REAL DEFAULT 0") } catch(e) {}
  try { db.exec("ALTER TABLE wire_transfers ADD COLUMN out_amount REAL DEFAULT 0") } catch(e) {}
  try { db.exec("ALTER TABLE wire_transfers ADD COLUMN out_rate REAL DEFAULT 1") } catch(e) {}
  try { db.exec("ALTER TABLE wire_transfers ADD COLUMN settled INTEGER DEFAULT 0") } catch(e) {}
  try { db.exec("ALTER TABLE wire_transfers ADD COLUMN downstream_id INTEGER DEFAULT NULL") } catch(e) {}
  try { db.exec("ALTER TABLE fund_groups ADD COLUMN prepaid REAL DEFAULT 0") } catch(e) {}
  try { db.exec("ALTER TABLE fund_groups ADD COLUMN prepaid_used REAL DEFAULT 0") } catch(e) {}
  try { db.exec("ALTER TABLE fund_groups ADD COLUMN enabled INTEGER DEFAULT 1") } catch(e) {}
  try { db.exec("ALTER TABLE wire_groups ADD COLUMN prepaid REAL DEFAULT 0") } catch(e) {}
  try { db.exec("ALTER TABLE wire_groups ADD COLUMN prepaid_used REAL DEFAULT 0") } catch(e) {}
  try { db.exec("ALTER TABLE wire_groups ADD COLUMN enabled INTEGER DEFAULT 1") } catch(e) {}
  try { db.exec("ALTER TABLE fund_groups DROP COLUMN prepaid_offset") } catch(e) {}
  try { db.exec('ALTER TABLE downstreams ADD COLUMN group_id INTEGER DEFAULT NULL') } catch(e) {}
  try { db.exec(`ALTER TABLE downstreams ADD COLUMN ledger_types TEXT DEFAULT '["funds"]'`) } catch(e) {}
  try { db.exec(`UPDATE downstreams SET ledger_types = '["funds"]' WHERE ledger_types IS NULL OR ledger_types = ''`) } catch(e) {}
  try { db.exec('ALTER TABLE downstreams ADD COLUMN enabled INTEGER DEFAULT 1') } catch(e) {}
  try { db.exec('UPDATE downstreams SET enabled = 1 WHERE enabled IS NULL') } catch(e) {}
  try { db.exec('UPDATE fund_groups SET enabled = 1 WHERE enabled IS NULL') } catch(e) {}
  try { db.exec('UPDATE wire_groups SET enabled = 1 WHERE enabled IS NULL') } catch(e) {}
  try { db.exec('ALTER TABLE prepaid_logs ADD COLUMN balance_before REAL DEFAULT 0') } catch(e) {}
  try { db.exec('ALTER TABLE prepaid_logs ADD COLUMN balance_after REAL DEFAULT 0') } catch(e) {}

  try {
    db.exec("UPDATE funds SET status = '已完成' WHERE IFNULL(settled, 0) = 1")
    db.exec("UPDATE funds SET status = '待出账' WHERE IFNULL(out_amount, 0) = 0 AND IFNULL(settled, 0) = 0")
    db.exec("UPDATE funds SET status = '待结算' WHERE IFNULL(settled, 0) = 0 AND IFNULL(out_amount, 0) > 0")
    db.exec("UPDATE wire_transfers SET status = '已完成' WHERE IFNULL(settled, 0) = 1")
    db.exec("UPDATE wire_transfers SET status = '待进账' WHERE IFNULL(in_rate, 0) <= 0 AND IFNULL(settled, 0) = 0 AND IFNULL(out_amount, 0) = 0")
    db.exec("UPDATE wire_transfers SET status = '待出账' WHERE IFNULL(in_rate, 0) > 0 AND IFNULL(out_amount, 0) = 0 AND IFNULL(settled, 0) = 0")
    db.exec("UPDATE wire_transfers SET status = '待结算' WHERE IFNULL(settled, 0) = 0 AND IFNULL(out_amount, 0) > 0")
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

  const insertPrepaidLogStmt = db.prepare(`
    INSERT INTO prepaid_logs
    (target_kind, ledger_type, target_id, target_name, event_type, amount, balance_before, balance_after, related_type, related_id, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  function resolveTargetName(targetKind, ledgerType, targetId) {
    if (targetKind === 'downstream') {
      const row = db.prepare('SELECT name FROM downstreams WHERE id = ?').get(targetId)
      return row?.name || ''
    }
    if (targetKind === 'upstream') {
      if (ledgerType === 'wire') {
        const row = db.prepare('SELECT name FROM wire_groups WHERE id = ?').get(targetId)
        return row?.name || ''
      }
      const row = db.prepare('SELECT name FROM fund_groups WHERE id = ?').get(targetId)
      return row?.name || ''
    }
    return ''
  }

  function addPrepaidLog({ target_kind, ledger_type = '', target_id, event_type, amount, balance_before = 0, balance_after = 0, related_type = '', related_id = null, note = '' }) {
    const val = Number(amount || 0)
    if (!val || !target_kind || !target_id || !event_type) return
    const name = resolveTargetName(target_kind, ledger_type, target_id)
    insertPrepaidLogStmt.run(
      target_kind,
      ledger_type || '',
      target_id,
      name,
      event_type,
      val,
      Number(balance_before || 0),
      Number(balance_after || 0),
      related_type || '',
      related_id ?? null,
      note || '',
    )
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
    // Wire transfers
    getAllWireTransfers() {
      return db.prepare('SELECT * FROM wire_transfers ORDER BY created_at DESC, id DESC').all()
    },
    getWireTransfersByGroup(groupId) {
      if (groupId === null) return db.prepare('SELECT * FROM wire_transfers WHERE group_id IS NULL ORDER BY created_at DESC, id DESC').all()
      return db.prepare('SELECT * FROM wire_transfers WHERE group_id = ? ORDER BY created_at DESC, id DESC').all(groupId)
    },
    addWireTransfer({ group_id, code, amount, name, bank, account_number, routing_number, swift_code, account_type, address, bank_address, birthday, record_date, currency, status, in_rate, out_amount, out_rate, out_date, out_to, downstream_id, settled }) {
      const stmt = db.prepare(`
        INSERT INTO wire_transfers
        (group_id, code, amount, name, bank, account_number, routing_number, swift_code, account_type, address, bank_address, birthday, record_date, currency, status, in_rate, out_amount, out_rate, out_date, out_to, downstream_id, settled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const result = stmt.run(
        group_id ?? null,
        code,
        amount || 0,
        name,
        bank || '',
        account_number || '',
        routing_number || '',
        swift_code || '',
        account_type || '',
        address || '',
        bank_address || '',
        birthday || '',
        record_date || '',
        currency || 'USD',
        status || '待进账',
        in_rate ?? 0,
        out_amount || 0,
        out_rate || 1,
        out_date || '',
        out_to || '',
        downstream_id ?? null,
        settled ?? 0,
      )
      return db.prepare('SELECT * FROM wire_transfers WHERE id = ?').get(result.lastInsertRowid)
    },
    updateWireTransferIn(id, { in_rate }) {
      db.prepare(`UPDATE wire_transfers SET in_rate = ?, status = CASE WHEN IFNULL(out_amount, 0) > 0 THEN '待结算' ELSE '待出账' END WHERE id = ?`)
        .run(in_rate, id)
      return db.prepare('SELECT * FROM wire_transfers WHERE id = ?').get(id)
    },
    updateWireTransferOut(id, { out_amount, out_rate, out_date, out_to, status, downstream_id, settled }) {
      db.prepare('UPDATE wire_transfers SET out_amount=?, out_rate=?, out_date=?, out_to=?, status=?, downstream_id=?, settled=? WHERE id=?')
        .run(out_amount, out_rate, out_date || '', out_to || '', status || '待出账', downstream_id ?? null, settled ?? 0, id)
      return db.prepare('SELECT * FROM wire_transfers WHERE id = ?').get(id)
    },
    updateWireTransferSettled(id, settled) {
      db.prepare(`UPDATE wire_transfers SET settled = ?, status = CASE WHEN ? = 1 THEN '已完成' WHEN out_amount > 0 THEN '待结算' WHEN IFNULL(in_rate, 0) > 0 THEN '待出账' ELSE '待进账' END WHERE id = ?`).run(settled ? 1 : 0, settled ? 1 : 0, id)
      return db.prepare('SELECT * FROM wire_transfers WHERE id = ?').get(id)
    },
    deleteWireTransfer(id) {
      db.prepare('DELETE FROM wire_transfers WHERE id = ?').run(id)
      return { ok: true }
    },
    getAllWireGroups() {
      return db.prepare('SELECT * FROM wire_groups ORDER BY created_at ASC, id ASC').all()
    },
    addWireGroup(name) {
      const result = db.prepare('INSERT INTO wire_groups (name) VALUES (?)').run(name)
      return db.prepare('SELECT * FROM wire_groups WHERE id = ?').get(result.lastInsertRowid)
    },
    renameWireGroup(id, name) {
      db.prepare('UPDATE wire_groups SET name = ? WHERE id = ?').run(name, id)
      return db.prepare('SELECT * FROM wire_groups WHERE id = ?').get(id)
    },
    setWireGroupEnabled(id, enabled) {
      db.prepare('UPDATE wire_groups SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id)
      return db.prepare('SELECT * FROM wire_groups WHERE id = ?').get(id)
    },
    updateWireGroupPrepaid(id, prepaid) {
      const row = db.prepare('SELECT prepaid, prepaid_used FROM wire_groups WHERE id = ?').get(id) || {}
      const before = Number(row.prepaid || 0) - Number(row.prepaid_used || 0)
      const delta = Number(prepaid || 0)
      const after = before + delta
      db.prepare('UPDATE wire_groups SET prepaid = prepaid + ? WHERE id = ?').run(prepaid, id)
      addPrepaidLog({ target_kind: 'upstream', ledger_type: 'wire', target_id: id, event_type: 'recharge', amount: prepaid, balance_before: before, balance_after: after, related_type: 'manual', note: '手动追加预付' })
      return db.prepare('SELECT * FROM wire_groups WHERE id = ?').get(id)
    },
    addWireGroupPrepaidUsed(groupId, amount, relatedId = null) {
      const row0 = db.prepare('SELECT prepaid, prepaid_used FROM wire_groups WHERE id = ?').get(groupId) || {}
      const before = Number(row0.prepaid || 0) - Number(row0.prepaid_used || 0)
      const delta = Number(amount || 0)
      const after = before - delta
      db.prepare('UPDATE wire_groups SET prepaid_used = prepaid_used + ? WHERE id = ?').run(amount, groupId)
      let note = '电汇进账消耗预付'
      if (relatedId) {
        const row = db.prepare('SELECT code FROM wire_transfers WHERE id = ?').get(relatedId)
        if (row?.code) note += `（编号 ${row.code}）`
      }
      addPrepaidLog({ target_kind: 'upstream', ledger_type: 'wire', target_id: groupId, event_type: 'consume', amount, balance_before: before, balance_after: after, related_type: 'wire', related_id: relatedId, note })
      return db.prepare('SELECT * FROM wire_groups WHERE id = ?').get(groupId)
    },
    deleteWireGroup(id) {
      db.prepare('UPDATE wire_transfers SET group_id = NULL WHERE group_id = ?').run(id)
      db.prepare('DELETE FROM wire_groups WHERE id = ?').run(id)
      return { ok: true }
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
    setFundGroupEnabled(id, enabled) {
      db.prepare('UPDATE fund_groups SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id)
      return db.prepare('SELECT * FROM fund_groups WHERE id = ?').get(id)
    },
    updateGroupPrepaid(id, prepaid) {
      const row = db.prepare('SELECT prepaid, prepaid_used FROM fund_groups WHERE id = ?').get(id) || {}
      const before = Number(row.prepaid || 0) - Number(row.prepaid_used || 0)
      const delta = Number(prepaid || 0)
      const after = before + delta
      db.prepare('UPDATE fund_groups SET prepaid = prepaid + ? WHERE id = ?').run(prepaid, id)
      addPrepaidLog({ target_kind: 'upstream', ledger_type: 'funds', target_id: id, event_type: 'recharge', amount: prepaid, balance_before: before, balance_after: after, related_type: 'manual', note: '手动追加预付' })
      return db.prepare('SELECT * FROM fund_groups WHERE id = ?').get(id)
    },
    addGroupPrepaidUsed(groupId, amount, relatedId = null) {
      const row0 = db.prepare('SELECT prepaid, prepaid_used FROM fund_groups WHERE id = ?').get(groupId) || {}
      const before = Number(row0.prepaid || 0) - Number(row0.prepaid_used || 0)
      const delta = Number(amount || 0)
      const after = before - delta
      db.prepare('UPDATE fund_groups SET prepaid_used = prepaid_used + ? WHERE id = ?').run(amount, groupId)
      let note = '资金进账消耗预付'
      if (relatedId) {
        const row = db.prepare('SELECT card_no FROM funds WHERE id = ?').get(relatedId)
        if (row?.card_no) note += `（卡号 ${row.card_no}）`
      }
      addPrepaidLog({ target_kind: 'upstream', ledger_type: 'funds', target_id: groupId, event_type: 'consume', amount, balance_before: before, balance_after: after, related_type: 'funds', related_id: relatedId, note })
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
      db.prepare('UPDATE wire_transfers SET downstream_id = NULL WHERE downstream_id = ?').run(id)
      db.prepare('DELETE FROM downstreams WHERE id = ?').run(id)
      return { ok: true }
    },
    addDownstreamPrepaid(id, amount) {
      const row0 = db.prepare('SELECT prepaid, prepaid_used FROM downstreams WHERE id = ?').get(id) || {}
      const before = Number(row0.prepaid || 0) - Number(row0.prepaid_used || 0)
      const delta = Number(amount || 0)
      const after = before + delta
      db.prepare('UPDATE downstreams SET prepaid = prepaid + ? WHERE id = ?').run(amount, id)
      addPrepaidLog({ target_kind: 'downstream', ledger_type: '', target_id: id, event_type: 'recharge', amount, balance_before: before, balance_after: after, related_type: 'manual', note: '手动追加预付' })
      return db.prepare('SELECT * FROM downstreams WHERE id = ?').get(id)
    },
    addDownstreamPrepaidUsed(id, amount, ledgerType = '', relatedId = null) {
      const row0 = db.prepare('SELECT prepaid, prepaid_used FROM downstreams WHERE id = ?').get(id) || {}
      const before = Number(row0.prepaid || 0) - Number(row0.prepaid_used || 0)
      const delta = Number(amount || 0)
      const after = before - delta
      db.prepare('UPDATE downstreams SET prepaid_used = prepaid_used + ? WHERE id = ?').run(amount, id)
      const lt = String(ledgerType || '')
      let note = '业务出账消耗预付'
      if (lt === 'funds') {
        note = '资金出账消耗预付'
        if (relatedId) {
          const row = db.prepare('SELECT card_no FROM funds WHERE id = ?').get(relatedId)
          if (row?.card_no) note += `（卡号 ${row.card_no}）`
        }
      } else if (lt === 'wire') {
        note = '电汇出账消耗预付'
        if (relatedId) {
          const row = db.prepare('SELECT code FROM wire_transfers WHERE id = ?').get(relatedId)
          if (row?.code) note += `（编号 ${row.code}）`
        }
      }
      addPrepaidLog({ target_kind: 'downstream', ledger_type: lt, target_id: id, event_type: 'consume', amount, balance_before: before, balance_after: after, related_type: lt || 'business', related_id: relatedId, note })
      return db.prepare('SELECT * FROM downstreams WHERE id = ?').get(id)
    },
    getPrepaidLogs(targetKind, targetId) {
      return db.prepare('SELECT * FROM prepaid_logs WHERE target_kind = ? AND target_id = ? ORDER BY created_at DESC, id DESC').all(targetKind, targetId)
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
