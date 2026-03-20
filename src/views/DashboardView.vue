<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dash-header">
      <div class="month-nav">
        <button class="nav-btn" @click="prevMonth"><i class="pi pi-chevron-left"></i></button>
        <span class="month-label">{{ currentYear }}年{{ currentMonth }}月</span>
        <button class="nav-btn" @click="nextMonth"><i class="pi pi-chevron-right"></i></button>
      </div>
    </div>

    <!-- Stats Cards -->
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

    <!-- Recent Records -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">最近记录</span>
        <button class="add-btn" @click="$emit('add')">
          <i class="pi pi-plus"></i> 新增
        </button>
      </div>

      <div class="records-list" v-if="recentRecords.length">
        <div
          v-for="record in recentRecords"
          :key="record.id"
          class="record-item"
        >
          <div class="record-cat-icon" :style="{ background: getCat(record.categoryId).color + '22', color: getCat(record.categoryId).color }">
            <i :class="'pi ' + (getCat(record.categoryId).icon || 'pi-circle')"></i>
          </div>
          <div class="record-info">
            <div class="record-name">{{ record.note || getCat(record.categoryId).name }}</div>
            <div class="record-date">{{ formatDate(record.date) }} · {{ getCat(record.categoryId).name }}</div>
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
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../store.js'

const emit = defineEmits(['add'])
const { state, getCategory, recordsByMonth } = useStore()

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)

const monthRecords = computed(() => recordsByMonth(currentYear.value, currentMonth.value))
const monthIncome = computed(() => monthRecords.value.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0))
const monthExpense = computed(() => monthRecords.value.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0))
const monthBalance = computed(() => monthIncome.value - monthExpense.value)
const recentRecords = computed(() => state.records.slice(0, 10))

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
function formatDate(d) {
  const date = new Date(d)
  return `${date.getMonth()+1}/${date.getDate()}`
}
</script>

<style scoped>
.dashboard {
  padding: 20px 24px;
  overflow-y: auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.dash-header {
  display: flex;
  align-items: center;
  justify-content: center;
}
.month-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0,0,0,0.05);
  border-radius: 20px;
  padding: 4px 4px;
}
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

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.stat-card {
  background: var(--mac-surface);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
}
.stat-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.stat-card.income .stat-icon { background: rgba(52,199,89,0.15); color: var(--mac-green); }
.stat-card.expense .stat-icon { background: rgba(255,59,48,0.15); color: var(--mac-red); }
.stat-card.balance .stat-icon { background: rgba(0,122,255,0.15); color: var(--mac-accent); }
.stat-label { font-size: 11px; color: var(--mac-text-secondary); margin-bottom: 2px; }
.stat-value { font-size: 18px; font-weight: 600; color: var(--mac-text); }
.stat-value.pos { color: var(--mac-green); }
.stat-value.neg { color: var(--mac-red); }

.section { display: flex; flex-direction: column; gap: 12px; }
.section-header { display: flex; justify-content: space-between; align-items: center; }
.section-title { font-size: 15px; font-weight: 600; color: var(--mac-text); }
.add-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 12px; border: none;
  background: var(--mac-accent); color: #fff;
  border-radius: 20px; font-size: 12px; font-weight: 500;
  cursor: pointer; transition: opacity 0.15s;
}
.add-btn:hover { opacity: 0.85; }

.records-list { display: flex; flex-direction: column; gap: 4px; }
.record-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px;
  background: var(--mac-surface);
  border-radius: 10px;
  transition: background 0.12s;
  cursor: default;
}
.record-item:hover { background: rgba(255,255,255,0.95); }
.record-cat-icon {
  width: 36px; height: 36px; border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; flex-shrink: 0;
}
.record-info { flex: 1; min-width: 0; }
.record-name { font-size: 13px; font-weight: 500; color: var(--mac-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.record-date { font-size: 11px; color: var(--mac-text-secondary); margin-top: 1px; }
.record-amount { font-size: 14px; font-weight: 600; flex-shrink: 0; }
.record-amount.income { color: var(--mac-green); }
.record-amount.expense { color: var(--mac-red); }

.empty-state {
  text-align: center; padding: 48px 24px;
  color: var(--mac-text-secondary);
  background: var(--mac-surface);
  border-radius: 12px;
}
.empty-state i { font-size: 32px; margin-bottom: 12px; display: block; }
.empty-state p { font-size: 13px; }
</style>
