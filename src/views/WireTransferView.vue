<template>
  <div class="wire-page">
    <div class="top-tabs">
      <button :class="['top-tab', { active: topTab === 'manage' }]" @click="topTab = 'manage'">
        <i class="pi pi-send"></i> 电汇管理
      </button>
      <button :class="['top-tab', { active: topTab === 'stats' }]" @click="topTab = 'stats'">
        <i class="pi pi-chart-bar"></i> 收支统计
      </button>
    </div>

    <div v-if="topTab === 'stats'" class="wire-stats">
      <div class="fs-filter-bar">
        <div class="filter-item">
          <label>进账日期</label>
          <DatePicker v-model="statsRecordRange" selectionMode="range" :manualInput="false" dateFormat="yy-mm-dd" placeholder="选择范围" showIcon showButtonBar appendTo="body" class="filter-date-range" />
        </div>
        <div class="filter-item">
          <label>出账日期</label>
          <DatePicker v-model="statsOutRange" selectionMode="range" :manualInput="false" dateFormat="yy-mm-dd" placeholder="选择范围" showIcon showButtonBar appendTo="body" class="filter-date-range" />
        </div>
        <div class="filter-item">
          <label>供应商</label>
          <Select v-model="statsGroup" :options="statsGroupOptions" optionLabel="name" optionValue="id" placeholder="全部" showClear class="filter-select" />
        </div>
        <div class="filter-item">
          <label>状态</label>
          <Select v-model="statsStatus" :options="statusOptions" placeholder="全部" showClear class="filter-select" />
        </div>
        <div class="filter-item">
          <label>货币</label>
          <Select v-model="statsCurrency" :options="currencyFilterOptions" placeholder="全部" showClear class="filter-select" />
        </div>
        <div class="filter-item">
          <label>出货信息</label>
          <InputText v-model="statsOutTo" placeholder="搜索..." class="filter-text" />
        </div>
        <Button v-if="hasStatsFilter" label="清除" icon="pi pi-filter-slash" text size="small" @click="clearStatsFilters" />
      </div>

      <div class="fs-summary-cards">
        <div class="fs-card">
          <div class="fs-card-label">总记录数</div>
          <div class="fs-card-val neutral">{{ statsData.totalCount }}</div>
        </div>
        <div class="fs-card">
          <div class="fs-card-label">总进账(¥)</div>
          <div class="fs-card-val income">¥{{ fmtNum(statsData.totalIn) }}</div>
        </div>
        <div class="fs-card">
          <div class="fs-card-label">总出账(¥)</div>
          <div class="fs-card-val expense">¥{{ fmtNum(statsData.totalOut) }}</div>
        </div>
        <div class="fs-card">
          <div class="fs-card-label">总盈利(¥)</div>
          <div class="fs-card-val" :class="statsData.totalProfit >= 0 ? 'income' : 'expense'">¥{{ fmtNum(statsData.totalProfit) }}</div>
        </div>
        <div class="fs-card">
          <div class="fs-card-label">待进账</div>
          <div class="fs-card-val neutral">{{ statsData.pendingInCount }} 条</div>
        </div>
        <div class="fs-card">
          <div class="fs-card-label">结算率</div>
          <div class="fs-card-val settle-rate">{{ statsData.settleRate }}%</div>
          <div class="settle-progress"><div class="settle-progress-fill" :style="{ width: statsData.settleRate + '%' }"></div></div>
          <div class="fs-card-sub">{{ statsData.doneCount }} / {{ statsData.totalCount }}</div>
        </div>
      </div>

      <div class="fs-section">
        <div class="fs-section-title">按货币统计</div>
        <div class="fs-currency-grid">
          <div v-for="cs in statsData.byCurrency" :key="cs.currency" class="fs-currency-card">
            <div class="fs-cur-header"><Tag :value="cs.currency" severity="info" /></div>
            <div class="fs-cur-row"><span class="fs-cur-label">原币进</span><span class="fs-cur-val income">{{ currencySymbol(cs.currency) }}{{ fmtNum(cs.inAmount) }}</span></div>
            <div class="fs-cur-row"><span class="fs-cur-label">原币出</span><span class="fs-cur-val expense">{{ currencySymbol(cs.currency) }}{{ fmtNum(cs.outAmount) }}</span></div>
            <div class="fs-cur-divider"></div>
            <div class="fs-cur-row"><span class="fs-cur-label">折合进(¥)</span><span class="fs-cur-val income">¥{{ fmtNum(cs.inRmb) }}</span></div>
            <div class="fs-cur-row"><span class="fs-cur-label">折合出(¥)</span><span class="fs-cur-val expense">¥{{ fmtNum(cs.outRmb) }}</span></div>
            <div class="fs-cur-row"><span class="fs-cur-label">盈利(¥)</span><span class="fs-cur-val" :class="cs.profit >= 0 ? 'income' : 'expense'">¥{{ fmtNum(cs.profit) }}</span></div>
          </div>
        </div>
      </div>

      <div class="fs-section">
        <div class="fs-section-header">
          <span class="fs-section-title">每日收支趋势</span>
          <div class="chart-range-tabs">
            <button v-for="r in chartRangeOptions" :key="r.value" :class="['chart-range-btn', { active: chartRange === r.value }]" @click="chartRange = r.value">{{ r.label }}</button>
          </div>
        </div>
        <div class="fs-chart-wrap"><canvas ref="dailyChartCanvas"></canvas></div>
      </div>
    </div>

    <div v-if="topTab === 'manage'" class="manage-view">
    <div class="wire-toolbar">
      <div>
        <div class="wire-title"><i class="pi pi-send"></i> 电汇</div>
        <div class="wire-subtitle">先选时间和货币，再粘贴文本解析，列表按完整业务字段展示。</div>
      </div>
      <div class="wire-toolbar-actions">
        <Button icon="pi pi-plus" label="新建供应商" size="small" severity="secondary" @click="showAddGroup = true" />
        <Button icon="pi pi-plus" label="添加电汇" size="small" @click="openAdd" :disabled="activeGroup === null" />
      </div>
    </div>

    <div class="group-tabs">
      <div class="tab-list">
        <div class="tab-item" :class="{ active: activeGroup === null }" @click="switchGroup(null)">全部</div>
        <div
          v-for="g in filteredGroups"
          :key="g.id"
          class="tab-item"
          :class="{ active: activeGroup === g.id }"
          @click="switchGroup(g.id)"
          @dblclick="startRename(g)"
        >
          <span>{{ g.name }}</span>
          <i class="pi pi-times tab-close" @click.stop="deleteGroup(g.id)"></i>
        </div>
        <div class="tab-add" @click="showAddGroup = true"><i class="pi pi-plus"></i></div>
      </div>
    </div>

    <div v-if="activeGroup !== null && activeGroupData" class="prepaid-bar">
      <div class="prepaid-info">
        <template v-if="activeGroupData.prepaid">
          <span class="prepaid-label">预付</span>
          <span class="prepaid-val">¥{{ fmtNum(activeGroupData.prepaid) }}</span>
          <span class="prepaid-sep">|</span>
          <span class="prepaid-label">已用</span>
          <span class="prepaid-val">¥{{ fmtNum(prepaidUsed) }}</span>
          <span class="prepaid-sep">|</span>
          <span class="prepaid-label">剩余</span>
          <span class="prepaid-val" :class="{ 'prepaid-low': prepaidRemaining <= 0 }">¥{{ fmtNum(prepaidRemaining) }}</span>
          <span v-if="prepaidRemaining <= 0" class="prepaid-warn"><i class="pi pi-exclamation-triangle"></i> 预付已用完</span>
        </template>
        <template v-else>
          <span class="prepaid-label">未设置预付</span>
        </template>
      </div>
      <Button icon="pi pi-plus" text size="small" @click="showPrepaidDialog = true" label="添加预付" />
    </div>

    <div class="filter-bar">
      <div class="filter-item">
        <label>时间</label>
        <DatePicker v-model="filterDateRange" selectionMode="range" :manualInput="false" dateFormat="yy-mm-dd" placeholder="选择范围" showIcon showButtonBar appendTo="body" class="filter-date-range" />
      </div>
      <div class="filter-item">
        <label>货币</label>
        <Select v-model="filters.currency" :options="currencyFilterOptions" placeholder="全部" showClear class="filter-select" />
      </div>
      <div class="filter-item">
        <label>供应商</label>
        <InputText v-model="groupSearch" placeholder="搜索供应商..." class="filter-text" />
      </div>
      <div class="filter-item">
        <label>编号</label>
        <InputText v-model="filters.code" placeholder="搜索..." class="filter-text" />
      </div>
      <div class="filter-item">
        <label>状态</label>
        <Select v-model="filters.status" :options="statusOptions" placeholder="全部" showClear class="filter-select" />
      </div>
      <div class="filter-item">
        <label>出货商</label>
        <Select v-model="filters.downstream_id" :options="downstreamOptions" optionLabel="label" optionValue="value" placeholder="全部" showClear class="filter-select" />
      </div>
      <div class="filter-item">
        <label>出货信息</label>
        <InputText v-model="filters.out_to" placeholder="搜索..." class="filter-text" />
      </div>
      <Button v-if="hasFilter" label="清除" icon="pi pi-filter-slash" text size="small" @click="clearFilters" />
    </div>

    <div class="wire-table-wrap">
      <div v-if="activeGroup === null && !groups.length" class="wire-empty">
        <i class="pi pi-folder-open"></i>
        <p>先新建一个供应商，再添加电汇记录。</p>
      </div>

      <DataTable
        v-else
        :value="filteredRecords"
        dataKey="id"
        contextMenu
        v-model:contextMenuSelection="ctxRow"
        stripedRows
        scrollable
        scrollHeight="flex"
        paginator
        :rows="30"
        :rowsPerPageOptions="[20, 50, 100]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="共 {totalRecords} 条，第 {first}-{last} 条"
        class="wire-table"
        @rowContextmenu="onRowCtx"
      >
        <Column field="record_date" header="时间" style="min-width: 110px">
          <template #body="{ data }"><span>{{ data.record_date || '-' }}</span></template>
        </Column>
        <Column field="currency" header="货币" style="min-width: 84px">
          <template #body="{ data }"><Tag :value="data.currency || 'USD'" severity="info" /></template>
        </Column>
        <Column field="code" header="编号" style="min-width: 180px">
          <template #body="{ data }">
            <div class="code-cell">
              <span class="wire-code">{{ data.code }}</span>
              <Button label="查看" text size="small" @click="viewDetails(data)" />
            </div>
          </template>
        </Column>
        <Column v-if="activeGroup === null" header="供应商" style="min-width: 120px">
          <template #body="{ data }">
            <Tag v-if="groupName(data.group_id)" :value="groupName(data.group_id)" severity="secondary" />
            <span v-else>-</span>
          </template>
        </Column>
        <Column field="status" header="状态" style="min-width: 90px">
          <template #body="{ data }"><span class="status-tag" :class="statusClass(data.status)">{{ data.status }}</span></template>
        </Column>
        <Column header="进账" style="min-width: 120px">
          <template #body="{ data }">
            <div v-if="data.in_rate > 0" class="amount-cell">
              <span class="amount-val income">{{ currencySymbol(data.currency) }}{{ fmtNum(data.amount) }}</span>
              <span class="amount-rate">× {{ data.in_rate }}</span>
              <span class="amount-total">= ¥{{ fmtNum((data.amount || 0) * data.in_rate) }}</span>
            </div>
            <span v-else class="no-data">待进账</span>
          </template>
        </Column>
        <Column header="出账" style="min-width: 120px">
          <template #body="{ data }">
            <div v-if="data.out_amount" class="amount-cell">
              <span class="amount-val expense">{{ currencySymbol(data.currency) }}{{ fmtNum(data.out_amount) }}</span>
              <span class="amount-rate">× {{ data.out_rate || 1 }}</span>
              <span class="amount-total">= ¥{{ fmtNum((data.out_amount || 0) * (data.out_rate || 1)) }}</span>
            </div>
            <span v-else class="no-data">未出账</span>
          </template>
        </Column>
        <Column header="盈利" style="min-width: 100px">
          <template #body="{ data }">
            <span v-if="data.out_amount" class="profit-cell" :class="profit(data) >= 0 ? 'profit-pos' : 'profit-neg'">¥{{ fmtNum(profit(data)) }}</span>
            <span v-else class="no-data">-</span>
          </template>
        </Column>
        <Column field="out_to" header="出货信息" style="min-width: 150px">
          <template #body="{ data }">
            <div v-if="data.out_date || data.out_to" class="out-info-cell">
              <span v-if="data.out_date" class="record-date">{{ data.out_date }}</span>
              <span v-if="data.out_to" class="out-to-cell">{{ data.out_to }}</span>
            </div>
            <span v-else class="no-data">-</span>
          </template>
        </Column>
        <Column field="settled" header="结算" style="min-width: 90px">
          <template #body="{ data }">
            <div v-if="!data.out_amount" class="settle-switch disabled"><span class="settle-inline">—</span></div>
            <div v-else class="settle-switch" :class="{ on: data.settled }" @click="toggleSettled(data)">
              <div class="settle-track"><div class="settle-thumb"></div></div>
              <span>{{ data.settled ? '已完成' : '待结算' }}</span>
            </div>
          </template>
        </Column>
        <Column header="操作" style="min-width: 110px">
          <template #body="{ data }">
            <div class="row-actions">
              <Button icon="pi pi-pencil" text rounded @click="openEdit(data)" />
              <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteRecord(data.id)" />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <ContextMenu ref="ctxMenu" :model="ctxItems" />

    <Dialog v-model:visible="showAdd" modal header="添加电汇信息" :style="{ width: '760px', maxWidth: '96vw' }" :draggable="false">
      <div class="form-body">
        <div class="form-grid">
          <div class="form-field">
            <label>时间</label>
            <DatePicker v-model="form.record_date" dateFormat="yy-mm-dd" showIcon showButtonBar appendTo="body" class="w-full" />
          </div>
          <div class="form-field">
            <label>货币</label>
            <Select v-model="form.currency" :options="currencyOptions" optionLabel="label" optionValue="value" class="w-full" />
          </div>
        </div>
        <div class="paste-panel">
          <label>粘贴文本</label>
          <Textarea v-model="rawInput" rows="7" autoResize placeholder="先选时间和货币，再把整段电汇文本粘贴到这里" />
          <div class="paste-actions">
            <Button label="自动识别" icon="pi pi-sparkles" size="small" severity="secondary" @click="parseRawInput" />
            <span class="paste-hint">当前供应商：{{ activeGroupData?.name || '未选择' }}</span>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-field"><label>编号</label><InputText v-model="form.code" /></div>
          <div class="form-field"><label>额度</label><InputNumber v-model="form.amount" mode="decimal" :minFractionDigits="0" :maxFractionDigits="2" fluid /></div>
          <div class="form-field"><label>Name</label><InputText v-model="form.name" /></div>
          <div class="form-field"><label>Birthday</label><InputText v-model="form.birthday" /></div>
          <div class="form-field"><label>Bank</label><InputText v-model="form.bank" /></div>
          <div class="form-field"><label>状态</label><InputText value="待进账" disabled /></div>
          <div class="form-field"><label>Account number</label><InputText v-model="form.account_number" /></div>
          <div class="form-field"><label>Routing number</label><InputText v-model="form.routing_number" /></div>
          <div class="form-field"><label>Swift code</label><InputText v-model="form.swift_code" /></div>
          <div class="form-field"><label>Account Type</label><InputText v-model="form.account_type" /></div>
          <div class="form-field form-field-span"><label>Address</label><Textarea v-model="form.address" rows="3" autoResize /></div>
          <div class="form-field form-field-span"><label>Address bank</label><Textarea v-model="form.bank_address" rows="3" autoResize /></div>
        </div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showAdd = false" />
        <Button label="保存" icon="pi pi-check" @click="submitAdd" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showInDialog" modal header="进账" :style="{ width: '420px', maxWidth: '96vw' }" :draggable="false">
      <div class="form-body">
        <div class="form-field">
          <label>进账汇率</label>
          <InputNumber v-model="inForm.in_rate" :minFractionDigits="2" :maxFractionDigits="4" fluid />
        </div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showInDialog = false" />
        <Button label="保存" icon="pi pi-check" @click="submitIn" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showEdit" modal header="编辑出账信息" :style="{ width: '500px', maxWidth: '96vw' }" :draggable="false">
      <div class="form-body">
        <div class="form-field">
          <label>出账日期</label>
          <DatePicker v-model="editForm.out_date" dateFormat="yy-mm-dd" showIcon showButtonBar appendTo="body" class="w-full" />
        </div>
        <div class="form-field">
          <label>出货商</label>
          <Select v-model="editForm.downstream_id" :options="downstreamOptions" optionLabel="label" optionValue="value" placeholder="选择出货商" showClear class="w-full" />
          <div v-if="selectedDownstream" class="ds-hint">
            预付剩余：¥{{ fmtNum((selectedDownstream.prepaid || 0) - (selectedDownstream.prepaid_used || 0)) }}
            <template v-if="(selectedDownstream.prepaid || 0) - (selectedDownstream.prepaid_used || 0) > 0">
              ，余额够时会自动扣款并直接结算
            </template>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-field"><label>出账金额</label><InputNumber v-model="editForm.out_amount" :minFractionDigits="2" :maxFractionDigits="2" fluid /></div>
          <div class="form-field"><label>出账汇率</label><InputNumber v-model="editForm.out_rate" :minFractionDigits="2" :maxFractionDigits="4" fluid /></div>
        </div>
      </div>
      <template #footer>
        <Button label="取消" text @click="showEdit = false" />
        <Button label="保存" icon="pi pi-check" @click="submitEdit" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showAddGroup" modal header="新建供应商" :style="{ width: '320px' }" :draggable="false">
      <div style="padding-top: 8px;">
        <InputText v-model="newGroupName" class="w-full" placeholder="供应商名称" @keyup.enter="submitAddGroup" autofocus />
      </div>
      <template #footer>
        <Button label="取消" text @click="showAddGroup = false" />
        <Button label="创建" icon="pi pi-check" @click="submitAddGroup" :disabled="!newGroupName.trim()" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showRenameGroup" modal header="重命名供应商" :style="{ width: '320px' }" :draggable="false">
      <div style="padding-top: 8px;">
        <InputText v-model="renameGroupName" class="w-full" @keyup.enter="submitRenameGroup" autofocus />
      </div>
      <template #footer>
        <Button label="取消" text @click="showRenameGroup = false" />
        <Button label="保存" icon="pi pi-check" @click="submitRenameGroup" :disabled="!renameGroupName.trim()" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showPrepaidDialog" modal header="添加预付金额" :style="{ width: '350px' }" :draggable="false">
      <div class="form-body">
        <div v-if="activeGroupData?.prepaid" class="prepaid-dialog-note">
          当前预付：¥{{ fmtNum(activeGroupData.prepaid) }}　剩余：¥{{ fmtNum(prepaidRemaining) }}
        </div>
        <InputNumber v-model="prepaidAmount" class="w-full" :minFractionDigits="2" :min="0" prefix="¥ " placeholder="输入追加金额" />
      </div>
      <template #footer>
        <Button label="取消" text @click="showPrepaidDialog = false" />
        <Button label="添加" icon="pi pi-plus" @click="savePrepaid" :disabled="!prepaidAmount" />
      </template>
    </Dialog>

    <Dialog v-model:visible="showDetail" modal header="电汇详情" :style="{ width: '760px', maxWidth: '96vw' }" :draggable="false">
      <div v-if="activeRecord" class="detail-table-wrap">
        <table class="detail-table">
          <tbody>
            <tr><th>时间</th><td>{{ activeRecord.record_date || '-' }}</td><th>货币</th><td>{{ activeRecord.currency || 'USD' }}</td></tr>
            <tr><th>编号</th><td>{{ activeRecord.code }}</td><th>供应商</th><td>{{ groupName(activeRecord.group_id) || '-' }}</td></tr>
            <tr><th>状态</th><td>{{ activeRecord.status || '-' }}</td><th>结算</th><td>{{ activeRecord.settled ? '已完成' : '待结算' }}</td></tr>
            <tr><th>Name</th><td>{{ activeRecord.name || '-' }}</td><th>Birthday</th><td>{{ activeRecord.birthday || '-' }}</td></tr>
            <tr><th>Bank</th><td>{{ activeRecord.bank || '-' }}</td><th>Account Type</th><td>{{ activeRecord.account_type || '-' }}</td></tr>
            <tr><th>Account number</th><td class="mono">{{ activeRecord.account_number || '-' }}</td><th>Routing number</th><td class="mono">{{ activeRecord.routing_number || '-' }}</td></tr>
            <tr><th>Swift code</th><td class="mono">{{ activeRecord.swift_code || '-' }}</td><th>额度</th><td>{{ activeRecord.amount || 0 }}</td></tr>
            <tr><th>Address</th><td colspan="3" class="multiline-cell">{{ activeRecord.address || '-' }}</td></tr>
            <tr><th>Address bank</th><td colspan="3" class="multiline-cell">{{ activeRecord.bank_address || '-' }}</td></tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <Button label="复制" icon="pi pi-copy" severity="secondary" @click="copyDetail(activeRecord)" />
        <Button label="关闭" text @click="showDetail = false" />
      </template>
    </Dialog>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import ContextMenu from 'primevue/contextmenu'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { parseDownstreamLedgerTypes } from '../utils/downstreamLedger.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

