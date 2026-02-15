// ✅ SYSTEM IMPLEMENTATION - V. 3.0 (PERFORMANCE OPTIMIZED)
// Archivo: electron/main.js
// Cambios: Removido Firebase, devTools deshabilitado en producción,
// flags Chromium para reducir procesos y memoria.

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import 'dotenv/config';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodeMachineId from 'node-machine-id';
const { machineIdSync } = nodeMachineId;
import checkDiskSpace from 'check-disk-space';
import { startLanServer, updateProductCache, getLocalIP } from './lanServer.js';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

// --- CONFIGURACIÓN DE ACTUALIZACIONES ---
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// --- CONFIGURACIÓN & ENTORNO ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

// ═══════════════════════════════════════════════════════════
// 🚀 PERFORMANCE: Chromium flags para reducir procesos y RAM
// ═══════════════════════════════════════════════════════════
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=384');       // Limitar heap JS a 384MB (era 512)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');              // Evitar cache de shaders en disco
app.commandLine.appendSwitch('disable-software-rasterizer');                // Desactivar rasterizador software
app.commandLine.appendSwitch('disable-features', 'SpareRendererForSitePerProcess'); // No pre-crear renderers extras
app.commandLine.appendSwitch('renderer-process-limit', '4');                // Máximo 4 procesos renderer
app.commandLine.appendSwitch('disable-background-timer-throttling');        // No throttle timers en fondo
if (!isDev) {
  app.commandLine.appendSwitch('disable-dev-tools');                        // Sin devtools en producción
}


// --- VENTANA PRINCIPAL ---
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "Listo POS",
    icon: path.join(__dirname, '../build/icon.ico'),
    frame: true,
    show: false,
    backgroundColor: '#ffffff',
    skipTaskbar: false,
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: isDev,                    // ✅ Solo en dev
      backgroundThrottling: true,         // ✅ Throttle cuando minimizado
      spellcheck: false,                  // ✅ No necesitamos spellcheck
      enableWebSQL: false,                // ✅ No usamos WebSQL
    }
  });

  mainWindow.setSkipTaskbar(false);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
    mainWindow.focus();
    mainWindow.moveTop();

    // 🚀 PERF: Unregister PWA service workers (innecesarios en Electron)
    mainWindow.webContents.session.clearStorageData({ storages: ['serviceworkers'] });
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.setMenuBarVisibility(false);

  mainWindow.webContents.session.on('will-download', (event, item) => {
    let fileName = item.getFilename();
    if (fileName.length > 30 && !fileName.includes(' ')) {
      fileName = 'Documento_Descargado.pdf';
    }
    item.setSaveDialogOptions({
      title: 'Guardar Archivo',
      defaultPath: fileName,
      filters: [{ name: 'Todos los archivos', extensions: ['*'] }]
    });
  });

  // 🚀 PERF: Liberar memoria agresivamente cuando la ventana está oculta
  mainWindow.on('hide', () => {
    if (mainWindow?.webContents) mainWindow.webContents.backgroundThrottling = true;
  });
}

// 🔧 FIX: Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// --- CICLO DE VIDA ---
app.whenReady().then(() => {
  // 🛠️ F12 solo en dev
  if (isDev) {
    import('electron').then(({ globalShortcut }) => {
      globalShortcut.register('F12', () => {
        if (mainWindow) mainWindow.webContents.toggleDevTools();
      });
    });
  }

  createWindow();

  // 📡 LAN SYNC: Arrancar servidor local para multi-caja
  // Lee config persistente para determinar si es Caja Principal
  try {
    const lanConfigPath = path.join(app.getPath('userData'), 'lan-config.json');
    let lanConfig = { role: 'principal' }; // Default: siempre servidor
    if (fs.existsSync(lanConfigPath)) {
      lanConfig = JSON.parse(fs.readFileSync(lanConfigPath, 'utf-8'));
    }
    if (lanConfig.role === 'principal') {
      startLanServer(mainWindow);
    }
  } catch (e) {
    console.error('❌ [LAN] Error iniciando servidor:', e.message);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // AutoUpdater con retraso
  setTimeout(() => {
    setupAutoUpdater();
  }, 5000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => { });

// --- ACTUALIZACIONES AUTOMÁTICAS ---
function setupAutoUpdater() {
  console.log('🔄 [AutoUpdater] Iniciando verificación...');

  autoUpdater.checkForUpdates();

  autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('checking_for_update');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('⬇️ [AutoUpdater] Actualización disponible:', info.version);
    if (mainWindow) mainWindow.webContents.send('update_available', info);
  });

  autoUpdater.on('update-not-available', () => {
    if (mainWindow) mainWindow.webContents.send('update_not_available');
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ [AutoUpdater] Error:', err);
    if (mainWindow) mainWindow.webContents.send('update_error', err.message);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) mainWindow.webContents.send('update_download_progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ [AutoUpdater] Descarga completada.');
    if (mainWindow) mainWindow.webContents.send('update_downloaded', info);
  });
}

