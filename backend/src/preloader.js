const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronApi', {
  on: (topic, handler) => ipcRenderer.on(topic, (evt, arg) => handler(evt, arg)),
  off: (topic) => ipcRenderer.removeAllListeners(topic),
  send: (topic, data) => ipcRenderer.invoke(topic, data),

});