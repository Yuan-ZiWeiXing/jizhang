import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { createDb } from './db.js'
import { autoUpdater } from 'electron-updater'

const __dirname = dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === 'development'

let db
let win

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 800,
    minHeight: 560,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  const dbDir = app.isPackaged
    ? dirname(app.getPath('exe'))
    : app.getPath('userData')
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
  autoUpdater.autoInstallOnAppQuit = false

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
  ipcMain.on('updater:install', () => autoUpdater.quitAndInstall())
  ipcMain.handle('updater:getVersion', () => app.getVersion())

  // Funds
  ipcMain.handle('funds:getAll', () => db.getAllFunds())
  ipcMain.handle('funds:getByDateRange', (_, start, end) => db.getFundsByDateRange(start, end))
  ipcMain.handle('funds:add', (_, data) => db.addFund(data))
  ipcMain.handle('funds:updateOut', (_, id, data) => db.updateFundOut(id, data))
  ipcMain.handle('funds:delete', (_, id) => db.deleteFund(id))
}