// --- IPC: Manual Update ---
ipcMain.on('check_for_updates', () => {
  autoUpdater.checkForUpdates();
});

// --- IPC: Configuración Persistente ---
ipcMain.handle('get-custom-env', () => {
  try {
    const envPath = path.join(app.getPath('userData'), 'custom-env.json');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('❌ [Main] Error leyendo custom-env.json:', e);
  }
  return {};
});

ipcMain.handle('save-custom-env', (event, envData) => {
  try {
    const envPath = path.join(app.getPath('userData'), 'custom-env.json');
    fs.writeFileSync(envPath, JSON.stringify(envData, null, 2));
    return true;
  } catch (e) {
    console.error('❌ [Main] Error guardando custom-env.json:', e);
    return false;
  }
});

// --- IPC: COMUNICACIÓN ---
ipcMain.on('test-print', () => {
  mainWindow.webContents.print({ silent: false, printBackground: true });
});

ipcMain.on('open-drawer', () => {
  console.log('📦 [Electron] Cajón abierto (Simulado)');
});

ipcMain.on('toggle-kiosk', (event, enable) => {
  mainWindow.setKiosk(enable);
});

ipcMain.handle('read-scale', async () => {
  return new Promise(resolve => setTimeout(() => resolve(Math.random() * 5), 1000));
});

ipcMain.handle('get-system-info', () => {
  return {
    platform: process.platform,
    version: app.getVersion(),
    electron: process.versions.electron,
    secureMode: true
  };
});

ipcMain.handle('get-machine-id', () => {
  try { return machineIdSync(); } catch (e) { return "UNKNOWN-ID"; }
});

ipcMain.handle('get-disk-info', async () => {
  try {
    const pathToCheck = process.platform === 'win32' ? 'C:/' : '/';
    const diskSpace = await checkDiskSpace(pathToCheck);
    return {
      free: parseFloat((diskSpace.free / 1024 / 1024 / 1024).toFixed(2)),
      size: parseFloat((diskSpace.size / 1024 / 1024 / 1024).toFixed(2)),
      percentUsed: Math.round(((diskSpace.size - diskSpace.free) / diskSpace.size) * 100)
    };
  } catch (e) {
    return { free: 0, size: 0, percentUsed: 0, error: true };
  }
});

// --- IPC: Firebase Sync (legacy, deshabilitado) ---
ipcMain.handle('firebase-sync', async () => {
  return { success: false, error: "Firebase deshabilitado — use sincronización LAN" };
});

// ═══════════════════════════════════════════════════════════
// 📡 IPC: LAN SYNC (Multi-Caja Offline)
// ═══════════════════════════════════════════════════════════

// Renderer envía productos actualizados → cache del servidor
ipcMain.on('lan-sync-products', (event, { products, categories, config }) => {
  // Enriquecer config con machineId y estado de licencia para el endpoint /api/license-grant
  const enrichedConfig = {
    ...config,
    _machineId: (() => { try { return machineIdSync(); } catch { return 'UNKNOWN'; } })(),
    _licenseActive: !!config?._licenseActive, // El renderer indica si tiene licencia
  };
  updateProductCache(products, categories, enrichedConfig);
});

// Obtener IP local para mostrar en UI
ipcMain.handle('lan-get-ip', () => {
  return getLocalIP();
});

// Obtener/guardar configuración LAN
ipcMain.handle('lan-get-config', () => {
  try {
    const configPath = path.join(app.getPath('userData'), 'lan-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) { /* default */ }
  return { role: 'principal', targetIP: '' };
});

ipcMain.handle('lan-save-config', (event, config) => {
  try {
    const configPath = path.join(app.getPath('userData'), 'lan-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    return false;
  }
});

// --- IPC: PDF Save ---
ipcMain.handle('pdf-save', async (event, { buffer, filename }) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar PDF',
      defaultPath: filename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (filePath) {
      await fs.promises.writeFile(filePath, Buffer.from(buffer));
      return { success: true, path: filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-file-location', (event, filePath) => {
  if (filePath) shell.showItemInFolder(filePath);
});

ipcMain.handle('open-file-default', (event, filePath) => {
  if (filePath) shell.openPath(filePath);
});

ipcMain.on('download_update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});