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
          <label>供应商</label>
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
          <label>下游</label>
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
          <div class="fs-card-label">未结算</div>
          <div class="fs-card-val unsettled">{{ statsData.unsettledCount }} 笔 / ¥{{ fmtNum(statsData.unsettledAmount) }}</div>
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
            <div v-if="cs.unsettledRmb" class="fs-cur-row">
              <span class="fs-cur-label">未结算(¥)</span>
              <span class="fs-cur-val unsettled">¥{{ fmtNum(cs.unsettledRmb) }}</span>
            </div>
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
        <div class="fs-chart-wrap">
          <canvas ref="dailyChartCanvas"></canvas>
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

    <!-- Prepaid Info Bar -->
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

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-item">
        <label>日期</label>
        <DatePicker v-model="filterDateRange" selectionMode="range" :manualInput="false" dateFormat="yy-mm-dd" placeholder="选择范围" showIcon showButtonBar appendTo="body" class="filter-date-range">
          <template #buttonbar="{ clearCallback }">
            <div class="dp-btnbar">
              <Button size="small" label="今天" severity="secondary" @click="filterDateRange = daysRange(0)" />
              <Button size="small" label="近3天" severity="secondary" @click="filterDateRange = daysRange(3)" />
              <Button size="small" label="近7天" severity="secondary" @click="filterDateRange = daysRange(7)" />
              <Button size="small" label="近30天" severity="secondary" @click="filterDateRange = daysRange(30)" />
              <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback; filterDateRange = null" />
            </div>
          </template>
        </DatePicker>
      </div>
      <div class="filter-item">
        <label>货币</label>
        <Select v-model="dtFilters.currency.value" :options="currencyFilterOptions" placeholder="全部" showClear class="filter-select" />
      </div>
      <div class="filter-item">
        <label>卡号</label>
        <InputText v-model="dtFilters.card_no.value" placeholder="搜索..." class="filter-text" />
      </div>
      <div class="filter-item">
        <label>状态</label>
        <Select v-model="dtFilters.status.value" :options="statusOptions" placeholder="全部" showClear class="filter-select" />
      </div>
      <div class="filter-item">
        <label>出账日期</label>
        <DatePicker v-model="filterOutDateRange" selectionMode="range" :manualInput="false" dateFormat="yy-mm-dd" placeholder="选择范围" showIcon showButtonBar appendTo="body" class="filter-date-range">
          <template #buttonbar="{ clearCallback }">
            <div class="dp-btnbar">
              <Button size="small" label="今天" severity="secondary" @click="filterOutDateRange = daysRange(0)" />
              <Button size="small" label="近7天" severity="secondary" @click="filterOutDateRange = daysRange(7)" />
              <Button size="small" label="近30天" severity="secondary" @click="filterOutDateRange = daysRange(30)" />
              <Button size="small" icon="pi pi-times" severity="danger" variant="outlined" @click="clearCallback; filterOutDateRange = null" />
            </div>
          </template>
        </DatePicker>
      </div>
      <div class="filter-item">
        <label>下游</label>
        <InputText v-model="dtFilters.out_to.value" placeholder="搜索..." class="filter-text" />
      </div>
      <Button v-if="hasManageFilter" label="清除" icon="pi pi-filter-slash" text size="small" @click="clearManageFilters" />
    </div>

    <!-- Batch Actions Bar -->
    <div v-if="selectedFunds.length" class="batch-bar">
      <span class="batch-info">已选 {{ selectedFunds.length }} 项</span>
      <Button label="批量出账" icon="pi pi-pencil" size="small" @click="openBatchEdit" />
      <Button label="标记已完成" icon="pi pi-check-circle" size="small" severity="success" @click="batchToggleSettled(true)" />
      <Button label="取消完成" icon="pi pi-circle" size="small" severity="secondary" @click="batchToggleSettled(false)" />
      <Button label="批量删除" icon="pi pi-trash" size="small" severity="danger" @click="batchDelete" />
      <Button label="取消选择" text size="small" @click="selectedFunds = []" />
    </div>

    <!-- DataTable -->
    <div class="table-wrap">
      <div v-if="activeGroup === null && !funds.length" class="group-hint">
        <i class="pi pi-folder-open"></i>
        <p>请先选择或新建一个供应商，再添加记录</p>
      </div>
      <DataTable
        :value="filteredFunds"
        v-model:selection="selectedFunds"
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
        contextMenu
        v-model:contextMenuSelection="ctxRow"
        @rowContextmenu="onRowCtx"
        :loading="loading"
        class="funds-table"
      >
        <Column selectionMode="multiple" style="width:28px" />
        <Column field="record_date" header="日期" style="min-width:100px">
          <template #body="{data}">
            <span v-if="data.record_date" class="record-date">{{ data.record_date }}</span>
            <span v-else class="no-data">-</span>
          </template>
        </Column>
        <Column field="currency" header="货币" style="min-width:20px">
          <template #body="{data}">
            <Tag :value="data.currency || 'USD'" severity="info" />
          </template>
        </Column>
        <Column field="card_no" header="卡片信息" style="min-width:280px">
          <template #body="{data}">
            <span class="card-inline">{{ data.card_no }} {{ data.card_date }} {{ data.cvv }}</span>
            <button class="copy-card-btn" @click="copyCardInfo(data)" title="复制卡片信息">
              <i class="pi pi-copy"></i>
            </button>
          </template>
        </Column>
        <Column v-if="activeGroup === null" header="供应商" style="min-width:70px">
          <template #body="{data}">
            <Tag v-if="groupName(data.group_id)" :value="groupName(data.group_id)" severity="secondary" />
            <span v-else class="no-data">-</span>
          </template>
        </Column>
        <Column field="status" header="状态" style="min-width:90px">
          <template #body="{data}">
            <span class="status-tag" :class="statusClass(data.status)">{{ data.status }}</span>
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
        <Column field="out_to" header="出货信息" style="min-width:120px">
          <template #body="{data}">
            <div v-if="data.out_date || data.out_to" class="out-info-cell">
              <span v-if="data.out_date" class="record-date">{{ data.out_date }}</span>
              <span v-if="data.out_to" class="out-to-cell">{{ data.out_to }}</span>
            </div>
            <span v-else class="no-data">-</span>
          </template>
        </Column>
        <Column field="settled" header="结算" style="min-width:72px">
          <template #body="{data}">
            <div v-if="!data.out_amount" class="settle-switch disabled">
              <span class="settle-inline">—</span>
            </div>
            <div v-else class="settle-switch" :class="{ on: data.settled }" @click="toggleSettled(data)">
              <div class="settle-track"><div class="settle-thumb"></div></div>
              <span>{{ data.settled ? '已完成' : '待结算' }}</span>
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
      <div class="stat-item">
        <span class="stat-label">未结算</span>
        <span class="stat-val unsettled">{{ unsettledCount }} 条 / ¥{{ fmtNum(unsettledAmount) }}</span>
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
      <div class="stat-divider"></div>
      <div class="stat-item">
        <span class="stat-label">已完成</span>
        <span class="stat-val done">{{ doneCount }} 条</span>
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
        <div class="form-hint">快速输入格式（每行一个字段，空行可有可无）：</div>
        <div class="form-hint-eg">卡号 → 日期 → CVV → 金额 → 汇率</div>
        <Textarea v-model="quickInput" rows="6" placeholder="5157631407152083&#10;03/30&#10;475&#10;&#10;310&#10;6.05" class="w-full" @input="parseQuick" autoResize />
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
          <label>下游</label>
          <Select v-model="editForm.downstream_id" :options="downstreamOptions" optionLabel="label" optionValue="value" placeholder="选择下游" showClear class="w-full" />
          <p v-if="!downstreamOptions.length" class="form-hint-mini">暂无已启用的资金类下游，请在「下游」页添加、勾选「资金」并保持启用。</p>
          <div v-if="selectedDownstream" class="ds-hint">
            预付剩余：¥{{ fmtNum((selectedDownstream.prepaid || 0) - (selectedDownstream.prepaid_used || 0)) }}
            <template v-if="(selectedDownstream.prepaid || 0) - (selectedDownstream.prepaid_used || 0) > 0">
              <span class="ds-hint-auto">· 余额充足时自动扣款并标记已完成</span>
            </template>
            <template v-else>
              <span class="ds-hint-warn">· 余额不足，保存后为待结算</span>
            </template>
          </div>
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
          <label>下游</label>
          <Select v-model="batchEditForm.downstream_id" :options="downstreamOptions" optionLabel="label" optionValue="value" placeholder="选择下游" showClear class="w-full" />
          <p v-if="!downstreamOptions.length" class="form-hint-mini">暂无已启用的资金类下游，请在「下游」页添加并保持启用。</p>
        </div>
        <div class="form-field">
          <label>出账汇率</label>
          <InputNumber v-model="batchEditForm.out_rate" class="w-full" :minFractionDigits="4" />
        </div>
        <div class="batch-edit-note">出账金额将自动使用每条记录的进账金额。选择下游后，预付余额内的记录自动结算。</div>
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
        <div class="form-hint">每条记录 5 行（每行一个字段，空行可有可无）：</div>
        <div class="form-hint-eg">卡号 → 日期 → CVV → 金额 → 汇率（多条记录连续输入）</div>
        <Textarea v-model="batchInput" rows="8" placeholder="5157631407152083&#10;03/30&#10;475&#10;&#10;310&#10;6.05&#10;5214160092182610&#10;04/30&#10;188&#10;&#10;600&#10;5.95" class="w-full" @input="parseBatch" autoResize />
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
    <Dialog v-model:visible="showAddGroup" modal header="新建供应商" :style="{width:'300px'}" :draggable="false">
      <div style="padding-top:8px">
        <InputText v-model="newGroupName" class="w-full" placeholder="供应商名称" @keyup.enter="submitAddGroup" autofocus />
      </div>
      <template #footer>
        <Button label="取消" text @click="showAddGroup = false" />
        <Button label="创建" icon="pi pi-check" @click="submitAddGroup" :disabled="!newGroupName.trim()" />
      </template>
    </Dialog>

    <!-- Prepaid Dialog -->
    <Dialog v-model:visible="showPrepaidDialog" modal header="添加预付金额" :style="{width:'350px'}" :draggable="false">
      <div style="padding-top:8px; display:flex; flex-direction:column; gap:8px;">
        <label style="font-size:13px; color:var(--mac-text-secondary)">当前供应商：{{ activeGroupData?.name }}</label>
        <div v-if="activeGroupData?.prepaid" style="font-size:12px; color:var(--mac-text-secondary)">
          当前预付：¥{{ fmtNum(activeGroupData.prepaid) }}　剩余：¥{{ fmtNum(prepaidRemaining) }}
        </div>
        <InputNumber v-model="prepaidAmount" class="w-full" :minFractionDigits="2" :min="0" prefix="¥ " placeholder="输入追加金额" />
      </div>
      <template #footer>
        <Button label="取消" text @click="showPrepaidDialog = false" />
        <Button label="添加" icon="pi pi-plus" @click="savePrepaid" :disabled="!prepaidAmount" />
      </template>
    </Dialog>

    <!-- Rename Group Dialog -->
    <Dialog v-model:visible="showRenameGroup" modal header="重命名供应商" :style="{width:'300px'}" :draggable="false">
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
import { ref, onMounted, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)
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
import { parseDownstreamLedgerTypes } from '../utils/downstreamLedger.js'

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
const downstreams = ref([])
const activeGroup = ref(null)
const loading = ref(false)
const showAdd = ref(false)
const showEdit = ref(false)
const showExport = ref(false)
const showBatch = ref(false)
const showAddGroup = ref(false)
const showRenameGroup = ref(false)
const showPrepaidDialog = ref(false)
const prepaidAmount = ref(0)
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
const batchEditForm = ref({ out_amount: 0, out_rate: 1, out_date: new Date(), out_to: '', downstream_id: null })

