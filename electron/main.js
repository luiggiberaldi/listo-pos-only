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
import { startLanServer, updateProductCache, updateClientsCache, setPairingPIN, getLocalIP } from './lanServer.js';
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
      // [V4] Restaurar PIN de emparejamiento si existe
      if (lanConfig.pairingPIN) {
        setPairingPIN(lanConfig.pairingPIN);
      }
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
  try {
    // Enriquecer config con machineId y estado de licencia para el endpoint /api/license-grant
    const enrichedConfig = {
      ...config,
      _machineId: (() => { try { return machineIdSync(); } catch { return 'UNKNOWN'; } })(),
      _licenseActive: !!config?._licenseActive, // El renderer indica si tiene licencia
    };
    updateProductCache(products, categories, enrichedConfig);
  } catch (e) {
    console.error('❌ [LAN] Error actualizando cache de productos:', e.message);
  }
});

// Obtener IP local para mostrar en UI
ipcMain.handle('lan-get-ip', () => {
  try {
    return getLocalIP();
  } catch (e) {
    console.error('❌ [LAN] Error obteniendo IP:', e.message);
    return '127.0.0.1';
  }
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

// [V4] Renderer envía clientes actualizados → cache del servidor
ipcMain.on('lan-sync-clients', (event, clients) => {
  try {
    updateClientsCache(clients);
  } catch (e) {
    console.error('❌ [LAN] Error actualizando cache de clientes:', e.message);
  }
});

// [V4] Configurar PIN de emparejamiento
ipcMain.handle('lan-set-pin', (event, pin) => {
  try {
    // Guardar PIN en lan-config.json
    const configPath = path.join(app.getPath('userData'), 'lan-config.json');
    let config = { role: 'principal' };
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
    config.pairingPIN = pin || null;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    setPairingPIN(pin || null);
    return true;
  } catch (e) {
    console.error('❌ [LAN] Error guardando PIN:', e.message);
    return false;
  }
});

// --- IPC: Smart Image Search ---
ipcMain.handle('search-product-image', async (event, query) => {

  // 🧠 Helper: Advanced Text Similarity Score
  const getSimiliarity = (str1, str2) => {
    if (!str1 || !str2) return 0;

    // Pre-clean: Remove dots from acronyms (P.A.N. -> PAN)
    const normalize = (s) => s.toLowerCase().replace(/\./g, '');

    const s1 = normalize(str1.toString()); // Query
    const s2 = normalize(str2.toString()); // Result Title

    // Tokenize: Split by non-alphanumeric, keep everything
    const clean = (s) => [...new Set(s.split(/[^a-z0-9]+/).filter(w => w.length > 0))];
    const words1 = clean(s1); // Query Words
    const words2 = clean(s2); // Result Words

    if (words1.length === 0) return 0;

    let matchCount = 0;
    let exactMatches = 0;

    words1.forEach(w => {
      // 1. Exact Word Match
      if (words2.includes(w)) {
        matchCount++;
        exactMatches++;
      } else {
        // 2. Partial Match (e.g. "bulto" in "bultos")
        const partial = words2.some(rw => rw.includes(w) || w.includes(rw));
        if (partial) matchCount += 0.8; // Almost as good as exact
      }
    });

    const coverage = matchCount / words1.length;

    // Simple Score: Coverage + Exact Bonus
    let score = coverage;

    if (exactMatches === words1.length) score += 0.5; // Perfect Match Bonus
    if (exactMatches > 0) score += 0.1;

    return score;
  };

  const searchProvider = async (url, selector, name) => {
    return new Promise((resolve) => {
      const win = new BrowserWindow({
        width: 1366,
        height: 768,
        show: false,
        webPreferences: {
          offscreen: true,
          images: false,
          javascript: true
        }
      });

      // 🥸 Stealth Mode
      win.webContents.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

      const safeDestroy = () => {
        if (!win.isDestroyed()) win.destroy();
      };

      const timeout = setTimeout(() => {
        safeDestroy();
        console.warn(`[SmartSearch] ${name} timed out.`);
        resolve([]);
      }, 15000); // Reduced to 15s

      // Wait for content logic
      const checkScript = `
        (async () => {
          const sleep = (ms) => new Promise(r => setTimeout(r, ms));
          const maxAttempts = 20;
          
          for (let i = 0; i < maxAttempts; i++) {
            const images = Array.from(document.querySelectorAll('${selector}'));
            const validImages = images.filter(img => img.src && img.src.startsWith('http') && img.offsetWidth > 0);
            
            if (validImages.length > 0) {
              return validImages.map(img => {
                let title = img.alt || img.title || '';
                
                // --- STRATEGY 2: Deep Search & Tree Climbing ---
                // If simple attributes fail, we climb the DOM tree to find the product card text
                if (!title || title.length < 5 || title.toLowerCase().includes('imagen')) {
                    let current = img;
                    for (let k = 0; k < 5; k++) { // Climb up to 5 levels
                        if (!current.parentElement) break;
                        current = current.parentElement;
                        
                        // Check if this parent looks like a container (has text)
                        if (current.innerText && current.innerText.length > 10) {
                             // Heuristic: Split by lines. Title is usually the first long line that isn't a price or discount.
                             const lines = current.innerText.split('\\n')
                                .map(l => l.trim())
                                .filter(l => 
                                    l.length > 5 && 
                                    !l.includes('$') && 
                                    !l.includes('Bs') && 
                                    !l.includes('%') &&
                                    !l.toLowerCase().includes('agregar')
                                );
                             
                             if (lines.length > 0) {
                                 title = lines[0]; // Take the first valid line
                                 break; // Found it!
                             }
                        }
                    }
                }
                
                // Cleanup
                title = (title || '').replace(/[\\n\\t]/g, ' ').trim();
                
                return { src: img.src, title };
              }).slice(0, 20);
            }
            await sleep(500);
          }
          return [];
        })()
      `;

      win.webContents.on('did-finish-load', async () => {
        console.log(`[SmartSearch] ${name} Loaded.`);
        try {
          const results = await win.webContents.executeJavaScript(checkScript);
          console.log(`[SmartSearch] ${name} found ${results.length} results.`);
          safeDestroy();
          clearTimeout(timeout);
          resolve(results || []);
        } catch (e) {
          safeDestroy();
          console.error(`[SmartSearch] ${name} Script Error:`, e.message);
          resolve([]);
        }
      });

      win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error(`[SmartSearch] ${name} Failed to Load: ${errorDescription} (${errorCode})`);
        // Don't kill immediately, sometimes it's partial, but let the timeout handle it if it stalls
      });
      win.loadURL(url);
    });
  };

  try {
    const q = encodeURIComponent(query);
    console.log(`[SmartSearch] Searching for: "${query}"`);

    // 🚀 Run search in parallel
    const [tuzonaResults, cocoResults, instaResults] = await Promise.all([
      searchProvider(`https://tuzonamarket.com/carabobo/buscar?q=${q}`, '.item-img img', 'TuZona'),
      searchProvider(`https://www.cocomercado.com/search?q=${q}`, '.card__img img', 'Coco'),
      searchProvider(`https://instamarketca.com/?s=${q}&post_type=product`, '.product-image img', 'InstaMarket')
    ]);

    const allResults = [...tuzonaResults, ...cocoResults, ...instaResults];

    if (allResults.length === 0) return null;

    // 🏆 Rank Results by Relevance
    const ranked = allResults.map(item => ({
      ...item,
      score: getSimiliarity(query, item.title)
    })).sort((a, b) => b.score - a.score);

    console.log("[SmartSearch] Top Match:", ranked[0]);

    // Validation: Return match if it has ANY relevance (low threshold)
    if (ranked.length > 0 && ranked[0].score > 0.1) {
      return ranked[0].src;
    }

    // Fallback: If we have results but low score, still return the best one if it's the only option?
    // No, better to return null if complete garbage. 0.1 is very low (means at least 10% match).

    return null; // No good match found

  } catch (error) {
    console.error("❌ [SmartSearch] Critical Error:", error);
    return null;
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