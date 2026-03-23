<template>
  <div class="funds-view">
    <!-- Top Tabs -->
    <div class="top-tabs">
      <button :class="['top-tab', { active: topTab === 'manage' }]" @click="topTab = 'manage'">
        <i class="pi pi-credit-card"></i> 资金管理
      </button>
      <button :class="['top-tab', { active: topTab === 'stats' }]" @click="topTab = 'stats'">
        <i class="pi pi-chart-bar"></i> 收支统计
      </button>
    </div>

    <!-- Stats View -->
    <div v-if="topTab === 'stats'" class="funds-stats">
      <!-- Stats Filter Bar -->
      <div class="fs-filter-bar">
        <div class="filter-item">
          <label>入账日期</label>
          <DatePicker v-model="statsRecordRange" selectionMode="range" :manualInput="false" dateFormat="yy-mm-dd" placeholder="选择范围" showIcon showButtonBar appendTo="body" class="filter-date-range">
            <template #buttonbar="{ clearCallback }">
              <div class="dp-btnbar">
                <Button size="small" label="今天" severity="secondary" @click="statsRecordRange = daysRange(0)" />
                <Button size="small" label="近7天" severity="secondary" @click="statsRecordRange = daysRange(7)" />
                <Button size="small" label="近30天" severity="secondary" @click="statsRecordRange = daysRange(30)" />
                <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback" />
              </div>
            </template>
          </DatePicker>
        </div>
        <div class="filter-item">
          <label>出账日期</label>
          <DatePicker v-model="statsOutRange" selectionMode="range" :manualInput="false" dateFormat="yy-mm-dd" placeholder="选择范围" showIcon showButtonBar appendTo="body" class="filter-date-range">
            <template #buttonbar="{ clearCallback }">
              <div class="dp-btnbar">
                <Button size="small" label="今天" severity="secondary" @click="statsOutRange = daysRange(0)" />
                <Button size="small" label="近7天" severity="secondary" @click="statsOutRange = daysRange(7)" />
                <Button size="small" label="近30天" severity="secondary" @click="statsOutRange = daysRange(30)" />
                <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback" />
              </div>
            </template>
          </DatePicker>
        </div>
        <div class="filter-item">
          <label>分组</label>
          <Select v-model="statsGroup" :options="statsGroupOptions" optionLabel="name" optionValue="id" placeholder="全部" showClear class="filter-select" />
        </div>
        <div class="filter-item">
          <label>状态</label>
          <Select v-model="statsStatus" :options="statusOptions" placeholder="全部" showClear class="filter-select" />
        </div>
        <div class="filter-item">
          <label>货币</label>
          <Select v-model="statsCurrency" :options="allCurrencies" placeholder="全部" showClear class="filter-select" />
        </div>
        <div class="filter-item">
          <label>出货商</label>
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
      </div>

      <div class="fs-section">
        <div class="fs-section-title">按货币统计</div>
        <div class="fs-currency-grid">
          <div v-for="cs in statsData.byCurrency" :key="cs.currency" class="fs-currency-card">
            <div class="fs-cur-header">
              <Tag :value="cs.currency" severity="info" />
            </div>
            <div class="fs-cur-row">
              <span class="fs-cur-label">原币进</span>
              <span class="fs-cur-val income">{{ currencySymbol(cs.currency) }}{{ fmtNum(cs.inAmount) }}</span>
            </div>
            <div class="fs-cur-row">
              <span class="fs-cur-label">原币出</span>
              <span class="fs-cur-val expense">{{ currencySymbol(cs.currency) }}{{ fmtNum(cs.outAmount) }}</span>
            </div>
            <div class="fs-cur-divider"></div>
            <div class="fs-cur-row">
              <span class="fs-cur-label">折合进(¥)</span>
              <span class="fs-cur-val income">¥{{ fmtNum(cs.inRmb) }}</span>
            </div>
            <div class="fs-cur-row">
              <span class="fs-cur-label">折合出(¥)</span>
              <span class="fs-cur-val expense">¥{{ fmtNum(cs.outRmb) }}</span>
            </div>
            <div class="fs-cur-row">
              <span class="fs-cur-label">盈利(¥)</span>
              <span class="fs-cur-val" :class="cs.profit >= 0 ? 'income' : 'expense'">¥{{ fmtNum(cs.profit) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="fs-section">
        <div class="fs-section-title">按状态统计</div>
        <div class="fs-status-list">
          <div v-for="s in statsData.byStatus" :key="s.status" class="fs-status-row">
            <Tag :severity="s.status === '盈利' ? 'success' : s.status === '亏损' ? 'danger' : 'warning'" :value="s.status" />
            <span class="fs-status-count">{{ s.count }} 条</span>
            <div class="fs-status-bar-bg">
              <div class="fs-status-bar-fill" :style="{ width: s.pct + '%', background: s.status === '盈利' ? '#34c759' : s.status === '亏损' ? '#ff3b30' : '#ff9500' }"></div>
            </div>
            <span class="fs-status-amt">进 ¥{{ fmtNum(s.inTotal) }}</span>
            <span class="fs-status-amt">出 ¥{{ fmtNum(s.outTotal) }}</span>
          </div>
        </div>
      </div>

      <div class="fs-section" v-if="statsData.byGroup.length">
        <div class="fs-section-title">按分组统计</div>
        <div class="fs-group-list">
          <div v-for="g in statsData.byGroup" :key="g.name" class="fs-group-row">
            <span class="fs-group-name">{{ g.name }}</span>
            <span class="fs-group-count">{{ g.count }} 条</span>
            <span class="fs-group-amt income">进 ¥{{ fmtNum(g.inTotal) }}</span>
            <span class="fs-group-amt expense">出 ¥{{ fmtNum(g.outTotal) }}</span>
            <span class="fs-group-amt" :class="g.profit >= 0 ? 'income' : 'expense'">利 ¥{{ fmtNum(g.profit) }}</span>
          </div>
        </div>
      </div>

      <div class="fs-section" v-if="statsData.byOutTo.length">
        <div class="fs-section-title">按出货商统计</div>
        <div class="fs-group-list">
          <div v-for="o in statsData.byOutTo" :key="o.name" class="fs-group-row">
            <span class="fs-group-name">{{ o.name }}</span>
            <span class="fs-group-count">{{ o.count }} 条</span>
            <span class="fs-group-amt expense">出 ¥{{ fmtNum(o.outTotal) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Manage View -->
    <div v-if="topTab === 'manage'" class="manage-view">
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
          <span v-if="groupPendingCount(g.id)" class="tab-badge">{{ groupPendingCount(g.id) }}</span>
          <i class="pi pi-times tab-close" @click.stop="deleteGroup(g.id)"></i>
        </div>
        <div class="tab-add" @click="showAddGroup = true"><i class="pi pi-plus"></i></div>
      </div>
    </div>

    <!-- Filter Bar -->

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
        v-model:filters="dtFilters"
        dataKey="id"
        stripedRows
        scrollable
        scrollHeight="flex"
        paginator
        :rows="pageRows"
        :rowsPerPageOptions="[20, 50, 100, 200, 500, 1000]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
        currentPageReportTemplate="共 {totalRecords} 条，第 {first}-{last} 条"
        :virtualScrollerOptions="filteredFunds.length > 200 ? { itemSize: 46 } : undefined"
        filterDisplay="row"
        :globalFilterFields="['card_no', 'out_to', 'record_date']"
        contextMenu
        v-model:contextMenuSelection="ctxRow"
        @rowContextmenu="onRowCtx"
        :loading="loading"
        class="funds-table"
      >
        <Column selectionMode="multiple" style="width:28px" />
        <Column field="record_date" header="日期" :showFilterMenu="false" style="min-width:100px">
          <template #body="{data}">
            <span v-if="data.record_date" class="record-date">{{ data.record_date }}</span>
            <span v-else class="no-data">-</span>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <DatePicker v-model="filterDateRange" selectionMode="range" :manualInput="false" dateFormat="yy-mm-dd" placeholder="日期范围" showIcon showButtonBar appendTo="body" class="dt-filter-date" @update:modelValue="filterCallback()">
              <template #buttonbar="{ clearCallback }">
                <div class="dp-btnbar">
                  <Button size="small" label="今天" severity="secondary" @click="filterDateRange = daysRange(0); filterCallback()" />
                  <Button size="small" label="近3天" severity="secondary" @click="filterDateRange = daysRange(3); filterCallback()" />
                  <Button size="small" label="近7天" severity="secondary" @click="filterDateRange = daysRange(7); filterCallback()" />
                  <Button size="small" label="近30天" severity="secondary" @click="filterDateRange = daysRange(30); filterCallback()" />
                  <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback; filterDateRange = null; filterCallback()" />
                </div>
              </template>
            </DatePicker>
          </template>
        </Column>
        <Column field="currency" header="货币" :showFilterMenu="false" style="min-width:20px">
          <template #body="{data}">
            <Tag :value="data.currency || 'USD'" severity="info" />
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <Select v-model="filterModel.value" @change="filterCallback()" :options="currencyFilterOptions" placeholder="全部" :showClear="true" class="dt-filter-select" />
          </template>
        </Column>
        <Column field="card_no" header="卡片信息" :showFilterMenu="false" style="min-width:240px">
          <template #body="{data}">
            <span class="card-inline">{{ data.card_no }} {{ data.card_date }} {{ data.cvv }}</span>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="搜索卡号" class="dt-filter-input" />
          </template>
        </Column>
        <Column v-if="activeGroup === null" header="分组" style="min-width:70px">
          <template #body="{data}">
            <Tag v-if="groupName(data.group_id)" :value="groupName(data.group_id)" severity="secondary" />
            <span v-else class="no-data">-</span>
          </template>
        </Column>
        <Column field="status" header="状态" :showFilterMenu="false" style="min-width:90px">
          <template #body="{data}">
            <span class="status-tag" :class="statusClass(data.status)">{{ data.status }}</span>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <Select v-model="filterModel.value" @change="filterCallback()" :options="statusOptions" placeholder="全部" :showClear="true" class="dt-filter-select" />
          </template>
        </Column>
        <Column header="进账" style="min-width:90px">
          <template #body="{data}">
            <div class="amount-cell">
              <span class="amount-val income">{{ currencySymbol(data.currency) }}{{ fmtNum(data.in_amount) }}</span>
              <span class="amount-rate">× {{ data.in_rate }}</span>
              <span class="amount-total">= ¥{{ fmtNum(data.in_amount * data.in_rate) }}</span>
            </div>
          </template>
        </Column>
        <Column header="出账" style="min-width:90px">
          <template #body="{data}">
            <div v-if="data.out_amount" class="amount-cell">
              <span class="amount-val expense">{{ currencySymbol(data.currency) }}{{ fmtNum(data.out_amount) }}</span>
              <span class="amount-rate">× {{ data.out_rate }}</span>
              <span class="amount-total">= ¥{{ fmtNum(data.out_amount * data.out_rate) }}</span>
            </div>
            <span v-else class="no-data">未出账</span>
          </template>
        </Column>
        <Column header="盈利" style="min-width:70px">
          <template #body="{data}">
            <div v-if="data.out_amount" class="profit-cell" :class="profit(data) >= 0 ? 'profit-pos' : 'profit-neg'">
              <i :class="profit(data) >= 0 ? 'pi pi-arrow-up' : 'pi pi-arrow-down'" style="font-size:11px"></i>
              ¥{{ fmtNum(Math.abs(profit(data))) }}
            </div>
            <span v-else class="no-data">-</span>
          </template>
        </Column>
        <Column field="out_to" header="出货信息" :showFilterMenu="false" style="min-width:120px">
          <template #body="{data}">
            <div v-if="data.out_date || data.out_to" class="out-info-cell">
              <span v-if="data.out_date" class="record-date">{{ data.out_date }}</span>
              <span v-if="data.out_to" class="out-to-cell">{{ data.out_to }}</span>
            </div>
            <span v-else class="no-data">-</span>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <div class="out-filter-group">
              <DatePicker v-model="filterOutDateRange" selectionMode="range" :manualInput="false" dateFormat="yy-mm-dd" placeholder="出账日期" showIcon showButtonBar appendTo="body" class="dt-filter-date" @update:modelValue="filterCallback()">
                <template #buttonbar="{ clearCallback }">
                  <div class="dp-btnbar">
                    <Button size="small" label="今天" severity="secondary" @click="filterOutDateRange = daysRange(0); filterCallback()" />
                    <Button size="small" label="近7天" severity="secondary" @click="filterOutDateRange = daysRange(7); filterCallback()" />
                    <Button size="small" label="近30天" severity="secondary" @click="filterOutDateRange = daysRange(30); filterCallback()" />
                    <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback; filterOutDateRange = null; filterCallback()" />
                  </div>
                </template>
              </DatePicker>
              <InputText v-model="filterModel.value" type="text" @input="filterCallback()" placeholder="搜索出货商" class="dt-filter-input" />
            </div>
          </template>
        </Column>
        <Column style="width:56px">
          <template #body="{data}">
            <Button icon="pi pi-trash" text rounded severity="danger" @click="deleteFund(data.id)" />
          </template>
        </Column>
        <template #paginatorstart>
          <div class="page-size-input">
            <span>每页</span>
            <input
              type="number"
              :value="pageRows"
              @change="e => { let v = parseInt(e.target.value) || 50; v = Math.max(10, Math.min(5000, v)); pageRows = v; e.target.value = v; }"
              class="page-size-native"
              min="10" max="5000" step="10"
            />
            <span>条</span>
          </div>
        </template>
        <template #empty>
          <div class="empty-tip"><i class="pi pi-inbox"></i><p>暂无数据，点击添加</p></div>
        </template>
      </DataTable>
    </div>
    <div v-if="filteredFunds.length && activeGroup !== null" class="stats-bar">
      <div class="stat-item">
        <span class="stat-label">待出账</span>
        <span class="stat-val">{{ pendingCount }} 条</span>
      </div>
      <div class="stat-divider"></div>
      <div v-for="cs in currencyStats" :key="cs.currency" class="stat-currency-group">
        <span class="stat-currency-tag">{{ cs.currency }}</span>
        <span class="stat-val income">进 {{ currencySymbol(cs.currency) }}{{ fmtNum(cs.inAmount) }}</span>
        <span class="stat-val expense">出 {{ currencySymbol(cs.currency) }}{{ fmtNum(cs.outAmount) }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-label">总进账(¥)</span>
        <span class="stat-val income">¥{{ fmtNum(totalIn) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">总出账(¥)</span>
        <span class="stat-val expense">¥{{ fmtNum(totalOut) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">总盈利(¥)</span>
        <span class="stat-val" :class="totalProfit >= 0 ? 'income' : 'expense'">¥{{ fmtNum(totalProfit) }}</span>
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
        <div class="form-field">
          <label>货币类型</label>
          <Select v-model="form.currency" :options="currencyOptions" optionLabel="label" optionValue="value" class="w-full" />
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
          <label>出货商</label>
          <InputText v-model="editForm.out_to" class="w-full" placeholder="输入出货商" />
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
          <label>出货商</label>
          <InputText v-model="batchEditForm.out_to" class="w-full" placeholder="输入出货商" />
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
        <div class="form-field" style="margin-bottom:8px">
          <label>货币类型</label>
          <Select v-model="batchCurrency" :options="currencyOptions" optionLabel="label" optionValue="value" class="w-full" />
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
        <div class="export-hint" v-if="selectedFunds.length">
          将导出已选中的 <strong>{{ selectedFunds.length }}</strong> 条记录
        </div>
        <div class="export-hint" v-else style="color:var(--mac-red)">
          <i class="pi pi-exclamation-triangle"></i> 请先在列表中勾选要导出的记录
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
        <Button label="导出 Excel" icon="pi pi-file-excel" @click="doExport" />
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
import { ref, onMounted, computed, watch } from 'vue'
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
import { useConfirm } from 'primevue/useconfirm'
import { FilterMatchMode } from '@primevue/core/api'
import * as XLSX from 'xlsx'

const toast = useToast()
const confirm = useConfirm()

const topTab = ref('manage')

function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d }
function daysRange(n) { const end = new Date(); const start = new Date(); start.setDate(start.getDate() - n); return [start, end] }
function emptyForm() { return { group_id: null, card_no: '', card_date: '', cvv: '', status: '待出账', in_amount: 0, in_rate: 1, out_amount: 0, out_rate: 1, record_date: new Date(), currency: 'USD' } }

const currencyOptions = [
  { label: '🇺🇸 美元 (USD)', value: 'USD' },
  { label: '🇪🇺 欧元 (EUR)', value: 'EUR' },
  { label: '🇦🇺 澳元 (AUD)', value: 'AUD' },
  { label: '🇨🇦 加元 (CAD)', value: 'CAD' },
]

const funds = ref([])
const allFunds = ref([])
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
const batchCurrency = ref('USD')
const ctxRow = ref(null)
const ctxMenu = ref(null)
const groupCtxMenu = ref(null)
const ctxGroup = ref(null)
const selectedFunds = ref([])
const pageRows = ref(50)
const showBatchEdit = ref(false)
const batchEditForm = ref({ out_amount: 0, out_rate: 1, out_date: new Date(), out_to: '' })

const currencyFilterOptions = ['USD', 'EUR', 'AUD', 'CAD']
const statusOptions = ['待出账', '盈利', '亏损']

const dtFilters = ref({
  currency: { value: null, matchMode: FilterMatchMode.EQUALS },
  card_no: { value: null, matchMode: FilterMatchMode.CONTAINS },
  status: { value: null, matchMode: FilterMatchMode.EQUALS },
  out_to: { value: null, matchMode: FilterMatchMode.CONTAINS },
})

const filterDateRange = ref(null)
const filterOutDateRange = ref(null)

const filteredFunds = computed(() => {
  let list = funds.value
  if (filterDateRange.value) {
    const [start, end] = filterDateRange.value
    if (start) { const s = fmtDate(start); list = list.filter(f => (f.record_date || '') >= s) }
    if (end) { const e = fmtDate(end); list = list.filter(f => (f.record_date || '') <= e) }
  }
  if (filterOutDateRange.value) {
    const [start, end] = filterOutDateRange.value
    if (start) { const s = fmtDate(start); list = list.filter(f => (f.out_date || '') >= s) }
    if (end) { const e = fmtDate(end); list = list.filter(f => (f.out_date || '') <= e) }
  }
  return list
})

const totalIn = computed(() => filteredFunds.value.reduce((s, f) => s + f.in_amount * f.in_rate, 0))
const totalOut = computed(() => filteredFunds.value.reduce((s, f) => s + (f.out_amount || 0) * (f.out_rate || 1), 0))
const totalProfit = computed(() => totalOut.value - totalIn.value)
const pendingCount = computed(() => filteredFunds.value.filter(f => f.status === '待出账').length)

const groupPendingMap = computed(() => {
  const map = {}
  for (const f of allFunds.value) {
    if (f.status === '待出账') {
      const gid = f.group_id
      map[gid] = (map[gid] || 0) + 1
    }
  }
  return map
})

function groupPendingCount(groupId) {
  return groupPendingMap.value[groupId] || 0
}

const allCurrencies = ['USD', 'EUR', 'AUD', 'CAD']

const currencyStats = computed(() => {
  const map = {}
  for (const cur of allCurrencies) {
    map[cur] = { currency: cur, inAmount: 0, inTotal: 0, outAmount: 0, outTotal: 0, profit: 0 }
  }
  for (const f of filteredFunds.value) {
    const cur = f.currency || 'USD'
    if (!map[cur]) map[cur] = { currency: cur, inAmount: 0, inTotal: 0, outAmount: 0, outTotal: 0, profit: 0 }
    map[cur].inAmount += f.in_amount || 0
    map[cur].inTotal += f.in_amount * f.in_rate
    map[cur].outAmount += f.out_amount || 0
    map[cur].outTotal += (f.out_amount || 0) * (f.out_rate || 1)
    map[cur].profit += ((f.out_amount || 0) * (f.out_rate || 1)) - (f.in_amount * f.in_rate)
  }
  return allCurrencies.map(cur => map[cur])
})

// Stats filters
const statsRecordRange = ref(null)
const statsOutRange = ref(null)
const statsGroup = ref(null)
const statsStatus = ref(null)
const statsCurrency = ref(null)
const statsOutTo = ref('')
const statsGroupOptions = computed(() => groups.value)

const hasStatsFilter = computed(() =>
  statsRecordRange.value || statsOutRange.value || statsGroup.value !== null || statsStatus.value || statsCurrency.value || statsOutTo.value
)

function clearStatsFilters() {
  statsRecordRange.value = null
  statsOutRange.value = null
  statsGroup.value = null
  statsStatus.value = null
  statsCurrency.value = null
  statsOutTo.value = ''
}

const statsFilteredFunds = computed(() => {
  let list = allFunds.value
  if (statsGroup.value !== null && statsGroup.value !== undefined) {
    list = list.filter(f => f.group_id === statsGroup.value)
  }
  if (statsStatus.value) {
    list = list.filter(f => f.status === statsStatus.value)
  }
  if (statsCurrency.value) {
    list = list.filter(f => (f.currency || 'USD') === statsCurrency.value)
  }
  if (statsRecordRange.value) {
    const [start, end] = statsRecordRange.value
    if (start) { const s = fmtDate(start); list = list.filter(f => (f.record_date || '') >= s) }
    if (end) { const e = fmtDate(end); list = list.filter(f => (f.record_date || '') <= e) }
  }
  if (statsOutRange.value) {
    const [start, end] = statsOutRange.value
    if (start) { const s = fmtDate(start); list = list.filter(f => (f.out_date || '') >= s) }
    if (end) { const e = fmtDate(end); list = list.filter(f => (f.out_date || '') <= e) }
  }
  if (statsOutTo.value) {
    const kw = statsOutTo.value.toLowerCase()
    list = list.filter(f => (f.out_to || '').toLowerCase().includes(kw))
  }
  return list
})

const statsData = computed(() => {
  const all = statsFilteredFunds.value
  const tIn = all.reduce((s, f) => s + f.in_amount * f.in_rate, 0)
  const tOut = all.reduce((s, f) => s + (f.out_amount || 0) * (f.out_rate || 1), 0)

  const curMap = {}
  for (const cur of allCurrencies) {
    curMap[cur] = { currency: cur, inAmount: 0, outAmount: 0, inRmb: 0, outRmb: 0, profit: 0 }
  }
  for (const f of all) {
    const cur = f.currency || 'USD'
    if (!curMap[cur]) curMap[cur] = { currency: cur, inAmount: 0, outAmount: 0, inRmb: 0, outRmb: 0, profit: 0 }
    curMap[cur].inAmount += f.in_amount
    curMap[cur].outAmount += (f.out_amount || 0)
    curMap[cur].inRmb += f.in_amount * f.in_rate
    curMap[cur].outRmb += (f.out_amount || 0) * (f.out_rate || 1)
    curMap[cur].profit += ((f.out_amount || 0) * (f.out_rate || 1)) - (f.in_amount * f.in_rate)
  }
  const byCurrency = allCurrencies.map(cur => curMap[cur])

  const statusMap = {}
  for (const f of all) {
    const st = f.status || '待出账'
    if (!statusMap[st]) statusMap[st] = { status: st, count: 0, inTotal: 0, outTotal: 0 }
    statusMap[st].count++
    statusMap[st].inTotal += f.in_amount * f.in_rate
    statusMap[st].outTotal += (f.out_amount || 0) * (f.out_rate || 1)
  }
  const byStatus = Object.values(statusMap).sort((a, b) => b.count - a.count)
  const maxCount = Math.max(...byStatus.map(s => s.count), 1)
  byStatus.forEach(s => { s.pct = (s.count / maxCount) * 100 })

  const groupMap = {}
  for (const f of all) {
    const gn = groupName(f.group_id) || '未分组'
    if (!groupMap[gn]) groupMap[gn] = { name: gn, count: 0, inTotal: 0, outTotal: 0, profit: 0 }
    groupMap[gn].count++
    groupMap[gn].inTotal += f.in_amount * f.in_rate
    groupMap[gn].outTotal += (f.out_amount || 0) * (f.out_rate || 1)
    groupMap[gn].profit += ((f.out_amount || 0) * (f.out_rate || 1)) - (f.in_amount * f.in_rate)
  }
  const byGroup = Object.values(groupMap).sort((a, b) => b.count - a.count)

  const outToMap = {}
  for (const f of all) {
    if (!f.out_to) continue
    if (!outToMap[f.out_to]) outToMap[f.out_to] = { name: f.out_to, count: 0, outTotal: 0 }
    outToMap[f.out_to].count++
    outToMap[f.out_to].outTotal += (f.out_amount || 0) * (f.out_rate || 1)
  }
  const byOutTo = Object.values(outToMap).sort((a, b) => b.outTotal - a.outTotal)

  return { totalIn: tIn, totalOut: tOut, totalProfit: tOut - tIn, totalCount: all.length, byCurrency, byStatus, byGroup, byOutTo }
})

const form = ref(emptyForm())
const quickInput = ref('')
const editForm = ref({ out_amount: 0, out_rate: 1, out_date: new Date(), out_to: '' })
const editId = ref(null)

const exportFields = ref([
  { key: 'record_date', label: '记录日期', checked: true },
  { key: 'currency', label: '货币', checked: true },
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
  { key: 'out_to', label: '出货商', checked: true },
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
  await loadAllFunds()
  await load()
})

async function loadAllFunds() {
  if (!window.api) { allFunds.value = []; return }
  allFunds.value = await window.api.getAllFunds()
}

watch(topTab, (val) => {
  if (val === 'stats') loadAllFunds()
})

async function refreshAllFunds() { if (window.api) allFunds.value = await window.api.getAllFunds() }

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

const currencySymbolMap = { USD: '$', EUR: '€', AUD: 'A$', CAD: 'C$' }
function currencySymbol(cur) { return currencySymbolMap[cur] || '$' }

function statusClass(status) {
  if (status === '盈利') return 'status-profit'
  if (status === '亏损') return 'status-loss'
  return 'status-pending'
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
  batchCurrency.value = 'USD'
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
  const cur = batchCurrency.value || 'USD'
  const plain = JSON.parse(JSON.stringify(batchRows.value)).map(r => ({ ...r, group_id: activeGroup.value, record_date: rd, currency: cur }))
  await window.api.addFundsBatch(plain)
  await load()
  showBatch.value = false
  batchInput.value = ''
  batchRows.value = []
  toast.add({ severity: 'success', summary: `已导入 ${count} 条记录`, life: 2000 })
  refreshAllFunds()
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
    currency: form.value.currency || 'USD',
  })
  funds.value.unshift(saved)
  form.value = emptyForm()
  quickInput.value = ''
  showAdd.value = false
  toast.add({ severity: 'success', summary: '已添加', life: 2000 })
  refreshAllFunds()
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
  refreshAllFunds()
}

function deleteFund(id) {
  confirm.require({
    message: '确定要删除这条记录吗？',
    header: '确认删除',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '删除',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: async () => {
      if (!window.api) return
      await window.api.deleteFund(id)
      funds.value = funds.value.filter(f => f.id !== id)
      selectedFunds.value = selectedFunds.value.filter(f => f.id !== id)
      toast.add({ severity: 'info', summary: '已删除', life: 2000 })
      refreshAllFunds()
    }
  })
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
  refreshAllFunds()
}

function batchDelete() {
  if (!selectedFunds.value.length) return
  const count = selectedFunds.value.length
  confirm.require({
    message: `确定要删除选中的 ${count} 条记录吗？此操作不可恢复。`,
    header: '确认批量删除',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '全部删除',
    rejectLabel: '取消',
    acceptClass: 'p-button-danger',
    accept: async () => {
      if (!window.api) return
      for (const f of selectedFunds.value) {
        await window.api.deleteFund(f.id)
      }
      const ids = new Set(selectedFunds.value.map(f => f.id))
      funds.value = funds.value.filter(f => !ids.has(f.id))
      selectedFunds.value = []
      toast.add({ severity: 'info', summary: `已删除 ${count} 条记录`, life: 2000 })
      refreshAllFunds()
    }
  })
}

function doExport() {
  if (!selectedFunds.value.length) { toast.add({ severity: 'warn', summary: '请先选中要导出的记录', life: 2000 }); return }
  const data = selectedFunds.value

  const fields = exportFields.value.filter(f => f.checked)
  const rows = data.map(row => {
    const obj = {}
    for (const f of fields) {
      let val
      if (f.key === 'profit') val = profit(row).toFixed(2)
      else if (f.key === 'group') val = groupName(row.group_id)
      else if (f.key === 'in_total') val = (row.in_amount * row.in_rate).toFixed(2)
      else if (f.key === 'out_total') val = row.out_amount ? (row.out_amount * row.out_rate).toFixed(2) : ''
      else if (f.key === 'card_no') val = String(row.card_no ?? '')
      else if (f.key === 'card_date') val = String(row.card_date ?? '')
      else if (f.key === 'cvv') val = String(row.cvv ?? '')
      else val = row[f.key] ?? ''
      obj[f.label] = val
    }
    return obj
  })

  const ws = XLSX.utils.json_to_sheet(rows)

  const colWidths = fields.map(f => {
    if (f.key === 'card_no') return { wch: 22 }
    if (f.key === 'card_date' || f.key === 'cvv') return { wch: 10 }
    if (f.key === 'record_date' || f.key === 'out_date') return { wch: 14 }
    if (f.key === 'group' || f.key === 'status') return { wch: 10 }
    if (f.key === 'out_to') return { wch: 14 }
    return { wch: 14 }
  })
  ws['!cols'] = colWidths

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  const centerStyle = { alignment: { horizontal: 'center', vertical: 'center' } }
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!ws[addr]) ws[addr] = { v: '' }
      ws[addr].s = centerStyle
    }
  }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '资金记录')
  XLSX.writeFile(wb, `资金记录_${new Date().toISOString().slice(0,10)}.xlsx`)

  showExport.value = false
  toast.add({ severity: 'success', summary: `已导出 ${data.length} 条记录`, life: 2000 })
}

function fmtDate(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}
</script>

<style scoped>
.funds-view { display: flex; flex-direction: column; height: 100%; background: var(--mac-bg); }
.manage-view { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

.top-tabs {
  display: flex; gap: 2px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}
.top-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 16px; border: none; background: transparent;
  border-radius: 8px; font-size: 13px; cursor: pointer;
  color: var(--mac-text-secondary); transition: all 0.15s; font-weight: 500;
}
.top-tab i { font-size: 13px; }
.top-tab:hover { background: rgba(0,0,0,0.05); color: var(--mac-text); }
.top-tab.active { background: var(--mac-accent, #007aff); color: #fff; }

.funds-stats {
  flex: 1; overflow-y: auto;
  padding: 20px; display: flex; flex-direction: column; gap: 20px;
}
.fs-filter-bar {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--mac-surface);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}
.fs-summary-cards {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
}
.fs-card {
  background: var(--mac-surface); border-radius: 12px; padding: 16px;
  text-align: center; box-shadow: var(--shadow-sm);
}
.fs-card-label { font-size: 11px; color: var(--mac-text-secondary); margin-bottom: 4px; font-weight: 500; text-transform: uppercase; }
.fs-card-val { font-size: 20px; font-weight: 700; }
.fs-card-val.income { color: #34c759; }
.fs-card-val.expense { color: #ff9500; }
.fs-card-val.neutral { color: var(--mac-text); }

.fs-currency-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.fs-currency-card {
  background: var(--mac-surface); border-radius: 12px; padding: 14px;
  box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 6px;
}
.fs-cur-header { display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
.fs-cur-row { display: flex; justify-content: space-between; align-items: center; }
.fs-cur-label { font-size: 12px; color: var(--mac-text-secondary); }
.fs-cur-val { font-size: 13px; font-weight: 600; }
.fs-cur-val.income { color: #34c759; }
.fs-cur-val.expense { color: #ff9500; }
.fs-cur-divider { height: 1px; background: var(--mac-border); margin: 2px 0; }

.fs-section { display: flex; flex-direction: column; gap: 10px; }
.fs-section-title { font-size: 14px; font-weight: 600; color: var(--mac-text); }

.fs-status-list { display: flex; flex-direction: column; gap: 8px; }
.fs-status-row {
  display: flex; align-items: center; gap: 10px;
  background: var(--mac-surface); border-radius: 10px; padding: 10px 14px;
}
.fs-status-count { font-size: 13px; color: var(--mac-text); font-weight: 500; min-width: 50px; }
.fs-status-bar-bg { flex: 1; height: 6px; background: rgba(0,0,0,0.06); border-radius: 3px; overflow: hidden; }
.fs-status-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.fs-status-amt { font-size: 12px; color: var(--mac-text-secondary); min-width: 90px; text-align: right; }

.fs-group-list { display: flex; flex-direction: column; gap: 6px; }
.fs-group-row {
  display: flex; align-items: center; gap: 12px;
  background: var(--mac-surface); border-radius: 10px; padding: 10px 14px;
}
.fs-group-name { font-size: 13px; font-weight: 600; color: var(--mac-text); min-width: 80px; }
.fs-group-count { font-size: 12px; color: var(--mac-text-secondary); min-width: 50px; }
.fs-group-amt { font-size: 12px; font-weight: 600; min-width: 100px; text-align: right; }
.fs-group-amt.income { color: #34c759; }
.fs-group-amt.expense { color: #ff9500; }

.toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}
.view-title { font-size: 15px; font-weight: 600; color: var(--mac-text); }
.toolbar-actions { display: flex; align-items: center; gap: 8px; }
.page-size-input { display: inline-flex; align-items: center; gap: 4px; }
.page-size-input span { font-size: 12px; color: var(--mac-text-secondary); white-space: nowrap; }
.page-size-native {
  width: 48px; height: 24px; border: 1px solid var(--mac-border, #d1d5db);
  border-radius: 6px; text-align: center; font-size: 12px; background: var(--mac-surface, #fff);
  color: var(--mac-text); outline: none; appearance: textfield; -moz-appearance: textfield;
}
.page-size-native::-webkit-inner-spin-button,
.page-size-native::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.page-size-native:focus { border-color: var(--mac-accent, #007aff); box-shadow: 0 0 0 2px rgba(0,122,255,0.15); }
:deep(.p-paginator) { flex-wrap: nowrap; gap: 2px; padding: 4px 8px; font-size: 12px; }
:deep(.p-paginator .p-paginator-element) { min-width: 28px; height: 28px; }
:deep(.p-paginator .p-paginator-current) { font-size: 12px; white-space: nowrap; }

.group-tabs {
  border-bottom: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.4);
  padding: 0 12px;
  overflow: hidden;
  flex-shrink: 0;
}
.tab-list {
  display: flex; align-items: center; gap: 2px;
  overflow-x: auto; overflow-y: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.15) transparent;
}
.tab-list::-webkit-scrollbar { height: 3px; }
.tab-list::-webkit-scrollbar-track { background: transparent; }
.tab-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
.tab-list::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.3); }
.tab-item {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; font-size: 13px; cursor: pointer;
  color: var(--mac-text-secondary); border-bottom: 2px solid transparent;
  white-space: nowrap; transition: color 0.15s;
  user-select: none;
}
.tab-item:hover { color: var(--mac-text); }
.tab-item.active { color: var(--mac-accent, #007aff); border-bottom-color: var(--mac-accent, #007aff); font-weight: 500; }
.tab-badge {
  font-size: 10px; font-weight: 700;
  background: #ff9500; color: #fff;
  min-width: 16px; height: 16px;
  border-radius: 8px; padding: 0 4px;
  display: inline-flex; align-items: center; justify-content: center;
  line-height: 1;
}
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
  flex-shrink: 0;
}
.batch-info { font-size: 13px; font-weight: 600; color: var(--mac-accent, #007aff); }
.batch-edit-hint { font-size: 13px; color: var(--mac-text-secondary); padding: 4px 0 8px; }
.batch-edit-note { font-size: 12px; color: var(--mac-text-secondary); font-style: italic; margin-top: 4px; }
.table-wrap { flex: 1; overflow: hidden; padding: 8px 12px; position: relative; display: flex; flex-direction: column; min-height: 0; }
:deep(.funds-table) { display: flex; flex-direction: column; height: 100%; }
:deep(.funds-table .p-datatable-wrapper) { flex: 1; min-height: 0; overflow: auto; }
:deep(.funds-table .p-paginator-bottom) { flex-shrink: 0; border-top: 1px solid var(--mac-border); }
.stats-bar {
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 10px 16px;
  border-top: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}
.stat-divider { width: 1px; height: 24px; background: var(--mac-border); flex-shrink: 0; }
.stat-currency-group {
  display: flex; align-items: center; gap: 12px;
  padding: 2px 10px;
  background: rgba(0,0,0,0.03);
  border-radius: 8px;
}
.stat-currency-tag {
  font-size: 11px; font-weight: 700; color: var(--mac-accent, #007aff);
  background: rgba(0,122,255,0.1); padding: 2px 6px; border-radius: 4px;
}
.stat-cny { font-size: 11px; color: var(--mac-text-secondary); font-weight: 400; }
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
.out-to-cell { font-size: 13px; color: var(--mac-accent, #007aff); font-weight: 500; }
.out-info-cell { display: flex; flex-direction: column; gap: 2px; }

.profit-cell { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-size: 14px; padding: 4px 10px; border-radius: 6px; }
.profit-pos { color: #34c759; background: rgba(52,199,89,0.1); }
.profit-neg { color: #ff3b30; background: rgba(255,59,48,0.1); }

.record-date { font-size: 13px; color: var(--mac-text); font-family: 'SF Mono', 'Fira Mono', monospace; }
.dp-btnbar { display: flex; align-items: center; gap: 4px; justify-content: center; flex-wrap: wrap; }
.status-tag {
  display: inline-block; padding: 3px 10px; border-radius: 12px;
  font-size: 12px; font-weight: 600; text-align: center;
}
.status-pending { background: #fff3cd; color: #856404; }
.status-profit { background: #d4edda; color: #155724; }
.status-loss { background: #f8d7da; color: #721c24; }

.dt-filter-input { width: 100%; font-size: 12px; }
.dt-filter-select { width: 100%; font-size: 12px; }
.dt-filter-date { width: 100%; font-size: 12px; }
.out-filter-group { display: flex; flex-direction: column; gap: 4px; width: 100%; }

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
.export-hint { font-size: 13px; color: var(--mac-text-secondary); padding: 4px 0; }
.field-checks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 6px; }
.field-check { display: flex; align-items: center; gap: 6px; font-size: 13px; }

.batch-preview-header { font-size: 11px; font-weight: 600; color: var(--mac-text-secondary); text-transform: uppercase; margin-bottom: 4px; }
.batch-preview-table { border: 1px solid var(--mac-border); border-radius: 6px; overflow: hidden; font-size: 12px; max-height: 180px; overflow-y: auto; }
.batch-preview-row { display: grid; grid-template-columns: 2fr 1fr 0.7fr 1.2fr; gap: 0; padding: 5px 10px; border-bottom: 1px solid var(--mac-border); }
.batch-preview-row:last-child { border-bottom: none; }
.batch-preview-head { background: rgba(0,0,0,0.04); font-weight: 600; color: var(--mac-text-secondary); }
.row-error { background: rgba(255,59,48,0.08); color: #ff3b30; }
</style>
