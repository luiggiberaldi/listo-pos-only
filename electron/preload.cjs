// ✅ SYSTEM IMPLEMENTATION - V. 2.0 (SECURE PRELOAD)
// Archivo: electron/preload.js
// Objetivo: Puente seguro entre proceso Main (Node) y Renderer (React)

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // 🖨️ Hardware Commands (One-way)
    printTicket: () => ipcRenderer.send('test-print'),
    openDrawer: () => ipcRenderer.send('open-drawer'),
    setKioskMode: (enable) => ipcRenderer.send('toggle-kiosk', enable),

    // ⚖️ Hardware Queries (Two-way / Async)
    readScale: () => ipcRenderer.invoke('read-scale'),
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    getMachineId: () => ipcRenderer.invoke('get-machine-id'),
    getDiskInfo: () => ipcRenderer.invoke('get-disk-info'),

    // 🤖 AI Control
    restartLocalAI: () => ipcRenderer.invoke('restart-ai'),


    // ☁️ Secure Cloud Sync (Renderer -> Main -> Firebase)
    // Permite enviar datos a la nube sin exponer credenciales en el cliente web
    syncToCloud: (collection, data) => ipcRenderer.invoke('firebase-sync', { collection, data }),

    // 📂 File System
    savePDF: (buffer, filename) => ipcRenderer.invoke('pdf-save', { buffer, filename }),
    openFileLocation: (path) => ipcRenderer.invoke('open-file-location', path),
    openFileDefault: (path) => ipcRenderer.invoke('open-file-default', path),

    // 📩 Listeners (Main -> Renderer)
    onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
    onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback)
});

console.log("🛡️ [PRELOAD] Puente seguro establecido.");
