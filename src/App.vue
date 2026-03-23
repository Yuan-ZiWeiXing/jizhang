<template>
  <LockScreen
    v-if="locked"
    :hasPassword="hasPassword"
    @unlocked="onUnlocked"
    @minimize="winMinimize"
    @maximize="winMaximize"
    @close="winClose"
  />
  <div v-else class="mac-window">
    <!-- Title Bar -->
    <div class="mac-titlebar">
      <div class="mac-titlebar-left">
        <button class="mac-icon-btn" @click="showAddDialog = true" title="新增记录">
          <i class="pi pi-plus"></i>
        </button>
      </div>
      <div class="mac-title">紫微星记账工具</div>
      <div class="mac-controls">
        <button class="mac-icon-btn" @click="lockApp" title="锁屏">
          <i class="pi pi-lock"></i>
        </button>
        <span class="mac-btn mac-minimize" @click="winMinimize" title="最小化"></span>
        <span class="mac-btn mac-maximize" @click="winMaximize" title="最大化"></span>
        <span class="mac-btn mac-close" @click="winClose" title="关闭"></span>
      </div>
    </div>

    <!-- Body -->
    <div class="mac-body">
      <!-- Sidebar -->
      <div class="mac-sidebar">
        <div class="sidebar-section">
          <div class="sidebar-label">概览</div>
          <div
            class="sidebar-item"
            :class="{ active: currentView === 'dashboard' }"
            @click="currentView = 'dashboard'"
          >
            <i class="pi pi-home"></i>
            <span>仪表板</span>
          </div>
        </div>

        <div class="sidebar-section sidebar-accounting">
          <button
            type="button"
            class="sidebar-group-head"
            :aria-expanded="accountingExpanded"
            @click="accountingExpanded = !accountingExpanded"
          >
            <i :class="accountingExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"></i>
            <span>记账类型</span>
          </button>
          <div v-show="accountingExpanded" class="sidebar-sublist">
            <div
              v-for="sub in accountingSubItems"
              :key="sub.id"
              class="sidebar-item sidebar-sub"
              :class="{ active: currentView === sub.id }"
              @click="currentView = sub.id"
            >
              <i :class="'pi ' + sub.icon"></i>
              <span>{{ sub.label }}</span>
            </div>
          </div>
        </div>

        <div class="sidebar-section">
          <div
            class="sidebar-item"
            :class="{ active: currentView === 'downstream' }"
            @click="currentView = 'downstream'"
          >
            <i class="pi pi-users"></i>
            <span>下游</span>
          </div>
        </div>

        <div class="sidebar-spacer"></div>
        <div class="sidebar-version" @click="checkUpdate">
          <span>v{{ appVersion }}</span>
          <i class="pi pi-sync" style="font-size:10px" title="检查更新"></i>
        </div>
      </div>

      <!-- Main Content -->
      <div class="mac-main">
        <component :is="currentComponent" :key="currentView" @add="showAddDialog = true" />
      </div>
    </div>

    <!-- Add Record Dialog -->
    <AddRecordDialog v-if="showAddDialog" @close="showAddDialog = false" />

    <!-- Updater Dialog -->
    <UpdaterDialog />
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useStore } from './store.js'
import { ACCOUNTING_SUB_NAV } from './config/accountingNav.js'
import DashboardView from './views/DashboardView.vue'
import FundsView from './views/FundsView.vue'
import WireTransferView from './views/WireTransferView.vue'
import One4AllView from './views/One4AllView.vue'
import DownstreamView from './views/DownstreamView.vue'
import AddRecordDialog from './components/AddRecordDialog.vue'
import UpdaterDialog from './components/UpdaterDialog.vue'
import LockScreen from './components/LockScreen.vue'
import ConfirmDialog from 'primevue/confirmdialog'

const { initStore } = useStore()

const appVersion = ref('')
const locked = ref(true)
const hasPassword = ref(false)

onMounted(async () => {
  initStore()
  if (window.api) {
    appVersion.value = await window.api.getVersion()
    hasPassword.value = await window.api.hasLockPassword()
    locked.value = hasPassword.value
  } else {
    locked.value = false
  }
})

function onUnlocked() {
  locked.value = false
  hasPassword.value = true
}