const currencyFilterOptions = ['USD', 'EUR', 'AUD', 'CAD']
const statusOptions = ['待出账', '待结算', '已完成']

const dtFilters = ref({
  currency: { value: null, matchMode: FilterMatchMode.EQUALS },
  card_no: { value: null, matchMode: FilterMatchMode.CONTAINS },
  status: { value: null, matchMode: FilterMatchMode.EQUALS },
  out_to: { value: null, matchMode: FilterMatchMode.CONTAINS },
})

const filterDateRange = ref(null)
const filterOutDateRange = ref(null)
const hasManageFilter = computed(() =>
  filterDateRange.value || filterOutDateRange.value ||
  dtFilters.value.currency.value || dtFilters.value.card_no.value ||
  dtFilters.value.status.value || dtFilters.value.out_to.value
)

function clearManageFilters() {
  filterDateRange.value = null
  filterOutDateRange.value = null
  dtFilters.value.currency.value = null
  dtFilters.value.card_no.value = null
  dtFilters.value.status.value = null
  dtFilters.value.out_to.value = null
}

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
  const cf = dtFilters.value
  if (cf.currency.value) list = list.filter(f => (f.currency || 'USD') === cf.currency.value)
  if (cf.card_no.value) {
    const kw = cf.card_no.value.toLowerCase()
    list = list.filter(f => (f.card_no || '').toLowerCase().includes(kw))
  }
  if (cf.status.value) list = list.filter(f => f.status === cf.status.value)
  if (cf.out_to.value) {
    const kw = cf.out_to.value.toLowerCase()
    list = list.filter(f => (f.out_to || '').toLowerCase().includes(kw))
  }
  return list
})

