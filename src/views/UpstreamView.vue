<template>
  <div class="upstream-page">
    <div class="us-header">
      <span class="us-title"><i class="pi pi-sitemap"></i> 供应商管理</span>
      <div class="us-toolbar-filters">
        <span class="us-tf-label">记账类型</span>
        <Select
          v-model="ledgerFilter"
          :options="ledgerFilterOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="全部"
          showClear
          class="us-tf-select"
        />
        <span class="us-tf-label">搜索</span>
        <InputText v-model="keyword" placeholder="供应商名称" class="us-search" />
      </div>
      <Button label="添加供应商" icon="pi pi-plus" size="small" @click="openAdd" />
    </div>

    <div class="us-list">
      <div v-if="!upstreams.length" class="us-empty">
        <i class="pi pi-sitemap"></i>
        <p>暂无供应商，点击添加</p>
      </div>
      <div v-else-if="!filteredUpstreams.length" class="us-empty">
        <i class="pi pi-filter-slash"></i>
        <p>当前记账类型下暂无供应商</p>
      </div>
      <div
        v-for="up in filteredUpstreams"
        :key="up.key"
        class="us-card"
        :class="{ 'us-card-disabled': !isUpEnabled(up) }"
      >
        <div class="us-card-header">
          <div class="us-name-row">
            <span class="us-name">{{ up.name }}</span>
          </div>
          <div class="us-ledger-row">
            <div class="us-ledger-tags">
              <Tag
                v-for="lid in up.ledger_types"
                :key="lid"
                :value="ledgerTypeLabel(lid)"
                severity="secondary"
              />
            </div>
          </div>
          <div class="us-op-row" @click.stop>
            <div class="us-enable-row">
              <span class="us-enable-label">启用</span>
              <InputSwitch
                :modelValue="isUpEnabled(up)"
                @update:modelValue="(v) => setUpEnabled(up, v)"
              />
            </div>
            <div class="us-actions">
              <Button icon="pi pi-list" text rounded size="small" @click="openRecords(up)" title="查看详情" />
              <Button icon="pi pi-history" text rounded size="small" @click="openPrepaidLogs(up)" title="预付日志" />
              <Button icon="pi pi-pencil" text rounded size="small" @click="openRename(up)" />
              <Button icon="pi pi-plus-circle" text rounded size="small" severity="success" @click="openPrepaid(up)" title="添加预付" />
              <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="deleteUpstream(up)" />
            </div>
          </div>
        </div>
        <div class="us-card-body" @click="openRecords(up)" style="cursor:pointer">
          <div class="us-stat">
            <span class="us-stat-label">预付总额</span>
            <span class="us-stat-val">¥{{ fmt(up.prepaid_total) }}</span>
          </div>
          <div class="us-stat">
            <span class="us-stat-label">已用</span>
            <span class="us-stat-val expense">¥{{ fmt(up.prepaid_used_total) }}</span>
          </div>
          <div class="us-stat">
            <span class="us-stat-label">剩余</span>
            <span class="us-stat-val" :class="remaining(up) <= 0 ? 'danger' : 'income'">¥{{ fmt(remaining(up)) }}</span>
          </div>
        </div>
        <div class="us-breakdown">
          <div v-for="lid in up.ledger_types" :key="lid" class="us-break-item">
            <span class="us-break-label">{{ ledgerTypeLabel(lid) }}</span>
            <span class="us-break-sub">预付 ¥{{ fmt(ledgerStats(up, lid).prepaid) }}</span>
            <span class="us-break-sub">已用 ¥{{ fmt(ledgerStats(up, lid).prepaid_used) }}</span>
          </div>
        </div>
        <div v-if="up.prepaid_total && remaining(up) <= 0" class="us-warn">
          <i class="pi pi-exclamation-triangle"></i> 预付已用完
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showAdd" modal header="添加供应商" :style="{ width: '420px' }" :draggable="false">
      <div class="form-stack">
        <div>
          <label class="field-label">归属记账类型（可多选）</label>
          <MultiSelect
            v-model="selectedLedgerIds"
            :options="ledgerMultiOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="选择侧栏「记账类型」下的模块"
            display="chip"
            :maxSelectedLabels="4"
            class="w-full"
            appendTo="body"
          />
        </div>
        <div>
          <label class="field-label">名称</label>
          <InputText v-model="newName" placeholder="输入供应商名称" class="w-full" @keyup.enter="submitAdd" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showAdd = false" />
        <Button label="添加" icon="pi pi-plus" @click="submitAdd" :disabled="!newName.trim() || !selectedLedgerIds.length" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showRename" modal header="编辑供应商" :style="{ width: '420px' }" :draggable="false">
      <div class="form-stack">
        <div>
          <label class="field-label">归属记账类型（可多选）</label>
          <MultiSelect
            v-model="renameLedgerIds"
            :options="ledgerMultiOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="选择侧栏「记账类型」下的模块"
            display="chip"
            :maxSelectedLabels="4"
            class="w-full"
            appendTo="body"
          />
          <p class="field-tip">取消某个类型时，会同时清掉该类型下这组供应商的关联。</p>
        </div>
        <div>
          <label class="field-label">名称</label>
          <InputText v-model="renameName" placeholder="输入名称" class="w-full" @keyup.enter="submitRename" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showRename = false" />
        <Button label="保存" icon="pi pi-check" @click="submitRename" :disabled="!renameName.trim() || !renameLedgerIds.length" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showPrepaid" modal header="添加预付金额" :style="{ width: '380px' }" :draggable="false">
      <div class="form-stack">
        <label class="prepaid-title">供应商：{{ prepaidTarget?.name }}</label>
        <div v-if="prepaidTarget?.ledger_types?.length > 1">
          <label class="field-label">记账类型</label>
          <Select
            v-model="prepaidLedgerId"
            :options="prepaidLedgerOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        <div class="prepaid-info" v-if="prepaidTarget && prepaidLedgerId">
          当前预付：¥{{ fmt(ledgerStats(prepaidTarget, prepaidLedgerId).prepaid) }}
          剩余：¥{{ fmt(ledgerStats(prepaidTarget, prepaidLedgerId).prepaid - ledgerStats(prepaidTarget, prepaidLedgerId).prepaid_used) }}
        </div>
        <InputNumber v-model="prepaidAmount" class="w-full" :minFractionDigits="2" :min="0" prefix="¥ " placeholder="输入追加金额" />
      </div>
      <template #footer>
        <Button label="取消" text @click="showPrepaid = false" />
        <Button label="添加" icon="pi pi-plus" @click="submitPrepaid" :disabled="!prepaidAmount || !prepaidLedgerId" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showRecords" modal :header="'供应商详情 — ' + (recordsTarget?.name || '')" :style="{ width: '940px', maxWidth: '95vw' }" :draggable="false">
      <div class="records-wrap">
        <div class="us-records-toolbar">
          <div v-if="showRecordLedgerFilter" class="us-rt-item">
            <span class="us-rt-label">记账类型</span>
            <Select
              v-model="recordLedgerFilter"
              :options="recordLedgerTypeSelectOptions"
              optionLabel="label"
              optionValue="value"
              class="us-rt-select"
            />
          </div>
          <div class="us-rt-item">
            <span class="us-rt-label">状态</span>
            <Select
              v-model="recordStatusFilter"
              :options="recordStatusOptions"
              placeholder="全部"
              showClear
              class="us-rt-select"
            />
          </div>
        </div>
        <div v-if="!filteredUpRecords.length" class="us-empty us-empty-inline">
          <p v-if="!upRecordsRaw.length">暂无关联记录</p>
          <p v-else>当前筛选下无记录</p>
        </div>
        <table v-else class="records-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>{{ effectiveRecordLedger === 'wire' ? '电汇信息' : '卡片信息' }}</th>
              <th>进账</th>
              <th>出账</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filteredUpRecords" :key="`${effectiveRecordLedger}-${r.id}`">
              <td>{{ r.record_date || r.out_date || '-' }}</td>
              <td>
                <template v-if="effectiveRecordLedger === 'wire'">
                  <div class="wire-record-inline">
                    <span class="card-inline">{{ r.code || '-' }}</span>
                    <span class="wire-record-sub">{{ r.name || '-' }}</span>
                  </div>
                </template>
                <template v-else>
                  <span class="card-inline">{{ r.card_no }} {{ r.card_date }} {{ r.cvv }}</span>
                </template>
              </td>
              <td>
                <template v-if="effectiveRecordLedger === 'wire'">
                  {{ csym(r.currency) }}{{ fmt(r.amount || 0) }}
                </template>
                <template v-else>
                  {{ csym(r.currency) }}{{ fmt(r.in_amount || 0) }}
                </template>
              </td>
              <td>{{ csym(r.currency) }}{{ fmt(recordOutAmount(r)) }}</td>
              <td><span class="rec-status" :class="recordStatusClass(r.status)">{{ r.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Dialog>

    <Dialog v-model:visible="showPrepaidLogs" modal :header="'预付日志 — ' + (logTarget?.name || '')" :style="{ width: '920px', maxWidth: '95vw' }" :draggable="false">
      <div class="records-wrap">
        <div class="us-records-toolbar">
          <div v-if="showLogLedgerFilter" class="us-rt-item">
            <span class="us-rt-label">记账类型</span>
            <Select
              v-model="logLedgerFilter"
              :options="logLedgerTypeOptions"
              optionLabel="label"
              optionValue="value"
              class="us-rt-select"
            />
          </div>
        </div>
        <div v-if="!filteredPrepaidLogs.length" class="us-empty us-empty-inline">
          <p>暂无预付日志</p>
        </div>
        <table v-else class="records-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>类型</th>
              <th>记账类型</th>
              <th>操作前</th>
              <th>操作</th>
              <th>操作后</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in filteredPrepaidLogs" :key="`${l.ledger_type || 'all'}-${l.id}-${l.target_id}`">
              <td>{{ l.created_at || '-' }}</td>
              <td><span class="rec-status" :class="l.event_type === 'consume' ? 'pending' : 'done'">{{ prepaidEventLabel(l.event_type) }}</span></td>
              <td>{{ logLedgerLabel(l.ledger_type) }}</td>
              <td>¥{{ fmt(l.balance_before || 0) }}</td>
              <td :class="l.event_type === 'consume' ? 'log-expense' : 'log-income'">
                {{ l.event_type === 'consume' ? '-' : '+' }}¥{{ fmt(l.amount || 0) }}
              </td>
              <td>¥{{ fmt(l.balance_after || 0) }}</td>
              <td>{{ l.note || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Dialog>

    <ConfirmDialog />
    <Toast />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ACCOUNTING_SUB_NAV } from '../config/accountingNav.js'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import InputSwitch from 'primevue/inputswitch'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'

const LEDGERS = ['funds', 'wire']
const ledgerApi = {
  funds: {
    list: () => window.api?.getAllFundGroups ? window.api.getAllFundGroups() : Promise.resolve([]),
    add: (name) => window.api?.addFundGroup ? window.api.addFundGroup(name) : Promise.resolve(null),
    rename: (id, name) => window.api?.renameFundGroup ? window.api.renameFundGroup(id, name) : Promise.resolve(null),
    setEnabled: (id, enabled) => window.api?.setFundGroupEnabled ? window.api.setFundGroupEnabled(id, enabled) : Promise.resolve(null),
    del: (id) => window.api?.deleteFundGroup ? window.api.deleteFundGroup(id) : Promise.resolve(null),
    addPrepaid: (id, amount) => window.api?.updateGroupPrepaid ? window.api.updateGroupPrepaid(id, amount) : Promise.resolve(null),
    listRecords: () => window.api?.getAllFunds ? window.api.getAllFunds() : Promise.resolve([]),
  },
  wire: {
    list: () => window.api?.getAllWireGroups ? window.api.getAllWireGroups() : Promise.resolve([]),
    add: (name) => window.api?.addWireGroup ? window.api.addWireGroup(name) : Promise.resolve(null),
    rename: (id, name) => window.api?.renameWireGroup ? window.api.renameWireGroup(id, name) : Promise.resolve(null),
    setEnabled: (id, enabled) => window.api?.setWireGroupEnabled ? window.api.setWireGroupEnabled(id, enabled) : Promise.resolve(null),
    del: (id) => window.api?.deleteWireGroup ? window.api.deleteWireGroup(id) : Promise.resolve(null),
    addPrepaid: (id, amount) => window.api?.updateWireGroupPrepaid ? window.api.updateWireGroupPrepaid(id, amount) : Promise.resolve(null),
    listRecords: () => window.api?.getAllWireTransfers ? window.api.getAllWireTransfers() : Promise.resolve([]),
  },
}

const confirm = useConfirm()
const toast = useToast()

const fundGroups = ref([])
const wireGroups = ref([])
const ledgerFilter = ref(null)
const keyword = ref('')

const showAdd = ref(false)
const showRename = ref(false)
const showPrepaid = ref(false)
const showRecords = ref(false)
const showPrepaidLogs = ref(false)
const newName = ref('')
const renameName = ref('')
const renameTarget = ref(null)
const prepaidTarget = ref(null)
const recordsTarget = ref(null)
const logTarget = ref(null)
const prepaidAmount = ref(0)
const prepaidLedgerId = ref(null)
const selectedLedgerIds = ref(['funds'])
const renameLedgerIds = ref(['funds'])
const upRecordsRaw = ref([])
const prepaidLogsRaw = ref([])
const recordLedgerFilter = ref('funds')
const recordStatusFilter = ref(null)
const logLedgerFilter = ref(null)

const ledgerFilterOptions = computed(() => [
  { label: '全部', value: null },
  ...ACCOUNTING_SUB_NAV.filter(s => LEDGERS.includes(s.id)).map(s => ({ label: s.label, value: s.id })),
])

const ledgerMultiOptions = computed(() =>
  ACCOUNTING_SUB_NAV.filter(s => LEDGERS.includes(s.id)).map(s => ({ label: s.label, value: s.id })),
)

function ledgerTypeLabel(id) {
  return ACCOUNTING_SUB_NAV.find(s => s.id === id)?.label || id
}

const upstreams = computed(() => {
  const map = new Map()

  const mergeRows = (rows, ledger) => {
    for (const row of rows) {
      const name = String(row.name || '').trim()
      if (!name) continue
      const key = name.toLowerCase()
      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          ledger_types: [],
          ledgers: {},
          prepaid_total: 0,
          prepaid_used_total: 0,
        })
      }
      const item = map.get(key)
      if (!item.ledger_types.includes(ledger)) item.ledger_types.push(ledger)
      if (!item.ledgers[ledger]) {
        item.ledgers[ledger] = { ids: [], prepaid: 0, prepaid_used: 0, created_at: row.created_at || '', enabled: isRowEnabled(row) }
      }
      item.ledgers[ledger].ids.push(row.id)
      item.ledgers[ledger].prepaid += Number(row.prepaid || 0)
      item.ledgers[ledger].prepaid_used += Number(row.prepaid_used || 0)
      item.ledgers[ledger].enabled = item.ledgers[ledger].enabled && isRowEnabled(row)
      if (!item.ledgers[ledger].created_at || row.created_at < item.ledgers[ledger].created_at) item.ledgers[ledger].created_at = row.created_at || ''
      item.prepaid_total += Number(row.prepaid || 0)
      item.prepaid_used_total += Number(row.prepaid_used || 0)
    }
  }

  mergeRows(fundGroups.value, 'funds')
  mergeRows(wireGroups.value, 'wire')

  return Array.from(map.values())
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
})

