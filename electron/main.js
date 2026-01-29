// ✅ SYSTEM IMPLEMENTATION - V. 2.0 (SECURE IPC)
// Archivo: electron/main.js
// Autorizado por Auditor en Fase 2 (Iron Dome)

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import 'dotenv/config'; // 🔑 Cargar .env
import fs from 'fs';
import { fileURLToPath } from 'url';

// ☁️ FIREBASE ADMIN (O CLIENT SDK EN NODE)
// Nota: En producción, usa variables de entorno reales o un archivo de config encriptado.
// Aquí simulamos la inicialización segura.
import nodeMachineId from 'node-machine-id';
const { machineIdSync } = nodeMachineId;
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Configuración leída de variables de entorno (dotenv) o inyectada en build
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

let db = null;

// Inicialización Defensiva de Firebase (Solo si hay config)
try {
  if (firebaseConfig.apiKey) {
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    console.log("☁️ [ELECTRON] Firebase inicializado en modo seguro.");
  } else {
    console.warn("⚠️ [ELECTRON] Sin credenciales Firebase. Modo Offline.");
  }
} catch (e) {
  console.error("🔥 [ELECTRON] Error iniciando Firebase:", e);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "Listo POS",
    // Modificado para usar ICONO.ico de public (Dev) o dist (Prod)
    icon: isDev
      ? path.join(__dirname, '../public/ICONO.ico')
      : path.join(__dirname, '../dist/ICONO.ico'),
    frame: true,
    webPreferences: {
      nodeIntegration: false, // 🛡️ CRÍTICO: Deshabilitar Node en render
      contextIsolation: true, // 🛡️ CRÍTICO: Aislar contextos
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: isDev // Solo DevTools en desarrollo
    },
    show: false
  });

  mainWindow.maximize();
  mainWindow.show();

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // Bloquear atajos de teclado peligrosos en producción
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key.toLowerCase() === 'r') {
        event.preventDefault(); // Bloquear Ctrl+R
      }
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        event.preventDefault(); // Bloquear DevTools
      }
    });
  }

  mainWindow.setMenuBarVisibility(false);

  // 📥 MANEJO DE DESCARGAS (Global Safety Net)
  // 📥 MANEJO DE DESCARGAS (Global Safety Net)
  // Corrige el problema de nombres UUID en descargas por defecto
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    let fileName = item.getFilename();

    // 🕵️ HEURÍSTICA: Si el nombre parece un UUID (muy largo, sin espacios, típico de blobs)
    // Forzamos un nombre genérico útil.
    if (fileName.length > 30 && !fileName.includes(' ')) {
      fileName = 'Documento_Descargado.pdf';
    }

    // Si item tiene nombre, lo respetamos y pedimos diálogo
    item.setSaveDialogOptions({
      title: 'Guardar Archivo',
      defaultPath: fileName,
      filters: [{ name: 'Todos los archivos', extensions: ['*'] }]
    });
    // item.setSavePath(...) // Si quisiéramos forzar ruta. Al no ponerlo, Electron muestra el diálogo (default) o guarda en Downloads.
    // Console log para depurar
    console.log(`📥 [Electron] Descarga iniciada: ${fileName}`);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- ZONA DE HARDWARE (IPC) ---

ipcMain.on('test-print', (event) => {
  console.log('🖨️ [Electron] Imprimiendo ticket...');
  // silent: true para impresión directa sin diálogo (Kiosco)
  mainWindow.webContents.print({ silent: false, printBackground: true });
});

ipcMain.on('open-drawer', (event) => {
  console.log('📦 [Electron] Comando cajón enviado (Simulado)');
  // Aquí iría la lógica serial/USB real
});

ipcMain.on('toggle-kiosk', (event, enable) => {
  mainWindow.setKiosk(enable);
});

ipcMain.handle('read-scale', async () => {
  // Simulación de balanza (reemplazar con lectura serial real)
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

// 💾 HARDWARE: DISK HEALTH
import checkDiskSpace from 'check-disk-space';



// ... (existing imports)

// --- ZONA DE HARDWARE (IPC) ---

// ... (existing handlers)

ipcMain.handle('get-machine-id', () => {
  try {
    const id = machineIdSync();
    return id;
  } catch (error) {
    console.error("🔒 [FÉNIX] Error getting Machine ID:", error);
    return "UNKNOWN-ID";
  }
});

ipcMain.handle('get-disk-info', async () => {
  try {
    // En Windows suele ser "C:/", en Unix "/"
    const pathToCheck = process.platform === 'win32' ? 'C:/' : '/';
    const diskSpace = await checkDiskSpace(pathToCheck);

    // Convertir a GB y Porcentaje para facilitar uso en frontend
    const freeGB = (diskSpace.free / 1024 / 1024 / 1024).toFixed(2);
    const sizeGB = (diskSpace.size / 1024 / 1024 / 1024).toFixed(2);
    const percentused = ((diskSpace.size - diskSpace.free) / diskSpace.size) * 100;

    return {
      free: parseFloat(freeGB),
      size: parseFloat(sizeGB),
      percentUsed: Math.round(percentused)
    };
  } catch (error) {
    console.error("💾 [DISK-CHECK] Error:", error);
    return { free: 0, size: 0, percentUsed: 0, error: true };
  }
});



// --- ZONA DE NUBE SEGURA (IPC) ---

ipcMain.handle('firebase-sync', async (event, { collection: colName, data }) => {
  if (!db) return { success: false, error: "Firebase no configurado en Main Process" };

  try {
    // Inyectamos timestamp de servidor aquí, en el entorno seguro
    const payload = {
      ...data,
      _sync_source: 'ELECTRON_MAIN',
      _sync_createdAt: serverTimestamp()
    };

    await addDoc(collection(db, colName), payload);
    return { success: true };
  } catch (error) {
    console.error("☁️ [ELECTRON] Sync Error:", error);
    return { success: false, error: error.message };
  }
});

// --- ZONA DE ARCHIVOS (PDF) ---
ipcMain.handle('pdf-save', async (event, { buffer, filename }) => {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Guardar Estado de Cuenta',
      defaultPath: filename,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });

    if (filePath) {
      await fs.promises.writeFile(filePath, Buffer.from(buffer));
      return { success: true, path: filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    console.error("💾 [ELECTRON] Save PDF Error:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-file-location', async (event, path) => {
  if (path) {
    shell.showItemInFolder(path);
  }
});

ipcMain.handle('open-file-default', async (event, path) => {
  if (path) {
    shell.openPath(path);
  }
});