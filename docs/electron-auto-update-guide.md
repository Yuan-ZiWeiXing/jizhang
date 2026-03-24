# Electron 应用自动更新完整方案

> 本文档描述一套基于 **electron-updater + GitHub Releases** 的 Electron 桌面应用自动更新方案。
> 适用于 Windows NSIS 安装包。可直接交给 AI 在新项目中实现。

---

## 一、技术栈要求

| 依赖 | 版本 | 用途 |
|---|---|---|
| `electron` | ^41.x | 应用运行时 |
| `electron-builder` | ^26.x | 打包构建 NSIS 安装包 |
| `electron-updater` | ^6.x | 自动更新核心库 |
| `socks-proxy-agent` | ^9.x | (可选) GitHub API 走 SOCKS 代理 |

安装命令：

```bash
npm install electron-updater
npm install -D electron-builder socks-proxy-agent
```

---

## 二、package.json 关键配置

```json
{
  "name": "your-app",
  "version": "1.0.0",
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build && electron-builder",
    "build:win": "vite build && electron-builder --win",
    "release": "node scripts/release.mjs",
    "release:minor": "node scripts/release.mjs minor",
    "release:major": "node scripts/release.mjs major"
  },
  "build": {
    "appId": "com.yourcompany.yourapp",
    "productName": "你的应用名称",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "dist-electron/**/*"
    ],
    "win": {
      "target": ["nsis"]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "language": "2052"
    },
    "publish": {
      "provider": "github",
      "owner": "你的GitHub用户名",
      "repo": "你的仓库名",
      "releaseType": "release"
    }
  }
}
```

### 配置说明

- **`version`**：版本号是整个更新链的唯一真相来源，`electron-updater` 用它与远端 `latest.yml` 对比。
- **`build.publish`**：告诉 `electron-updater` 去哪里查找更新。provider 设为 `github`，它会自动请求 `https://github.com/{owner}/{repo}/releases/latest/download/latest.yml`。
- **`build.directories.output`**：打包产物输出到 `release/` 目录。
- **`nsis.language: "2052"`**：中文安装界面。

---

## 三、主进程代码 (electron/main.js)

### 3.1 autoUpdater 初始化

```javascript
import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'

let win

function setupAutoUpdater() {
  // 不自动下载，让用户确认后再下载
  autoUpdater.autoDownload = false
  // 下载完成后，用户退出应用时自动安装
  autoUpdater.autoInstallOnAppQuit = true

  // ---- 事件转发：Main → Renderer ----

  autoUpdater.on('checking-for-update', () => {
    win.webContents.send('updater:checking')
  })

  autoUpdater.on('update-available', (info) => {
    // info 包含: version, releaseDate, releaseNotes 等
    win.webContents.send('updater:available', info)
  })

  autoUpdater.on('update-not-available', () => {
    win.webContents.send('updater:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    // progress 包含: percent, bytesPerSecond, transferred, total
    win.webContents.send('updater:progress', progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('updater:downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    win.webContents.send('updater:error', err.message)
  })

  // 启动 3 秒后自动检查一次更新
  setTimeout(() => autoUpdater.checkForUpdates(), 3000)
}
```

### 3.2 IPC Handler 注册

```javascript
function setupUpdaterIpc() {
  // 手动触发检查更新
  ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates())

  // 开始下载更新
  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate())

  // 退出并安装
  // 参数: isSilent=false(显示安装界面), isForceRunAfter=true(安装完自动启动)
  ipcMain.on('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  // 获取当前版本号
  ipcMain.handle('updater:getVersion', () => app.getVersion())
}
```

### 3.3 应用启动入口

```javascript
app.whenReady().then(() => {
  createWindow()

  setupUpdaterIpc()

  // 仅在打包后启用自动更新（开发模式下不检测）
  if (app.isPackaged) {
    setupAutoUpdater()
  }
})
```

### 3.4 关键行为说明

