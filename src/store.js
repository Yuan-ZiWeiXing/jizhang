import { reactive, computed, ref } from 'vue'

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && !!window.api

// Fallback in-memory + localStorage for browser dev
function localFallback() {
  const STORAGE_KEY = 'jizhang_data'
  function load() {
    try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) } catch {}
    return { records: [], categories: [
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
    ]}
  }
  return load()
}

const state = reactive({ records: [], categories: [], loaded: false })

async function initStore() {
  if (state.loaded) return
  if (isElectron) {
    state.categories = await window.api.getAllCategories()
    state.records = await window.api.getAllRecords()
  } else {
    const data = localFallback()
    state.categories = data.categories
    state.records = data.records
  }
  state.loaded = true
}

export function useStore() {
  if (!state.loaded) initStore()

  const totalIncome = computed(() =>
    state.records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  )
  const totalExpense = computed(() =>
    state.records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  )
  const balance = computed(() => totalIncome.value - totalExpense.value)

  async function addRecord(record) {
    // map camelCase to snake_case for db
    const payload = {
      type: record.type,
      amount: record.amount,
      category_id: record.categoryId,
      date: record.date,
      note: record.note || '',
    }
    if (isElectron) {
      const saved = await window.api.addRecord(payload)
      state.records.unshift(normalize(saved))
    } else {
      state.records.unshift({ ...record, id: String(Date.now()), createdAt: new Date().toISOString() })
      localStorage.setItem('jizhang_data', JSON.stringify({ records: state.records, categories: state.categories }))
    }
  }

  async function deleteRecord(id) {
    if (isElectron) {
      await window.api.deleteRecord(id)
    }
    const idx = state.records.findIndex(r => r.id === id || r.id === Number(id))
    if (idx !== -1) state.records.splice(idx, 1)
    if (!isElectron) localStorage.setItem('jizhang_data', JSON.stringify({ records: state.records, categories: state.categories }))
  }

  function getCategory(id) {
    return state.categories.find(c => c.id === id) || {}
  }

  function recordsByMonth(year, month) {
    return state.records.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
  }

  return {
    state,
    totalIncome,
    totalExpense,
    balance,
    addRecord,
    deleteRecord,
    getCategory,
    recordsByMonth,
    initStore,
  }
}

// Normalize SQLite row (category_id) to camelCase (categoryId)
function normalize(row) {
  return {
    ...row,
    categoryId: row.category_id ?? row.categoryId,
    createdAt: row.created_at ?? row.createdAt,
  }
}
