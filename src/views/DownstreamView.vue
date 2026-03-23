<template>
  <div class="downstream-page">
    <div class="ds-header">
      <span class="ds-title"><i class="pi pi-users"></i> 出货商管理</span>
      <Button label="添加出货商" icon="pi pi-plus" size="small" @click="showAdd = true" />
    </div>

    <div class="ds-list">
      <div v-if="!downstreams.length" class="ds-empty">
        <i class="pi pi-users"></i>
        <p>暂无出货商，点击添加</p>
      </div>
      <div v-for="ds in downstreams" :key="ds.id" class="ds-card">
        <div class="ds-card-header">
          <span class="ds-name">{{ ds.name }}</span>
          <div class="ds-actions">
            <Button icon="pi pi-list" text rounded size="small" @click="openRecords(ds)" title="查看记录" />
            <Button icon="pi pi-pencil" text rounded size="small" @click="openRename(ds)" />
            <Button icon="pi pi-plus-circle" text rounded size="small" severity="success" @click="openPrepaid(ds)" title="添加预付" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="doDelete(ds)" />
          </div>
        </div>
        <div class="ds-card-body" @click="openRecords(ds)" style="cursor:pointer">
          <div class="ds-stat">
            <span class="ds-stat-label">预付总额</span>
            <span class="ds-stat-val">¥{{ fmt(ds.prepaid || 0) }}</span>
          </div>
          <div class="ds-stat">
            <span class="ds-stat-label">已用</span>
            <span class="ds-stat-val expense">¥{{ fmt(ds.prepaid_used || 0) }}</span>
          </div>
          <div class="ds-stat">
            <span class="ds-stat-label">剩余</span>
            <span class="ds-stat-val" :class="remaining(ds) <= 0 ? 'danger' : 'income'">¥{{ fmt(remaining(ds)) }}</span>
          </div>
        </div>
        <div v-if="ds.prepaid && remaining(ds) <= 0" class="ds-warn">
          <i class="pi pi-exclamation-triangle"></i> 预付已用完
        </div>
      </div>
    </div>

    <Dialog v-model:visible="showAdd" modal header="添加出货商" :style="{width:'350px'}" :draggable="false">
      <div style="padding-top:8px; display:flex; flex-direction:column; gap:10px;">
        <div>
          <label class="field-label">名称</label>
          <InputText v-model="newName" placeholder="输入出货商名称" class="w-full" />
        </div>
        <div>
          <label class="field-label">初始预付金额（可选）</label>
          <InputNumber v-model="newPrepaid" class="w-full" :minFractionDigits="2" :min="0" prefix="¥ " placeholder="0.00" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showAdd = false" />
        <Button label="添加" icon="pi pi-plus" @click="doAdd" :disabled="!newName.trim()" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showRename" modal header="重命名出货商" :style="{width:'350px'}" :draggable="false">
      <div style="padding-top:8px">
        <InputText v-model="renameName" placeholder="输入新名称" class="w-full" />
      </div>
      <template #footer>
        <Button label="取消" text @click="showRename = false" />
        <Button label="保存" icon="pi pi-check" @click="doRename" :disabled="!renameName.trim()" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showPrepaid" modal header="添加预付金额" :style="{width:'350px'}" :draggable="false">
      <div style="padding-top:8px; display:flex; flex-direction:column; gap:8px;">
        <label style="font-size:13px; color:var(--mac-text-secondary)">出货商：{{ prepaidTarget?.name }}</label>
        <div v-if="prepaidTarget?.prepaid" style="font-size:12px; color:var(--mac-text-secondary)">
          当前预付：¥{{ fmt(prepaidTarget.prepaid) }}　剩余：¥{{ fmt(remaining(prepaidTarget)) }}
        </div>
        <InputNumber v-model="prepaidAmount" class="w-full" :minFractionDigits="2" :min="0" prefix="¥ " placeholder="输入追加金额" />
      </div>
      <template #footer>
        <Button label="取消" text @click="showPrepaid = false" />
        <Button label="添加" icon="pi pi-plus" @click="doPrepaid" :disabled="!prepaidAmount" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showRecords" modal :header="'消费记录 — ' + (recordsTarget?.name || '')" :style="{width:'700px', maxWidth:'95vw'}" :draggable="false">
      <div class="records-wrap">
        <div v-if="!dsRecords.length" class="ds-empty" style="padding:24px">
          <p>暂无消费记录</p>
        </div>
        <table v-else class="records-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>卡号</th>
              <th>出账金额</th>
              <th>汇率</th>
              <th>折合(¥)</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in dsRecords" :key="r.id">
              <td>{{ r.out_date || r.record_date || '-' }}</td>
              <td>{{ r.card_no }}</td>
              <td>{{ csym(r.currency) }}{{ fmt(r.out_amount) }}</td>
              <td>{{ r.out_rate }}</td>
              <td>¥{{ fmt((r.out_amount || 0) * (r.out_rate || 1)) }}</td>
              <td><span class="rec-status" :class="r.status === '已完成' ? 'done' : 'pending'">{{ r.status }}</span></td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right; font-weight:600">合计</td>
              <td style="font-weight:700">¥{{ fmt(dsRecordsTotal) }}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Dialog>

    <ConfirmDialog />
    <Toast />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'

const confirm = useConfirm()
const toast = useToast()

