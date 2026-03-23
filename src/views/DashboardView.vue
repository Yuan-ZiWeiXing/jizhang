<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dash-header">
      <div class="month-nav">
        <button class="nav-btn" @click="prevMonth"><i class="pi pi-chevron-left"></i></button>
        <span class="month-label">{{ currentYear }}年{{ currentMonth }}月</span>
        <button class="nav-btn" @click="nextMonth"><i class="pi pi-chevron-right"></i></button>
      </div>
      <div class="header-actions">
        <div class="view-tabs">
          <button :class="['vtab', { active: activeTab === 'overview' }]" @click="activeTab = 'overview'">
            <i class="pi pi-home"></i> 总览
          </button>
          <button :class="['vtab', { active: activeTab === 'records' }]" @click="activeTab = 'records'">
            <i class="pi pi-list"></i> 账单
          </button>
          <button :class="['vtab', { active: activeTab === 'stats' }]" @click="activeTab = 'stats'">
            <i class="pi pi-chart-bar"></i> 统计
          </button>
        </div>
        <button class="add-btn" @click="$emit('add')">
          <i class="pi pi-plus"></i>
        </button>
      </div>
    </div>

    <!-- Tab: Overview -->
    <div v-if="activeTab === 'overview'" class="tab-content">
      <!-- 记账概览 -->
      <div class="overview-section">
        <div class="os-header">
          <i class="pi pi-wallet os-icon"></i>
          <span class="os-title">记账概览</span>
          <span class="os-sub">{{ currentYear }}年{{ currentMonth }}月</span>
        </div>
        <div class="stats-row">
          <div class="stat-card income">
            <div class="stat-icon"><i class="pi pi-arrow-down-left"></i></div>
            <div class="stat-info">
              <div class="stat-label">本月收入</div>
              <div class="stat-value">¥{{ fmt(monthIncome) }}</div>
            </div>
          </div>
          <div class="stat-card expense">
            <div class="stat-icon"><i class="pi pi-arrow-up-right"></i></div>
            <div class="stat-info">
              <div class="stat-label">本月支出</div>
              <div class="stat-value">¥{{ fmt(monthExpense) }}</div>
            </div>
          </div>
          <div class="stat-card balance">
            <div class="stat-icon"><i class="pi pi-wallet"></i></div>
            <div class="stat-info">
              <div class="stat-label">本月结余</div>
              <div class="stat-value" :class="monthBalance >= 0 ? 'pos' : 'neg'">¥{{ fmt(monthBalance) }}</div>
            </div>
          </div>
        </div>
        <!-- Quick category breakdown -->
        <div class="cat-list-preview" v-if="categoryStats.length">
          <div v-for="cat in categoryStats.slice(0, 5)" :key="cat.id" class="cat-preview-row">
            <div class="cat-icon-sm" :style="{ background: cat.color + '22', color: cat.color }">
              <i :class="'pi ' + cat.icon"></i>
            </div>
            <span class="cat-name-sm">{{ cat.name }}</span>
            <div class="cat-bar-sm">
              <div class="cat-bar-fill-sm" :style="{ width: cat.pct + '%', background: cat.color }"></div>
            </div>
            <span class="cat-amt-sm">¥{{ fmt(cat.total) }}</span>
          </div>
        </div>
      </div>

      <!-- 资金概览 -->
      <div class="overview-section">
        <div class="os-header">
          <i class="pi pi-credit-card os-icon"></i>
          <span class="os-title">资金概览</span>
          <span class="os-sub">全部</span>
        </div>
        <div class="stats-row">
          <div class="stat-card income">
            <div class="stat-icon"><i class="pi pi-arrow-down-left"></i></div>
            <div class="stat-info">
              <div class="stat-label">总进账</div>
              <div class="stat-value">¥{{ fmt(fundsStats.totalIn) }}</div>
            </div>
          </div>
          <div class="stat-card expense">
            <div class="stat-icon"><i class="pi pi-arrow-up-right"></i></div>
            <div class="stat-info">
              <div class="stat-label">总出账</div>
              <div class="stat-value">¥{{ fmt(fundsStats.totalOut) }}</div>
            </div>
          </div>
          <div class="stat-card" :class="fundsStats.totalProfit >= 0 ? 'balance' : 'expense'">
            <div class="stat-icon"><i class="pi pi-chart-line"></i></div>
            <div class="stat-info">
              <div class="stat-label">总盈利</div>
              <div class="stat-value" :class="fundsStats.totalProfit >= 0 ? 'pos' : 'neg'">¥{{ fmt(fundsStats.totalProfit) }}</div>
            </div>
          </div>
        </div>
        <div class="funds-mini-stats" v-if="fundsStats.totalCount">
          <div class="fms-item">
            <span class="fms-label">总记录</span>
            <span class="fms-val">{{ fundsStats.totalCount }} 条</span>
          </div>
          <div class="fms-item">
            <span class="fms-label">待出账</span>
            <span class="fms-val warning">{{ fundsStats.pendingCount }} 条</span>
          </div>
          <div class="fms-item">
            <span class="fms-label">盈利</span>
            <span class="fms-val success">{{ fundsStats.profitCount }} 条</span>
          </div>
          <div class="fms-item">
            <span class="fms-label">亏损</span>
            <span class="fms-val danger">{{ fundsStats.lossCount }} 条</span>
          </div>
        </div>
      </div>

      <!-- Recent records -->
      <div class="overview-section">
        <div class="os-header">
          <i class="pi pi-clock os-icon"></i>
          <span class="os-title">最近记录</span>
        </div>
        <div class="records-list" v-if="recentRecords.length">
          <div v-for="record in recentRecords" :key="record.id" class="record-item">
            <div class="record-cat-icon" :style="{ background: getCat(record.categoryId).color + '22', color: getCat(record.categoryId).color }">
              <i :class="'pi ' + (getCat(record.categoryId).icon || 'pi-circle')"></i>
            </div>
            <div class="record-info">
              <div class="record-name">{{ record.note || getCat(record.categoryId).name }}</div>
              <div class="record-date-text">{{ formatDate(record.date) }} · {{ getCat(record.categoryId).name }}</div>
            </div>
            <div class="record-amount" :class="record.type">
              {{ record.type === 'income' ? '+' : '-' }}¥{{ fmt(record.amount) }}
            </div>
          </div>
        </div>
        <div class="empty-state" v-else>
          <i class="pi pi-inbox"></i>
          <p>暂无记录，点击新增开始记账</p>
        </div>
      </div>
    </div>

    <!-- Tab: Records -->
    <div v-if="activeTab === 'records'" class="tab-content">
      <div class="filter-bar">
        <div class="filter-tabs">
          <button :class="['ftab', { active: filter === 'all' }]" @click="filter = 'all'">全部</button>
          <button :class="['ftab', { active: filter === 'expense' }]" @click="filter = 'expense'">支出</button>
          <button :class="['ftab', { active: filter === 'income' }]" @click="filter = 'income'">收入</button>
        </div>
        <div class="filter-summary">
          <span class="sum-item income">收入 ¥{{ fmt(monthIncome) }}</span>
          <span class="sum-divider">|</span>
          <span class="sum-item expense">支出 ¥{{ fmt(monthExpense) }}</span>
          <span class="sum-divider">|</span>
          <span class="sum-item">结余 ¥{{ fmt(monthBalance) }}</span>
        </div>
      </div>

      <div class="records-scroll">
        <div v-if="groupedRecords.length === 0" class="empty-state">
          <i class="pi pi-inbox"></i>
          <p>本月暂无{{ filter === 'all' ? '' : filter === 'expense' ? '支出' : '收入' }}记录</p>
        </div>

        <div v-for="group in groupedRecords" :key="group.date" class="date-group">
          <div class="date-header">
            <span class="date-text">{{ group.dateLabel }}</span>
            <span class="date-sum" v-if="group.dayExpense">支出 ¥{{ fmt(group.dayExpense) }}</span>
          </div>
          <div class="group-records">
            <div v-for="record in group.records" :key="record.id" class="record-row">
              <div class="cat-icon" :style="{ background: getCat(record.categoryId).color + '22', color: getCat(record.categoryId).color }">
                <i :class="'pi ' + (getCat(record.categoryId).icon || 'pi-circle')"></i>
              </div>
              <div class="rec-info">
                <div class="rec-title">{{ record.note || getCat(record.categoryId).name }}</div>
                <div class="rec-sub">{{ getCat(record.categoryId).name }}</div>
              </div>
              <div class="rec-amount" :class="record.type">
                {{ record.type === 'income' ? '+' : '-' }}¥{{ fmt(record.amount) }}
              </div>
              <button class="del-btn" @click="doDelete(record.id)" title="删除">
                <i class="pi pi-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: Stats -->
    <div v-if="activeTab === 'stats'" class="tab-content">
      <div class="stats-toolbar">
        <div class="type-tabs">
          <button :class="['ftab', { active: viewType === 'expense' }]" @click="viewType = 'expense'">支出</button>
          <button :class="['ftab', { active: viewType === 'income' }]" @click="viewType = 'income'">收入</button>
        </div>
      </div>

      <div class="stats-scroll">
        <!-- Time-based summary cards -->
        <div class="time-stats-row">
          <div class="time-stat-card">
            <div class="ts-label">今日{{ viewType === 'expense' ? '支出' : '收入' }}</div>
            <div class="ts-value" :class="viewType">¥{{ fmt(todayAmount) }}</div>
            <div class="ts-count">{{ todayCount }} 笔</div>
          </div>
          <div class="time-stat-card">
            <div class="ts-label">本周{{ viewType === 'expense' ? '支出' : '收入' }}</div>
            <div class="ts-value" :class="viewType">¥{{ fmt(weekAmount) }}</div>
            <div class="ts-count">{{ weekCount }} 笔</div>
          </div>
          <div class="time-stat-card">
            <div class="ts-label">本月{{ viewType === 'expense' ? '支出' : '收入' }}</div>
            <div class="ts-value" :class="viewType">¥{{ fmt(viewType === 'expense' ? monthExpense : monthIncome) }}</div>
            <div class="ts-count">{{ monthTypeCount }} 笔</div>
          </div>
        </div>

        <div class="breakdown-section" v-if="statsCategoryData.length">
          <div class="section-title">分类统计</div>
          <div class="cat-list">
            <div v-for="cat in statsCategoryData" :key="cat.id" class="cat-stat-row">
              <div class="cat-icon" :style="{ background: cat.color + '22', color: cat.color }">
                <i :class="'pi ' + cat.icon"></i>
              </div>
              <div class="cat-stat-info">
                <div class="cat-stat-header">
                  <span class="cat-name">{{ cat.name }}</span>
                  <span class="cat-amount" :class="viewType">¥{{ fmt(cat.total) }}</span>
                </div>
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" :style="{ width: cat.pct + '%', background: cat.color }"></div>
                </div>
                <div class="cat-pct">{{ cat.pct.toFixed(1) }}%</div>
              </div>
            </div>
          </div>
        </div>

        <div class="empty-state" v-else>
          <i class="pi pi-chart-pie"></i>
          <p>本月暂无{{ viewType === 'expense' ? '支出' : '收入' }}数据</p>
        </div>

        <div class="trend-section">
          <div class="section-title">近6个月趋势</div>
          <div class="trend-bars">
            <div v-for="m in trendData" :key="m.label" class="trend-bar-col">
              <div class="trend-bar-wrap">
                <div
                  class="trend-bar"
                  :style="{ height: m.pct + '%', background: viewType === 'expense' ? 'var(--mac-red)' : 'var(--mac-green)' }"
                ></div>
              </div>
              <div class="trend-label">{{ m.label }}</div>
              <div class="trend-val">¥{{ fmtShort(m.amount) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from '../store.js'

const emit = defineEmits(['add'])
const { state, getCategory, deleteRecord, recordsByMonth } = useStore()

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)
const activeTab = ref('overview')
const filter = ref('all')
const viewType = ref('expense')

const allFunds = ref([])

onMounted(async () => {
  if (window.api) allFunds.value = await window.api.getAllFunds()
})

const monthRecords = computed(() => recordsByMonth(currentYear.value, currentMonth.value))
const monthIncome = computed(() => monthRecords.value.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0))
const monthExpense = computed(() => monthRecords.value.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0))
const monthBalance = computed(() => monthIncome.value - monthExpense.value)
const recentRecords = computed(() => state.records.slice(0, 10))