const STORAGE_KEY = 'jizhang_wire_transfers'
const toast = useToast()
const confirm = useConfirm()
const currencyOptions = [
  { label: '美元 (USD)', value: 'USD' },
  { label: '欧元 (EUR)', value: 'EUR' },
  { label: '澳元 (AUD)', value: 'AUD' },
  { label: '加元 (CAD)', value: 'CAD' },
]
const currencyFilterOptions = ['USD', 'EUR', 'AUD', 'CAD']
const statusOptions = ['待进账', '待出账', '待结算', '已完成']
const records = ref([])
const allRecords = ref([])
const groups = ref([])
const groupSearch = ref('')
const downstreams = ref([])
const activeGroup = ref(null)
const activeRecord = ref(null)
const rawInput = ref('')
const showAdd = ref(false)
const showDetail = ref(false)
const showEdit = ref(false)
const showInDialog = ref(false)
const showAddGroup = ref(false)
const showRenameGroup = ref(false)
const showPrepaidDialog = ref(false)
const newGroupName = ref('')
const renameGroupName = ref('')
const renameGroupId = ref(null)
const prepaidAmount = ref(0)
const editId = ref(null)
const inId = ref(null)
const ctxRow = ref(null)
const ctxMenu = ref(null)
const filterDateRange = ref(null)
const filters = ref({ currency: null, code: '', status: null, downstream_id: null, out_to: '' })
const inForm = ref({ in_rate: 0 })
const topTab = ref('manage')
const statsRecordRange = ref(null)
const statsOutRange = ref(null)
const statsGroup = ref(null)
const statsStatus = ref(null)
const statsCurrency = ref(null)
const statsOutTo = ref('')
const dailyChartCanvas = ref(null)
let dailyChartInstance = null
const chartRange = ref(7)
const chartRangeOptions = [{ label: '7天', value: 7 }, { label: '15天', value: 15 }, { label: '30天', value: 30 }, { label: '全部', value: 0 }]

