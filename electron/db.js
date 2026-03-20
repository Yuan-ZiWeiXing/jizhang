import Database from 'better-sqlite3'
import { join } from 'path'

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
  }
}
