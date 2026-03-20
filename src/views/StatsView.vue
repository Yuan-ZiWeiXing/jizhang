<template>
  <div class="stats-view">
    <div class="toolbar">
      <div class="month-nav">
        <button class="nav-btn" @click="prevMonth"><i class="pi pi-chevron-left"></i></button>
        <span class="month-label">{{ currentYear }}年{{ currentMonth }}月</span>
        <button class="nav-btn" @click="nextMonth"><i class="pi pi-chevron-right"></i></button>
      </div>
      <div class="type-tabs">
        <button :class="['tab', { active: viewType === 'expense' }]" @click="viewType = 'expense'">支出</button>
        <button :class="['tab', { active: viewType === 'income' }]" @click="viewType = 'income'">收入</button>
      </div>
    </div>

    <div class="stats-scroll">
      <!-- Total -->
      <div class="total-card">
        <div class="total-label">{{ viewType === 'expense' ? '本月支出' : '本月收入' }}</div>
        <div class="total-amount" :class="viewType">
          ¥{{ fmt(viewType === 'expense' ? monthExpense : monthIncome) }}
        </div>
      </div>

      <!-- Category breakdown -->
      <div class="breakdown-section" v-if="categoryStats.length">
        <div class="section-title">分类统计</div>
        <div class="cat-list">
          <div v-for="cat in categoryStats" :key="cat.id" class="cat-stat-row">
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

      <!-- Monthly trend -->
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
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../store.js'

const { state, getCategory, recordsByMonth } = useStore()

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)
const viewType = ref('expense')

const monthRecords = computed(() => recordsByMonth(currentYear.value, currentMonth.value))
const monthExpense = computed(() => monthRecords.value.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0))
const monthIncome = computed(() => monthRecords.value.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0))

const categoryStats = computed(() => {
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
function fmt(v) { return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtShort(v) {
  if (v >= 10000) return (v / 10000).toFixed(1) + 'w'
  if (v >= 1000) return (v / 1000).toFixed(1) + 'k'
  return v.toFixed(0)
}
</script>

<style scoped>
.stats-view { display: flex; flex-direction: column; height: 100%; }
.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(10px);
}
.month-nav { display: flex; align-items: center; gap: 8px; }
.month-label { font-size: 14px; font-weight: 600; color: var(--mac-text); min-width: 90px; text-align: center; }
.nav-btn {
  width: 26px; height: 26px; border: none; background: transparent;
  border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--mac-text-secondary); font-size: 11px; transition: background 0.15s;
}
.nav-btn:hover { background: rgba(0,0,0,0.08); }
.type-tabs { display: flex; background: rgba(0,0,0,0.07); border-radius: 8px; padding: 2px; gap: 1px; }
.tab { padding: 4px 14px; border: none; background: transparent; border-radius: 6px; font-size: 12px; cursor: pointer; color: var(--mac-text-secondary); transition: all 0.15s; }
.tab.active { background: #fff; color: var(--mac-text); font-weight: 500; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

.stats-scroll { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 20px; }

.total-card {
  background: var(--mac-surface); border-radius: 14px;
  padding: 20px 24px; text-align: center;
  box-shadow: var(--shadow-sm);
}
.total-label { font-size: 12px; color: var(--mac-text-secondary); margin-bottom: 6px; }
.total-amount { font-size: 32px; font-weight: 700; color: var(--mac-text); }
.total-amount.expense { color: var(--mac-red); }
.total-amount.income { color: var(--mac-green); }

.section-title { font-size: 14px; font-weight: 600; color: var(--mac-text); margin-bottom: 10px; }
.cat-list { display: flex; flex-direction: column; gap: 8px; }
.cat-stat-row {
  display: flex; align-items: flex-start; gap: 10px;
  background: var(--mac-surface); border-radius: 10px; padding: 10px 12px;
}
.cat-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; margin-top: 2px; }
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

.empty-state { text-align: center; padding: 40px; color: var(--mac-text-secondary); }
.empty-state i { font-size: 32px; margin-bottom: 10px; display: block; }
.empty-state p { font-size: 13px; }
</style>