function emptyForm() {
  return { record_date: new Date(), currency: 'USD', code: '', amount: null, name: '', bank: '', account_number: '', routing_number: '', swift_code: '', account_type: '', address: '', bank_address: '', birthday: '', in_rate: 1 }
}

const form = ref(emptyForm())
const editForm = ref({ out_amount: 0, out_rate: 1, out_date: new Date(), out_to: '', downstream_id: null })
const activeGroupData = computed(() => groups.value.find(item => item.id === activeGroup.value) || null)
const selectedDownstream = computed(() =>
  editForm.value.downstream_id ? downstreams.value.find(d => d.id === editForm.value.downstream_id) : null,
)
const prepaidUsed = computed(() => activeGroupData.value?.prepaid_used || 0)
const prepaidRemaining = computed(() => {
  const prepaid = activeGroupData.value?.prepaid || 0
  if (!prepaid) return 0
  return prepaid - prepaidUsed.value
})
const filteredGroups = computed(() => {
  const kw = groupSearch.value.trim().toLowerCase()
  const enabledGroups = groups.value.filter(item => item == null || item.enabled == null || Number(item.enabled) === 1)
  if (!kw) return enabledGroups
  return enabledGroups.filter(item => String(item.name || '').toLowerCase().includes(kw))
})
const downstreamOptions = computed(() =>
  downstreams.value.filter(d => (d.enabled == null || Number(d.enabled) === 1) && parseDownstreamLedgerTypes(d).includes('wire')).map(d => ({ label: d.name, value: d.id })),
)
const filteredRecords = computed(() => {
  let list = [...records.value]
  if (filterDateRange.value) {
    const [start, end] = filterDateRange.value
    if (start) list = list.filter(r => (r.record_date || '') >= fmtDate(start))
    if (end) list = list.filter(r => (r.record_date || '') <= fmtDate(end))
  }
  if (filters.value.currency) list = list.filter(r => (r.currency || 'USD') === filters.value.currency)
  if (filters.value.code) list = list.filter(r => String(r.code || '').toLowerCase().includes(filters.value.code.toLowerCase()))
  if (filters.value.status) list = list.filter(r => r.status === filters.value.status)
  if (filters.value.downstream_id) list = list.filter(r => r.downstream_id === filters.value.downstream_id)
  if (filters.value.out_to) list = list.filter(r => String(r.out_to || '').toLowerCase().includes(filters.value.out_to.toLowerCase()))
  return list
})
const hasFilter = computed(() => !!filterDateRange.value || !!filters.value.currency || !!filters.value.code || !!filters.value.status || !!filters.value.downstream_id || !!filters.value.out_to)
const statsGroupOptions = computed(() => groups.value.filter(item => item == null || item.enabled == null || Number(item.enabled) === 1))
const hasStatsFilter = computed(() => !!statsRecordRange.value || !!statsOutRange.value || statsGroup.value !== null || !!statsStatus.value || !!statsCurrency.value || !!statsOutTo.value)
const statsFilteredRecords = computed(() => {
  let list = [...allRecords.value]
  if (statsGroup.value !== null && statsGroup.value !== undefined) list = list.filter(r => r.group_id === statsGroup.value)
  if (statsStatus.value) list = list.filter(r => r.status === statsStatus.value)
  if (statsCurrency.value) list = list.filter(r => (r.currency || 'USD') === statsCurrency.value)
  if (statsRecordRange.value) {
    const [start, end] = statsRecordRange.value
    if (start) list = list.filter(r => (r.record_date || '') >= fmtDate(start))
    if (end) list = list.filter(r => (r.record_date || '') <= fmtDate(end))
  }
  if (statsOutRange.value) {
    const [start, end] = statsOutRange.value
    if (start) list = list.filter(r => (r.out_date || '') >= fmtDate(start))
    if (end) list = list.filter(r => (r.out_date || '') <= fmtDate(end))
  }
  if (statsOutTo.value) list = list.filter(r => String(r.out_to || '').toLowerCase().includes(statsOutTo.value.toLowerCase()))
  return list
})
const statsData = computed(() => {
  const all = statsFilteredRecords.value
  const map = {}
  for (const cur of currencyFilterOptions) map[cur] = { currency: cur, inAmount: 0, outAmount: 0, inRmb: 0, outRmb: 0, profit: 0 }
  for (const r of all) {
    const cur = r.currency || 'USD'
    if (!map[cur]) map[cur] = { currency: cur, inAmount: 0, outAmount: 0, inRmb: 0, outRmb: 0, profit: 0 }
    map[cur].inAmount += r.amount || 0
    map[cur].outAmount += r.out_amount || 0
    map[cur].inRmb += (r.amount || 0) * (r.in_rate || 0)
    map[cur].outRmb += (r.out_amount || 0) * (r.out_rate || 1)
    map[cur].profit += ((r.out_amount || 0) * (r.out_rate || 1)) - ((r.amount || 0) * (r.in_rate || 0))
  }
  const totalIn = all.reduce((s, r) => s + ((r.amount || 0) * (r.in_rate || 0)), 0)
  const totalOut = all.reduce((s, r) => s + ((r.out_amount || 0) * (r.out_rate || 1)), 0)
  const doneCount = all.filter(r => r.status === '已完成').length
  return {
    totalCount: all.length,
    totalIn,
    totalOut,
    totalProfit: totalOut - totalIn,
    pendingInCount: all.filter(r => r.status === '待进账').length,
    doneCount,
    settleRate: all.length ? Math.round(doneCount / all.length * 100) : 0,
    byCurrency: currencyFilterOptions.map(cur => map[cur]),
  }
})
const dailyChartData = computed(() => {
  const map = {}
  for (const r of statsFilteredRecords.value) {
    const d = r.record_date || '未知'
    if (!map[d]) map[d] = { inRmb: 0, outRmb: 0, profit: 0 }
    map[d].inRmb += (r.amount || 0) * (r.in_rate || 0)
    map[d].outRmb += (r.out_amount || 0) * (r.out_rate || 1)
    map[d].profit += ((r.out_amount || 0) * (r.out_rate || 1)) - ((r.amount || 0) * (r.in_rate || 0))
  }
  let entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  if (chartRange.value > 0) {
    const labels = []
    const now = new Date()
    for (let i = chartRange.value - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      labels.push(d.toISOString().slice(0, 10))
    }
    return {
      labels: labels.map(d => d.slice(5)),
      inData: labels.map(d => map[d]?.inRmb || 0),
      outData: labels.map(d => map[d]?.outRmb || 0),
      profitData: labels.map(d => map[d]?.profit || 0),
    }
  }
  return {
    labels: entries.map(([d]) => d.slice(5)),
    inData: entries.map(([, v]) => v.inRmb),
    outData: entries.map(([, v]) => v.outRmb),
    profitData: entries.map(([, v]) => v.profit),
  }
})
const ctxItems = computed(() => {
  const row = ctxRow.value
  if (!row) return []
  const items = []
  if (row.status === '待进账') items.push({ label: '进账', icon: 'pi pi-arrow-down-left', command: () => openIn(row) })
  if (row.status !== '待进账') items.push({ label: '出账', icon: 'pi pi-arrow-up-right', command: () => openEdit(row) })
  items.push({ separator: true })
  items.push({ label: '查看详情', icon: 'pi pi-eye', command: () => viewDetails(row) })
  items.push({ label: '删除', icon: 'pi pi-trash', command: () => deleteRecord(row.id) })
  return items
})

