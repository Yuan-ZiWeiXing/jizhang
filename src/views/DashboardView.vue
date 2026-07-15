<template>
  <div class="dashboard">
    <!-- Header -->
    <div class="dash-header">
      <div class="dash-title"><i class="pi pi-home"></i> 仪表盘</div>
      <div class="dash-right">
        <div class="view-tabs">
          <button
            v-for="t in RANGE_TABS"
            :key="t.id"
            :class="['vtab', { active: rangeMode === t.id }]"
            @click="setMode(t.id)"
          >{{ t.label }}</button>
        </div>
        <div class="day-nav">
          <button class="nav-btn" @click="shiftPeriod(-1)" :title="'上一' + navUnit"><i class="pi pi-chevron-left"></i></button>
          <DatePicker v-if="rangeMode === 'day'" v-model="selectedDate" dateFormat="yy-mm-dd" showIcon showButtonBar appendTo="body" class="dash-dp">
            <template #buttonbar>
              <div class="dp-btnbar">
                <Button size="small" label="今天" severity="secondary" @click="selectedDate = new Date()" />
                <Button size="small" label="昨天" severity="secondary" @click="selectedDate = yesterday()" />
              </div>
            </template>
          </DatePicker>
          <span v-else class="range-text">{{ rangeLabel }}</span>
          <button class="nav-btn" @click="shiftPeriod(1)" :title="'下一' + navUnit"><i class="pi pi-chevron-right"></i></button>
        </div>
        <span v-if="rangeMode === 'day'" class="dash-date">{{ rangeLabel }}</span>
        <button v-if="!isCurrentPeriod" class="today-btn" @click="selectedDate = new Date()">回到{{ currentTitle }}</button>
        <button class="refresh-btn" @click="loadData" title="刷新数据">
          <i class="pi pi-refresh"></i>
        </button>
      </div>
    </div>

    <div class="dash-body">
      <!-- 所选区间 · 记账类型合计 -->
      <div class="overview-section">
        <div class="os-header">
          <i class="pi pi-calendar os-icon"></i>
          <span class="os-title">{{ rangeTitle }}合计</span>
          <span class="os-sub">记账类型（{{ typeLabels }}）· {{ rangeLabel }}</span>
        </div>
        <div class="stats-row">
          <div class="stat-card income">
            <div class="stat-icon"><i class="pi pi-arrow-down-left"></i></div>
            <div class="stat-info">
              <div class="stat-label">{{ rangeTitle }}入账</div>
              <div class="stat-value">¥{{ fmt(totalDay.inAmount) }}</div>
              <div class="stat-count">{{ totalDay.inCount }} 笔</div>
            </div>
          </div>
          <div class="stat-card expense">
            <div class="stat-icon"><i class="pi pi-arrow-up-right"></i></div>
            <div class="stat-info">
              <div class="stat-label">{{ rangeTitle }}出账</div>
              <div class="stat-value">¥{{ fmt(totalDay.outAmount) }}</div>
              <div class="stat-count">{{ totalDay.outCount }} 笔</div>
            </div>
          </div>
          <div class="stat-card balance">
            <div class="stat-icon"><i class="pi pi-chart-line"></i></div>
            <div class="stat-info">
              <div class="stat-label">{{ rangeTitle }}盈利（已结算）</div>
              <div class="stat-value" :class="totalDay.profit >= 0 ? 'pos' : 'neg'">¥{{ fmt(totalDay.profit) }}</div>
              <div class="stat-count">{{ totalDay.profitCount }} 笔结算</div>
            </div>
          </div>
          <div class="stat-card unsettled" :class="{ clickable: totalDay.unsettledCount }" @click="totalDay.unsettledCount && (showUnsettled = true)">
            <div class="stat-icon"><i class="pi pi-hourglass"></i></div>
            <div class="stat-info">
              <div class="stat-label">{{ rangeTitle }}未结算</div>
              <div class="stat-value warn">¥{{ fmt(totalDay.unsettledAmount) }}</div>
              <div class="stat-count">{{ totalDay.unsettledCount }} 笔未结算</div>
            </div>
            <button v-if="totalDay.unsettledCount" class="detail-btn" @click.stop="showUnsettled = true">
              查看 <i class="pi pi-angle-right"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 所选区间 · 各记账类型明细 -->
      <div class="overview-section">
        <div class="os-header">
          <i class="pi pi-list os-icon"></i>
          <span class="os-title">各类型{{ rangeTitle }}明细</span>
        </div>
        <div class="type-grid">
          <div v-for="t in typeStats" :key="t.id" class="type-card">
            <div class="type-head">
              <span class="type-icon" :style="{ background: t.color + '1f', color: t.color }">
                <i :class="'pi ' + t.icon"></i>
              </span>
              <span class="type-name">{{ t.label }}</span>
              <span v-if="t.placeholder" class="type-tag">开发中</span>
            </div>
            <div class="type-rows">
              <div class="type-row">
                <span class="tr-label">入账</span>
                <span class="tr-value in">¥{{ fmt(t.stats.inAmount) }}</span>
                <span class="tr-count">{{ t.stats.inCount }} 笔</span>
              </div>
              <div class="type-row">
                <span class="tr-label">出账</span>
                <span class="tr-value out">¥{{ fmt(t.stats.outAmount) }}</span>
                <span class="tr-count">{{ t.stats.outCount }} 笔</span>
              </div>
              <div class="type-row">
                <span class="tr-label">盈利</span>
                <span class="tr-value" :class="t.stats.profit >= 0 ? 'pos' : 'neg'">¥{{ fmt(t.stats.profit) }}</span>
                <span class="tr-count">{{ t.stats.profitCount }} 笔结算</span>
              </div>
              <div class="type-row">
                <span class="tr-label">未结算</span>
                <span class="tr-value warn">¥{{ fmt(t.stats.unsettledAmount) }}</span>
                <span class="tr-count">{{ t.stats.unsettledCount }} 笔</span>
              </div>
              <!-- 各货币原币明细 -->
              <div class="type-cur-list" v-if="t.currencies && t.currencies.length">
                <div v-for="c in t.currencies" :key="c.currency" class="type-cur-row">
                  <span class="type-cur-tag">{{ c.currency }}</span>
                  <span class="type-cur-val in">进 {{ c.symbol }}{{ fmt(c.inOrig) }}</span>
                  <span class="type-cur-val out">出 {{ c.symbol }}{{ fmt(c.outOrig) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 未结算明细弹窗 -->
    <Dialog v-model:visible="showUnsettled" modal :header="rangeTitle + '未结算明细'" :style="{ width: '640px', maxWidth: '95vw' }" :draggable="false">
      <div class="us-body">
        <div class="us-summary">
          <span class="us-total">共 {{ unsettledRecords.length }} 笔 · 出账 ¥{{ fmt(totalDay.unsettledAmount) }} · 结算后盈利
            <b :class="unsettledProfitTotal >= 0 ? 'pos' : 'neg'">¥{{ fmt(unsettledProfitTotal) }}</b>
          </span>
        </div>

        <div class="us-section-title">按出账对象汇总（谁没结算）</div>
        <div class="us-who-list">
          <div v-for="w in unsettledByWho" :key="w.name" class="us-who-row">
            <span class="us-who-name">{{ w.name }}</span>
            <span class="us-who-count">{{ w.count }} 笔</span>
            <span class="us-who-amt">¥{{ fmt(w.amount) }}</span>
          </div>
        </div>

        <div class="us-section-title">明细列表</div>
        <div class="us-list">
          <div v-for="r in unsettledRecords" :key="r.id" class="us-row">
            <span class="us-tag" :style="{ background: r.color + '1f', color: r.color }">{{ r.typeLabel }}</span>
            <div class="us-info">
              <div class="us-code">{{ r.code }}</div>
              <div class="us-sub">出给 {{ r.outTo }}<span v-if="r.outDate"> · {{ r.outDate }}</span></div>
            </div>
            <div class="us-nums">
              <div class="us-amt">¥{{ fmt(r.amount) }}</div>
              <div class="us-profit" :class="r.profit >= 0 ? 'pos' : 'neg'">盈利 ¥{{ fmt(r.profit) }}</div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import { ACCOUNTING_SUB_NAV } from '../config/accountingNav.js'

const allFunds = ref([])
const allWires = ref([])

async function loadData() {
  if (!window.api) return
  allFunds.value = await window.api.getAllFunds()
  allWires.value = window.api.getAllWireTransfers ? await window.api.getAllWireTransfers() : []
}
onMounted(loadData)

// —— 时间区间选择（按日 / 本周 / 本月 / 本年）——
const pad = n => String(n).padStart(2, '0')
const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const RANGE_TABS = [
  { id: 'day', label: '今日' },
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
  { id: 'year', label: '本年' },
]
const rangeMode = ref('day')
const selectedDate = ref(new Date())
watch(selectedDate, (v) => { if (!v) selectedDate.value = new Date() })

function setMode(mode) {
  rangeMode.value = mode
  selectedDate.value = new Date()
}

function shiftPeriod(delta) {
  const d = new Date(selectedDate.value || new Date())
  if (rangeMode.value === 'week') d.setDate(d.getDate() + delta * 7)
  else if (rangeMode.value === 'month') { selectedDate.value = new Date(d.getFullYear(), d.getMonth() + delta, 1); return }
  else if (rangeMode.value === 'year') { selectedDate.value = new Date(d.getFullYear() + delta, 0, 1); return }
  else d.setDate(d.getDate() + delta)
  selectedDate.value = d
}
function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d
}

// 区间起止（周从周一开始，与全局设置一致）
const range = computed(() => {
  const a = new Date(selectedDate.value || new Date())
  const mode = rangeMode.value
  if (mode === 'week') {
    const s = new Date(a)
    const day = s.getDay() || 7
    s.setDate(s.getDate() - day + 1)
    const e = new Date(s)
    e.setDate(e.getDate() + 6)
    return { start: fmtDate(s), end: fmtDate(e) }
  }
  if (mode === 'month') {
    return { start: fmtDate(new Date(a.getFullYear(), a.getMonth(), 1)), end: fmtDate(new Date(a.getFullYear(), a.getMonth() + 1, 0)) }
  }
  if (mode === 'year') {
    return { start: `${a.getFullYear()}-01-01`, end: `${a.getFullYear()}-12-31` }
  }
  const d = fmtDate(a)
  return { start: d, end: d }
})

const isCurrentPeriod = computed(() => {
  const t = fmtDate(new Date())
  return t >= range.value.start && t <= range.value.end
})

const CURRENT_TITLES = { day: '今日', week: '本周', month: '本月', year: '本年' }
const currentTitle = computed(() => rangeMode.value === 'day' ? '今天' : CURRENT_TITLES[rangeMode.value])
const rangeTitle = computed(() => {
  if (isCurrentPeriod.value) return CURRENT_TITLES[rangeMode.value]
  const a = selectedDate.value || new Date()
  if (rangeMode.value === 'day') return `${a.getMonth() + 1}月${a.getDate()}日`
  if (rangeMode.value === 'week') return '当周'
  if (rangeMode.value === 'month') return `${a.getMonth() + 1}月`
  return `${a.getFullYear()}年`
})

const cnDate = (s) => {
  const [, m, d] = s.split('-').map(Number)
  return `${m}月${d}日`
}
const rangeLabel = computed(() => {
  const a = selectedDate.value || new Date()
  const { start, end } = range.value
  if (rangeMode.value === 'day') {
    return `${a.getFullYear()}年${a.getMonth() + 1}月${a.getDate()}日 周${['日','一','二','三','四','五','六'][a.getDay()]}`
  }
  if (rangeMode.value === 'week') return `${a.getFullYear()}年 ${cnDate(start)} - ${cnDate(end)}`
  if (rangeMode.value === 'month') return `${a.getFullYear()}年${a.getMonth() + 1}月`
  return `${a.getFullYear()}年全年`
})

const NAV_UNITS = { day: '天', week: '周', month: '月', year: '年' }
const navUnit = computed(() => NAV_UNITS[rangeMode.value])

// —— 统计口径（与「资金」「电汇」页面保持一致）——
const fundIn = f => (f.in_amount || 0) * (f.in_rate || 1)
const fundOut = f => (f.out_amount || 0) * (f.out_rate || 1)
const fundProfit = f => fundOut(f) - fundIn(f)
const wireIn = r => (r.amount || 0) * (r.in_rate || 0)
const wireOut = r => (r.out_amount || 0) * (r.out_rate || 1)
const wireProfit = r => wireOut(r) - wireIn(r)

// 区间口径：入账按 record_date，出账按 out_date，盈利按结算日（settled_date，兼容老数据回退）
// 未结算：区间内已出账（out_date 在区间内）但还没点结算的记录
function calcRange(list, start, end, inOf, outOf, profitOf) {
  const within = d => d >= start && d <= end
  const s = emptyStats()
  for (const r of list) {
    if (within(r.record_date || '') && inOf(r) > 0) { s.inAmount += inOf(r); s.inCount++ }
    if (within(r.out_date || '') && outOf(r) > 0) {
      s.outAmount += outOf(r); s.outCount++
      if (!r.settled) { s.unsettledAmount += outOf(r); s.unsettledCount++ }
    }
    if (r.settled && within(r.settled_date || r.out_date || r.record_date || '')) { s.profit += profitOf(r); s.profitCount++ }
  }
  return s
}

const emptyStats = () => ({ inAmount: 0, inCount: 0, outAmount: 0, outCount: 0, profit: 0, profitCount: 0, unsettledAmount: 0, unsettledCount: 0 })

const TYPE_COLORS = { funds: '#007aff', wire: '#af52de', one4all: '#ff9500' }

// 每个类型内部再按货币拆分原币进出
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', AUD: 'A$', CAD: 'C$' }
function calcCurrencies(list, start, end, inOf, outOf, inOrigOf, outOrigOf) {
  const within = d => d >= start && d <= end
  const map = {}
  const ensure = (c) => {
    if (!map[c]) map[c] = { currency: c, symbol: CURRENCY_SYMBOLS[c] || '$', inOrig: 0, outOrig: 0 }
    return map[c]
  }
  for (const r of list) {
    const c = r.currency || 'USD'
    if (within(r.record_date || '') && inOf(r) > 0) ensure(c).inOrig += inOrigOf(r)
    if (within(r.out_date || '') && outOf(r) > 0) ensure(c).outOrig += outOrigOf(r)
  }
  return Object.values(map)
    .filter(c => c.inOrig || c.outOrig)
    .sort((a, b) => (b.inOrig + b.outOrig) - (a.inOrig + a.outOrig))
}

const typeStats = computed(() => {
  const { start, end } = range.value
  const byId = {
    funds: calcRange(allFunds.value, start, end, fundIn, fundOut, fundProfit),
    wire: calcRange(allWires.value, start, end, wireIn, wireOut, wireProfit),
  }
  const currenciesById = {
    funds: calcCurrencies(allFunds.value, start, end, fundIn, fundOut, f => f.in_amount || 0, f => f.out_amount || 0),
    wire: calcCurrencies(allWires.value, start, end, wireIn, wireOut, w => w.amount || 0, w => w.out_amount || 0),
  }
  return ACCOUNTING_SUB_NAV.map(nav => ({
    ...nav,
    color: TYPE_COLORS[nav.id] || '#8e8e93',
    placeholder: !byId[nav.id],
    stats: byId[nav.id] || emptyStats(),
    currencies: currenciesById[nav.id] || [],
  }))
})

const totalDay = computed(() =>
  typeStats.value.reduce((acc, t) => {
    acc.inAmount += t.stats.inAmount
    acc.inCount += t.stats.inCount
    acc.outAmount += t.stats.outAmount
    acc.outCount += t.stats.outCount
    acc.profit += t.stats.profit
    acc.profitCount += t.stats.profitCount
    acc.unsettledAmount += t.stats.unsettledAmount
    acc.unsettledCount += t.stats.unsettledCount
    return acc
  }, emptyStats())
)

// —— 未结算明细 ——
const showUnsettled = ref(false)

const unsettledRecords = computed(() => {
  const { start, end } = range.value
  const within = d => d >= start && d <= end
  const list = []
  for (const f of allFunds.value) {
    if (!f.settled && fundOut(f) > 0 && within(f.out_date || '')) {
      list.push({
        id: 'f' + f.id, typeLabel: '资金', color: TYPE_COLORS.funds,
        code: f.card_no, outTo: f.out_to || '未填写', outDate: f.out_date || '',
        amount: fundOut(f), profit: fundProfit(f),
      })
    }
  }
  for (const w of allWires.value) {
    if (!w.settled && wireOut(w) > 0 && within(w.out_date || '')) {
      list.push({
        id: 'w' + w.id, typeLabel: '电汇', color: TYPE_COLORS.wire,
        code: w.code + (w.name ? ' · ' + w.name : ''), outTo: w.out_to || '未填写', outDate: w.out_date || '',
        amount: wireOut(w), profit: wireProfit(w),
      })
    }
  }
  return list.sort((a, b) => b.outDate.localeCompare(a.outDate))
})

const unsettledProfitTotal = computed(() => unsettledRecords.value.reduce((s, r) => s + r.profit, 0))

const unsettledByWho = computed(() => {
  const map = {}
  for (const r of unsettledRecords.value) {
    if (!map[r.outTo]) map[r.outTo] = { name: r.outTo, count: 0, amount: 0 }
    map[r.outTo].count++
    map[r.outTo].amount += r.amount
  }
  return Object.values(map).sort((a, b) => b.amount - a.amount)
})

const typeLabels = computed(() => ACCOUNTING_SUB_NAV.map(t => t.label).join(' + '))

function fmt(v) { return Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
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
  flex-shrink: 0;
  gap: 12px;
}
.dash-title {
  font-size: 15px; font-weight: 600; color: var(--mac-text);
  display: flex; align-items: center; gap: 8px;
  flex-shrink: 0;
}
.dash-title i { color: var(--mac-accent); }
.dash-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.dash-date { font-size: 12px; color: var(--mac-text-secondary); }

.view-tabs { display: flex; background: rgba(0,0,0,0.07); border-radius: 8px; padding: 2px; gap: 1px; }
.vtab {
  padding: 4px 12px; border: none; background: transparent;
  border-radius: 6px; font-size: 12px; cursor: pointer;
  color: var(--mac-text-secondary); transition: all 0.15s;
}
.vtab.active { background: #fff; color: var(--mac-text); font-weight: 500; box-shadow: var(--shadow-sm); }

.range-text {
  font-size: 12px; font-weight: 600; color: var(--mac-text);
  min-width: 130px; text-align: center;
}

.day-nav { display: flex; align-items: center; gap: 4px; }
.nav-btn {
  width: 26px; height: 26px;
  border: none; background: transparent;
  border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--mac-text-secondary); font-size: 11px;
  transition: background 0.15s;
  flex-shrink: 0;
}
.nav-btn:hover { background: rgba(0,0,0,0.08); color: var(--mac-text); }

.dash-dp :deep(.p-inputtext) {
  padding: 4px 10px;
  font-size: 12px;
  width: 108px;
}
.dp-btnbar { display: flex; gap: 8px; width: 100%; }

.today-btn {
  border: none; background: var(--mac-accent); color: #fff;
  border-radius: 6px; padding: 4px 10px; font-size: 12px;
  cursor: pointer; transition: opacity 0.15s;
}
.today-btn:hover { opacity: 0.85; }

.refresh-btn {
  width: 28px; height: 28px; border: none; background: transparent;
  border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--mac-text-secondary); font-size: 12px;
  transition: background 0.15s;
}
.refresh-btn:hover { background: rgba(0,0,0,0.08); color: var(--mac-text); }

