'use strict';

if (typeof require('electron') === 'string') {
  console.error('Electron is running in Node mode. Start the picker with ELECTRON_RUN_AS_NODE unset.');
  process.exit(1);
}

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const assets = require('./lib/assets');
const preview = require('./lib/preview');

const configFile = () => path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configFile(), 'utf8'));
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify(cfg, null, 2));
}

// The picker is meant to be dropped into (or shipped inside) the DAoC
// "custom" UI folder, so try locations derived from where the executable
// lives before falling back to the saved config or a folder dialog.
function detectUiRoot() {
  const cfg = loadConfig();
  const candidates = [];
  if (cfg.uiRoot) candidates.push(cfg.uiRoot);
  if (process.env.PORTABLE_EXECUTABLE_DIR) candidates.push(process.env.PORTABLE_EXECUTABLE_DIR);
  if (process.env.APPIMAGE) candidates.push(path.dirname(process.env.APPIMAGE));
  candidates.push(path.dirname(process.execPath));
  let dir = app.getAppPath();
  for (let i = 0; i < 4; i++) {
    candidates.push(dir);
    dir = path.dirname(dir);
  }
  return candidates.find((c) => assets.isUiRoot(c)) || null;
}

let uiRoot = null;

function state() {
  if (!uiRoot) return { uiRoot: null, categories: [] };
  try {
    return { uiRoot, categories: assets.scan(uiRoot) };
  } catch (err) {
    return { uiRoot, categories: [], error: String(err.message || err) };
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 760,
    height: 720,
    minWidth: 560,
    minHeight: 420,
    backgroundColor: '#14120e',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  uiRoot = detectUiRoot();

  ipcMain.handle('picker:get-state', () => state());

  ipcMain.handle('picker:pick-folder', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Select your DAoC custom UI folder (the one containing "Options")',
      properties: ['openDirectory'],
    });
    if (!res.canceled && res.filePaths[0]) {
      const chosen = res.filePaths[0];
      if (assets.isUiRoot(chosen)) {
        uiRoot = chosen;
        saveConfig({ ...loadConfig(), uiRoot });
      } else {
        return { ...state(), error: `No "Options" folder found in: ${chosen}` };
      }
    }
    return state();
  });

  ipcMain.handle('picker:preview', (_ev, categoryId, variantId) => {
    try {
      const hit = assets.find(uiRoot, categoryId, variantId);
      return hit ? preview.resolve(uiRoot, hit.variant) : null;
    } catch {
      return null;
    }
  });

  ipcMain.handle('picker:apply', (_ev, categoryId, variantId) => {
    try {
      const count = assets.apply(uiRoot, categoryId, variantId);
      return { ...state(), applied: { categoryId, variantId, count } };
    } catch (err) {
      return { ...state(), error: String(err.message || err) };
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});