onMounted(async () => {
  await loadGroups()
  await loadDownstreams()
  await loadAllRecords()
  await load()
})

onBeforeUnmount(() => {
  if (dailyChartInstance) dailyChartInstance.destroy()
})

watch(() => editForm.value.downstream_id, (dsId) => {
  if (!dsId) return
  const ds = downstreams.value.find(item => item.id === dsId)
  if (ds) editForm.value.out_to = ds.name
})

async function load() {
  if (window.api?.getAllWireTransfers) {
    records.value = activeGroup.value === null ? await window.api.getAllWireTransfers() : await window.api.getWireTransfersByGroup(activeGroup.value)
    return
  }
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    records.value = activeGroup.value === null ? all : all.filter(item => item.group_id === activeGroup.value)
  } catch {
    records.value = []
  }
}

async function loadAllRecords() {
  allRecords.value = window.api?.getAllWireTransfers ? await window.api.getAllWireTransfers() : records.value
}

async function loadGroups() { groups.value = window.api?.getAllWireGroups ? await window.api.getAllWireGroups() : [] }
async function loadDownstreams() { downstreams.value = window.api?.getAllDownstreams ? await window.api.getAllDownstreams() : [] }
async function switchGroup(groupId) { activeGroup.value = groupId; await load() }

function openAdd() {
  if (activeGroup.value === null) {
    toast.add({ severity: 'warn', summary: '请先选择一个供应商', life: 2000 })
    return
  }
  form.value = emptyForm()
  rawInput.value = ''
  showAdd.value = true
}

