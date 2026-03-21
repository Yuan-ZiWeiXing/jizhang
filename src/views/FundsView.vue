<template>
  <div class="funds-view">
    <!-- Toolbar -->
    <div class="toolbar">
      <span class="view-title">资金管理</span>
      <div class="toolbar-actions">
        <Button icon="pi pi-plus" label="添加" size="small" @click="showAdd = true" />
        <Button icon="pi pi-download" label="导出" size="small" severity="secondary" @click="showExport = true" />
      </div>
    </div>

    <!-- DataTable -->
    <div class="table-wrap">
      <DataTable
        :value="funds"
        size="small"
        stripedRows
        scrollable
        scrollHeight="flex"
        contextMenu
        v-model:contextMenuSelection="ctxRow"
        @rowContextmenu="onRowCtx"
        :loading="loading"
        class="funds-table"
      >
        <Column field="card_no" header="卡号" style="min-width:160px" />
        <Column field="card_date" header="日期" style="width:80px" />
        <Column field="cvv" header="CVV" style="width:60px" />
        <Column field="status" header="状态" style="width:80px">
          <template #body="{data}">
            <Tag :severity="data.status === '完成' ? 'success' : 'warning'" :value="data.status" />
          </template>
        </Column>
        <Column header="进账" style="width:100px">
          <template #body="{data}">
            <span>{{ data.in_amount }} × {{ data.in_rate }}</span>
          </template>
        </Column>
        <Column header="出账" style="width:100px">
          <template #body="{data}">
            <span>{{ data.out_amount }} × {{ data.out_rate }}</span>
          </template>
        </Column>
        <Column header="盈利" style="width:100px">
          <template #body="{data}">
            <span :class="profit(data) >= 0 ? 'profit-pos' : 'profit-neg'">
              {{ profit(data).toFixed(2) }}
            </span>
          </template>
        </Column>
        <Column style="width:50px">
          <template #body="{data}">
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="deleteFund(data.id)" />
          </template>
        </Column>
        <template #empty>
          <div class="empty-tip"><i class="pi pi-inbox"></i><p>暂无数据，点击添加</p></div>
        </template>
      </DataTable>
    </div>

    <!-- Right-click menu -->
    <ContextMenu ref="ctxMenu" :model="ctxItems" />

    <!-- Add Dialog -->
    <Dialog v-model:visible="showAdd" modal header="添加资金记录" :style="{width:'420px'}" :draggable="false">
      <div class="form-body">
        <div class="form-hint">快速输入格式：<code>卡号 日期 CVV 状态 进账金额*进账汇率</code></div>
        <div class="form-hint-eg">例：5214160092182610 04/30 188 完成 600*5.95</div>
        <Textarea v-model="quickInput" rows="2" placeholder="粘贴快捷格式..." class="w-full" @input="parseQuick" autoResize />
        <Divider />
        <div class="form-grid">
          <div class="form-field">
            <label>卡号</label>
            <InputText v-model="form.card_no" class="w-full" />
          </div>
          <div class="form-field">
            <label>日期</label>
            <InputText v-model="form.card_date" placeholder="04/30" class="w-full" />
          </div>
          <div class="form-field">
            <label>CVV</label>
            <InputText v-model="form.cvv" class="w-full" />
          </div>
          <div class="form-field">
            <label>状态</label>
            <Select v-model="form.status" :options="['完成','未完成']" class="w-full" />
          </div>
          <div class="form-field">
            <label>进账金额</label>
            <InputNumber v-model="form.in_amount" class="w-full" :minFractionDigits="2" />
          </div>
          <div class="form-field">
            <label>进账汇率</label>
            <InputNumber v-model="form.in_rate" class="w-full" :minFractionDigits="4" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showAdd = false" />
        <Button label="保存" icon="pi pi-check" @click="submitAdd" :disabled="!form.card_no" />
      </template>
    </Dialog>

    <!-- Edit Out Dialog -->
    <Dialog v-model:visible="showEdit" modal header="编辑出账信息" :style="{width:'320px'}" :draggable="false">
      <div class="form-grid" style="margin-top:8px">
        <div class="form-field">
          <label>出账金额</label>
          <InputNumber v-model="editForm.out_amount" class="w-full" :minFractionDigits="2" />
        </div>
        <div class="form-field">
          <label>出账汇率</label>
          <InputNumber v-model="editForm.out_rate" class="w-full" :minFractionDigits="4" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showEdit = false" />
        <Button label="保存" icon="pi pi-check" @click="submitEdit" />
      </template>
    </Dialog>

    <!-- Export Dialog -->
    <Dialog v-model:visible="showExport" modal header="导出数据" :style="{width:'460px'}" :draggable="false">
      <div class="export-body">
        <div class="form-field">
          <label>时间范围</label>
          <div class="export-range">
            <DatePicker v-model="exportStart" dateFormat="yy-mm-dd" placeholder="开始日期" showIcon />
            <span style="color:var(--mac-text-secondary)">至</span>
            <DatePicker v-model="exportEnd" dateFormat="yy-mm-dd" placeholder="结束日期" showIcon />
            <Button label="全部" text size="small" @click="exportStart=null;exportEnd=null" />
          </div>
        </div>
        <div class="form-field" style="margin-top:14px">
          <label>导出字段</label>
          <div class="field-checks">
            <div v-for="f in exportFields" :key="f.key" class="field-check">
              <Checkbox v-model="f.checked" :inputId="f.key" binary />
              <label :for="f.key">{{ f.label }}</label>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showExport = false" />
        <Button label="导出 CSV" icon="pi pi-file" @click="doExport" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import Divider from 'primevue/divider'
