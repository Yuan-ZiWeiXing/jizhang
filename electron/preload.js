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

  // Funds
  getAllFunds: () => ipcRenderer.invoke('funds:getAll'),
  getFundsByDateRange: (start, end) => ipcRenderer.invoke('funds:getByDateRange', start, end),
  addFund: (data) => ipcRenderer.invoke('funds:add', data),
  updateFundOut: (id, data) => ipcRenderer.invoke('funds:updateOut', id, data),
  deleteFund: (id) => ipcRenderer.invoke('funds:delete', id),
  addFundsBatch: (rows) => ipcRenderer.invoke('funds:addBatch', rows),
  updateFundSettled: (id, settled) => ipcRenderer.invoke('funds:updateSettled', id, settled),
  batchUpdateSettled: (ids, settled) => ipcRenderer.invoke('funds:batchUpdateSettled', ids, settled),
  getFundsByGroup: (groupId) => ipcRenderer.invoke('funds:getByGroup', groupId),
  getAllFundGroups: () => ipcRenderer.invoke('fundGroups:getAll'),
  addFundGroup: (name) => ipcRenderer.invoke('fundGroups:add', name),
  renameFundGroup: (id, name) => ipcRenderer.invoke('fundGroups:rename', id, name),
  deleteFundGroup: (id) => ipcRenderer.invoke('fundGroups:delete', id),
  updateGroupPrepaid: (id, prepaid) => ipcRenderer.invoke('fundGroups:updatePrepaid', id, prepaid),
  addGroupPrepaidUsed: (groupId, amount) => ipcRenderer.invoke('fundGroups:addPrepaidUsed', groupId, amount),
})