.dash-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 20px 20px;
}

.overview-section {
  background: var(--mac-surface);
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.os-header { display: flex; align-items: center; gap: 8px; }
.os-icon { font-size: 16px; color: var(--mac-accent); }
.os-title { font-size: 14px; font-weight: 600; color: var(--mac-text); }
.os-sub { font-size: 11px; color: var(--mac-text-secondary); margin-left: auto; text-align: right; max-width: 60%; }

/* 合计卡片 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
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
.stat-card.unsettled .stat-icon { background: rgba(230,126,34,0.15); color: #e67e22; }
.stat-card.clickable { cursor: pointer; transition: background 0.15s; }
.stat-card.clickable:hover { background: rgba(230,126,34,0.08); }
.stat-label { font-size: 11px; color: var(--mac-text-secondary); margin-bottom: 2px; }
.stat-value { font-size: 17px; font-weight: 700; color: var(--mac-text); }
.stat-count { font-size: 10px; color: var(--mac-text-secondary); margin-top: 2px; }
.stat-value.pos { color: #2a9d4a; }
.stat-value.neg { color: #e0443e; }
.stat-value.warn { color: #e67e22; }

.detail-btn {
  margin-left: auto;
  align-self: center;
  border: none;
  background: rgba(230,126,34,0.14);
  color: #b35b12;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  transition: background 0.15s;
}
.detail-btn:hover { background: rgba(230,126,34,0.25); }
.detail-btn i { font-size: 10px; }

/* 各类型卡片 */
.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.type-card {
  background: rgba(0,0,0,0.03);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.type-head { display: flex; align-items: center; gap: 8px; }
.type-icon {
  width: 28px; height: 28px; border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; flex-shrink: 0;
}
.type-name { font-size: 13px; font-weight: 600; color: var(--mac-text); }

.type-cur-list {
  display: flex; flex-direction: column; gap: 4px;
  border-top: 1px dashed rgba(0,0,0,0.1);
  padding-top: 7px; margin-top: 2px;
}
.type-cur-row {
  display: flex; align-items: center; gap: 8px;
  font-size: 11px;
  padding: 0 2px;
}
.type-cur-tag {
  background: rgba(0,0,0,0.06);
  border-radius: 4px; padding: 1px 6px;
  font-size: 10px; font-weight: 700;
  color: var(--mac-text-secondary);
  flex-shrink: 0;
}
.type-cur-val { font-weight: 600; }
.type-cur-val.in { color: #2a9d4a; }
.type-cur-val.out { color: #e0443e; margin-left: auto; }
.type-tag {
  margin-left: auto;
  font-size: 10px; color: #856404;
  background: rgba(230,126,34,0.14);
  border-radius: 5px; padding: 1px 7px;
}
.type-rows { display: flex; flex-direction: column; gap: 5px; }
.type-row {
  display: flex; align-items: baseline; gap: 8px;
  padding: 5px 8px;
  background: rgba(255,255,255,0.55);
  border-radius: 7px;
}
.tr-label { font-size: 11px; color: var(--mac-text-secondary); min-width: 40px; }
.tr-value { font-size: 13px; font-weight: 700; color: var(--mac-text); }
.tr-value.in { color: #2a9d4a; }
.tr-value.out { color: #e0443e; }
.tr-value.pos { color: #2a9d4a; }
.tr-value.neg { color: #e0443e; }
.tr-value.warn { color: #e67e22; }
.tr-count { margin-left: auto; font-size: 10px; color: var(--mac-text-secondary); }

/* 未结算明细弹窗 */
.us-body { display: flex; flex-direction: column; gap: 12px; }
.us-summary {
  background: rgba(230,126,34,0.07);
  border: 1px solid rgba(230,126,34,0.22);
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--mac-text);
}
.us-summary b { font-weight: 700; }
.us-summary .pos { color: #2a9d4a; }
.us-summary .neg { color: #e0443e; }

.us-section-title { font-size: 12px; font-weight: 600; color: var(--mac-text-secondary); }

.us-who-list { display: flex; flex-direction: column; gap: 4px; }
.us-who-row {
  display: flex; align-items: center; gap: 10px;
  padding: 7px 10px;
  background: rgba(0,0,0,0.03);
  border-radius: 8px;
  font-size: 13px;
}
.us-who-name { font-weight: 600; color: var(--mac-text); }
.us-who-count { font-size: 11px; color: var(--mac-text-secondary); }
.us-who-amt { margin-left: auto; font-weight: 700; color: #e67e22; }

.us-list { display: flex; flex-direction: column; gap: 4px; max-height: 320px; overflow-y: auto; }
.us-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  background: rgba(0,0,0,0.03);
  border-radius: 8px;
}
.us-tag {
  font-size: 11px; font-weight: 600;
  border-radius: 5px; padding: 2px 8px;
  flex-shrink: 0;
}
.us-info { flex: 1; min-width: 0; }
.us-code { font-size: 13px; font-weight: 500; color: var(--mac-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.us-sub { font-size: 11px; color: var(--mac-text-secondary); margin-top: 1px; }
.us-nums { text-align: right; flex-shrink: 0; }
.us-amt { font-size: 13px; font-weight: 700; color: var(--mac-text); }
.us-profit { font-size: 11px; font-weight: 600; margin-top: 1px; }
.us-profit.pos { color: #2a9d4a; }
.us-profit.neg { color: #e0443e; }
</style>