const totalIn = computed(() => filteredFunds.value.reduce((s, f) => s + f.in_amount * f.in_rate, 0))
const totalOut = computed(() => filteredFunds.value.reduce((s, f) => s + (f.out_amount || 0) * (f.out_rate || 1), 0))
const totalProfit = computed(() => totalOut.value - totalIn.value)
const pendingCount = computed(() => filteredFunds.value.filter(f => f.status === '待出账').length)
const unsettledCount = computed(() => filteredFunds.value.filter(f => f.status === '待结算').length)
const unsettledAmount = computed(() => filteredFunds.value.filter(f => f.status === '待结算').reduce((s, f) => s + (f.out_amount || 0) * (f.out_rate || 1), 0))
const doneCount = computed(() => filteredFunds.value.filter(f => f.status === '已完成').length)

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

const activeGroupData = computed(() => {
  if (activeGroup.value === null) return null
  return groups.value.find(g => g.id === activeGroup.value)
})

const groupInTotal = computed(() => {
  if (activeGroup.value === null) return 0
  return allFunds.value
    .filter(f => f.group_id === activeGroup.value)
    .reduce((s, f) => s + f.in_amount * f.in_rate, 0)
})

const prepaidUsed = computed(() => activeGroupData.value?.prepaid_used || 0)