| 配置项 | 值 | 效果 |
|---|---|---|
| `autoDownload = false` | 用户点"立即下载"才开始下载，不会静默下载 |
| `autoInstallOnAppQuit = true` | 如果已下载完但用户选了"稍后重启"，退出应用时会自动安装 |
| `setTimeout 3000` | 启动后延迟 3 秒检查，避免阻塞窗口加载 |
| `app.isPackaged` | 仅打包后检查更新，`npm run dev` 不触发 |

---

## 四、Preload 桥接层 (electron/preload.js)

```javascript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // ---- 更新相关 API ----

  // 手动检查更新
  checkForUpdate: () => ipcRenderer.invoke('updater:check'),

  // 开始下载
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),

  // 退出并安装
  installUpdate: () => ipcRenderer.send('updater:install'),

  // 获取当前版本号
  getVersion: () => ipcRenderer.invoke('updater:getVersion'),

  // 监听更新事件（返回取消监听的函数）
  onUpdaterEvent: (channel, fn) => {
    ipcRenderer.on(channel, (_, ...args) => fn(...args))
    return () => ipcRenderer.removeAllListeners(channel)
  },

  // ... 其他业务 API
})
```

### API 清单

| 方法 | 方向 | 用途 |
|---|---|---|
| `checkForUpdate()` | Renderer → Main | 主动触发检查 |
| `downloadUpdate()` | Renderer → Main | 开始下载安装包 |
| `installUpdate()` | Renderer → Main | 退出应用并安装 |
| `getVersion()` | Renderer → Main | 获取当前 `app.getVersion()` |
| `onUpdaterEvent(channel, fn)` | Main → Renderer | 监听 6 个更新事件 |

### 可监听的事件通道

| channel | 触发时机 | 回调参数 |
|---|---|---|
| `updater:checking` | 开始检查 | 无 |
| `updater:available` | 发现新版本 | `info` (version, releaseDate 等) |
| `updater:not-available` | 当前已是最新 | 无 |
| `updater:progress` | 下载进度更新 | `{ percent, bytesPerSecond, transferred, total }` |
| `updater:downloaded` | 下载完成 | `info` |
| `updater:error` | 出错 | `errorMessage` (string) |

---

## 五、渲染进程 UI 组件 (Vue 3 示例)

### 5.1 组件结构 — 三阶段弹窗

整个更新 UI 由三个弹窗组成，按流程依次出现：

```
发现新版本弹窗 → 下载进度弹窗 → 下载完成弹窗
```

### 5.2 完整 Vue 组件参考 (UpdaterDialog.vue)

```vue
<template>
  <!-- 阶段1：发现新版本 -->
  <Dialog v-model:visible="showAvailable" modal header="发现新版本" :style="{ width: '420px' }">
    <div style="text-align: center; padding: 16px 0;">
      <p>当前版本: v{{ currentVersion }}</p>
      <p>最新版本: v{{ availableInfo.version }}</p>
      <p v-if="availableInfo.releaseDate">
        发布日期: {{ new Date(availableInfo.releaseDate).toLocaleDateString('zh-CN') }}
      </p>
      <p>新版本已发布，建议更新以获得最新功能和修复。</p>
    </div>
    <template #footer>
      <Button label="稍后提醒" severity="secondary" text @click="showAvailable = false" />
      <Button label="立即下载" icon="pi pi-download" @click="startDownload" :loading="downloading" />
    </template>
  </Dialog>

  <!-- 阶段2：下载进度 -->
  <Dialog v-model:visible="showProgress" modal :closable="false" header="正在下载更新" :style="{ width: '380px' }">
    <div style="padding: 8px 0;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span>{{ Math.round(progressData.percent || 0) }}%</span>
        <span v-if="progressData.bytesPerSecond">{{ formatSpeed(progressData.bytesPerSecond) }}</span>
      </div>
      <ProgressBar :value="Math.round(progressData.percent || 0)" style="height: 8px" />
      <div v-if="progressData.total" style="text-align: right; font-size: 12px; margin-top: 4px;">
        {{ formatBytes(progressData.transferred) }} / {{ formatBytes(progressData.total) }}
      </div>
    </div>
  </Dialog>

  <!-- 阶段3：下载完成，提示安装 -->
  <Dialog v-model:visible="showDownloaded" modal :closable="false" header="更新已就绪" :style="{ width: '380px' }">
    <p style="text-align: center; padding: 16px 0;">新版本下载完成，重启应用即可完成更新。</p>
    <template #footer>
      <Button label="稍后重启" severity="secondary" text @click="showDownloaded = false" />
      <Button label="立即重启安装" icon="pi pi-refresh" severity="success" @click="installNow" />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import ProgressBar from 'primevue/progressbar'

const currentVersion = ref('')
const showAvailable = ref(false)
const showProgress = ref(false)
const showDownloaded = ref(false)
const downloading = ref(false)
const availableInfo = ref({})
const progressData = ref({})
const cleanups = []

onMounted(async () => {
  if (!window.api) return
  currentVersion.value = await window.api.getVersion()

  cleanups.push(
    window.api.onUpdaterEvent('updater:available', (info) => {
      availableInfo.value = info
      showAvailable.value = true
    }),
    window.api.onUpdaterEvent('updater:not-available', () => {
      // 可以用 toast 提示"已是最新版本"
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
      // 可以用 toast 提示错误信息 msg
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
```