// Funds overview stats
const fundsStats = computed(() => {
  const all = allFunds.value
  const totalIn = all.reduce((s, f) => s + f.in_amount * f.in_rate, 0)
  const totalOut = all.reduce((s, f) => s + (f.out_amount || 0) * (f.out_rate || 1), 0)
  return {
    totalIn,
    totalOut,
    totalProfit: totalOut - totalIn,
    totalCount: all.length,
    pendingCount: all.filter(f => f.status === '待出账').length,
    profitCount: all.filter(f => f.status === '盈利').length,
    lossCount: all.filter(f => f.status === '亏损').length,
  }
})

// Records tab
const filteredRecords = computed(() =>
  filter.value === 'all' ? monthRecords.value : monthRecords.value.filter(r => r.type === filter.value)
)

const groupedRecords = computed(() => {
  const groups = {}
  for (const r of filteredRecords.value) {
    const d = r.date
    if (!groups[d]) groups[d] = []
    groups[d].push(r)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, records]) => {
      const d = new Date(date)
      const dayExpense = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
      return {
        date,
        dateLabel: `${d.getMonth()+1}月${d.getDate()}日 ${['日','一','二','三','四','五','六'][d.getDay()]}`,
        dayExpense,
        records,
      }
    })
})

// Overview quick category stats (expense)
const categoryStats = computed(() => {
  const filtered = monthRecords.value.filter(r => r.type === 'expense')
  const total = filtered.reduce((s, r) => s + r.amount, 0)
  const map = {}
  for (const r of filtered) {
    if (!map[r.categoryId]) map[r.categoryId] = 0
    map[r.categoryId] += r.amount
  }
  return Object.entries(map)
    .map(([id, amt]) => {
      const cat = getCategory(id)
      return { id, name: cat.name || id, icon: cat.icon || 'pi-circle', color: cat.color || '#888', total: amt, pct: total ? (amt / total * 100) : 0 }
    })
    .sort((a, b) => b.total - a.total)
})