const prepaidRemaining = computed(() => {
  const prepaid = activeGroupData.value?.prepaid || 0
  if (!prepaid) return 0
  return prepaid - prepaidUsed.value
})

async function savePrepaid() {
  if (!window.api || !activeGroupData.value) return
  const result = await window.api.updateGroupPrepaid(activeGroupData.value.id, prepaidAmount.value || 0)
  activeGroupData.value.prepaid = result.prepaid
  activeGroupData.value.prepaid_used = result.prepaid_used
  showPrepaidDialog.value = false
  toast.add({ severity: 'success', summary: '预付已追加', life: 2000 })
}

watch(showPrepaidDialog, (v) => {
  if (v) prepaidAmount.value = 0
})

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
    curMap[cur] = { currency: cur, inAmount: 0, outAmount: 0, inRmb: 0, outRmb: 0, profit: 0, unsettledRmb: 0 }
  }
  for (const f of all) {
    const cur = f.currency || 'USD'
    if (!curMap[cur]) curMap[cur] = { currency: cur, inAmount: 0, outAmount: 0, inRmb: 0, outRmb: 0, profit: 0, unsettledRmb: 0 }
    curMap[cur].inAmount += f.in_amount
    curMap[cur].outAmount += (f.out_amount || 0)
    curMap[cur].inRmb += f.in_amount * f.in_rate
    curMap[cur].outRmb += (f.out_amount || 0) * (f.out_rate || 1)
    curMap[cur].profit += ((f.out_amount || 0) * (f.out_rate || 1)) - (f.in_amount * f.in_rate)
    if (f.status === '待结算') curMap[cur].unsettledRmb += (f.out_amount || 0) * (f.out_rate || 1)
  }
  const byCurrency = allCurrencies.map(cur => curMap[cur])

  const unsettled = all.filter(f => f.status === '待结算')
  const unsettledCount = unsettled.length
  const unsettledAmount = unsettled.reduce((s, f) => s + (f.out_amount || 0) * (f.out_rate || 1), 0)
  const doneCount = all.filter(f => f.status === '已完成').length
  const settleRate = all.length ? Math.round(doneCount / all.length * 100) : 0

  return { totalIn: tIn, totalOut: tOut, totalProfit: tOut - tIn, totalCount: all.length, byCurrency, unsettledCount, unsettledAmount, doneCount, settleRate }
})

const dailyChartCanvas = ref(null)
let dailyChartInstance = null
const chartRange = ref(7)
const chartRangeOptions = [
  { label: '7天', value: 7 },
  { label: '15天', value: 15 },
  { label: '30天', value: 30 },
  { label: '全部', value: 0 },
]