### 5.3 使用方式

在 `App.vue` 中引入该组件即可：

```vue
<template>
  <router-view />
  <UpdaterDialog />
</template>

<script setup>
import UpdaterDialog from './components/UpdaterDialog.vue'
</script>
```

---

## 六、一键发布脚本 (scripts/release.mjs)

### 6.1 完整脚本

```javascript
#!/usr/bin/env node
/**
 * 发布脚本：提交代码 → bump版本 → 构建打包 → 推送tag → 创建Release → 上传安装包
 * 用法：
 *   npm run release         # patch (1.0.x → 1.0.x+1)
 *   npm run release:minor   # minor
 *   npm run release:major   # major
 * 需要环境变量：GH_TOKEN
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import { SocksProxyAgent } from 'socks-proxy-agent'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// (可选) 从 .env.local 读取 GH_TOKEN 和代理配置
const envFile = join(root, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf-8').split('\n')) {
    const [key, ...vals] = line.trim().split('=')
    if (key && !key.startsWith('#') && vals.length) {
      process.env[key.trim()] = vals.join('=').trim()
    }
  }
}

const GH_TOKEN = process.env.GH_TOKEN
if (!GH_TOKEN) {
  console.error('\n❌ 缺少 GH_TOKEN')
  console.error('   set GH_TOKEN=ghp_xxx && npm run release')
  process.exit(1)
}

// (可选) SOCKS 代理
const githubAgent = process.env.GITHUB_SOCKS_PROXY
  ? new SocksProxyAgent(process.env.GITHUB_SOCKS_PROXY)
  : undefined

// ★ 修改为你的 GitHub 信息
const OWNER = '你的GitHub用户名'
const REPO = '你的仓库名'
const bumpType = process.argv[2] || 'patch'

// ---- 步骤 1：提交未暂存的改动 ----
console.log('\n📝 检查工作区...')
const status = execSync('git status --porcelain', { cwd: root }).toString().trim()
if (status) {
  console.log('  提交未暂存的改动...')
  execSync('git add -A', { cwd: root, stdio: 'inherit' })
  try {
    execSync('git commit -m "chore: pre-release changes"', { cwd: root, stdio: 'inherit' })
  } catch {}
}

// ---- 步骤 2：Bump 版本号 ----
const pkgPath = join(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const [major, minor, patch] = pkg.version.split('.').map(Number)
const newVersion =
  bumpType === 'major' ? `${major + 1}.0.0` :
  bumpType === 'minor' ? `${major}.${minor + 1}.0` :
  `${major}.${minor}.${patch + 1}`

console.log(`\n🔖 版本 ${pkg.version} → ${newVersion}`)
pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

// ---- 步骤 3：构建 ----
console.log('\n🔨 构建前端...')
execSync('npx vite build', { cwd: root, stdio: 'inherit' })

console.log('\n📦 打包 Windows 安装程序...')
execSync('npx electron-builder --win', { cwd: root, stdio: 'inherit' })

// ---- 步骤 4：Git commit + tag + push ----
console.log('\n🚀 提交并推送...')
try { execSync('git config --unset http.proxy', { cwd: root }) } catch {}
try { execSync('git config --unset https.proxy', { cwd: root }) } catch {}
const authRemote = `https://${GH_TOKEN}@github.com/${OWNER}/${REPO}.git`
execSync('git add -A', { cwd: root, stdio: 'inherit' })
try {
  execSync(`git commit -m "chore: release v${newVersion}"`, { cwd: root, stdio: 'inherit' })
} catch {}
try {
  execSync(`git tag v${newVersion}`, { cwd: root })
} catch {
  console.log(`  tag v${newVersion} 已存在`)
}
execSync(`git push ${authRemote} HEAD --tags`, { cwd: root, stdio: 'inherit' })
console.log('✅ 代码和标签已推送')