// Stats tab - time-based stats
const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
})

function getWeekStart() {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
const weekStartStr = getWeekStart()

const todayRecords = computed(() =>
  state.records.filter(r => r.type === viewType.value && r.date === todayStr.value)
)
const todayAmount = computed(() => todayRecords.value.reduce((s, r) => s + r.amount, 0))
const todayCount = computed(() => todayRecords.value.length)

const weekRecords = computed(() =>
  state.records.filter(r => r.type === viewType.value && r.date >= weekStartStr && r.date <= todayStr.value)
)
const weekAmount = computed(() => weekRecords.value.reduce((s, r) => s + r.amount, 0))
const weekCount = computed(() => weekRecords.value.length)

const monthTypeCount = computed(() => monthRecords.value.filter(r => r.type === viewType.value).length)

// Stats tab - category data based on viewType
const statsCategoryData = computed(() => {
  const filtered = monthRecords.value.filter(r => r.type === viewType.value)
  const total = filtered.reduce((s, r) => s + r.amount, 0)
  const map = {}
  for (const r of filtered) {
    if (!map[r.categoryId]) map[r.categoryId] = 0
    map[r.categoryId] += r.amount
  }
  return Object.entries(map)
    .map(([id, amt]) => {
      const cat = getCategory(id)
      return { id, name: cat.name || id, icon: cat.icon || 'pi-circle', color: cat.color || '#888', total: amt, pct: total ? (amt / total * 100) : 0 }
    })
    .sort((a, b) => b.total - a.total)
})

const trendData = computed(() => {
  const months = []
  for (let i = 5; i >= 0; i--) {
    let y = currentYear.value, m = currentMonth.value - i
    while (m <= 0) { m += 12; y-- }
    const recs = recordsByMonth(y, m)
    const amount = recs.filter(r => r.type === viewType.value).reduce((s, r) => s + r.amount, 0)
    months.push({ label: `${m}月`, amount })
  }
  const max = Math.max(...months.map(m => m.amount), 1)
  return months.map(m => ({ ...m, pct: (m.amount / max) * 80 + 5 }))
})

function prevMonth() {
  if (currentMonth.value === 1) { currentMonth.value = 12; currentYear.value-- }
  else currentMonth.value--
}
function nextMonth() {
  if (currentMonth.value === 12) { currentMonth.value = 1; currentYear.value++ }
  else currentMonth.value++
}
function getCat(id) { return getCategory(id) }
function fmt(v) { return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtShort(v) {
  if (v >= 10000) return (v / 10000).toFixed(1) + 'w'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return v.toFixed(0)
}
function formatDate(d) {
  const date = new Date(d)
  return `${date.getMonth()+1}/${date.getDate()}`
}
function doDelete(id) { deleteRecord(id) }
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--mac-bg);
}