const dailyChartData = computed(() => {
  const all = statsFilteredFunds.value
  const dayMap = {}
  for (const f of all) {
    const d = f.record_date || '未知'
    if (!dayMap[d]) dayMap[d] = { inRmb: 0, outRmb: 0, profit: 0 }
    dayMap[d].inRmb += f.in_amount * f.in_rate
    dayMap[d].outRmb += (f.out_amount || 0) * (f.out_rate || 1)
    dayMap[d].profit += ((f.out_amount || 0) * (f.out_rate || 1)) - (f.in_amount * f.in_rate)
  }

  const days = chartRange.value
  let entries = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b))

  if (days > 0) {
    const now = new Date()
    const labels = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      labels.push(d.toISOString().slice(0, 10))
    }
    const profitArr = labels.map(d => (dayMap[d]?.profit || 0))
    let cum = 0
    const cumProfitData = profitArr.map(p => { cum += p; return cum })
    return {
      labels: labels.map(d => d.slice(5)),
      inData: labels.map(d => (dayMap[d]?.inRmb || 0)),
      outData: labels.map(d => (dayMap[d]?.outRmb || 0)),
      profitData: profitArr,
      cumProfitData,
    }
  }

  const profitArr = entries.map(([, v]) => v.profit)
  let cum = 0
  const cumProfitData = profitArr.map(p => { cum += p; return cum })
  return {
    labels: entries.map(([d]) => d.slice(5)),
    inData: entries.map(([, v]) => v.inRmb),
    outData: entries.map(([, v]) => v.outRmb),
    profitData: profitArr,
    cumProfitData,
  }
})

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
        { label: '累计盈利(¥)', data: d.cumProfitData, borderColor: '#af52de', backgroundColor: 'rgba(175,82,222,0.08)', tension: 0.35, fill: false, pointRadius: 2, borderWidth: 2, borderDash: [5, 3] },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 } } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ¥${ctx.parsed.y.toFixed(2)}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 45 } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, callback: v => '¥' + v.toLocaleString() } },
      },
    },
  })
}

watch(dailyChartData, () => nextTick(renderDailyChart))
watch(() => topTab.value, v => { if (v === 'stats') nextTick(renderDailyChart) })

onBeforeUnmount(() => { if (dailyChartInstance) dailyChartInstance.destroy() })

const form = ref(emptyForm())
const quickInput = ref('')
const editForm = ref({ out_amount: 0, out_rate: 1, out_date: new Date(), out_to: '', downstream_id: null })
const editId = ref(null)

function isDownstreamEnabled(d) {
  return d == null || d.enabled == null || Number(d.enabled) === 1
}

const downstreamOptions = computed(() =>
  downstreams.value
    .filter(d => isDownstreamEnabled(d) && parseDownstreamLedgerTypes(d).includes('funds'))
    .map(d => ({ label: d.name, value: d.id })),
)
const selectedDownstream = computed(() =>
  editForm.value.downstream_id ? downstreams.value.find(d => d.id === editForm.value.downstream_id) : null
)

watch(() => editForm.value.downstream_id, (dsId) => {
  if (dsId) {
    const ds = downstreams.value.find(d => d.id === dsId)
    if (ds) editForm.value.out_to = ds.name
  }
})

watch(() => batchEditForm.value.downstream_id, (dsId) => {
  if (dsId) {
    const ds = downstreams.value.find(d => d.id === dsId)
    if (ds) batchEditForm.value.out_to = ds.name
  }
})

const exportFields = ref([
  { key: 'record_date', label: '记录日期', checked: true },
  { key: 'currency', label: '货币', checked: true },
  { key: 'group', label: '供应商', checked: true },
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
  { key: 'out_to', label: '下游', checked: true },
  { key: 'profit', label: '盈利', checked: true },
  { key: 'settled', label: '结算', checked: true },
])

const ctxItems = [
  { label: '编辑出账信息', icon: 'pi pi-pencil', command: () => openEdit() },
  { separator: true },
  { label: '删除', icon: 'pi pi-trash', command: () => ctxRow.value && deleteFund(ctxRow.value.id) },
]

const groupCtxItems = [
  { label: '重命名', icon: 'pi pi-pencil', command: () => ctxGroup.value && startRename(ctxGroup.value) },
  { separator: true },
  { label: '删除供应商', icon: 'pi pi-trash', command: () => ctxGroup.value && deleteGroup(ctxGroup.value.id) },
]

function onGroupCtx(event, group) {
  ctxGroup.value = group
  groupCtxMenu.value.show(event)
}

onMounted(async () => {
  await loadGroups()
  await loadAllFunds()
  await loadDownstreams()
  await load()
})

async function loadDownstreams() {
  downstreams.value = window.api ? await window.api.getAllDownstreams() : []
}

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
  if (status === '已完成') return 'status-done'
  if (status === '待结算') return 'status-settle'
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
    downstream_id: ctxRow.value.downstream_id || null,
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

function parseMultiLineRecords(text) {
  const lines = text.split('\n').map(l => l.trim())
  const nonEmpty = []
  for (const l of lines) {
    if (l !== '') nonEmpty.push(l)
  }
  const records = []
  for (let i = 0; i + 4 < nonEmpty.length; i += 5) {
    records.push({
      card_no: String(nonEmpty[i]),
      card_date: String(nonEmpty[i + 1]),
      cvv: String(nonEmpty[i + 2]),
      status: '待出账',
      in_amount: parseFloat(nonEmpty[i + 3]) || 0,
      in_rate: parseFloat(nonEmpty[i + 4]) || 1,
      out_amount: 0,
      out_rate: 1,
    })
  }
  return records
}