function openEdit(row) {
  editId.value = row.id
  editForm.value = { out_amount: row.out_amount || row.amount || 0, out_rate: row.out_rate || 1, out_date: row.out_date ? new Date(row.out_date) : new Date(), out_to: row.out_to || '', downstream_id: row.downstream_id || null }
  showEdit.value = true
}

function openIn(row) {
  inId.value = row.id
  inForm.value = { in_rate: row.in_rate > 0 ? row.in_rate : 0 }
  showInDialog.value = true
}

function viewDetails(row) { activeRecord.value = row; showDetail.value = true }

async function submitAdd() {
  if (rawInput.value.trim() && (!form.value.code || !form.value.name)) parseRawInput()
  const payload = normalizeForm(form.value)
  if (!payload.code || !payload.name) {
    toast.add({ severity: 'warn', summary: '请先填写编号和姓名', life: 2200 })
    return
  }
  let saved
  if (window.api?.addWireTransfer) {
    saved = await window.api.addWireTransfer({ ...payload, group_id: activeGroup.value })
  } else {
    saved = { ...payload, group_id: activeGroup.value, id: Date.now(), created_at: new Date().toISOString() }
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    all.unshift(saved)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  }
  records.value.unshift(saved)
  allRecords.value.unshift(saved)
  showAdd.value = false
  rawInput.value = ''
  toast.add({ severity: 'success', summary: '电汇信息已保存', life: 2000 })
}

async function submitIn() {
  if (!window.api?.updateWireTransferIn) return
  const rate = Number(inForm.value.in_rate) || 0
  if (!rate) {
    toast.add({ severity: 'warn', summary: '请填写进账汇率', life: 1800 })
    return
  }
  const updated = await window.api.updateWireTransferIn(inId.value, { in_rate: rate })
  const idx = records.value.findIndex(item => item.id === inId.value)
  if (idx !== -1) records.value[idx] = updated
  const group = groups.value.find(item => item.id === updated.group_id)
  const inRmb = (updated.amount || 0) * (updated.in_rate || 0)
  if (updated.group_id && inRmb > 0 && group?.prepaid && window.api?.addWireGroupPrepaidUsed) {
    const groupUpdated = await window.api.addWireGroupPrepaidUsed(updated.group_id, inRmb, updated.id || null)
    const groupIdx = groups.value.findIndex(item => item.id === updated.group_id)
    if (groupIdx !== -1) groups.value[groupIdx] = groupUpdated
  }
  await loadAllRecords()
  showInDialog.value = false
  toast.add({ severity: 'success', summary: '已完成进账', life: 1800 })
}