// ---- 步骤 5：创建 GitHub Release ----
console.log('\n🎉 创建 GitHub Release...')
const releaseInfo = await githubApi('POST', `/repos/${OWNER}/${REPO}/releases`, {
  tag_name: `v${newVersion}`,
  name: `v${newVersion}`,
  body: `## 你的应用名称 v${newVersion}\n\n下载下方安装包即可安装。`,
  draft: false,
  prerelease: false,
})
console.log(`✅ Release: ${releaseInfo.html_url}`)

// ---- 步骤 6：上传安装包到 Release ----
console.log('\n⬆️  上传安装包到 GitHub Release...')
execSync('npx electron-builder --win --publish always', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, GH_TOKEN },
})

console.log(`\n🎊 v${newVersion} 发布完成！`)
console.log(`   ${releaseInfo.html_url}\n`)

// ---- GitHub API 工具函数 ----
function githubApi(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const req = https.request({
      hostname: 'api.github.com',
      path,
      method,
      ...(githubAgent ? { agent: githubAgent } : {}),
      headers: {
        Authorization: `token ${GH_TOKEN}`,
        'User-Agent': 'app-release-script',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let raw = ''
      res.on('data', (c) => (raw += c))
      res.on('end', () => {
        const json = JSON.parse(raw)
        if (res.statusCode >= 400) reject(new Error(`GitHub API ${res.statusCode}: ${json.message}`))
        else resolve(json)
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}
```

### 6.2 发布流程图

```
npm run release
       │
       ▼
┌─ 1. git add -A && git commit (提交脏文件)
│
├─ 2. package.json version bump (1.0.22 → 1.0.23)
│
├─ 3. vite build → electron-builder --win
│     产出: release/应用名 Setup 1.0.23.exe
│           release/应用名 Setup 1.0.23.exe.blockmap
│           release/latest.yml
│
├─ 4. git add → commit "release v1.0.23" → tag v1.0.23 → push
│
├─ 5. GitHub API 创建 Release (tag: v1.0.23)
│
└─ 6. electron-builder --publish always
       上传 .exe / .blockmap / latest.yml 到 Release
```

---

## 七、补救上传脚本 (scripts/upload-release-assets.mjs)

当步骤 6 因网络失败时，手动运行此脚本补传：

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// 读取 .env.local
const envFile = join(root, '.env.local')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf-8').split('\n')) {
    const [key, ...vals] = line.trim().split('=')
    if (key && !key.startsWith('#') && vals.length) {
      process.env[key.trim()] = vals.join('=').trim()
    }
  }
}

const TOKEN = process.env.GH_TOKEN
if (!TOKEN) { console.error('Missing GH_TOKEN'); process.exit(1) }

const OWNER = '你的GitHub用户名'
const REPO = '你的仓库名'
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
const ver = pkg.version
const TAG = `v${ver}`

function request(method, hostname, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname, path, method,
      headers: {
        Authorization: `token ${TOKEN}`,
        'User-Agent': 'app-upload',
        Accept: 'application/vnd.github+json',
        ...extraHeaders,
      },
    }
    if (body && typeof body === 'string') {
      opts.headers['Content-Type'] = 'application/json'
      opts.headers['Content-Length'] = Buffer.byteLength(body)
    }
    const req = https.request(opts, (res) => {
      let raw = ''
      res.on('data', (c) => (raw += c))
      res.on('end', () => {
        if (res.statusCode >= 400) {
          const err = new Error(`${res.statusCode}: ${raw}`)
          reject(err)
        } else {
          resolve(raw ? JSON.parse(raw) : {})
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}

async function getOrCreateRelease() {
  try {
    return await request('GET', 'api.github.com', `/repos/${OWNER}/${REPO}/releases/tags/${TAG}`)
  } catch (e) {
    console.log(`Release ${TAG} 不存在，正在创建...`)
    const body = JSON.stringify({
      tag_name: TAG, name: TAG,
      body: `## 应用 ${TAG}`,
      draft: false, prerelease: false,
    })
    return await request('POST', 'api.github.com', `/repos/${OWNER}/${REPO}/releases`, body)
  }
}

async function uploadAsset(uploadUrl, filePath) {
  const buf = readFileSync(filePath)
  const name = filePath.split(/[/\\]/).pop()
  const path = `${uploadUrl}?name=${encodeURIComponent(name)}`
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'uploads.github.com', path, method: 'POST',
      headers: {
        Authorization: `token ${TOKEN}`,
        'User-Agent': 'app-upload',
        'Content-Type': 'application/octet-stream',
        'Content-Length': buf.length,
      },
    }, (res) => {
      let raw = ''
      res.on('data', (c) => (raw += c))
      res.on('end', () => {
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${raw}`))
        else resolve(JSON.parse(raw))
      })
    })
    req.on('error', reject)
    req.write(buf)
    req.end()
  })
}

async function main() {
  console.log(`版本: ${ver} (${TAG})\n`)
  const release = await getOrCreateRelease()
  const uploadUrl = release.upload_url.replace(/\{\?name,label\}/, '')
  // ★ 修改为你的安装包文件名格式
  const files = [
    join(root, 'release', `应用名 Setup ${ver}.exe`),
    join(root, 'release', `应用名 Setup ${ver}.exe.blockmap`),
    join(root, 'release', 'latest.yml'),
  ]
  for (const fp of files) {
    if (!existsSync(fp)) { console.error(`缺少文件: ${fp}`); process.exit(1) }
    const name = fp.split(/[/\\]/).pop()
    console.log('Uploading', name, '...')
    await uploadAsset(uploadUrl, fp)
    console.log('  OK', name)
  }
  console.log('\n完成:', release.html_url)
}

main().catch((e) => { console.error(e); process.exit(1) })
```

---

## 八、更新检测原理（底层流程）

### 8.1 electron-updater 做了什么

```
客户端 app.getVersion() = "1.0.22"
         │
         ▼
autoUpdater.checkForUpdates()
         │
         │  HTTP GET
         │  https://github.com/{owner}/{repo}/releases/latest/download/latest.yml
         ▼
┌─────────────────────────────────────┐
│ latest.yml 内容示例:                 │
│                                     │
│ version: 1.0.23                     │
│ files:                              │
│   - url: 应用名 Setup 1.0.23.exe   │
│     sha512: abc123...               │
│     size: 87654321                  │
│ path: 应用名 Setup 1.0.23.exe      │
│ sha512: abc123...                   │
│ releaseDate: '2026-03-25T...'       │
└─────────────────────────────────────┘
         │
         ▼
对比: latest.yml.version (1.0.23) > app.getVersion() (1.0.22) ?
         │
    ┌────┴────┐
    │ 是       │ 否
    ▼         ▼
update-available    update-not-available
```

### 8.2 三个关键文件

| 文件 | 作用 | 由谁生成 |
|---|---|---|
| `应用名 Setup x.x.x.exe` | NSIS 安装程序 | `electron-builder --win` |
| `应用名 Setup x.x.x.exe.blockmap` | 增量更新块映射，支持差量下载节省带宽 | `electron-builder` 自动生成 |
| `latest.yml` | 更新元数据（版本号、SHA512、文件大小、发布日期） | `electron-builder` 自动生成 |

### 8.3 增量更新 (blockmap)

`electron-updater` 利用 `.blockmap` 文件实现增量下载：
- 将安装包分成固定大小的块，计算每块的 hash
- 下载时只传输与旧版本不同的块
- 大幅减少下载量（通常只需下载 30%-50% 的数据）

---

## 九、完整时序图

```
用户启动应用
    │
    ▼
app.whenReady()
    ├── createWindow()
    ├── setupUpdaterIpc()
    └── if (app.isPackaged) setupAutoUpdater()
            │
            │  setTimeout 3000ms
            ▼
    autoUpdater.checkForUpdates()
            │
            │  GET latest.yml from GitHub Releases
            ▼
    ┌── 版本相同 ───→ updater:not-available ──→ (可选) Toast "已是最新版本"
    │
    └── 有新版本 ───→ updater:available(info) ──→ 弹窗"发现新版本"
                        │                          显示: v1.0.22 → v1.0.23
                        │
            ┌───────────┤
            │ [稍后提醒]  │ [立即下载]
            │ 关闭弹窗    ▼
            │        window.api.downloadUpdate()
            │            │
            │            ▼
            │      updater:progress × N ──→ 进度弹窗
            │        (percent, speed, transferred/total)
            │            │
            │            ▼
            │      updater:downloaded ──→ 弹窗"更新已就绪"
            │            │
            │  ┌─────────┤
            │  │[稍后重启] │ [立即重启安装]
            │  │          ▼
            │  │   window.api.installUpdate()
            │  │          │
            │  │          ▼
            │  │   autoUpdater.quitAndInstall(false, true)
            │  │   → 退出应用 → NSIS 覆盖安装 → 启动新版本
            │  │
            │  └──→ 退出时自动安装 (autoInstallOnAppQuit = true)
            │
            └──→ 下次启动重新检测
```

---

## 十、环境变量配置

在项目根目录创建 `.env.local`（已被 `.gitignore` 忽略）：

```ini
GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# (可选) 如果 GitHub API 需要走 SOCKS 代理
GITHUB_SOCKS_PROXY=socks5://127.0.0.1:7890
```

---

## 十一、.gitignore 相关

确保以下目录不被提交：

```gitignore
node_modules/
dist/
dist-electron/
release/
.env.local
```

---

## 十二、接入清单 (Checklist)

在新项目中接入此方案，按以下顺序操作：

- [ ] 安装依赖: `npm install electron-updater` + `npm install -D electron-builder`
- [ ] 配置 `package.json` 的 `build` 和 `build.publish` 字段
- [ ] 主进程添加 `setupAutoUpdater()` 和 `setupUpdaterIpc()`
- [ ] preload 中暴露 5 个更新 API (`checkForUpdate`, `downloadUpdate`, `installUpdate`, `getVersion`, `onUpdaterEvent`)
- [ ] 渲染进程添加 `UpdaterDialog` 组件并在 App.vue 中引入
- [ ] 创建 `scripts/release.mjs` 发布脚本
- [ ] (可选) 创建 `scripts/upload-release-assets.mjs` 补救脚本
- [ ] 配置 `.env.local` 写入 `GH_TOKEN`
- [ ] 在 GitHub 创建仓库并确保有 Releases 权限
- [ ] 运行 `npm run release` 测试完整流程
