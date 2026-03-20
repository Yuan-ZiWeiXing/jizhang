import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Records
  getAllRecords: () => ipcRenderer.invoke('records:getAll'),
  getRecordsByMonth: (year, month) => ipcRenderer.invoke('records:getByMonth', year, month),
  addRecord: (record) => ipcRenderer.invoke('records:add', record),
  deleteRecord: (id) => ipcRenderer.invoke('records:delete', id),
  updateRecord: (id, data) => ipcRenderer.invoke('records:update', id, data),

  // Categories
  getAllCategories: () => ipcRenderer.invoke('categories:getAll'),

  // Window
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),

  // Updater
  checkForUpdate: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.send('updater:install'),
  getVersion: () => ipcRenderer.invoke('updater:getVersion'),
  onUpdaterEvent: (channel, fn) => {
    ipcRenderer.on(channel, (_, ...args) => fn(...args))
    return () => ipcRenderer.removeAllListeners(channel)
  },
})