async function submitEdit() {
  if (!window.api?.updateWireTransferOut) return
  const outAmt = Number(editForm.value.out_amount) || 0
  const outRate = Number(editForm.value.out_rate) || 1
  const dsId = editForm.value.downstream_id || null
  const ds = dsId ? downstreams.value.find(d => d.id === dsId) : null
  const outRmb = outAmt * outRate
  const dsRemaining = ds ? (ds.prepaid || 0) - (ds.prepaid_used || 0) : 0
  const canAutoSettle = ds && outAmt > 0 && dsRemaining >= outRmb
  const autoSettled = canAutoSettle ? 1 : 0
  const autoStatus = autoSettled ? '已完成' : (outAmt > 0 ? '待结算' : '待出账')
  const updated = await window.api.updateWireTransferOut(editId.value, {
    out_amount: outAmt,
    out_rate: outRate,
    out_date: editForm.value.out_date ? fmtDate(editForm.value.out_date) : '',
    out_to: editForm.value.out_to || '',
    status: autoStatus,
    downstream_id: dsId,
    settled: autoSettled,
  })
  if (canAutoSettle && window.api?.addDownstreamPrepaidUsed) {
    await window.api.addDownstreamPrepaidUsed(dsId, outRmb, 'wire', editId.value || null)
    await loadDownstreams()
  }
  const idx = records.value.findIndex(item => item.id === editId.value)
  if (idx !== -1) records.value[idx] = updated
  await loadAllRecords()
  showEdit.value = false
  toast.add({ severity: 'success', summary: autoSettled ? '已出账并自动结算' : '已更新出账信息', life: 1800 })
}

async function toggleSettled(row) {
  if (!row.out_amount || !window.api?.updateWireTransferSettled) return
  const updated = await window.api.updateWireTransferSettled(row.id, row.settled ? 0 : 1)
  const idx = records.value.findIndex(item => item.id === row.id)
  if (idx !== -1) records.value[idx] = updated
  await loadAllRecords()
}

function deleteRecord(id) {
  confirm.require({
    message: '确定删除这条电汇记录吗？',
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '删除',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: async () => {
      if (!window.api?.deleteWireTransfer) return
      await window.api.deleteWireTransfer(id)
      records.value = records.value.filter(item => item.id !== id)
      allRecords.value = allRecords.value.filter(item => item.id !== id)
      toast.add({ severity: 'success', summary: '已删除', life: 1800 })
    },
  })
}

async function submitAddGroup() {
  if (!newGroupName.value.trim() || !window.api?.addWireGroup) return
  const group = await window.api.addWireGroup(newGroupName.value.trim())
  groups.value.push(group)
  newGroupName.value = ''
  showAddGroup.value = false
  await switchGroup(group.id)
}

function startRename(group) {
  renameGroupId.value = group.id
  renameGroupName.value = group.name
  showRenameGroup.value = true
}

async function submitRenameGroup() {
  if (!renameGroupName.value.trim() || !window.api?.renameWireGroup) return
  const updated = await window.api.renameWireGroup(renameGroupId.value, renameGroupName.value.trim())
  const idx = groups.value.findIndex(item => item.id === renameGroupId.value)
  if (idx !== -1) groups.value[idx] = updated
  showRenameGroup.value = false
}

async function savePrepaid() {
  if (!window.api?.updateWireGroupPrepaid || !activeGroupData.value) return
  const result = await window.api.updateWireGroupPrepaid(activeGroupData.value.id, prepaidAmount.value || 0)
  const idx = groups.value.findIndex(item => item.id === activeGroupData.value.id)
  if (idx !== -1) groups.value[idx] = result
  showPrepaidDialog.value = false
  toast.add({ severity: 'success', summary: '预付已追加', life: 2000 })
}

function deleteGroup(id) {
  confirm.require({
    message: '确定删除这个供应商吗？该供应商下记录会保留，但归属会被清空。',
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '删除',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: async () => {
      if (!window.api?.deleteWireGroup) return
      await window.api.deleteWireGroup(id)
      groups.value = groups.value.filter(item => item.id !== id)
      if (activeGroup.value === id) activeGroup.value = null
      await load()
      toast.add({ severity: 'success', summary: '已删除供应商', life: 1800 })
    },
  })
}

function clearFilters() { filterDateRange.value = null; filters.value = { currency: null, code: '', status: null, downstream_id: null, out_to: '' } }
function clearStatsFilters() { statsRecordRange.value = null; statsOutRange.value = null; statsGroup.value = null; statsStatus.value = null; statsCurrency.value = null; statsOutTo.value = '' }
function parseRawInput() { if (rawInput.value.trim()) { form.value = { ...form.value, ...parseWireTransferText(rawInput.value.trim()) }; toast.add({ severity: 'success', summary: '已自动识别内容', life: 1600 }) } }
function onRowCtx(e) { ctxMenu.value.show(e.originalEvent) }

watch(showPrepaidDialog, (v) => {
  if (v) prepaidAmount.value = 0
})

function parseWireTransferText(text) {
  const normalized = text.replace(/\r\n/g, '\n')
  const fieldMap = [
    { key: 'bank_address', labels: ['address bank', 'bank address'] },
    { key: 'account_number', labels: ['account number', 'account no'] },
    { key: 'routing_number', labels: ['routing number'] },
    { key: 'swift_code', labels: ['swift code', 'swift'] },
    { key: 'account_type', labels: ['account type'] },
    { key: 'birthday', labels: ['birthday', 'birth day'] },
    { key: 'code', labels: ['编号'] },
    { key: 'amount', labels: ['额度', 'amount'] },
    { key: 'name', labels: ['name'] },
    { key: 'bank', labels: ['bank'] },
    { key: 'address', labels: ['address'] },
  ]
  const parsed = {}
  for (const entry of extractFieldEntries(normalized, fieldMap)) {
    let value = entry.value.trim()
    if (entry.key === 'amount') value = Number(String(value).replace(/[^\d.]/g, '')) || 0
    parsed[entry.key] = value
  }
  return parsed
}

function extractFieldEntries(text, fieldMap) {
  const matches = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const found = matchFieldsInLine(line, fieldMap)
    if (found.length) matches.push(...found)
    else if (matches.length) matches[matches.length - 1].value += `\n${line}`
  }
  return matches
}

function matchFieldsInLine(line, fieldMap) {
  const hits = []
  const sortedFields = [...fieldMap].sort((a, b) => Math.max(...b.labels.map(label => label.length)) - Math.max(...a.labels.map(label => label.length)))
  for (const field of sortedFields) {
    for (const label of field.labels) {
      const regex = new RegExp(`(^|\\s{2,}|\\t+|\\n)(${escapeRegExp(label)})\\s*(?:：|:)?\\s*`, 'ig')
      let match
      while ((match = regex.exec(line)) !== null) {
        const localStart = match.index + match[1].length
        if (hits.some(item => rangesOverlap(item.localStart, item.valueStart, localStart, localStart + match[2].length))) continue
        hits.push({ key: field.key, localStart, valueStart: match.index + match[0].length })
      }
    }
  }
  hits.sort((a, b) => a.localStart - b.localStart)
  return hits.filter((hit, index) => index === 0 || hit.localStart !== hits[index - 1].localStart).map((hit, index, arr) => ({ key: hit.key, value: line.slice(hit.valueStart, arr[index + 1] ? arr[index + 1].localStart : line.length).trim() }))
}