const filteredUpstreams = computed(() => {
  let list = upstreams.value
  if (ledgerFilter.value) {
    list = list.filter(item => item.ledger_types.includes(ledgerFilter.value))
  }
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(item => item.name.toLowerCase().includes(kw))
  }
  return list
})

const prepaidLedgerOptions = computed(() =>
  (prepaidTarget.value?.ledger_types || []).map(id => ({ label: ledgerTypeLabel(id), value: id })),
)
const recordStatusOptions = ['待进账', '待出账', '待结算', '已完成', '未完成']
const targetLedgerTypes = computed(() => recordsTarget.value?.ledger_types || [])
const showRecordLedgerFilter = computed(() => targetLedgerTypes.value.length > 1)
const recordLedgerTypeSelectOptions = computed(() =>
  targetLedgerTypes.value.map(id => ({ label: ledgerTypeLabel(id), value: id })),
)
const effectiveRecordLedger = computed(() => {
  const types = targetLedgerTypes.value
  if (!types.length) return 'funds'
  if (types.length === 1) return types[0]
  return recordLedgerFilter.value
})
const filteredUpRecords = computed(() => {
  let list = [...upRecordsRaw.value]
  if (recordStatusFilter.value) list = list.filter(r => r.status === recordStatusFilter.value)
  return list
})
const showLogLedgerFilter = computed(() => (logTarget.value?.ledger_types?.length || 0) > 1)
const logLedgerTypeOptions = computed(() => {
  const types = logTarget.value?.ledger_types || []
  return [{ label: '全部', value: null }, ...types.map(id => ({ label: ledgerTypeLabel(id), value: id }))]
})
const filteredPrepaidLogs = computed(() => {
  let list = [...prepaidLogsRaw.value]
  if (!logLedgerFilter.value) return list
  return list.filter(l => String(l.ledger_type || '') === '' || l.ledger_type === logLedgerFilter.value)
})

