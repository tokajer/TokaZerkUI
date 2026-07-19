'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('picker', {
  getState: () => ipcRenderer.invoke('picker:get-state'),
  preview: (categoryId, variantId) => ipcRenderer.invoke('picker:preview', categoryId, variantId),
  pickFolder: () => ipcRenderer.invoke('picker:pick-folder'),
  apply: (categoryId, variantId) => ipcRenderer.invoke('picker:apply', categoryId, variantId),
});
