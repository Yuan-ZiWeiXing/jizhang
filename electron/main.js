import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, copyFileSync } from 'fs'
import { createDb } from './db.js'
import { autoUpdater } from 'electron-updater'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === 'development'

if (isDev) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true'
}

let db
let win

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }

  if (!isDev) {
    win.webContents.on('before-input-event', (event, input) => {
      const isDevToolsShortcut =
        (input.key === 'F12') ||
        (input.control && input.shift && input.key === 'I') ||
        (input.control && input.shift && input.key === 'i') ||
        (input.control && input.shift && input.key === 'J') ||
        (input.control && input.shift && input.key === 'j')
      if (isDevToolsShortcut) event.preventDefault()
    })
  }
}

function migrateOldDb(targetDir) {
  const targetDb = join(targetDir, 'jizhang.db')
  if (existsSync(targetDb)) return
  const exeDir = dirname(app.getPath('exe'))
  const oldDb = join(exeDir, 'jizhang.db')
  if (existsSync(oldDb)) {
    try {
      copyFileSync(oldDb, targetDb)
      const oldWal = oldDb + '-wal'
      const oldShm = oldDb + '-shm'
      if (existsSync(oldWal)) copyFileSync(oldWal, targetDb + '-wal')
      if (existsSync(oldShm)) copyFileSync(oldShm, targetDb + '-shm')
    } catch (e) { /* ignore migration errors */ }
  }
}

app.whenReady().then(() => {
  const dbDir = app.getPath('userData')
  migrateOldDb(dbDir)
  db = createDb(dbDir)
  setupIpc()
  createWindow()

  if (app.isPackaged) {
    setupAutoUpdater()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    win.webContents.send('updater:checking')
  })

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('updater:available', info)
  })

  autoUpdater.on('update-not-available', () => {
    win.webContents.send('updater:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    win.webContents.send('updater:progress', progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('updater:downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    win.webContents.send('updater:error', err.message)
  })

  // Check on startup after 3s delay
  setTimeout(() => autoUpdater.checkForUpdates(), 3000)
}

