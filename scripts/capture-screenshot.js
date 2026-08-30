const { app, BrowserWindow } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

async function capture() {
  await app.whenReady();
  const window = new BrowserWindow({ width: 1280, height: 720, show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  await window.loadFile(path.join(__dirname, "..", "index.html"));
  await new Promise(resolve => setTimeout(resolve, 1500));
  const outputDir = path.join(__dirname, "..", "docs", "images");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "menu.png"), (await window.webContents.capturePage()).toPNG());
  await window.webContents.executeJavaScript('document.getElementById("btnMenuStart").click()');
  await new Promise(resolve => setTimeout(resolve, 1000));
  fs.writeFileSync(path.join(outputDir, "gameplay.png"), (await window.webContents.capturePage()).toPNG());
  window.destroy();
  app.quit();
}

capture().catch(error => { console.error(error); app.exit(1); });