function parseBatch() {
  batchRows.value = parseMultiLineRecords(batchInput.value)
}

async function submitBatch() {
  if (!window.api || !batchRows.value.length) return
  const count = batchRows.value.length
  const rd = batchDate.value ? fmtDate(batchDate.value) : ''
  const cur = batchCurrency.value || 'USD'
  const plain = JSON.parse(JSON.stringify(batchRows.value)).map(r => ({ ...r, group_id: activeGroup.value, record_date: rd, currency: cur }))
  await window.api.addFundsBatch(plain)
  if (activeGroup.value && activeGroupData.value?.prepaid) {
    const totalInRmb = plain.reduce((s, r) => s + (r.in_amount || 0) * (r.in_rate || 1), 0)
    if (totalInRmb > 0) {
      const updated = await window.api.addGroupPrepaidUsed(activeGroup.value, totalInRmb)
      if (updated && activeGroupData.value) activeGroupData.value.prepaid_used = updated.prepaid_used
    }
  }
  await load()
  showBatch.value = false
  batchInput.value = ''
  batchRows.value = []
  toast.add({ severity: 'success', summary: `已导入 ${count} 条记录`, life: 2000 })
  refreshAllFunds()
}

function parseQuick() {
  const records = parseMultiLineRecords(quickInput.value)
  if (records.length > 0) {
    const r = records[0]
    form.value.card_no = r.card_no
    form.value.card_date = r.card_date
    form.value.cvv = r.cvv
    form.value.in_amount = r.in_amount
    form.value.in_rate = r.in_rate
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
  const inRmb = (Number(form.value.in_amount) || 0) * (Number(form.value.in_rate) || 1)
  if (inRmb > 0 && activeGroup.value && activeGroupData.value?.prepaid) {
    const updated = await window.api.addGroupPrepaidUsed(activeGroup.value, inRmb)
    if (updated && activeGroupData.value) activeGroupData.value.prepaid_used = updated.prepaid_used
  }
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
  const dsId = editForm.value.downstream_id || null
  const ds = dsId ? downstreams.value.find(d => d.id === dsId) : null
  const outRmb = outAmt * outRate
  const dsRemaining = ds ? (ds.prepaid || 0) - (ds.prepaid_used || 0) : 0
  const canAutoSettle = ds && outAmt > 0 && dsRemaining >= outRmb
  const autoSettled = canAutoSettle ? 1 : 0
  const autoStatus = autoSettled ? '已完成' : (outAmt > 0 ? '待结算' : '待出账')
  const updated = await window.api.updateFundOut(editId.value, {
    out_amount: outAmt,
    out_rate: outRate,
    out_date: editForm.value.out_date ? fmtDate(editForm.value.out_date) : '',
    out_to: editForm.value.out_to || '',
    status: autoStatus,
    downstream_id: dsId,
    settled: autoSettled,
  })
  if (canAutoSettle) {
    await window.api.addDownstreamPrepaidUsed(dsId, outRmb)
    await loadDownstreams()
  }
  const idx = funds.value.findIndex(f => f.id === editId.value)
  if (idx !== -1) funds.value[idx] = updated
  showEdit.value = false
  toast.add({ severity: 'success', summary: autoSettled ? '已出账并自动结算' : '已更新', life: 2000 })
  refreshAllFunds()
}

async function copyCardInfo(data) {
  const text = `${data.card_no} ${data.card_date} ${data.cvv} 完成`
  try {
    await navigator.clipboard.writeText(text)
    toast.add({ severity: 'success', summary: '已复制', life: 1500 })
  } catch {
    toast.add({ severity: 'error', summary: '复制失败', life: 2000 })
  }
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
  batchEditForm.value = { out_amount: 0, out_rate: 1, out_date: new Date(), out_to: '', downstream_id: null }
  showBatchEdit.value = true
}

async function submitBatchEdit() {
  if (!window.api || !selectedFunds.value.length) return
  const outRate = Number(batchEditForm.value.out_rate) || 1
  const outDate = batchEditForm.value.out_date ? fmtDate(batchEditForm.value.out_date) : ''
  const dsId = batchEditForm.value.downstream_id || null
  const ds = dsId ? downstreams.value.find(d => d.id === dsId) : null
  const outTo = ds ? ds.name : ''
  let dsRemaining = ds ? (ds.prepaid || 0) - (ds.prepaid_used || 0) : 0
  let settledCount = 0
  const count = selectedFunds.value.length
  for (const f of selectedFunds.value) {
    const outAmt = f.in_amount || 0
    const outRmb = outAmt * outRate
    const canSettle = ds && outAmt > 0 && dsRemaining >= outRmb
    const settled = canSettle ? 1 : 0
    const autoStatus = settled ? '已完成' : (outAmt > 0 ? '待结算' : '待出账')
    if (canSettle) {
      dsRemaining -= outRmb
      settledCount++
    }
    const updated = await window.api.updateFundOut(f.id, {
      out_amount: outAmt, out_rate: outRate, out_date: outDate, out_to: outTo,
      status: autoStatus, downstream_id: dsId, settled,
    })
    const idx = funds.value.findIndex(r => r.id === f.id)
    if (idx !== -1) funds.value[idx] = updated
  }
  if (ds && settledCount > 0) {
    const totalDeducted = (ds.prepaid - ds.prepaid_used) - dsRemaining
    await window.api.addDownstreamPrepaidUsed(dsId, totalDeducted)
    await loadDownstreams()
  }
  showBatchEdit.value = false
  selectedFunds.value = []
  const msg = settledCount > 0 ? `已更新 ${count} 条，其中 ${settledCount} 条自动结算` : `已更新 ${count} 条出账记录`
  toast.add({ severity: 'success', summary: msg, life: 3000 })
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

async function toggleSettled(fund) {
  if (!window.api || !fund.out_amount) return
  const newVal = fund.settled ? 0 : 1
  const updated = await window.api.updateFundSettled(fund.id, newVal)
  fund.settled = updated.settled
  fund.status = updated.status
  const af = allFunds.value.find(f => f.id === fund.id)
  if (af) { af.settled = updated.settled; af.status = updated.status }
}

async function batchToggleSettled(settled) {
  if (!window.api || !selectedFunds.value.length) return
  const ids = selectedFunds.value.map(f => f.id)
  await window.api.batchUpdateSettled(ids, settled)
  const newSettled = settled ? 1 : 0
  for (const f of selectedFunds.value) {
    f.settled = newSettled
    f.status = newSettled ? '已完成' : (f.out_amount > 0 ? '待结算' : '待出账')
  }
  for (const f of allFunds.value) {
    if (ids.includes(f.id)) {
      f.settled = newSettled
      f.status = newSettled ? '已完成' : (f.out_amount > 0 ? '待结算' : '待出账')
    }
  }
  toast.add({ severity: 'success', summary: `已${settled ? '结算' : '取消结算'} ${ids.length} 条`, life: 2000 })
  selectedFunds.value = []
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
      else if (f.key === 'settled') val = !row.out_amount ? '—' : (row.settled ? '已完成' : '待结算')
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
.fs-card-val { font-size: 20px; font-weight: 700; color: var(--mac-text); }

.fs-currency-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.fs-currency-card {
  background: var(--mac-surface); border-radius: 12px; padding: 14px;
  box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 6px;
}
.fs-cur-header { display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
.fs-cur-row { display: flex; justify-content: space-between; align-items: center; }
.fs-cur-label { font-size: 12px; color: var(--mac-text-secondary); }
.fs-cur-val { font-size: 13px; font-weight: 700; color: var(--mac-text); }
.fs-cur-divider { height: 1px; background: var(--mac-border); margin: 2px 0; }

.fs-section-header { display: flex; align-items: center; justify-content: space-between; }
.chart-range-tabs { display: flex; gap: 2px; background: rgba(0,0,0,0.06); border-radius: 8px; padding: 2px; }
.chart-range-btn {
  padding: 3px 10px; border: none; background: transparent; border-radius: 6px;
  font-size: 11px; cursor: pointer; color: var(--mac-text-secondary); transition: all 0.15s;
}
.chart-range-btn.active { background: #fff; color: var(--mac-text); font-weight: 600; box-shadow: var(--shadow-sm); }
.fs-chart-wrap {
  background: var(--mac-surface); border-radius: 12px; padding: 16px;
  box-shadow: var(--shadow-sm); height: 330px; position: relative;
}

.fs-section { display: flex; flex-direction: column; gap: 10px; }
.fs-section-title { font-size: 14px; font-weight: 600; color: var(--mac-text); }

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

.prepaid-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 16px;
  border-bottom: 1px solid var(--mac-border);
  background: rgba(0,122,255,0.04);
  flex-shrink: 0;
}
.prepaid-info { display: flex; align-items: center; gap: 8px; }
.prepaid-label { font-size: 12px; color: var(--mac-text-secondary); }
.prepaid-val { font-size: 13px; font-weight: 700; color: var(--mac-text); }
.prepaid-val.prepaid-low { color: #ff3b30; }
.prepaid-sep { color: var(--mac-border); font-size: 12px; }
.prepaid-warn {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 600; color: #ff3b30;
  background: rgba(255,59,48,0.1); padding: 2px 8px; border-radius: 10px;
  margin-left: 4px;
}

.filter-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 16px;
  border-bottom: 1px solid var(--mac-border);
  background: rgba(255,255,255,0.3);
  flex-shrink: 0;
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
.form-hint-mini { font-size: 12px; color: #e67e22; margin: 4px 0 0; }
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
.stat-val { font-size: 14px; font-weight: 700; color: var(--mac-text); }
.stat-val.unsettled, .fs-card-val.unsettled, .fs-cur-val.unsettled { color: #e67e22; }
.stat-val.done { color: #155724; }
.fs-card-val.settle-rate { color: var(--mac-accent, #007aff); }
.settle-progress { width: 100%; height: 4px; background: rgba(0,0,0,0.08); border-radius: 2px; margin-top: 6px; overflow: hidden; }
.settle-progress-fill { height: 100%; background: #34c759; border-radius: 2px; transition: width 0.4s ease; }
.fs-card-sub { font-size: 11px; color: var(--mac-text-secondary); margin-top: 3px; }
.group-hint { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--mac-text-secondary); gap: 8px; }
.group-hint i { font-size: 36px; }
.group-hint p { font-size: 13px; }

.card-inline { font-family: 'SF Mono', 'Fira Mono', monospace; font-size: 14px; letter-spacing: 0.3px; color: var(--mac-text); user-select: text; }
.copy-card-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; margin-left: 6px; border: none; background: transparent;
  border-radius: 4px; cursor: pointer; color: var(--mac-text-secondary); font-size: 12px;
  transition: background 0.15s, color 0.15s; vertical-align: middle;
}
.copy-card-btn:hover { background: var(--mac-hover); color: var(--mac-accent); }
.card-info { display: flex; flex-direction: column; gap: 4px; }
.card-meta { display: flex; gap: 6px; }
.card-badge { font-family: 'SF Mono', 'Fira Mono', monospace; font-size: 11px; color: var(--mac-text-secondary); background: rgba(0,0,0,0.06); padding: 1px 6px; border-radius: 4px; }

.amount-cell { display: flex; flex-direction: column; gap: 1px; }
.amount-val { font-weight: 700; font-size: 14px; color: var(--mac-text); }
.amount-rate { font-size: 12px; color: var(--mac-text-secondary); }
.amount-total { font-size: 12px; color: var(--mac-text-secondary); font-style: italic; }
.out-meta { display: flex; gap: 6px; font-size: 11px; color: var(--mac-text-secondary); margin-top: 2px; }
.out-date { font-family: 'SF Mono', 'Fira Mono', monospace; }
.out-to { color: var(--mac-accent, #007aff); }
.out-to-cell { font-size: 13px; color: var(--mac-accent, #007aff); font-weight: 500; }
.out-info-cell { display: flex; flex-direction: column; gap: 2px; }

.profit-cell { display: inline-flex; align-items: center; gap: 4px; font-weight: 700; font-size: 14px; padding: 4px 10px; border-radius: 6px; color: var(--mac-text); background: rgba(0,0,0,0.04); }

.record-date { font-size: 13px; color: var(--mac-text); font-family: 'SF Mono', 'Fira Mono', monospace; }
.dp-btnbar { display: flex; align-items: center; gap: 4px; justify-content: center; flex-wrap: wrap; }
.settle-switch {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  font-size: 11px; font-weight: 600; color: var(--mac-text-secondary);
  user-select: none;
}
.settle-switch.disabled { opacity: 0.35; cursor: default; }
.settle-inline { font-size: 12px; color: var(--mac-text-secondary); }
.settle-switch.on { color: #34c759; }
.settle-track {
  width: 32px; height: 18px; border-radius: 9px;
  background: rgba(0,0,0,0.15); position: relative; transition: background 0.2s;
  flex-shrink: 0;
}
.settle-switch.on .settle-track { background: #34c759; }
.settle-thumb {
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff; position: absolute; top: 2px; left: 2px;
  transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.settle-switch.on .settle-thumb { transform: translateX(14px); }

.status-tag {
  display: inline-block; padding: 3px 10px; border-radius: 12px;
  font-size: 12px; font-weight: 600; text-align: center;
}
.status-pending { background: #fff3cd; color: #856404; }
.status-settle { background: #cce5ff; color: #004085; }
.status-done { background: #d4edda; color: #155724; }

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
.ds-hint { font-size: 12px; color: var(--mac-text-secondary); margin-top: 2px; }
.ds-hint-auto { color: #34c759; font-weight: 500; }
.ds-hint-warn { color: #e67e22; font-weight: 500; }
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
