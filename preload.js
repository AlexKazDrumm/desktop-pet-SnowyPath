const { contextBridge } = require('electron');

// На будущее, если понадобится IPC. Пока просто даём window.api-обёртку.
contextBridge.exposeInMainWorld('api', {
  // placeholder
});