import ContextMenu from 'primevue/contextmenu'
import Checkbox from 'primevue/checkbox'
import DatePicker from 'primevue/datepicker'
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const funds = ref([])
const loading = ref(false)
const showAdd = ref(false)
const showEdit = ref(false)
const showExport = ref(false)
const ctxRow = ref(null)
const ctxMenu = ref(null)

const emptyForm = () => ({ card_no: '', card_date: '', cvv: '', status: '完成', in_amount: 0, in_rate: 1, out_amount: 0, out_rate: 1 })
const form = ref(emptyForm())
const quickInput = ref('')
const editForm = ref({ out_amount: 0, out_rate: 1 })
const editId = ref(null)

const exportStart = ref(null)
const exportEnd = ref(null)
const exportFields = ref([
  { key: 'card_no', label: '卡号', checked: true },
  { key: 'card_date', label: '日期', checked: true },
  { key: 'cvv', label: 'CVV', checked: true },
  { key: 'status', label: '状态', checked: true },
  { key: 'in_amount', label: '进账金额', checked: true },
  { key: 'in_rate', label: '进账汇率', checked: true },
  { key: 'out_amount', label: '出账金额', checked: true },
  { key: 'out_rate', label: '出账汇率', checked: true },
  { key: 'profit', label: '盈利', checked: true },
])

const ctxItems = [
  { label: '编辑出账信息', icon: 'pi pi-pencil', command: () => openEdit() },
  { separator: true },
  { label: '删除', icon: 'pi pi-trash', command: () => ctxRow.value && deleteFund(ctxRow.value.id) },
]

onMounted(load)

async function load() {
  loading.value = true
  funds.value = window.api ? await window.api.getAllFunds() : []
  loading.value = false
}

function profit(row) {
  return (row.in_amount * row.in_rate) - (row.out_amount * row.out_rate)
}

function onRowCtx(e) {
  ctxMenu.value.show(e.originalEvent)
}

function openEdit() {
  if (!ctxRow.value) return
  editId.value = ctxRow.value.id
  editForm.value = { out_amount: ctxRow.value.out_amount, out_rate: ctxRow.value.out_rate }
  showEdit.value = true
}

function parseQuick() {
  const parts = quickInput.value.trim().split(/\s+/)
  if (parts.length >= 5) {
    form.value.card_no = parts[0]
    form.value.card_date = parts[1]
    form.value.cvv = parts[2]
    form.value.status = parts[3]
    const [amt, rate] = (parts[4] || '').split('*')
    form.value.in_amount = parseFloat(amt) || 0
    form.value.in_rate = parseFloat(rate) || 1
  }
}

async function submitAdd() {
  if (!window.api) return
  const saved = await window.api.addFund({
    card_no: form.value.card_no,
    card_date: form.value.card_date,
    cvv: form.value.cvv,
    status: form.value.status,
    in_amount: form.value.in_amount,
    in_rate: form.value.in_rate,
    out_amount: form.value.out_amount,
    out_rate: form.value.out_rate,
  })
  funds.value.unshift(saved)
  form.value = emptyForm()
  quickInput.value = ''
  showAdd.value = false
  toast.add({ severity: 'success', summary: '已添加', life: 2000 })
}

async function submitEdit() {
  if (!window.api) return
  const updated = await window.api.updateFundOut(editId.value, editForm.value)
  const idx = funds.value.findIndex(f => f.id === editId.value)
  if (idx !== -1) funds.value[idx] = updated
  showEdit.value = false
  toast.add({ severity: 'success', summary: '已更新', life: 2000 })
}

async function deleteFund(id) {
  if (!window.api) return
  await window.api.deleteFund(id)
  funds.value = funds.value.filter(f => f.id !== id)
  toast.add({ severity: 'info', summary: '已删除', life: 2000 })
}

async function doExport() {
  let data = funds.value
  if (exportStart.value || exportEnd.value) {
    const s = exportStart.value ? fmtDate(exportStart.value) : '0000-01-01'
    const e = exportEnd.value ? fmtDate(exportEnd.value) : '9999-12-31'
    if (window.api) data = await window.api.getFundsByDateRange(s, e)
  }
  const fields = exportFields.value.filter(f => f.checked)
  const header = fields.map(f => f.label).join(',')
  const rows = data.map(row => {
    return fields.map(f => {
      if (f.key === 'profit') return profit(row).toFixed(2)
      return String(row[f.key] ?? '')
    }).join(',')
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `资金记录_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  showExport.value = false
  toast.add({ severity: 'success', summary: '导出成功', life: 2000 })
}

function fmtDate(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}
</script>

<style scoped>
.funds-view { display: flex; flex-direction: column; height: 100%; background: var(--mac-bg); }
.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(10px);
}
.view-title { font-size: 15px; font-weight: 600; color: var(--mac-text); }
.toolbar-actions { display: flex; gap: 8px; }
.table-wrap { flex: 1; overflow: hidden; padding: 12px; }
.profit-pos { color: #34c759; font-weight: 600; }
.profit-neg { color: #ff3b30; font-weight: 600; }
.empty-tip { text-align: center; padding: 40px; color: var(--mac-text-secondary); }
.empty-tip i { font-size: 32px; display: block; margin-bottom: 8px; }
.empty-tip p { font-size: 13px; }

.form-body { display: flex; flex-direction: column; gap: 10px; }
.form-hint { font-size: 12px; color: var(--mac-text-secondary); }
.form-hint-eg { font-size: 11px; color: var(--mac-accent, #007aff); font-family: monospace; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 11px; font-weight: 600; color: var(--mac-text-secondary); text-transform: uppercase; }
.w-full { width: 100%; }

.export-body { display: flex; flex-direction: column; gap: 12px; }
.export-range { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.field-checks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 6px; }
.field-check { display: flex; align-items: center; gap: 6px; font-size: 13px; }
</style>