function remaining(item) {
  return (item?.prepaid_total || 0) - (item?.prepaid_used_total || 0)
}

function ledgerStats(item, ledgerId) {
  return item?.ledgers?.[ledgerId] || { ids: [], prepaid: 0, prepaid_used: 0, enabled: true }
}

function fmt(v) {
  return Number(v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const currencySymbolMap = { USD: '$', EUR: 'EUR', AUD: 'A$', CAD: 'C$' }
function csym(cur) { return currencySymbolMap[cur] || '$' }
function recordOutAmount(row) {
  if (effectiveRecordLedger.value === 'wire') return row.out_amount || 0
  return row.out_amount || 0
}
function recordStatusClass(status) {
  if (status === '已完成') return 'done'
  if (status === '待结算') return 'settle'
  return 'pending'
}
function prepaidEventLabel(type) {
  if (type === 'consume') return '消耗'
  if (type === 'recharge') return '追加'
  return type || '-'
}
function logLedgerLabel(ledger) {
  if (!ledger) return '通用'
  return ledgerTypeLabel(ledger)
}
function isRowEnabled(row) {
  return row == null || row.enabled == null || Number(row.enabled) === 1
}
function isUpEnabled(item) {
  return item?.ledger_types?.every(ledgerId => ledgerStats(item, ledgerId).enabled !== false) ?? true
}

async function loadAll() {
  const [funds, wire] = await Promise.all([
    ledgerApi.funds.list(),
    ledgerApi.wire.list(),
  ])
  fundGroups.value = funds || []
  wireGroups.value = wire || []
}

function openAdd() {
  newName.value = ''
  selectedLedgerIds.value = ledgerFilter.value ? [ledgerFilter.value] : ['funds']
  showAdd.value = true
}

async function setUpEnabled(item, enabled) {
  try {
    for (const ledger of item.ledger_types) {
      for (const id of ledgerStats(item, ledger).ids) {
        await ledgerApi[ledger]?.setEnabled?.(id, enabled)
      }
    }
    await loadAll()
    toast.add({ severity: 'success', summary: enabled ? '已启用' : '已停用', life: 1800 })
  } catch (e) {
    toast.add({ severity: 'error', summary: '更新失败', detail: String(e?.message || e), life: 3000 })
  }
}

async function submitAdd() {
  const name = newName.value.trim()
  if (!name || !selectedLedgerIds.value.length) return
  for (const ledger of selectedLedgerIds.value) {
    await ledgerApi[ledger]?.add?.(name)
  }
  showAdd.value = false
  await loadAll()
  toast.add({ severity: 'success', summary: '已添加供应商', life: 1800 })
}

function openRename(item) {
  renameTarget.value = item
  renameName.value = item.name
  renameLedgerIds.value = [...item.ledger_types]
  showRename.value = true
}

async function submitRename() {
  if (!renameTarget.value || !renameName.value.trim() || !renameLedgerIds.value.length) return
  const nextName = renameName.value.trim()
  const oldLedgers = new Set(renameTarget.value.ledger_types)
  const newLedgers = new Set(renameLedgerIds.value)

  for (const ledger of renameTarget.value.ledger_types) {
    if (newLedgers.has(ledger)) {
      for (const id of ledgerStats(renameTarget.value, ledger).ids) {
        await ledgerApi[ledger]?.rename?.(id, nextName)
      }
    }
  }

  for (const ledger of renameLedgerIds.value) {
    if (!oldLedgers.has(ledger)) {
      await ledgerApi[ledger]?.add?.(nextName)
    }
  }

  for (const ledger of renameTarget.value.ledger_types) {
    if (!newLedgers.has(ledger)) {
      for (const id of ledgerStats(renameTarget.value, ledger).ids) {
        await ledgerApi[ledger]?.del?.(id)
      }
    }
  }

  showRename.value = false
  await loadAll()
  toast.add({ severity: 'success', summary: '供应商已更新', life: 1800 })
}

function openPrepaid(item) {
  prepaidTarget.value = item
  prepaidAmount.value = 0
  prepaidLedgerId.value = ledgerFilter.value && item.ledger_types.includes(ledgerFilter.value)
    ? ledgerFilter.value
    : item.ledger_types[0] || null
  showPrepaid.value = true
}

async function openRecords(item) {
  recordsTarget.value = item
  recordLedgerFilter.value = item.ledger_types.includes('funds') ? 'funds' : (item.ledger_types[0] || 'funds')
  recordStatusFilter.value = null
  await refreshRecordRows(recordLedgerFilter.value)
  showRecords.value = true
}

async function openPrepaidLogs(item) {
  logTarget.value = item
  logLedgerFilter.value = null
  const rows = []
  for (const ledger of item.ledger_types) {
    for (const id of ledgerStats(item, ledger).ids) {
      if (!window.api?.getPrepaidLogsByTarget) continue
      const part = await window.api.getPrepaidLogsByTarget('upstream', id)
      rows.push(...(part || []).map(r => ({ ...r, ledger_type: r.ledger_type || ledger })))
    }
  }
  prepaidLogsRaw.value = rows.sort((a, b) => {
    const ta = String(a.created_at || '')
    const tb = String(b.created_at || '')
    if (ta !== tb) return tb.localeCompare(ta)
    return (b.id || 0) - (a.id || 0)
  })
  showPrepaidLogs.value = true
}

async function refreshRecordRows(ledger) {
  if (!recordsTarget.value) {
    upRecordsRaw.value = []
    return
  }
  const ids = new Set(ledgerStats(recordsTarget.value, ledger).ids)
  if (!ids.size) {
    upRecordsRaw.value = []
    return
  }
  const all = await ledgerApi[ledger]?.listRecords?.()
  upRecordsRaw.value = (all || []).filter(row => ids.has(row.group_id))
}

async function submitPrepaid() {
  if (!prepaidTarget.value || !prepaidLedgerId.value || !prepaidAmount.value) return
  const target = ledgerStats(prepaidTarget.value, prepaidLedgerId.value)
  const id = target.ids[0]
  if (!id) return
  await ledgerApi[prepaidLedgerId.value]?.addPrepaid?.(id, Number(prepaidAmount.value) || 0)
  showPrepaid.value = false
  await loadAll()
  toast.add({ severity: 'success', summary: '预付已追加', life: 1800 })
}

function deleteUpstream(item) {
  confirm.require({
    message: `确定删除供应商"${item.name}"？关联记录的供应商归属会被清空。`,
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '删除',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: async () => {
      for (const ledger of item.ledger_types) {
        for (const id of ledgerStats(item, ledger).ids) {
          await ledgerApi[ledger]?.del?.(id)
        }
      }
      await loadAll()
      toast.add({ severity: 'success', summary: '已删除供应商', life: 1800 })
    },
  })
}

onMounted(loadAll)

watch(recordLedgerFilter, async (ledger) => {
  if (!showRecords.value) return
  await refreshRecordRows(ledger || 'funds')
})
</script>

<style scoped>
.upstream-page {
  display: flex; flex-direction: column; height: 100%;
  background: var(--mac-bg); padding: 16px 20px;
}
.us-header {
  display: flex; flex-wrap: wrap; align-items: center; gap: 12px;
  justify-content: space-between;
  margin-bottom: 16px; flex-shrink: 0;
}
.us-toolbar-filters {
  display: flex; align-items: center; gap: 8px;
  flex: 1 1 auto;
  justify-content: center;
  min-width: 0;
}
.us-tf-label { font-size: 12px; font-weight: 600; color: var(--mac-text-secondary); white-space: nowrap; }
.us-tf-select { width: 160px; max-width: 100%; }
.us-enable-row { display: flex; align-items: center; gap: 6px; }
.us-enable-label { font-size: 12px; font-weight: 600; color: var(--mac-text-secondary); }
.us-title {
  font-size: 16px; font-weight: 600; color: var(--mac-text);
  display: flex; align-items: center; gap: 8px;
}
.us-title i { font-size: 18px; color: var(--mac-accent); }
.us-search { width: 160px; max-width: 100%; }
.us-list {
  flex: 1; overflow-y: auto;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px; align-content: start;
}
.us-empty {
  grid-column: 1 / -1; text-align: center; padding: 60px 24px;
  color: var(--mac-text-secondary);
}
.us-empty i { font-size: 36px; display: block; margin-bottom: 12px; }
.us-empty p { font-size: 13px; }
.us-card {
  background: var(--mac-surface); border-radius: 12px;
  padding: 14px 16px; box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column; gap: 10px;
}
.us-card-disabled { opacity: 0.72; }
.us-card-header {
  display: flex; flex-direction: column; gap: 8px;
}
.us-name-row,
.us-ledger-row {
  display: flex; align-items: center;
}
.us-op-row {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
}
.us-name { font-size: 16px; font-weight: 600; color: var(--mac-text); }
.us-ledger-tags {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
}
.us-actions { display: flex; gap: 2px; flex-wrap: wrap; margin-left: auto; }
.us-card-body {
  display: flex; gap: 16px; flex-wrap: wrap;
}
.us-stat {
  display: flex; flex-direction: column; gap: 2px;
}
.us-stat-label { font-size: 11px; color: var(--mac-text-secondary); font-weight: 500; }
.us-stat-val { font-size: 15px; font-weight: 700; color: var(--mac-text); }
.us-stat-val.expense { color: #e67e22; }
.us-stat-val.income { color: #34c759; }
.us-stat-val.danger { color: #ff3b30; }
.us-breakdown {
  display: flex; flex-direction: column; gap: 8px;
}
.us-break-item {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding-top: 2px;
}
.us-break-label {
  min-width: 42px; font-size: 12px; font-weight: 600; color: var(--mac-text-secondary);
}
.us-break-sub {
  font-size: 12px; color: var(--mac-text-secondary);
}
.us-warn {
  font-size: 12px; color: #ff3b30; font-weight: 500;
  display: flex; align-items: center; gap: 4px;
}
.records-wrap { max-height: 520px; overflow-y: auto; }
.us-records-toolbar {
  display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: flex-end;
  margin-bottom: 12px; padding-bottom: 12px;
  border-bottom: 1px solid var(--mac-border);
}
.us-rt-item { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.us-rt-label { font-size: 11px; font-weight: 600; color: var(--mac-text-secondary); }
.us-rt-select { width: 150px; }
.us-empty-inline { padding: 24px; }
.card-inline {
  font-family: 'SF Mono', 'Fira Mono', ui-monospace, monospace;
  font-size: 13px;
  letter-spacing: 0.3px;
  color: var(--mac-text);
  user-select: text;
}
.wire-record-inline { display: flex; flex-direction: column; gap: 2px; }
.wire-record-sub { font-size: 12px; color: var(--mac-text-secondary); }
.records-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.records-table th {
  text-align: left; padding: 8px 10px;
  background: rgba(0,0,0,0.04); font-weight: 600;
  color: var(--mac-text-secondary); font-size: 11px;
  text-transform: uppercase; border-bottom: 1px solid var(--mac-border);
}
.records-table td {
  padding: 7px 10px; border-bottom: 1px solid rgba(0,0,0,0.05);
  color: var(--mac-text);
}
.rec-status {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: 11px; font-weight: 600;
}
.rec-status.done { background: #d4edda; color: #155724; }
.rec-status.settle { background: #cce5ff; color: #004085; }
.rec-status.pending { background: #fff3cd; color: #856404; }
.log-expense { color: #e67e22; font-weight: 600; }
.log-income { color: #34c759; font-weight: 600; }
.form-stack {
  padding-top: 8px;
  display: flex; flex-direction: column; gap: 10px;
}
.field-label { display: inline-block; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: var(--mac-text-secondary); }
.field-tip { margin: 6px 0 0; font-size: 11px; color: var(--mac-text-secondary); }
.prepaid-title { font-size: 13px; color: var(--mac-text-secondary); }
.prepaid-info { font-size: 12px; color: var(--mac-text-secondary); }
.w-full { width: 100%; }
@media (max-width: 900px) {
  .us-list { grid-template-columns: 1fr; }
}
</style>
