<template>
  <!-- 发现新版本弹窗 -->
  <Dialog
    v-model:visible="showAvailable"
    modal
    :closable="true"
    :draggable="false"
    header="发现新版本"
    :style="{ width: '420px' }"
    :pt="dialogPt"
  >
    <div class="update-body">
      <div class="update-icon">
        <i class="pi pi-arrow-circle-up"></i>
      </div>
      <div class="update-info">
        <div class="update-version">
          <Tag severity="info" :value="'v' + currentVersion" />
          <i class="pi pi-arrow-right" style="color: var(--p-text-muted-color); font-size: 12px"></i>
          <Tag severity="success" :value="'v' + availableInfo.version" />
        </div>
        <p class="update-desc">新版本已发布，建议更新以获得最新功能和修复。</p>
        <div v-if="availableInfo.releaseDate" class="update-meta">
          <i class="pi pi-calendar" style="font-size: 11px"></i>
          <span>{{ formatDate(availableInfo.releaseDate) }}</span>
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="稍后提醒" severity="secondary" text @click="showAvailable = false" />
      <Button label="立即下载" icon="pi pi-download" @click="startDownload" :loading="downloading" />
    </template>
  </Dialog>

  <!-- 下载进度弹窗 -->
  <Dialog
    v-model:visible="showProgress"
    modal
    :closable="false"
    :draggable="false"
    header="正在下载更新"
    :style="{ width: '380px' }"
    :pt="dialogPt"
  >
    <div class="progress-body">
      <div class="progress-info">
        <span class="progress-pct">{{ Math.round(progressData.percent || 0) }}%</span>
        <span class="progress-speed" v-if="progressData.bytesPerSecond">
          {{ formatSpeed(progressData.bytesPerSecond) }}
        </span>
      </div>
      <ProgressBar :value="Math.round(progressData.percent || 0)" style="height: 8px" />
      <div class="progress-size" v-if="progressData.total">
        {{ formatBytes(progressData.transferred) }} / {{ formatBytes(progressData.total) }}
      </div>
    </div>
  </Dialog>

  <!-- 下载完成弹窗 -->
  <Dialog
    v-model:visible="showDownloaded"
    modal
    :closable="false"
    :draggable="false"
    header="更新已就绪"
    :style="{ width: '380px' }"
    :pt="dialogPt"
  >
    <div class="update-body">
      <div class="update-icon success">
        <i class="pi pi-check-circle"></i>
      </div>
      <p style="text-align:center; color: var(--p-text-muted-color); font-size: 14px">
        新版本下载完成，重启应用即可完成更新。
      </p>
    </div>
    <template #footer>
      <Button label="稍后重启" severity="secondary" text @click="showDownloaded = false" />
      <Button label="立即重启安装" icon="pi pi-refresh" severity="success" @click="installNow" />
    </template>
  </Dialog>

  <!-- 错误提示 -->
  <Toast position="bottom-right" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

const toast = useToast()

const currentVersion = ref('')
const showAvailable = ref(false)
const showProgress = ref(false)
const showDownloaded = ref(false)
const downloading = ref(false)
const availableInfo = ref({})
const progressData = ref({})

const cleanups = []

const dialogPt = {
  root: { style: 'border-radius: 14px; overflow: hidden;' },
  header: { style: 'padding: 16px 20px 12px;' },
  content: { style: 'padding: 0 20px 16px;' },
  footer: { style: 'padding: 12px 20px 16px; gap: 8px; display: flex; justify-content: flex-end;' },
}

onMounted(async () => {
  if (!window.api) return

  currentVersion.value = await window.api.getVersion()

  cleanups.push(
    window.api.onUpdaterEvent('updater:available', (info) => {
      availableInfo.value = info
      showAvailable.value = true
    }),
    window.api.onUpdaterEvent('updater:progress', (progress) => {
      progressData.value = progress
    }),
    window.api.onUpdaterEvent('updater:downloaded', () => {
      showProgress.value = false
      showDownloaded.value = true
    }),
    window.api.onUpdaterEvent('updater:error', (msg) => {
      downloading.value = false
      showProgress.value = false
      toast.add({ severity: 'error', summary: '更新失败', detail: msg, life: 5000 })
    }),
  )
})

onUnmounted(() => cleanups.forEach(fn => fn?.()))

async function startDownload() {
  downloading.value = true
  showAvailable.value = false
  showProgress.value = true
  await window.api.downloadUpdate()
}

function installNow() {
  window.api.installUpdate()
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('zh-CN')
}
function formatSpeed(bps) {
  if (bps > 1024 * 1024) return (bps / 1024 / 1024).toFixed(1) + ' MB/s'
  return (bps / 1024).toFixed(0) + ' KB/s'
}
function formatBytes(b) {
  if (!b) return '0 B'
  if (b > 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB'
  return (b / 1024).toFixed(0) + ' KB'
}
</script>

<style scoped>
.update-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}
.update-icon {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: rgba(0,122,255,0.1);
  display: flex; align-items: center; justify-content: center;
}
.update-icon i { font-size: 28px; color: var(--mac-accent, #007aff); }
.update-icon.success { background: rgba(52,199,89,0.1); }
.update-icon.success i { color: #34c759; }
.update-info { width: 100%; display: flex; flex-direction: column; gap: 8px; }
.update-version { display: flex; align-items: center; gap: 8px; justify-content: center; }
.update-desc { text-align: center; font-size: 14px; color: var(--p-text-muted-color); margin: 0; }
.update-meta { display: flex; align-items: center; gap: 4px; justify-content: center; font-size: 12px; color: var(--p-text-muted-color); }

.progress-body { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
.progress-info { display: flex; justify-content: space-between; align-items: center; }
.progress-pct { font-size: 16px; font-weight: 600; }
.progress-speed { font-size: 12px; color: var(--p-text-muted-color); }
.progress-size { font-size: 11px; color: var(--p-text-muted-color); text-align: right; }
</style>
