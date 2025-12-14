const { contextBridge, ipcRenderer } = require("electron");

// Мост для вызовов окна из рендерера.
contextBridge.exposeInMainWorld("api", {
  setFullscreen: (flag) => ipcRenderer.invoke("set-fullscreen", !!flag),
  setWindowSize: (width, height) => ipcRenderer.invoke("set-window-size", { width, height }),
  exitApp: () => ipcRenderer.invoke("app-exit")
});
