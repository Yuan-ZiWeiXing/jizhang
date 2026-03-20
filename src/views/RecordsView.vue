<template>
  <div class="records-view">
    <!-- Toolbar -->
    <div class="toolbar">
      <div class="toolbar-left">
        <div class="month-nav">
          <button class="nav-btn" @click="prevMonth"><i class="pi pi-chevron-left"></i></button>
          <span class="month-label">{{ currentYear }}年{{ currentMonth }}月</span>
          <button class="nav-btn" @click="nextMonth"><i class="pi pi-chevron-right"></i></button>
        </div>
      </div>
      <div class="toolbar-right">
        <div class="filter-tabs">
          <button :class="['tab', { active: filter === 'all' }]" @click="filter = 'all'">全部</button>
          <button :class="['tab', { active: filter === 'expense' }]" @click="filter = 'expense'">支出</button>
          <button :class="['tab', { active: filter === 'income' }]" @click="filter = 'income'">收入</button>
        </div>
        <button class="add-btn" @click="$emit('add')">
          <i class="pi pi-plus"></i>
        </button>
      </div>
    </div>

    <!-- Summary bar -->
    <div class="summary-bar">
      <span class="sum-item income">收入 ¥{{ fmt(monthIncome) }}</span>
      <span class="sum-divider">|</span>
      <span class="sum-item expense">支出 ¥{{ fmt(monthExpense) }}</span>
      <span class="sum-divider">|</span>
      <span class="sum-item">结余 ¥{{ fmt(monthBalance) }}</span>
    </div>

    <!-- Records grouped by date -->
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
          <div
            v-for="record in group.records"
            :key="record.id"
            class="record-row"
          >
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
            <button class="del-btn" @click="deleteRecord(record.id)" title="删除">
              <i class="pi pi-times"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../store.js'

const emit = defineEmits(['add'])
const { getCategory, deleteRecord, recordsByMonth } = useStore()

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)
const filter = ref('all')

const monthRecords = computed(() => recordsByMonth(currentYear.value, currentMonth.value))
const filteredRecords = computed(() =>
  filter.value === 'all' ? monthRecords.value : monthRecords.value.filter(r => r.type === filter.value)
)

const monthIncome = computed(() => monthRecords.value.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0))
const monthExpense = computed(() => monthRecords.value.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0))
const monthBalance = computed(() => monthIncome.value - monthExpense.value)

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
</script>

<style scoped>
.records-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--mac-bg);
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(10px);
  gap: 12px;
}
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 10px; }
.month-nav { display: flex; align-items: center; gap: 8px; }
.month-label { font-size: 14px; font-weight: 600; color: var(--mac-text); min-width: 90px; text-align: center; }
.nav-btn {
  width: 26px; height: 26px; border: none; background: transparent;
  border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--mac-text-secondary); font-size: 11px; transition: background 0.15s;
}
.nav-btn:hover { background: rgba(0,0,0,0.08); }
.filter-tabs { display: flex; background: rgba(0,0,0,0.07); border-radius: 8px; padding: 2px; gap: 1px; }
.tab {
  padding: 4px 12px; border: none; background: transparent;
  border-radius: 6px; font-size: 12px; cursor: pointer;
  color: var(--mac-text-secondary); transition: all 0.15s;
}
.tab.active { background: #fff; color: var(--mac-text); font-weight: 500; box-shadow: var(--shadow-sm); }
.add-btn {
  width: 28px; height: 28px; border: none;
  background: var(--mac-accent); color: #fff;
  border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 13px; transition: opacity 0.15s;
}
.add-btn:hover { opacity: 0.85; }

.summary-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 20px;
  font-size: 12px;
  background: rgba(0,0,0,0.03);
  border-bottom: 1px solid var(--mac-border);
}
.sum-item { color: var(--mac-text); }
.sum-item.income { color: var(--mac-green); }
.sum-item.expense { color: var(--mac-red); }
.sum-divider { color: var(--mac-border); }

.records-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

.empty-state {
  text-align: center; padding: 60px 24px;
  color: var(--mac-text-secondary);
}
.empty-state i { font-size: 36px; margin-bottom: 12px; display: block; }
.empty-state p { font-size: 13px; }
</style>
