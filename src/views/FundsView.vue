<template>
  <div class="funds-view">
    <!-- Toolbar -->
    <div class="toolbar">
      <span class="view-title">资金管理</span>
      <div class="toolbar-actions">
        <Button icon="pi pi-plus" label="添加" size="small" @click="showAdd = true" :disabled="activeGroup === null" />
        <Button icon="pi pi-upload" label="批量导入" size="small" severity="secondary" @click="openBatch" :disabled="activeGroup === null" />
        <Button icon="pi pi-download" label="导出" size="small" severity="secondary" @click="showExport = true" />
      </div>
    </div>

    <!-- Group Tabs -->
    <div class="group-tabs">
      <div class="tab-list">
        <div class="tab-item" :class="{active: activeGroup === null}" @click="switchGroup(null)">全部</div>
        <div
          v-for="g in groups" :key="g.id"
          class="tab-item"
          :class="{active: activeGroup === g.id}"
          @click="switchGroup(g.id)"
          @dblclick="startRename(g)"
          @contextmenu.prevent="onGroupCtx($event, g)"
        >
          <span>{{ g.name }}</span>
          <i class="pi pi-times tab-close" @click.stop="deleteGroup(g.id)"></i>
        </div>
        <div class="tab-add" @click="showAddGroup = true"><i class="pi pi-plus"></i></div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-item">
        <label>入账时间</label>
        <DatePicker v-model="filterRecordRange" selectionMode="range" :manualInput="false" dateFormat="yy-mm-dd" placeholder="选择日期范围" showIcon showButtonBar appendTo="body" class="filter-date-range">
          <template #buttonbar="{ clearCallback }">
            <div class="dp-btnbar">
              <Button size="small" label="今天" severity="secondary" @click="filterRecordRange = daysRange(0)" />
              <Button size="small" label="近3天" severity="secondary" @click="filterRecordRange = daysRange(3)" />
              <Button size="small" label="近7天" severity="secondary" @click="filterRecordRange = daysRange(7)" />
              <Button size="small" label="近30天" severity="secondary" @click="filterRecordRange = daysRange(30)" />
              <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback" />
            </div>
          </template>
        </DatePicker>
      </div>
      <div class="filter-item">
        <label>出账时间</label>
        <DatePicker v-model="filterOutRange" selectionMode="range" :manualInput="false" dateFormat="yy-mm-dd" placeholder="选择日期范围" showIcon showButtonBar appendTo="body" class="filter-date-range">
          <template #buttonbar="{ clearCallback }">
            <div class="dp-btnbar">
              <Button size="small" label="今天" severity="secondary" @click="filterOutRange = daysRange(0)" />
              <Button size="small" label="近3天" severity="secondary" @click="filterOutRange = daysRange(3)" />
              <Button size="small" label="近7天" severity="secondary" @click="filterOutRange = daysRange(7)" />
              <Button size="small" label="近30天" severity="secondary" @click="filterOutRange = daysRange(30)" />
              <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback" />
            </div>
          </template>
        </DatePicker>
      </div>
      <div class="filter-item">
        <label>状态</label>
        <Select v-model="filterStatus" :options="statusOptions" placeholder="全部" showClear class="filter-select" />
      </div>
      <div class="filter-item">
        <label>出给谁</label>
        <InputText v-model="filterOutTo" placeholder="搜索..." class="filter-text" />
      </div>
      <Button v-if="hasActiveFilter" label="清除筛选" icon="pi pi-filter-slash" text size="small" @click="clearFilters" />
    </div>

    <!-- Batch Actions Bar -->
    <div v-if="selectedFunds.length" class="batch-bar">
      <span class="batch-info">已选 {{ selectedFunds.length }} 项</span>
      <Button label="批量出账" icon="pi pi-pencil" size="small" @click="openBatchEdit" />
      <Button label="批量删除" icon="pi pi-trash" size="small" severity="danger" @click="batchDelete" />
      <Button label="取消选择" text size="small" @click="selectedFunds = []" />
    </div>

    <!-- DataTable -->
    <div class="table-wrap">
      <div v-if="activeGroup === null && !funds.length" class="group-hint">
        <i class="pi pi-folder-open"></i>
        <p>请先选择或新建一个分组，再添加记录</p>
      </div>
      <DataTable
        :value="filteredFunds"
        v-model:selection="selectedFunds"
        dataKey="id"
        stripedRows
        scrollable
        scrollHeight="flex"
        paginator
        :rows="50"
        :rowsPerPageOptions="[20, 50, 100, 200]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport"
        currentPageReportTemplate="共 {totalRecords} 条，第 {first}-{last} 条"
        contextMenu
        v-model:contextMenuSelection="ctxRow"
        @rowContextmenu="onRowCtx"
        :loading="loading"
        class="funds-table"
      >
        <Column selectionMode="multiple" style="width:48px" />
        <Column field="record_date" header="日期" style="min-width:110px">
          <template #body="{data}">
            <span v-if="data.record_date" class="record-date">{{ data.record_date }}</span>
            <span v-else class="no-data">-</span>
          </template>
        </Column>
        <Column header="卡片信息" style="min-width:240px">
          <template #body="{data}">
            <span class="card-inline">{{ data.card_no }} {{ data.card_date }} {{ data.cvv }}</span>
          </template>
        </Column>
        <Column v-if="activeGroup === null" header="分组" style="min-width:90px">
          <template #body="{data}">
            <Tag v-if="groupName(data.group_id)" :value="groupName(data.group_id)" severity="secondary" />
            <span v-else class="no-data">-</span>
          </template>
        </Column>
        <Column field="status" header="状态" style="min-width:80px">
          <template #body="{data}">
            <Tag :severity="data.status === '盈利' ? 'success' : data.status === '亏损' ? 'danger' : 'warning'" :value="data.status" />
          </template>
        </Column>
        <Column header="进账" style="min-width:150px">
          <template #body="{data}">
            <div class="amount-cell">
              <span class="amount-val income">¥{{ fmtNum(data.in_amount) }}</span>
              <span class="amount-rate">× {{ data.in_rate }}</span>
              <span class="amount-total">= ¥{{ fmtNum(data.in_amount * data.in_rate) }}</span>
            </div>
          </template>
        </Column>
        <Column header="出账" style="min-width:180px">
          <template #body="{data}">
            <div v-if="data.out_amount" class="amount-cell">
              <span class="amount-val expense">¥{{ fmtNum(data.out_amount) }}</span>
              <span class="amount-rate">× {{ data.out_rate }}</span>
              <span class="amount-total">= ¥{{ fmtNum(data.out_amount * data.out_rate) }}</span>
              <span v-if="data.out_date || data.out_to" class="out-meta">
                <span v-if="data.out_date" class="out-date">{{ data.out_date }}</span>
                <span v-if="data.out_to" class="out-to">→ {{ data.out_to }}</span>
              </span>
            </div>
            <span v-else class="no-data">未出账</span>
          </template>
        </Column>
        <Column header="盈利" style="min-width:120px">
          <template #body="{data}">
            <div v-if="data.out_amount" class="profit-cell" :class="profit(data) >= 0 ? 'profit-pos' : 'profit-neg'">
              <i :class="profit(data) >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" style="font-size:11px"></i>
              ¥{{ fmtNum(Math.abs(profit(data))) }}
            </div>
            <span v-else class="no-data">-</span>
          </template>
        </Column>
        <Column style="width:56px">
          <template #body="{data}">
            <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteFund(data.id)" />
          </template>
        </Column>
        <template #empty>
          <div class="empty-tip"><i class="pi pi-inbox"></i><p>暂无数据，点击添加</p></div>
        </template>
      </DataTable>
      <div v-if="filteredFunds.length" class="stats-bar">
        <div class="stat-item">
          <span class="stat-label">总进账</span>
          <span class="stat-val income">¥{{ fmtNum(totalIn) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总出账</span>
          <span class="stat-val expense">¥{{ fmtNum(totalOut) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总盈利</span>
          <span class="stat-val" :class="totalProfit >= 0 ? 'income' : 'expense'">¥{{ fmtNum(totalProfit) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">待出账</span>
          <span class="stat-val">{{ pendingCount }} 条</span>
        </div>
      </div>
    </div>

    <!-- Right-click menu -->
    <ContextMenu ref="ctxMenu" :model="ctxItems" />
    <ContextMenu ref="groupCtxMenu" :model="groupCtxItems" />

    <!-- Add Dialog -->
    <Dialog v-model:visible="showAdd" modal header="添加资金记录" :style="{width:'580px', maxWidth:'95vw'}" :draggable="false">
      <div class="form-body">
        <div class="form-field">
          <label>记录日期</label>
          <DatePicker v-model="form.record_date" dateFormat="yy-mm-dd" showIcon showButtonBar appendTo="body" class="w-full">
            <template #buttonbar="{ clearCallback }">
              <div class="dp-btnbar">
                <Button size="small" label="今天" severity="secondary" @click="form.record_date = new Date()" />
                <Button size="small" label="昨天" severity="secondary" @click="form.record_date = yesterday()" />
                <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback" />
              </div>
            </template>
          </DatePicker>
        </div>
        <Divider />
        <div class="form-hint">快速输入格式：<code>卡号 日期 CVV [状态] 进账金额*进账汇率</code></div>
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
    <Dialog v-model:visible="showEdit" modal header="编辑出账信息" :style="{width:'480px', maxWidth:'95vw'}" :draggable="false">
      <div class="form-body">
        <div class="form-field">
          <label>出账日期</label>
          <DatePicker v-model="editForm.out_date" dateFormat="yy-mm-dd" showIcon showButtonBar appendTo="body" class="w-full">
            <template #buttonbar="{ clearCallback }">
              <div class="dp-btnbar">
                <Button size="small" label="今天" severity="secondary" @click="editForm.out_date = new Date()" />
                <Button size="small" label="昨天" severity="secondary" @click="editForm.out_date = yesterday()" />
                <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback" />
              </div>
            </template>
          </DatePicker>
        </div>
        <div class="form-field">
          <label>出给谁</label>
          <InputText v-model="editForm.out_to" class="w-full" placeholder="输入出账对象" />
        </div>
        <div class="form-grid" style="margin-top:4px">
          <div class="form-field">
            <label>出账金额</label>
            <InputNumber v-model="editForm.out_amount" class="w-full" :minFractionDigits="2" />
          </div>
          <div class="form-field">
            <label>出账汇率</label>
            <InputNumber v-model="editForm.out_rate" class="w-full" :minFractionDigits="4" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showEdit = false" />
        <Button label="保存" icon="pi pi-check" @click="submitEdit" />
      </template>
    </Dialog>

    <!-- Batch Edit Out Dialog -->
    <Dialog v-model:visible="showBatchEdit" modal header="批量编辑出账" :style="{width:'480px', maxWidth:'95vw'}" :draggable="false">
      <div class="form-body">
        <div class="batch-edit-hint">将对已选的 {{ selectedFunds.length }} 条记录统一设置出账信息</div>
        <div class="form-field">
          <label>出账日期</label>
          <DatePicker v-model="batchEditForm.out_date" dateFormat="yy-mm-dd" showIcon showButtonBar appendTo="body" class="w-full">
            <template #buttonbar="{ clearCallback }">
              <div class="dp-btnbar">
                <Button size="small" label="今天" severity="secondary" @click="batchEditForm.out_date = new Date()" />
                <Button size="small" label="昨天" severity="secondary" @click="batchEditForm.out_date = yesterday()" />
                <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback" />
              </div>
            </template>
          </DatePicker>
        </div>
        <div class="form-field">
          <label>出给谁</label>
          <InputText v-model="batchEditForm.out_to" class="w-full" placeholder="输入出账对象" />
        </div>
        <div class="form-field">
          <label>出账汇率</label>
          <InputNumber v-model="batchEditForm.out_rate" class="w-full" :minFractionDigits="4" />
        </div>
        <div class="batch-edit-note">出账金额将自动使用每条记录的进账金额</div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showBatchEdit = false" />
        <Button label="保存" icon="pi pi-check" @click="submitBatchEdit" />
      </template>
    </Dialog>

    <!-- Batch Import Dialog -->
    <Dialog v-model:visible="showBatch" modal header="批量导入资金记录" :style="{width:'620px', maxWidth:'95vw'}" :draggable="false">
      <div class="form-body">
        <div class="form-field" style="margin-bottom:8px">
          <label>记录日期</label>
          <DatePicker v-model="batchDate" dateFormat="yy-mm-dd" showIcon showButtonBar appendTo="body" class="w-full">
            <template #buttonbar="{ clearCallback }">
              <div class="dp-btnbar">
                <Button size="small" label="今天" severity="secondary" @click="batchDate = new Date()" />
                <Button size="small" label="昨天" severity="secondary" @click="batchDate = yesterday()" />
                <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback" />
              </div>
            </template>
          </DatePicker>
        </div>
        <div class="form-hint">每行一条记录，格式：<code>卡号 日期 CVV [状态] 进账金额*进账汇率</code></div>
        <div class="form-hint-eg">例：5214160092182610 04/30 188 完成 600*5.95</div>
        <Textarea v-model="batchInput" rows="8" placeholder="粘贴多行数据..." class="w-full" @input="parseBatch" autoResize />
        <div v-if="batchRows.length" style="margin-top:10px">
          <div class="batch-preview-header">预览（{{ batchRows.length }} 条）</div>
          <div class="batch-preview-table">
            <div class="batch-preview-row batch-preview-head">
              <span>卡号</span><span>日期</span><span>CVV</span><span>进账</span>
            </div>
            <div v-for="(r, i) in batchRows" :key="i" class="batch-preview-row" :class="r._error ? 'row-error' : ''">
              <span>{{ r.card_no || '?' }}</span>
              <span>{{ r.card_date || '?' }}</span>
              <span>{{ r.cvv || '?' }}</span>
              <span>{{ r.in_amount }}×{{ r.in_rate }}</span>
            </div>
          </div>
        </div>
        <div v-if="batchInput && !batchRows.length" style="color:var(--mac-text-secondary);font-size:12px;margin-top:8px">未识别到有效行，请检查格式</div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showBatch = false" />
        <Button label="导入" icon="pi pi-check" @click="submitBatch" :disabled="!batchRows.length" />
      </template>
    </Dialog>

    <!-- Export Dialog -->
    <Dialog v-model:visible="showExport" modal header="导出数据" :style="{width:'460px'}" :draggable="false">
      <div class="export-body">
        <div class="form-field">
          <label>分组</label>
          <Select v-model="exportGroup" :options="exportGroupOptions" optionLabel="name" optionValue="id" placeholder="全部分组" showClear class="w-full" style="margin-top:4px" />
        </div>
        <div class="form-field" style="margin-top:14px">
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
    <!-- Add Group Dialog -->
    <Dialog v-model:visible="showAddGroup" modal header="新建分组" :style="{width:'300px'}" :draggable="false">
      <div style="padding-top:8px">
        <InputText v-model="newGroupName" class="w-full" placeholder="分组名称" @keyup.enter="submitAddGroup" autofocus />
      </div>
      <template #footer>
        <Button label="取消" text @click="showAddGroup = false" />
        <Button label="创建" icon="pi pi-check" @click="submitAddGroup" :disabled="!newGroupName.trim()" />
      </template>
    </Dialog>

    <!-- Rename Group Dialog -->
    <Dialog v-model:visible="showRenameGroup" modal header="重命名分组" :style="{width:'300px'}" :draggable="false">
      <div style="padding-top:8px">
        <InputText v-model="renameGroupName" class="w-full" @keyup.enter="submitRenameGroup" autofocus />
      </div>
      <template #footer>
        <Button label="取消" text @click="showRenameGroup = false" />
        <Button label="保存" icon="pi pi-check" @click="submitRenameGroup" :disabled="!renameGroupName.trim()" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
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

function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d }
function daysRange(n) { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - n); return [start, end] }
function emptyForm() { return { group_id: null, card_no: '', card_date: '', cvv: '', status: '待出账', in_amount: 0, in_rate: 1, out_amount: 0, out_rate: 1, record_date: new Date() } }

const funds = ref([])
const groups = ref([])
const activeGroup = ref(null)
const loading = ref(false)
const showAdd = ref(false)
const showEdit = ref(false)
const showExport = ref(false)
const showBatch = ref(false)
const showAddGroup = ref(false)
const showRenameGroup = ref(false)
const newGroupName = ref('')
const renameGroupName = ref('')
const renameGroupId = ref(null)
const batchInput = ref('')
const batchRows = ref([])
const batchDate = ref(new Date())
const ctxRow = ref(null)
const ctxMenu = ref(null)
const groupCtxMenu = ref(null)
const ctxGroup = ref(null)
const selectedFunds = ref([])
const showBatchEdit = ref(false)
const batchEditForm = ref({ out_amount: 0, out_rate: 1, out_date: new Date(), out_to: '' })

const filterRecordRange = ref(null)
const filterOutRange = ref(null)
const filterStatus = ref(null)
const filterOutTo = ref('')
const statusOptions = ['待出账', '盈利', '亏损']

const hasActiveFilter = computed(() =>
  filterRecordRange.value || filterOutRange.value || filterStatus.value || filterOutTo.value
)

function clearFilters() {
  filterRecordRange.value = null
  filterOutRange.value = null
  filterStatus.value = null
  filterOutTo.value = ''
}

const filteredFunds = computed(() => {
  let list = funds.value
  if (filterStatus.value) {
    list = list.filter(f => f.status === filterStatus.value)
  }
  if (filterRecordRange.value) {
    const [start, end] = filterRecordRange.value
    if (start) {
      const s = fmtDate(start)
      list = list.filter(f => (f.record_date || '') >= s)
    }
    if (end) {
      const e = fmtDate(end)
      list = list.filter(f => (f.record_date || '') <= e)
    }
  }
  if (filterOutRange.value) {
    const [start, end] = filterOutRange.value
    if (start) {
      const s = fmtDate(start)
      list = list.filter(f => (f.out_date || '') >= s)
    }
    if (end) {
      const e = fmtDate(end)
      list = list.filter(f => (f.out_date || '') <= e)
    }
  }
  if (filterOutTo.value) {
    const kw = filterOutTo.value.toLowerCase()
    list = list.filter(f => (f.out_to || '').toLowerCase().includes(kw))
  }
  return list
})

const totalIn = computed(() => filteredFunds.value.reduce((s, f) => s + f.in_amount * f.in_rate, 0))
const totalOut = computed(() => filteredFunds.value.reduce((s, f) => s + (f.out_amount || 0) * (f.out_rate || 1), 0))
const totalProfit = computed(() => totalOut.value - totalIn.value)
const pendingCount = computed(() => filteredFunds.value.filter(f => f.status === '待出账').length)
const form = ref(emptyForm())
const quickInput = ref('')
const editForm = ref({ out_amount: 0, out_rate: 1, out_date: new Date(), out_to: '' })
const editId = ref(null)

const exportStart = ref(null)
const exportEnd = ref(null)
const exportGroup = ref(null)
const exportGroupOptions = computed(() => groups.value)
const exportFields = ref([
  { key: 'record_date', label: '记录日期', checked: true },
  { key: 'group', label: '分组', checked: true },
  { key: 'card_no', label: '卡号', checked: true },
  { key: 'card_date', label: '卡片日期', checked: true },
  { key: 'cvv', label: 'CVV', checked: true },
  { key: 'status', label: '状态', checked: true },
  { key: 'in_amount', label: '进账金额', checked: true },
  { key: 'in_rate', label: '进账汇率', checked: true },
  { key: 'in_total', label: '进账合计', checked: true },
  { key: 'out_amount', label: '出账金额', checked: true },
  { key: 'out_rate', label: '出账汇率', checked: true },
  { key: 'out_total', label: '出账合计', checked: true },
  { key: 'out_date', label: '出账日期', checked: true },
  { key: 'out_to', label: '出给谁', checked: true },
  { key: 'profit', label: '盈利', checked: true },
])

const ctxItems = [
  { label: '编辑出账信息', icon: 'pi pi-pencil', command: () => openEdit() },
  { separator: true },
  { label: '删除', icon: 'pi pi-trash', command: () => ctxRow.value && deleteFund(ctxRow.value.id) },
]

const groupCtxItems = [
  { label: '重命名', icon: 'pi pi-pencil', command: () => ctxGroup.value && startRename(ctxGroup.value) },
  { separator: true },
  { label: '删除分组', icon: 'pi pi-trash', command: () => ctxGroup.value && deleteGroup(ctxGroup.value.id) },
]

function onGroupCtx(event, group) {
  ctxGroup.value = group
  groupCtxMenu.value.show(event)
}

onMounted(async () => {
  await loadGroups()
  await load()
})

async function loadGroups() {
  groups.value = window.api ? await window.api.getAllFundGroups() : []
}

async function switchGroup(gid) {
  activeGroup.value = gid
  await load()
}

async function load() {
  loading.value = true
  selectedFunds.value = []
  if (!window.api) { funds.value = []; loading.value = false; return }
  if (activeGroup.value === null) {
    funds.value = await window.api.getAllFunds()
  } else {
    funds.value = await window.api.getFundsByGroup(activeGroup.value)
  }
  loading.value = false
}

async function submitAddGroup() {
  if (!newGroupName.value.trim() || !window.api) return
  const g = await window.api.addFundGroup(newGroupName.value.trim())
  groups.value.push(g)
  newGroupName.value = ''
  showAddGroup.value = false
  switchGroup(g.id)
}

function startRename(g) {
  renameGroupId.value = g.id
  renameGroupName.value = g.name
  showRenameGroup.value = true
}

async function submitRenameGroup() {
  if (!renameGroupName.value.trim() || !window.api) return
  const updated = await window.api.renameFundGroup(renameGroupId.value, renameGroupName.value.trim())
  const idx = groups.value.findIndex(g => g.id === renameGroupId.value)
  if (idx !== -1) groups.value[idx] = updated
  showRenameGroup.value = false
}

async function deleteGroup(id) {
  if (!window.api) return
  await window.api.deleteFundGroup(id)
  groups.value = groups.value.filter(g => g.id !== id)
  if (activeGroup.value === id) switchGroup(null)
}

function profit(row) {
  return (row.out_amount * row.out_rate) - (row.in_amount * row.in_rate)
}

function fmtNum(val) {
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function groupName(gid) {
  if (!gid) return ''
  const g = groups.value.find(g => g.id === gid)
  return g ? g.name : ''
}

function onRowCtx(e) {
  ctxMenu.value.show(e.originalEvent)
}

function openEdit() {
  if (!ctxRow.value) return
  editId.value = ctxRow.value.id
  editForm.value = {
    out_amount: ctxRow.value.out_amount || ctxRow.value.in_amount,
    out_rate: ctxRow.value.out_rate,
    out_date: ctxRow.value.out_date ? new Date(ctxRow.value.out_date) : new Date(),
    out_to: ctxRow.value.out_to || '',
  }
  showEdit.value = true
}

function openBatch() {
  batchInput.value = ''
  batchRows.value = []
  batchDate.value = new Date()
  showBatch.value = true
}

function parseLine(line) {
  const parts = line.trim().split(/\s+/)
  if (parts.length < 4) return null
  const amtField = parts.length >= 5 ? parts[4] : parts[3]
  const [amt, rate] = (amtField || '').split('*')
  return {
    card_no: String(parts[0]),
    card_date: String(parts[1]),
    cvv: String(parts[2]),
    status: '待出账',
    in_amount: parseFloat(amt) || 0,
    in_rate: parseFloat(rate) || 1,
    out_amount: 0,
    out_rate: 1,
  }
}

function parseBatch() {
  const lines = batchInput.value.split('\n').filter(l => l.trim())
  batchRows.value = lines.map(parseLine).filter(Boolean)
}

async function submitBatch() {
  if (!window.api || !batchRows.value.length) return
  const count = batchRows.value.length
  const rd = batchDate.value ? fmtDate(batchDate.value) : ''
  const plain = JSON.parse(JSON.stringify(batchRows.value)).map(r => ({ ...r, group_id: activeGroup.value, record_date: rd }))
  await window.api.addFundsBatch(plain)
  await load()
  showBatch.value = false
  batchInput.value = ''
  batchRows.value = []
  toast.add({ severity: 'success', summary: `已导入 ${count} 条记录`, life: 2000 })
}

function parseQuick() {
  const parts = quickInput.value.trim().split(/\s+/)
  if (parts.length >= 4) {
    form.value.card_no = parts[0]
    form.value.card_date = parts[1]
    form.value.cvv = parts[2]
    const amtField = parts.length >= 5 ? parts[4] : parts[3]
    const [amt, rate] = (amtField || '').split('*')
    form.value.in_amount = parseFloat(amt) || 0
    form.value.in_rate = parseFloat(rate) || 1
  }
}

async function submitAdd() {
  if (!window.api) return
  const saved = await window.api.addFund({
    group_id: activeGroup.value,
    card_no: String(form.value.card_no),
    card_date: String(form.value.card_date),
    cvv: String(form.value.cvv),
    status: String(form.value.status),
    in_amount: Number(form.value.in_amount) || 0,
    in_rate: Number(form.value.in_rate) || 1,
    out_amount: Number(form.value.out_amount) || 0,
    out_rate: Number(form.value.out_rate) || 1,
    record_date: form.value.record_date ? fmtDate(form.value.record_date) : '',
  })
  funds.value.unshift(saved)
  form.value = emptyForm()
  quickInput.value = ''
  showAdd.value = false
  toast.add({ severity: 'success', summary: '已添加', life: 2000 })
}

async function submitEdit() {
  if (!window.api) return
  const outAmt = Number(editForm.value.out_amount) || 0
  const outRate = Number(editForm.value.out_rate) || 1
  const fund = funds.value.find(f => f.id === editId.value)
  const inTotal = fund ? fund.in_amount * fund.in_rate : 0
  const outTotal = outAmt * outRate
  const autoStatus = outAmt > 0 ? (outTotal >= inTotal ? '盈利' : '亏损') : '待出账'
  const updated = await window.api.updateFundOut(editId.value, {
    out_amount: outAmt,
    out_rate: outRate,
    out_date: editForm.value.out_date ? fmtDate(editForm.value.out_date) : '',
    out_to: editForm.value.out_to || '',
    status: autoStatus,
  })
  const idx = funds.value.findIndex(f => f.id === editId.value)
  if (idx !== -1) funds.value[idx] = updated
  showEdit.value = false
  toast.add({ severity: 'success', summary: '已更新', life: 2000 })
}

async function deleteFund(id) {
  if (!window.api) return
  await window.api.deleteFund(id)
  funds.value = funds.value.filter(f => f.id !== id)
  selectedFunds.value = selectedFunds.value.filter(f => f.id !== id)
  toast.add({ severity: 'info', summary: '已删除', life: 2000 })
}

function openBatchEdit() {
  batchEditForm.value = { out_amount: 0, out_rate: 1, out_date: new Date(), out_to: '' }
  showBatchEdit.value = true
}

async function submitBatchEdit() {
  if (!window.api || !selectedFunds.value.length) return
  const outRate = Number(batchEditForm.value.out_rate) || 1
  const outDate = batchEditForm.value.out_date ? fmtDate(batchEditForm.value.out_date) : ''
  const outTo = batchEditForm.value.out_to || ''
  const count = selectedFunds.value.length
  for (const f of selectedFunds.value) {
    const outAmt = f.in_amount || 0
    const inTotal = f.in_amount * f.in_rate
    const outTotal = outAmt * outRate
    const autoStatus = outAmt > 0 ? (outTotal >= inTotal ? '盈利' : '亏损') : '待出账'
    const updated = await window.api.updateFundOut(f.id, {
      out_amount: outAmt, out_rate: outRate, out_date: outDate, out_to: outTo, status: autoStatus,
    })
    const idx = funds.value.findIndex(r => r.id === f.id)
    if (idx !== -1) funds.value[idx] = updated
  }
  showBatchEdit.value = false
  selectedFunds.value = []
  toast.add({ severity: 'success', summary: `已更新 ${count} 条出账记录`, life: 2000 })
}

async function batchDelete() {
  if (!window.api || !selectedFunds.value.length) return
  const count = selectedFunds.value.length
  for (const f of selectedFunds.value) {
    await window.api.deleteFund(f.id)
  }
  const ids = new Set(selectedFunds.value.map(f => f.id))
  funds.value = funds.value.filter(f => !ids.has(f.id))
  selectedFunds.value = []
  toast.add({ severity: 'info', summary: `已删除 ${count} 条记录`, life: 2000 })
}

async function doExport() {
  let data
  if (exportStart.value || exportEnd.value) {
    const s = exportStart.value ? fmtDate(exportStart.value) : '0000-01-01'
    const e = exportEnd.value ? fmtDate(exportEnd.value) : '9999-12-31'
    data = window.api ? await window.api.getFundsByDateRange(s, e) : []
  } else if (exportGroup.value !== null && exportGroup.value !== undefined) {
    data = window.api ? await window.api.getFundsByGroup(exportGroup.value) : []
  } else {
    data = window.api ? await window.api.getAllFunds() : []
  }
  const fields = exportFields.value.filter(f => f.checked)
  const header = fields.map(f => f.label).join(',')
  const rows = data.map(row => {
    return fields.map(f => {
      if (f.key === 'profit') return profit(row).toFixed(2)
      if (f.key === 'group') return groupName(row.group_id)
      if (f.key === 'in_total') return (row.in_amount * row.in_rate).toFixed(2)
      if (f.key === 'out_total') return row.out_amount ? (row.out_amount * row.out_rate).toFixed(2) : ''
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

.group-tabs {
  border-bottom: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.4);
  padding: 0 12px;
}
.tab-list { display: flex; align-items: center; gap: 2px; overflow-x: auto; }
.tab-item {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; font-size: 13px; cursor: pointer;
  color: var(--mac-text-secondary); border-bottom: 2px solid transparent;
  white-space: nowrap; transition: color 0.15s;
  user-select: none;
}
.tab-item:hover { color: var(--mac-text); }
.tab-item.active { color: var(--mac-accent, #007aff); border-bottom-color: var(--mac-accent, #007aff); font-weight: 500; }
.tab-close { font-size: 10px; opacity: 0; transition: opacity 0.15s; padding: 2px; border-radius: 3px; }
.tab-item:hover .tab-close { opacity: 0.5; }
.tab-close:hover { opacity: 1 !important; color: #ff3b30; }
.tab-add {
  padding: 8px 10px; cursor: pointer; color: var(--mac-text-secondary);
  font-size: 12px; transition: color 0.15s;
}
.tab-add:hover { color: var(--mac-accent, #007aff); }

.filter-bar {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 10px 16px;
  border-bottom: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.3);
}
.filter-item { display: flex; align-items: center; gap: 6px; }
.filter-item label { font-size: 12px; font-weight: 600; color: var(--mac-text-secondary); white-space: nowrap; }
.filter-date-range { width: 230px; }
.filter-select { width: 120px; }
.filter-text { width: 130px; }
.batch-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 16px;
  background: rgba(0,122,255,0.06);
  border-bottom: 1px solid var(--mac-border);
}
.batch-info { font-size: 13px; font-weight: 600; color: var(--mac-accent, #007aff); }
.batch-edit-hint { font-size: 13px; color: var(--mac-text-secondary); padding: 4px 0 8px; }
.batch-edit-note { font-size: 12px; color: var(--mac-text-secondary); font-style: italic; margin-top: 4px; }
.table-wrap { flex: 1; overflow: hidden; padding: 16px; position: relative; display: flex; flex-direction: column; }
.stats-bar {
  display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
  padding: 10px 16px;
  border-top: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.5);
  border-radius: 0 0 8px 8px;
}
.stat-item { display: flex; align-items: center; gap: 6px; }
.stat-label { font-size: 12px; color: var(--mac-text-secondary); font-weight: 500; }
.stat-val { font-size: 14px; font-weight: 700; }
.stat-val.income { color: #34c759; }
.stat-val.expense { color: #ff9500; }
.group-hint { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--mac-text-secondary); gap: 8px; }
.group-hint i { font-size: 36px; }
.group-hint p { font-size: 13px; }

.card-inline { font-family: 'SF Mono', 'Fira Mono', monospace; font-size: 14px; letter-spacing: 0.3px; color: var(--mac-text); user-select: text; }
.card-info { display: flex; flex-direction: column; gap: 4px; }
.card-meta { display: flex; gap: 6px; }
.card-badge { font-family: 'SF Mono', 'Fira Mono', monospace; font-size: 11px; color: var(--mac-text-secondary); background: rgba(0,0,0,0.06); padding: 1px 6px; border-radius: 4px; }

.amount-cell { display: flex; flex-direction: column; gap: 1px; }
.amount-val { font-weight: 600; font-size: 14px; }
.amount-val.income { color: #34c759; }
.amount-val.expense { color: #ff9500; }
.amount-rate { font-size: 12px; color: var(--mac-text-secondary); }
.amount-total { font-size: 12px; color: var(--mac-text-secondary); font-style: italic; }
.out-meta { display: flex; gap: 6px; font-size: 11px; color: var(--mac-text-secondary); margin-top: 2px; }
.out-date { font-family: 'SF Mono', 'Fira Mono', monospace; }
.out-to { color: var(--mac-accent, #007aff); }

.profit-cell { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-size: 14px; padding: 4px 10px; border-radius: 6px; }
.profit-pos { color: #34c759; background: rgba(52,199,89,0.1); }
.profit-neg { color: #ff3b30; background: rgba(255,59,48,0.1); }

.record-date { font-size: 13px; color: var(--mac-text); font-family: 'SF Mono', 'Fira Mono', monospace; }
.dp-btnbar { display: flex; align-items: center; gap: 4px; justify-content: center; flex-wrap: wrap; }
.no-data { font-size: 12px; color: var(--mac-text-secondary); }

.empty-tip { text-align: center; padding: 40px; color: var(--mac-text-secondary); }
.empty-tip i { font-size: 32px; display: block; margin-bottom: 8px; }
.empty-tip p { font-size: 13px; }

.form-body { display: flex; flex-direction: column; gap: 10px; }
.form-hint { font-size: 12px; color: var(--mac-text-secondary); }
.form-hint-eg { font-size: 11px; color: var(--mac-accent, #007aff); font-family: monospace; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.form-field { display: flex; flex-direction: column; gap: 4px; }
.form-field label { font-size: 11px; font-weight: 600; color: var(--mac-text-secondary); text-transform: uppercase; }
.w-full { width: 100%; box-sizing: border-box; }

.export-body { display: flex; flex-direction: column; gap: 12px; }
.export-range { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.field-checks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 6px; }
.field-check { display: flex; align-items: center; gap: 6px; font-size: 13px; }

.batch-preview-header { font-size: 11px; font-weight: 600; color: var(--mac-text-secondary); text-transform: uppercase; margin-bottom: 4px; }
.batch-preview-table { border: 1px solid var(--mac-border); border-radius: 6px; overflow: hidden; font-size: 12px; max-height: 180px; overflow-y: auto; }
.batch-preview-row { display: grid; grid-template-columns: 2fr 1fr 0.7fr 1.2fr; gap: 0; padding: 5px 10px; border-bottom: 1px solid var(--mac-border); }
.batch-preview-row:last-child { border-bottom: none; }
.batch-preview-head { background: rgba(0,0,0,0.04); font-weight: 600; color: var(--mac-text-secondary); }
.row-error { background: rgba(255,59,48,0.08); color: #ff3b30; }
</style>