async function copyDetail(row) {
  if (!row) return
  try {
    await navigator.clipboard.writeText(formatDetailForCopy(row))
    toast.add({ severity: 'success', summary: '已复制详情', life: 1800 })
  } catch {
    toast.add({ severity: 'error', summary: '复制失败', life: 1800 })
  }
}

function formatDetailForCopy(row) {
  return [
    `编号：${row.code || ''}    额度${row.amount || 0}`,
    `Name：${row.name || ''}`,
    `Bank：${row.bank || ''}`,
    `Account number：${row.account_number || ''}`,
    `Routing number：${row.routing_number || ''}`,
    `Swift code：${row.swift_code || ''} `,
    `Account Type：  ${row.account_type || ''}`,
    `Address：  ${row.address || ''}`,
    `Address bank：${row.bank_address || ''} `,
    `birthday：${row.birthday || ''}`,
  ].join('\n')
}

function normalizeForm(raw) {
  return {
    record_date: raw.record_date ? fmtDate(raw.record_date) : '',
    currency: raw.currency || 'USD',
    code: String(raw.code || '').trim(),
    amount: Number(raw.amount || 0),
    name: String(raw.name || '').trim(),
    bank: String(raw.bank || '').trim(),
    account_number: String(raw.account_number || '').trim(),
    routing_number: String(raw.routing_number || '').trim(),
    swift_code: String(raw.swift_code || '').trim(),
    account_type: String(raw.account_type || '').trim(),
    address: String(raw.address || '').trim(),
    bank_address: String(raw.bank_address || '').trim(),
    birthday: String(raw.birthday || '').trim(),
    status: '待进账',
    in_rate: 0,
    out_amount: 0,
    out_rate: 1,
    out_date: '',
    out_to: '',
    downstream_id: null,
    settled: 0,
  }
}