.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(10px);
  gap: 12px;
  flex-shrink: 0;
}
.header-actions { display: flex; align-items: center; gap: 10px; }

.month-nav { display: flex; align-items: center; gap: 8px; }
.month-label { font-size: 14px; font-weight: 600; color: var(--mac-text); min-width: 90px; text-align: center; }
.nav-btn {
  width: 28px; height: 28px;
  border: none; background: transparent;
  border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--mac-text-secondary); font-size: 12px;
  transition: background 0.15s;
}
.nav-btn:hover { background: rgba(0,0,0,0.08); }

.view-tabs { display: flex; background: rgba(0,0,0,0.07); border-radius: 8px; padding: 2px; gap: 1px; }
.vtab {
  padding: 4px 12px; border: none; background: transparent;
  border-radius: 6px; font-size: 12px; cursor: pointer;
  color: var(--mac-text-secondary); transition: all 0.15s;
  display: flex; align-items: center; gap: 4px;
}
.vtab i { font-size: 11px; }
.vtab.active { background: #fff; color: var(--mac-text); font-weight: 500; box-shadow: var(--shadow-sm); }

.add-btn {
  width: 28px; height: 28px; border: none;
  background: var(--mac-accent); color: #fff;
  border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 13px; transition: opacity 0.15s;
}
.add-btn:hover { opacity: 0.85; }

/* Tab content */
.tab-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px 20px;
}

