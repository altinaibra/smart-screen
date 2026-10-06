// Vetëm faqja e lidhjes (setup.html) e përdor: ruan adresën e serverit dhe hap panelin.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('smartScreenPanel', {
  connect: server => ipcRenderer.invoke('panel:connect', server),
});
