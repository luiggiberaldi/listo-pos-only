// ✅ SYSTEM IMPLEMENTATION - V. 2.1 (CLEAN & SECURE)
// Archivo: electron/main.js

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import 'dotenv/config';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodeMachineId from 'node-machine-id';
const { machineIdSync } = nodeMachineId;
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import checkDiskSpace from 'check-disk-space';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

// --- CONFIGURACIÓN DE ACTUALIZACIONES ---
autoUpdater.autoDownload = false; // 🛑 NO descargar automáticamente para evitar lag
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.autoInstallOnAppQuit = true;

// --- CONFIGURACIÓN & ENTORNO ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV === 'development';

// 🚀 PERF: Memory optimization for low-end PCs (2-4GB RAM)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

let db = null;
try {
  if (firebaseConfig.apiKey) {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    console.log("☁️ [ELECTRON] Firebase inicializado.");
  }
} catch (e) {
  console.error("🔥 [ELECTRON] Firebase Error:", e);
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
    frame: true, // Ensure window has frame
    show: false, // Don't show until ready
    backgroundColor: '#ffffff', // Prevent white flash
    skipTaskbar: false, // Ensure it appears in taskbar
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: true // 🛠️ Habilitado para depuración en producción
    }
  });

  // 🔧 FIX: Explicitly ensure taskbar visibility
  mainWindow.setSkipTaskbar(false);

  // 🔧 FIX: Show window only when ready to prevent blank screen
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
    mainWindow.focus(); // Force focus on Windows
    mainWindow.moveTop(); // Bring to front
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
}

// 🔧 FIX: Prevent multiple instances and restore window when clicking icon
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// --- CICLO DE VIDA ---
app.whenReady().then(() => {
  // 🛠️ Atajo de Depuración (F12)
  import('electron').then(({ globalShortcut }) => {
    globalShortcut.register('F12', () => {
      if (mainWindow) mainWindow.webContents.toggleDevTools();
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Iniciar AutoUpdater después de un breve retraso
  setTimeout(() => {
    setupAutoUpdater();
  }, 3000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
});

// --- ACTUALIZACIONES AUTOMÁTICAS ---
// --- ACTUALIZACIONES AUTOMÁTICAS ---
function setupAutoUpdater() {
  console.log('🔄 [AutoUpdater] Iniciando verificación de actualizaciones...');

  // 1. Check inicial (Silencioso, sin notificación nativa)
  autoUpdater.checkForUpdates();

  // 2. Eventos
  autoUpdater.on('checking-for-update', () => {
    console.log('🔄 [AutoUpdater] Buscando actualizaciones...');
    if (mainWindow) mainWindow.webContents.send('checking_for_update');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('⬇️ [AutoUpdater] Actualización disponible:', info.version);
    if (mainWindow) mainWindow.webContents.send('update_available', info);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('✅ [AutoUpdater] No hay actualizaciones pendientes.');
    if (mainWindow) mainWindow.webContents.send('update_not_available');
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ [AutoUpdater] Error:', err);
    if (mainWindow) mainWindow.webContents.send('update_error', err.message);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Descargando: " + Math.round(progressObj.percent) + '%';
    console.log(log_message);
    if (mainWindow) mainWindow.webContents.send('update_download_progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ [AutoUpdater] Descarga completada.');
    if (mainWindow) mainWindow.webContents.send('update_downloaded', info);
  });
}

// 3. Listener Manual (desde UI)
ipcMain.on('check_for_updates', () => {
  console.log('👆 [AutoUpdater] Verificación manual solicitada per usuario.');
  autoUpdater.checkForUpdates();
});

// 4. Configuración Persistente (Runtime Environment)
ipcMain.handle('get-custom-env', () => {
  try {
    const fs = require('fs');
    const envPath = path.join(app.getPath('userData'), 'custom-env.json');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf-8');
      const customEnv = JSON.parse(raw);
      console.log('🔑 [Main] Cargada configuración personalizada desde disk.');
      return customEnv;
    }
  } catch (e) {
    console.error('❌ [Main] Error leyendo custom-env.json:', e);
  }
  return {};
});

// 5. Guardar Configuración (Para UI de "Recuperar Conexión")
ipcMain.handle('save-custom-env', (event, envData) => {
  try {
    const fs = require('fs');
    const envPath = path.join(app.getPath('userData'), 'custom-env.json');
    fs.writeFileSync(envPath, JSON.stringify(envData, null, 2));
    console.log('💾 [Main] Guardada configuración personalizada.');
    return true;
  } catch (e) {
    console.error('❌ [Main] Error guardando custom-env.json:', e);
    return false;
  }
});

// --- COMUNICACIÓN (IPC) ---



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

ipcMain.handle('firebase-sync', async (event, { collection: colName, data }) => {
  if (!db) return { success: false, error: "Firebase no configurado" };
  try {
    const payload = { ...data, _sync_source: 'ELECTRON_MAIN', _sync_createdAt: serverTimestamp() };
    await addDoc(collection(db, colName), payload);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

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

ipcMain.handle('open-file-location', (event, path) => {
  if (path) shell.showItemInFolder(path);
});

ipcMain.handle('open-file-default', (event, path) => {
  if (path) shell.openPath(path);
});

ipcMain.on('download_update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});