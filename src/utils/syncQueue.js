// src/utils/syncQueue.js
// Cola offline simple con localStorage para que las cajas secundarias
// puedan seguir registrando ventas localmente y sincronizar al reconectar.

const QUEUE_KEY = 'listo_sync_queue';

export function enqueueForSync(payload) {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    queue.push({ ...payload, enqueuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function getSyncQueue() {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
}

export function clearSyncQueue() {
    localStorage.removeItem(QUEUE_KEY);
}