async function lockApp() {
  if (window.api) {
    hasPassword.value = await window.api.hasLockPassword()
  }
  locked.value = true
}

function checkUpdate() {
  if (window.api) window.api.checkForUpdate()
}

const currentView = ref('dashboard')
const showAddDialog = ref(false)
const accountingExpanded = ref(true)

const accountingSubItems = ACCOUNTING_SUB_NAV

const currentComponent = computed(() => {
  const map = {
    dashboard: DashboardView,
    funds: FundsView,
    wire: WireTransferView,
    one4all: One4AllView,
    downstream: DownstreamView,
  }
  return map[currentView.value]
})

watch(currentView, (v) => {
  if (accountingSubItems.some(s => s.id === v)) accountingExpanded.value = true
})

function winClose() { window.api?.close() }
function winMinimize() { window.api?.minimize() }
function winMaximize() { window.api?.maximize() }
</script>

<style scoped>
.mac-window {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--mac-bg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.mac-titlebar {
  height: 40px;
  background: var(--mac-titlebar-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--mac-border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  flex-shrink: 0;
  user-select: none;
  -webkit-app-region: drag;
}

.mac-titlebar-left {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.mac-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  -webkit-app-region: no-drag;
}

.mac-btn {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: block;
  cursor: pointer;
  transition: opacity 0.15s;
  position: relative;
}
.mac-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.15s;
  background-size: 8px 8px;
  background-repeat: no-repeat;
  background-position: center;
}
.mac-controls:hover .mac-btn::after { opacity: 1; }
.mac-minimize { background: #febc2e; border: 1px solid #d4a029; }
.mac-minimize::after { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Crect x='0' y='3.5' width='8' height='1' fill='%23985a00' rx='0.5'/%3E%3C/svg%3E"); }
.mac-maximize { background: #28c840; border: 1px solid #1aab2e; }
.mac-maximize::after { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 1h6v6H1z' fill='none' stroke='%23006500' stroke-width='1'/%3E%3C/svg%3E"); }
.mac-close { background: #ff5f57; border: 1px solid #e0443e; }
.mac-close::after { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cline x1='1' y1='1' x2='7' y2='7' stroke='%238b0000' stroke-width='1.2' stroke-linecap='round'/%3E%3Cline x1='7' y1='1' x2='1' y2='7' stroke='%238b0000' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E"); }

.mac-title {
  flex: 1;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--mac-text);
  letter-spacing: -0.2px;
}

.mac-titlebar-left {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
}

.mac-icon-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--mac-text-secondary);
  transition: background 0.15s;
  font-size: 13px;
}
.mac-icon-btn:hover { background: var(--mac-hover); color: var(--mac-text); }

.mac-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.mac-sidebar {
  width: 150px;
  background: var(--mac-sidebar-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid var(--mac-border);
  padding: 12px 6px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 4px;
}
.sidebar-spacer { flex: 1; }

.sidebar-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--mac-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 8px 2px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sidebar-accounting { margin-top: 4px; }
.sidebar-section + .sidebar-section:not(.sidebar-accounting) { margin-top: 6px; }

.sidebar-group-head {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--mac-text-secondary);
  text-align: left;
  transition: background 0.12s, color 0.12s;
}
.sidebar-group-head:hover {
  background: var(--mac-hover);
  color: var(--mac-text);
}
.sidebar-group-head i { font-size: 10px; opacity: 0.85; }

.sidebar-sublist {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-left: 4px;
}
.sidebar-item.sidebar-sub {
  padding-left: 14px;
  font-size: 12px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--mac-text);
  transition: background 0.12s;
  font-weight: 400;
}
.sidebar-item i { font-size: 13px; color: var(--mac-text-secondary); }
.sidebar-item:hover { background: var(--mac-hover); }
.sidebar-item.active {
  background: var(--mac-selected);
  color: var(--mac-accent);
  font-weight: 500;
}
.sidebar-item.active i { color: var(--mac-accent); }

.sidebar-version {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px; font-size: 11px; color: var(--mac-text-secondary);
  cursor: pointer; border-radius: 6px; transition: background 0.15s;
}
.sidebar-version:hover { background: var(--mac-hover); color: var(--mac-text); }

.mac-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