function profit(row) { return ((row.out_amount || 0) * (row.out_rate || 1)) - ((row.amount || 0) * (row.in_rate || 1)) }
function statusClass(status) { if (status === '已完成') return 'status-done'; if (status === '待结算') return 'status-settle'; if (status === '待进账') return 'status-in'; return 'status-pending' }
function groupName(groupId) { return groups.value.find(item => item.id === groupId)?.name || '' }
const currencySymbolMap = { USD: '$', EUR: '€', AUD: 'A$', CAD: 'C$' }
function currencySymbol(cur) { return currencySymbolMap[cur] || '$' }
function fmtNum(val) { return Number(val || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function fmtDate(d) { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` }
function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function rangesOverlap(startA, endA, startB, endB) { return startA < endB && startB < endA }

function renderDailyChart() {
  if (!dailyChartCanvas.value) return
  if (dailyChartInstance) { dailyChartInstance.destroy(); dailyChartInstance = null }
  const d = dailyChartData.value
  if (!d.labels.length) return
  dailyChartInstance = new Chart(dailyChartCanvas.value, {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [
        { label: '进账(¥)', data: d.inData, borderColor: '#007aff', backgroundColor: 'rgba(0,122,255,0.08)', tension: 0.35, fill: true, pointRadius: 3, borderWidth: 2 },
        { label: '出账(¥)', data: d.outData, borderColor: '#ff9500', backgroundColor: 'rgba(255,149,0,0.08)', tension: 0.35, fill: true, pointRadius: 3, borderWidth: 2 },
        { label: '盈利(¥)', data: d.profitData, borderColor: '#34c759', backgroundColor: 'rgba(52,199,89,0.08)', tension: 0.35, fill: true, pointRadius: 3, borderWidth: 2 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top' } },
      scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' } } },
    },
  })
}

watch(dailyChartData, () => nextTick(renderDailyChart))
watch(topTab, (val) => { if (val === 'stats') nextTick(renderDailyChart) })
</script>

<style scoped>
.wire-page { display: flex; flex-direction: column; height: 100%; background: var(--mac-bg); }
.manage-view { display: flex; flex-direction: column; flex: 1; overflow: hidden; padding: 16px; gap: 12px; }
.top-tabs { display: flex; gap: 2px; padding: 8px 16px; border-bottom: 1px solid var(--mac-border); background: rgba(255,255,255,0.5); backdrop-filter: blur(10px); flex-shrink: 0; }
.top-tab { display: flex; align-items: center; gap: 6px; padding: 7px 16px; border: none; background: transparent; border-radius: 8px; font-size: 13px; cursor: pointer; color: var(--mac-text-secondary); transition: all 0.15s; font-weight: 500; }
.top-tab:hover { background: rgba(0,0,0,0.05); color: var(--mac-text); }
.top-tab.active { background: var(--mac-accent, #007aff); color: #fff; }
.wire-stats { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
.fs-filter-bar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 12px 16px; background: var(--mac-surface); border-radius: 12px; box-shadow: var(--shadow-sm); }
.fs-summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.fs-card { background: var(--mac-surface); border-radius: 12px; padding: 16px; text-align: center; box-shadow: var(--shadow-sm); }
.fs-card-label { font-size: 11px; color: var(--mac-text-secondary); margin-bottom: 4px; font-weight: 500; text-transform: uppercase; }
.fs-card-val { font-size: 20px; font-weight: 700; color: var(--mac-text); }
.fs-card-val.settle-rate { color: var(--mac-accent, #007aff); }
.settle-progress { width: 100%; height: 4px; background: rgba(0,0,0,0.08); border-radius: 2px; margin-top: 6px; overflow: hidden; }
.settle-progress-fill { height: 100%; background: #34c759; border-radius: 2px; transition: width 0.4s ease; }
.fs-card-sub { font-size: 11px; color: var(--mac-text-secondary); margin-top: 3px; }
.fs-section { display: flex; flex-direction: column; gap: 10px; }
.fs-section-title { font-size: 14px; font-weight: 600; color: var(--mac-text); }
.fs-section-header { display: flex; align-items: center; justify-content: space-between; }
.fs-currency-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.fs-currency-card { background: var(--mac-surface); border-radius: 12px; padding: 14px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 6px; }
.fs-cur-header { display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
.fs-cur-row { display: flex; justify-content: space-between; align-items: center; }
.fs-cur-label { font-size: 12px; color: var(--mac-text-secondary); }
.fs-cur-val { font-size: 13px; font-weight: 700; color: var(--mac-text); }
.fs-cur-divider { height: 1px; background: var(--mac-border); margin: 2px 0; }
.chart-range-tabs { display: flex; gap: 2px; background: rgba(0,0,0,0.06); border-radius: 8px; padding: 2px; }
.chart-range-btn { padding: 3px 10px; border: none; background: transparent; border-radius: 6px; font-size: 11px; cursor: pointer; color: var(--mac-text-secondary); transition: all 0.15s; }
.chart-range-btn.active { background: #fff; color: var(--mac-text); font-weight: 600; box-shadow: var(--shadow-sm); }
.fs-chart-wrap { background: var(--mac-surface); border-radius: 12px; padding: 16px; box-shadow: var(--shadow-sm); height: 330px; position: relative; }
.wire-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-radius: 14px; background: rgba(255,255,255,0.72); border: 1px solid var(--mac-border); box-shadow: var(--shadow-sm); }
.wire-toolbar-actions { display: flex; align-items: center; gap: 8px; }
.wire-title { font-size: 16px; font-weight: 700; color: var(--mac-text); display: flex; align-items: center; gap: 8px; }
.wire-title i { color: var(--mac-accent); }
.wire-subtitle { margin-top: 4px; font-size: 12px; color: var(--mac-text-secondary); }
.group-tabs { border: 1px solid var(--mac-border); background: rgba(255,255,255,0.4); padding: 0 12px; border-radius: 14px; }
.tab-list { display: flex; align-items: center; gap: 2px; overflow-x: auto; }
.tab-item { display: flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 13px; cursor: pointer; color: var(--mac-text-secondary); border-bottom: 2px solid transparent; white-space: nowrap; }
.tab-item.active { color: var(--mac-accent, #007aff); border-bottom-color: var(--mac-accent, #007aff); font-weight: 500; }
.tab-close { font-size: 10px; opacity: 0; transition: opacity 0.15s; padding: 2px; }
.tab-item:hover .tab-close { opacity: 0.5; }
.tab-add { padding: 8px 10px; cursor: pointer; color: var(--mac-text-secondary); }
.prepaid-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-radius: 14px; background: linear-gradient(135deg, rgba(255,255,255,0.82), rgba(245,249,255,0.82)); border: 1px solid rgba(0,122,255,0.12); box-shadow: var(--shadow-sm); }
.prepaid-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.prepaid-label { font-size: 12px; color: var(--mac-text-secondary); }
.prepaid-val { font-size: 13px; font-weight: 700; color: var(--mac-text); }
.prepaid-val.prepaid-low { color: #ff3b30; }
.prepaid-sep { color: var(--mac-border); font-size: 12px; }
.prepaid-warn { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 12px; color: #ff3b30; background: rgba(255,59,48,0.08); border-radius: 999px; }
.prepaid-dialog-note { font-size: 12px; color: var(--mac-text-secondary); }
.filter-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 10px 14px; border: 1px solid var(--mac-border); border-radius: 14px; background: rgba(255,255,255,0.45); }
.filter-item { display: flex; align-items: center; gap: 6px; }
.filter-item label { font-size: 12px; font-weight: 600; color: var(--mac-text-secondary); white-space: nowrap; }
.filter-date-range { width: 220px; }
.filter-select { width: 110px; }
.filter-text { width: 130px; }
.wire-table-wrap { flex: 1; min-height: 0; position: relative; background: rgba(255,255,255,0.58); border: 1px solid var(--mac-border); border-radius: 16px; overflow: hidden; }
:deep(.wire-table) { display: flex; flex-direction: column; height: 100%; }
:deep(.wire-table .p-datatable-wrapper) { flex: 1; min-height: 0; }
.wire-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--mac-text-secondary); }
.wire-empty i { font-size: 34px; opacity: 0.5; }
.wire-empty p { margin: 0; font-size: 13px; }
.code-cell { display: inline-flex; align-items: center; gap: 8px; }
.wire-code, .mono, .record-date { font-family: 'SF Mono', 'Fira Mono', monospace; }
.wire-code { font-weight: 700; color: var(--mac-text); }
.form-body { display: flex; flex-direction: column; gap: 12px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field label, .paste-panel label { font-size: 11px; font-weight: 700; color: var(--mac-text-secondary); text-transform: uppercase; }
.form-field-span { grid-column: 1 / -1; }
.paste-panel { display: flex; flex-direction: column; gap: 8px; }
.paste-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.paste-hint { font-size: 12px; color: var(--mac-text-secondary); }
.ds-hint { margin-top: 6px; font-size: 12px; color: var(--mac-text-secondary); }
.w-full { width: 100%; box-sizing: border-box; }
.status-tag { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-align: center; }
.status-in { background: #e8f4ff; color: #0b69c7; }
.status-pending { background: #fff3cd; color: #856404; }
.status-settle { background: #cce5ff; color: #004085; }
.status-done { background: #d4edda; color: #155724; }
.amount-cell { display: flex; flex-direction: column; gap: 1px; }
.amount-val { font-weight: 700; font-size: 14px; color: var(--mac-text); }
.amount-val.income { color: #007aff; }
.amount-val.expense { color: #e67e22; }
.amount-rate, .amount-total, .no-data { font-size: 12px; color: var(--mac-text-secondary); }
.profit-cell { display: inline-flex; align-items: center; font-weight: 700; font-size: 13px; padding: 4px 10px; border-radius: 6px; }
.profit-pos { color: #155724; background: rgba(52,199,89,0.12); }
.profit-neg { color: #c0392b; background: rgba(255,59,48,0.12); }
.out-info-cell { display: flex; flex-direction: column; gap: 2px; }
.out-to-cell { font-size: 13px; color: var(--mac-accent, #007aff); font-weight: 500; }
.settle-switch { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11px; font-weight: 600; color: var(--mac-text-secondary); user-select: none; }
.settle-switch.disabled { opacity: 0.35; cursor: default; }
.settle-inline { font-size: 12px; color: var(--mac-text-secondary); }
.settle-switch.on { color: #34c759; }
.settle-track { width: 32px; height: 18px; border-radius: 9px; background: rgba(0,0,0,0.15); position: relative; transition: background 0.2s; flex-shrink: 0; }
.settle-switch.on .settle-track { background: #34c759; }
.settle-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; position: absolute; top: 2px; left: 2px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
.settle-switch.on .settle-thumb { transform: translateX(14px); }
.row-actions { display: flex; align-items: center; gap: 2px; }
.detail-table-wrap { border: 1px solid var(--mac-border); border-radius: 12px; overflow: hidden; }
.detail-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.detail-table th, .detail-table td { border-bottom: 1px solid var(--mac-border); border-right: 1px solid var(--mac-border); padding: 10px 12px; font-size: 13px; color: var(--mac-text); vertical-align: top; word-break: break-word; }
.detail-table tr:last-child th, .detail-table tr:last-child td { border-bottom: none; }
.detail-table th:last-child, .detail-table td:last-child { border-right: none; }
.detail-table th { width: 140px; background: rgba(0,0,0,0.04); color: var(--mac-text-secondary); font-weight: 700; text-align: left; }
.multiline-cell { white-space: pre-wrap; }
@media (max-width: 960px) {
  .wire-toolbar { flex-direction: column; align-items: stretch; }
  .form-grid { grid-template-columns: 1fr; }
  .fs-summary-cards, .fs-currency-grid { grid-template-columns: 1fr; }
}
</style>
