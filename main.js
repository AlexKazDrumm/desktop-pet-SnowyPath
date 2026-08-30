// main.js
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let mainWindow;

function createWindow() {
  const windowed = process.argv.includes("--windowed");
  mainWindow = new BrowserWindow({
    title: "SnowyPath",
    fullscreen: !windowed,
    frame: windowed,
    autoHideMenuBar: true,
    width: 1920,
    height: 1080, // 16:9
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Keep 16:9 aspect ratio
  mainWindow.setAspectRatio(16 / 9);

  mainWindow.loadFile("index.html");

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) event.preventDefault();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle("set-fullscreen", (_event, flag) => {
  if (mainWindow) {
    mainWindow.setFullScreen(!!flag);
  }
});

ipcMain.handle("set-window-size", (_event, payload) => {
  if (!mainWindow || !payload) return;
  const width = Math.max(1, Math.floor(Number(payload.width) || 0));
  const height = Math.max(1, Math.floor(Number(payload.height) || 0));
  if (width && height) {
    mainWindow.setFullScreen(false);
    mainWindow.setSize(width, height);
    mainWindow.center();
  }
});

ipcMain.handle("app-exit", () => {
  app.quit();
});