/* Overview Section Cards */
.overview-section {
  background: var(--mac-surface);
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.os-header {
  display: flex; align-items: center; gap: 8px;
}
.os-icon { font-size: 16px; color: var(--mac-accent); }
.os-title { font-size: 14px; font-weight: 600; color: var(--mac-text); }
.os-sub { font-size: 11px; color: var(--mac-text-secondary); margin-left: auto; }

/* Stats Cards */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.stat-card {
  background: rgba(0,0,0,0.03);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.stat-icon {
  width: 36px; height: 36px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; flex-shrink: 0;
}
.stat-card.income .stat-icon { background: rgba(52,199,89,0.15); color: var(--mac-green); }
.stat-card.expense .stat-icon { background: rgba(255,59,48,0.15); color: var(--mac-red); }
.stat-card.balance .stat-icon { background: rgba(0,122,255,0.15); color: var(--mac-accent); }
.stat-label { font-size: 11px; color: var(--mac-text-secondary); margin-bottom: 2px; }
.stat-value { font-size: 16px; font-weight: 600; color: var(--mac-text); }
.stat-value.pos { color: var(--mac-green); }
.stat-value.neg { color: var(--mac-red); }

/* Funds mini stats */
.funds-mini-stats {
  display: flex; gap: 16px; flex-wrap: wrap;
  padding-top: 4px;
}
.fms-item { display: flex; align-items: center; gap: 4px; }
.fms-label { font-size: 11px; color: var(--mac-text-secondary); }
.fms-val { font-size: 13px; font-weight: 600; color: var(--mac-text); }
.fms-val.warning { color: #ff9500; }
.fms-val.success { color: #34c759; }
.fms-val.danger { color: #ff3b30; }

/* Category preview */
.cat-list-preview { display: flex; flex-direction: column; gap: 5px; }
.cat-preview-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 8px;
  background: rgba(0,0,0,0.02);
  border-radius: 7px;
}
.cat-icon-sm {
  width: 26px; height: 26px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; flex-shrink: 0;
}
.cat-name-sm { font-size: 12px; font-weight: 500; color: var(--mac-text); min-width: 44px; }
.cat-bar-sm { flex: 1; height: 4px; background: rgba(0,0,0,0.06); border-radius: 2px; overflow: hidden; }
.cat-bar-fill-sm { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
.cat-amt-sm { font-size: 12px; font-weight: 600; color: var(--mac-text-secondary); min-width: 65px; text-align: right; }

/* Recent records */
.records-list { display: flex; flex-direction: column; gap: 4px; }
.record-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px;
  background: rgba(0,0,0,0.02);
  border-radius: 8px;
  transition: background 0.12s;
  cursor: default;
}
.record-item:hover { background: rgba(0,0,0,0.04); }
.record-cat-icon {
  width: 34px; height: 34px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}
.record-info { flex: 1; min-width: 0; }
.record-name { font-size: 13px; font-weight: 500; color: var(--mac-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.record-date-text { font-size: 11px; color: var(--mac-text-secondary); margin-top: 1px; }
.record-amount { font-size: 14px; font-weight: 600; flex-shrink: 0; }
.record-amount.income { color: var(--mac-green); }
.record-amount.expense { color: var(--mac-red); }

/* Records Tab */
.filter-bar {
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.filter-tabs { display: flex; background: rgba(0,0,0,0.07); border-radius: 8px; padding: 2px; gap: 1px; }
.ftab {
  padding: 4px 12px; border: none; background: transparent;
  border-radius: 6px; font-size: 12px; cursor: pointer;
  color: var(--mac-text-secondary); transition: all 0.15s;
}
.ftab.active { background: #fff; color: var(--mac-text); font-weight: 500; box-shadow: var(--shadow-sm); }
.filter-summary { display: flex; align-items: center; gap: 10px; font-size: 12px; }
.sum-item { color: var(--mac-text); }
.sum-item.income { color: var(--mac-green); }
.sum-item.expense { color: var(--mac-red); }
.sum-divider { color: var(--mac-border); }

.records-scroll { flex: 1; display: flex; flex-direction: column; gap: 14px; }

.date-group { display: flex; flex-direction: column; gap: 4px; }
.date-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 4px 4px;
  border-bottom: 1px solid var(--mac-border);
}
.date-text { font-size: 12px; color: var(--mac-text-secondary); font-weight: 500; }
.date-sum { font-size: 11px; color: var(--mac-red); }

.group-records { display: flex; flex-direction: column; gap: 3px; }
.record-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px;
  background: var(--mac-surface);
  border-radius: 9px;
  transition: background 0.12s;
}
.record-row:hover { background: rgba(255,255,255,0.95); }
.record-row:hover .del-btn { opacity: 1; }
.cat-icon {
  width: 34px; height: 34px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}
.rec-info { flex: 1; min-width: 0; }
.rec-title { font-size: 13px; font-weight: 500; color: var(--mac-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-sub { font-size: 11px; color: var(--mac-text-secondary); margin-top: 1px; }
.rec-amount { font-size: 14px; font-weight: 600; flex-shrink: 0; }
.rec-amount.income { color: var(--mac-green); }
.rec-amount.expense { color: var(--mac-red); }
.del-btn {
  width: 22px; height: 22px; border: none;
  background: rgba(255,59,48,0.12); color: var(--mac-red);
  border-radius: 50%; cursor: pointer; font-size: 10px;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.15s;
  flex-shrink: 0;
}
.del-btn:hover { background: rgba(255,59,48,0.22); }

/* Stats Tab */
.stats-toolbar { flex-shrink: 0; }
.type-tabs { display: flex; background: rgba(0,0,0,0.07); border-radius: 8px; padding: 2px; gap: 1px; width: fit-content; }

.stats-scroll { flex: 1; display: flex; flex-direction: column; gap: 20px; }

.total-card {
  background: var(--mac-surface); border-radius: 14px;
  padding: 20px 24px; text-align: center;
  box-shadow: var(--shadow-sm);
}
.total-label { font-size: 12px; color: var(--mac-text-secondary); margin-bottom: 6px; }
.total-amount { font-size: 32px; font-weight: 700; color: var(--mac-text); }
.total-amount.expense { color: var(--mac-red); }
.total-amount.income { color: var(--mac-green); }

/* Time stats row */
.time-stats-row {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
}
.time-stat-card {
  background: var(--mac-surface); border-radius: 12px;
  padding: 16px; text-align: center;
  box-shadow: var(--shadow-sm);
}
.ts-label { font-size: 11px; color: var(--mac-text-secondary); margin-bottom: 4px; font-weight: 500; }
.ts-value { font-size: 22px; font-weight: 700; }
.ts-value.expense { color: var(--mac-red); }
.ts-value.income { color: var(--mac-green); }
.ts-count { font-size: 11px; color: var(--mac-text-secondary); margin-top: 2px; }

.section-title { font-size: 14px; font-weight: 600; color: var(--mac-text); margin-bottom: 10px; }
.breakdown-section { display: flex; flex-direction: column; }
.cat-list { display: flex; flex-direction: column; gap: 8px; }
.cat-stat-row {
  display: flex; align-items: flex-start; gap: 10px;
  background: var(--mac-surface); border-radius: 10px; padding: 10px 12px;
}
.cat-stat-info { flex: 1; min-width: 0; }
.cat-stat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.cat-name { font-size: 13px; font-weight: 500; color: var(--mac-text); }
.cat-amount { font-size: 13px; font-weight: 600; }
.cat-amount.expense { color: var(--mac-red); }
.cat-amount.income { color: var(--mac-green); }
.progress-bar-bg { height: 4px; background: rgba(0,0,0,0.08); border-radius: 2px; overflow: hidden; }
.progress-bar-fill { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
.cat-pct { font-size: 10px; color: var(--mac-text-secondary); margin-top: 2px; }

.trend-section { display: flex; flex-direction: column; }
.trend-bars { display: flex; gap: 8px; align-items: flex-end; height: 120px; background: var(--mac-surface); border-radius: 12px; padding: 16px; }
.trend-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
.trend-bar-wrap { flex: 1; width: 100%; display: flex; align-items: flex-end; }
.trend-bar { width: 100%; border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.4s ease; }
.trend-label { font-size: 10px; color: var(--mac-text-secondary); }
.trend-val { font-size: 9px; color: var(--mac-text-secondary); }

/* Common */
.empty-state {
  text-align: center; padding: 40px 24px;
  color: var(--mac-text-secondary);
  background: rgba(0,0,0,0.02);
  border-radius: 12px;
}
.empty-state i { font-size: 32px; margin-bottom: 12px; display: block; }
.empty-state p { font-size: 13px; }
</style>
