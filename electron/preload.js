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
  setFundGroupEnabled: (id, enabled) => ipcRenderer.invoke('fundGroups:setEnabled', id, enabled),
  deleteFundGroup: (id) => ipcRenderer.invoke('fundGroups:delete', id),
  updateGroupPrepaid: (id, prepaid) => ipcRenderer.invoke('fundGroups:updatePrepaid', id, prepaid),
  addGroupPrepaidUsed: (groupId, amount, relatedId) => ipcRenderer.invoke('fundGroups:addPrepaidUsed', groupId, amount, relatedId),

  // Wire transfers
  getAllWireTransfers: () => ipcRenderer.invoke('wireTransfers:getAll'),
  getWireTransfersByGroup: (groupId) => ipcRenderer.invoke('wireTransfers:getByGroup', groupId),
  addWireTransfer: (data) => ipcRenderer.invoke('wireTransfers:add', data),
  updateWireTransferIn: (id, data) => ipcRenderer.invoke('wireTransfers:updateIn', id, data),
  updateWireTransferOut: (id, data) => ipcRenderer.invoke('wireTransfers:updateOut', id, data),
  updateWireTransferSettled: (id, settled) => ipcRenderer.invoke('wireTransfers:updateSettled', id, settled),
  deleteWireTransfer: (id) => ipcRenderer.invoke('wireTransfers:delete', id),
  getAllWireGroups: () => ipcRenderer.invoke('wireGroups:getAll'),
  addWireGroup: (name) => ipcRenderer.invoke('wireGroups:add', name),
  renameWireGroup: (id, name) => ipcRenderer.invoke('wireGroups:rename', id, name),
  setWireGroupEnabled: (id, enabled) => ipcRenderer.invoke('wireGroups:setEnabled', id, enabled),
  updateWireGroupPrepaid: (id, prepaid) => ipcRenderer.invoke('wireGroups:updatePrepaid', id, prepaid),
  addWireGroupPrepaidUsed: (groupId, amount, relatedId) => ipcRenderer.invoke('wireGroups:addPrepaidUsed', groupId, amount, relatedId),
  deleteWireGroup: (id) => ipcRenderer.invoke('wireGroups:delete', id),

  // Downstreams
  getAllDownstreams: () => ipcRenderer.invoke('downstreams:getAll'),
  addDownstream: (name, ledgerTypes) => ipcRenderer.invoke('downstreams:add', name, ledgerTypes),
  updateDownstream: (id, name, ledgerTypes) => ipcRenderer.invoke('downstreams:update', id, name, ledgerTypes),
  deleteDownstream: (id) => ipcRenderer.invoke('downstreams:delete', id),
  addDownstreamPrepaid: (id, amount) => ipcRenderer.invoke('downstreams:addPrepaid', id, amount),
  addDownstreamPrepaidUsed: (id, amount, ledgerType, relatedId) => ipcRenderer.invoke('downstreams:addPrepaidUsed', id, amount, ledgerType, relatedId),
  setDownstreamEnabled: (id, enabled) => ipcRenderer.invoke('downstreams:setEnabled', id, enabled),
  getPrepaidLogsByTarget: (targetKind, targetId) => ipcRenderer.invoke('prepaidLogs:getByTarget', targetKind, targetId),

  // Lock password
  hasLockPassword: () => ipcRenderer.invoke('lock:hasPassword'),
  setLockPassword: (pw) => ipcRenderer.invoke('lock:setPassword', pw),
  verifyLockPassword: (pw) => ipcRenderer.invoke('lock:verify', pw),
  removeLockPassword: () => ipcRenderer.invoke('lock:removePassword'),
})