const downstreams = ref([])
const showAdd = ref(false)
const newName = ref('')
const newPrepaid = ref(0)
const showRename = ref(false)
const renameName = ref('')
const renameId = ref(null)
const showPrepaid = ref(false)
const prepaidTarget = ref(null)
const prepaidAmount = ref(0)
const showRecords = ref(false)
const recordsTarget = ref(null)
const dsRecords = ref([])

onMounted(load)

async function load() {
  if (window.api) downstreams.value = await window.api.getAllDownstreams()
}

function remaining(ds) {
  return (ds.prepaid || 0) - (ds.prepaid_used || 0)
}

function fmt(v) {
  return Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function doAdd() {
  if (!window.api || !newName.value.trim()) return
  const ds = await window.api.addDownstream(newName.value.trim())
  if (newPrepaid.value > 0) {
    await window.api.addDownstreamPrepaid(ds.id, newPrepaid.value)
  }
  newName.value = ''
  newPrepaid.value = 0
  showAdd.value = false
  await load()
  toast.add({ severity: 'success', summary: '已添加出货商', life: 2000 })
}

function openRename(ds) {
  renameId.value = ds.id
  renameName.value = ds.name
  showRename.value = true
}

async function doRename() {
  if (!window.api || !renameId.value) return
  await window.api.updateDownstream(renameId.value, renameName.value.trim())
  showRename.value = false
  await load()
  toast.add({ severity: 'success', summary: '已重命名', life: 2000 })
}

function openPrepaid(ds) {
  prepaidTarget.value = ds
  prepaidAmount.value = 0
  showPrepaid.value = true
}

async function doPrepaid() {
  if (!window.api || !prepaidTarget.value || !prepaidAmount.value) return
  await window.api.addDownstreamPrepaid(prepaidTarget.value.id, prepaidAmount.value)
  showPrepaid.value = false
  await load()
  toast.add({ severity: 'success', summary: '预付已追加', life: 2000 })
}

const currencySymbolMap = { USD: '$', EUR: '€', AUD: 'A$', CAD: 'C$' }
function csym(cur) { return currencySymbolMap[cur] || '$' }

const dsRecordsTotal = computed(() =>
  dsRecords.value.reduce((s, r) => s + (r.out_amount || 0) * (r.out_rate || 1), 0)
)

async function openRecords(ds) {
  recordsTarget.value = ds
  if (window.api) {
    const all = await window.api.getAllFunds()
    dsRecords.value = all.filter(f => f.downstream_id === ds.id)
  }
  showRecords.value = true
}

function doDelete(ds) {
  confirm.require({
    message: `确定删除出货商"${ds.name}"？关联的资金记录将取消关联。`,
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '删除',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: async () => {
      if (!window.api) return
      await window.api.deleteDownstream(ds.id)
      await load()
      toast.add({ severity: 'success', summary: '已删除', life: 2000 })
    },
  })
}
</script>

<style scoped>
.downstream-page {
  display: flex; flex-direction: column; height: 100%;
  background: var(--mac-bg); padding: 16px 20px;
}
.ds-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; flex-shrink: 0;
}
.ds-title {
  font-size: 16px; font-weight: 600; color: var(--mac-text);
  display: flex; align-items: center; gap: 8px;
}
.ds-title i { font-size: 18px; color: var(--mac-accent); }

.ds-list {
  flex: 1; overflow-y: auto;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px; align-content: start;
}
.ds-empty {
  grid-column: 1 / -1; text-align: center; padding: 60px 24px;
  color: var(--mac-text-secondary);
}
.ds-empty i { font-size: 36px; display: block; margin-bottom: 12px; }
.ds-empty p { font-size: 13px; }

.ds-card {
  background: var(--mac-surface); border-radius: 12px;
  padding: 14px 16px; box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column; gap: 10px;
}
.ds-card-header {
  display: flex; align-items: center; justify-content: space-between;
}
.ds-name { font-size: 15px; font-weight: 600; color: var(--mac-text); }
.ds-actions { display: flex; gap: 2px; }

.ds-card-body {
  display: flex; gap: 16px; flex-wrap: wrap;
}
.ds-stat { display: flex; flex-direction: column; gap: 2px; }
.ds-stat-label { font-size: 11px; color: var(--mac-text-secondary); font-weight: 500; }
.ds-stat-val { font-size: 15px; font-weight: 700; color: var(--mac-text); }
.ds-stat-val.income { color: #34c759; }
.ds-stat-val.expense { color: #e67e22; }
.ds-stat-val.danger { color: #ff3b30; }

.ds-warn {
  font-size: 12px; color: #ff3b30; font-weight: 500;
  display: flex; align-items: center; gap: 4px;
}

.field-label { font-size: 11px; font-weight: 600; color: var(--mac-text-secondary); text-transform: uppercase; display: block; margin-bottom: 4px; }

.records-wrap { max-height: 400px; overflow-y: auto; }
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
.records-table tfoot td {
  border-top: 2px solid var(--mac-border); border-bottom: none;
  padding-top: 10px;
}
.rec-status {
  display: inline-block; padding: 2px 8px; border-radius: 10px;
  font-size: 11px; font-weight: 600;
}
.rec-status.done { background: #d4edda; color: #155724; }
.rec-status.pending { background: #cce5ff; color: #004085; }
</style>