function setupIpc() {
  // Records
  ipcMain.handle('records:getAll', () => db.getAllRecords())
  ipcMain.handle('records:getByMonth', (_, year, month) => db.getRecordsByMonth(year, month))
  ipcMain.handle('records:add', (_, record) => db.addRecord(record))
  ipcMain.handle('records:delete', (_, id) => db.deleteRecord(id))
  ipcMain.handle('records:update', (_, id, data) => db.updateRecord(id, data))

  // Categories
  ipcMain.handle('categories:getAll', () => db.getAllCategories())

  // Window controls
  ipcMain.on('win:minimize', () => win.minimize())
  ipcMain.on('win:maximize', () => win.isMaximized() ? win.unmaximize() : win.maximize())
  ipcMain.on('win:close', () => win.close())

  // Updater controls
  ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates())
  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate())
  ipcMain.on('updater:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
  ipcMain.handle('updater:getVersion', () => app.getVersion())

  // Funds
  ipcMain.handle('funds:getAll', () => db.getAllFunds())
  ipcMain.handle('funds:getByDateRange', (_, start, end) => db.getFundsByDateRange(start, end))
  ipcMain.handle('funds:add', (_, data) => db.addFund(data))
  ipcMain.handle('funds:updateOut', (_, id, data) => db.updateFundOut(id, data))
  ipcMain.handle('funds:delete', (_, id) => db.deleteFund(id))
  ipcMain.handle('funds:addBatch', (_, rows) => db.addFundsBatch(rows))
  ipcMain.handle('funds:updateSettled', (_, id, settled) => db.updateFundSettled(id, settled))
  ipcMain.handle('funds:batchUpdateSettled', (_, ids, settled) => db.batchUpdateSettled(ids, settled))
  ipcMain.handle('fundGroups:updatePrepaid', (_, id, prepaid) => db.updateGroupPrepaid(id, prepaid))
  ipcMain.handle('fundGroups:addPrepaidUsed', (_, groupId, amount, relatedId) => db.addGroupPrepaidUsed(groupId, amount, relatedId))
  ipcMain.handle('funds:getByGroup', (_, groupId) => db.getFundsByGroup(groupId))
  ipcMain.handle('fundGroups:getAll', () => db.getAllFundGroups())
  ipcMain.handle('fundGroups:add', (_, name) => db.addFundGroup(name))
  ipcMain.handle('fundGroups:rename', (_, id, name) => db.renameFundGroup(id, name))
  ipcMain.handle('fundGroups:setEnabled', (_, id, enabled) => db.setFundGroupEnabled(id, enabled))
  ipcMain.handle('fundGroups:delete', (_, id) => db.deleteFundGroup(id))

  // Wire transfers
  ipcMain.handle('wireTransfers:getAll', () => db.getAllWireTransfers())
  ipcMain.handle('wireTransfers:getByGroup', (_, groupId) => db.getWireTransfersByGroup(groupId))
  ipcMain.handle('wireTransfers:add', (_, data) => db.addWireTransfer(data))
  ipcMain.handle('wireTransfers:updateIn', (_, id, data) => db.updateWireTransferIn(id, data))
  ipcMain.handle('wireTransfers:updateOut', (_, id, data) => db.updateWireTransferOut(id, data))
  ipcMain.handle('wireTransfers:updateSettled', (_, id, settled) => db.updateWireTransferSettled(id, settled))
  ipcMain.handle('wireTransfers:delete', (_, id) => db.deleteWireTransfer(id))
  ipcMain.handle('wireGroups:getAll', () => db.getAllWireGroups())
  ipcMain.handle('wireGroups:add', (_, name) => db.addWireGroup(name))
  ipcMain.handle('wireGroups:rename', (_, id, name) => db.renameWireGroup(id, name))
  ipcMain.handle('wireGroups:setEnabled', (_, id, enabled) => db.setWireGroupEnabled(id, enabled))
  ipcMain.handle('wireGroups:updatePrepaid', (_, id, prepaid) => db.updateWireGroupPrepaid(id, prepaid))
  ipcMain.handle('wireGroups:addPrepaidUsed', (_, groupId, amount, relatedId) => db.addWireGroupPrepaidUsed(groupId, amount, relatedId))
  ipcMain.handle('wireGroups:delete', (_, id) => db.deleteWireGroup(id))

  // Downstreams
  ipcMain.handle('downstreams:getAll', () => db.getAllDownstreams())
  ipcMain.handle('downstreams:add', (_, name, ledgerTypes) => {
    const ids = Array.isArray(ledgerTypes) && ledgerTypes.length ? ledgerTypes : ['funds']
    return db.addDownstream(name, JSON.stringify(ids))
  })
  ipcMain.handle('downstreams:update', (_, id, name, ledgerTypes) => {
    const ids = Array.isArray(ledgerTypes) && ledgerTypes.length ? ledgerTypes : ['funds']
    return db.updateDownstream(id, name, JSON.stringify(ids))
  })
  ipcMain.handle('downstreams:delete', (_, id) => db.deleteDownstream(id))
  ipcMain.handle('downstreams:setEnabled', (_, id, enabled) => db.setDownstreamEnabled(id, enabled))
  ipcMain.handle('downstreams:addPrepaid', (_, id, amount) => db.addDownstreamPrepaid(id, amount))
  ipcMain.handle('downstreams:addPrepaidUsed', (_, id, amount, ledgerType, relatedId) => db.addDownstreamPrepaidUsed(id, amount, ledgerType, relatedId))
  ipcMain.handle('prepaidLogs:getByTarget', (_, targetKind, targetId) => db.getPrepaidLogs(targetKind, targetId))

  // Lock password
  ipcMain.handle('lock:hasPassword', () => db.hasLockPassword())
  ipcMain.handle('lock:setPassword', (_, pw) => db.setLockPassword(pw))
  ipcMain.handle('lock:verify', (_, pw) => db.verifyLockPassword(pw))
  ipcMain.handle('lock:removePassword', () => db.removeLockPassword())
}
