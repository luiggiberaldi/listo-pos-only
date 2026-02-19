// ✅ SYSTEM IMPLEMENTATION - V. 3.0 (LAN SYNC SERVICE — HARDENED + AUTH)
// Archivo: src/services/lanSyncService.js
// Protecciones implementadas:
//   1. Retry con exponential backoff
//   2. Cola de stock persistida en localStorage (sobrevive reinicio)
//   3. Stock-aware sync (no sobrescribir stock si hay decrementos locales pendientes)
//   4. Deduplicación de updates
//   5. Heartbeat con auto-reconnect
//   6. [FIX C1] Auth token en todas las requests al servidor Master
//   7. [FIX M6] Normalización de nombres (tildes/acentos)

import { db } from '../db';

const LAN_PORT = 3847;
const POLL_INTERVAL = 5000;
const MAX_BACKOFF = 30000; // 30s máximo entre reintentos
const QUEUE_KEY = 'listo-lan-pending-queue'; // localStorage key
const TOKEN_KEY = 'listo-lan-auth-token'; // [FIX C1] Token de autenticación

let _serverIP = null;
let _polling = false;
let _pollTimer = null;
let _eventSource = null;
let _lastTimestamp = 0;
let _pendingStockUpdates = [];
let _onStatusChange = null;
let _status = 'disconnected';
let _consecutiveFailures = 0;
let _lastFullSyncSuccess = 0;
let _lanToken = null; // [FIX C1] Token recibido del Master

// ═══════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════

function setStatus(newStatus) {
    if (newStatus === _status) return;
    _status = newStatus;
    if (_onStatusChange) _onStatusChange(newStatus);
}

/** Persistir cola en localStorage (sobrevive crash/reinicio) */
function persistQueue() {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(_pendingStockUpdates));
    } catch { /* localStorage lleno — no fatal */ }
}

/** Restaurar cola desde localStorage */
function restoreQueue() {
    try {
        const saved = localStorage.getItem(QUEUE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                _pendingStockUpdates = parsed;
                console.log(`📡 [LAN SYNC] Restaurados ${parsed.length} updates pendientes del último reinicio`);
            }
        }
    } catch { /* corrupto — ignorar */ }
}

/** Restaurar token de auth desde localStorage */
function restoreToken() {
    try {
        const saved = localStorage.getItem(TOKEN_KEY);
        if (saved) {
            _lanToken = saved;
            console.log(`🔑 [LAN SYNC] Token de auth restaurado`);
        }
    } catch { /* ignore */ }
}

/** Calcular delay con exponential backoff */
function getBackoffDelay() {
    const base = Math.min(1000 * Math.pow(2, _consecutiveFailures), MAX_BACKOFF);
    // Jitter: ±25% para evitar que ambas cajas polleen a la vez
    return base + Math.random() * base * 0.5;
}

// [FIX M6] Normalizar nombre (tildes, espacios, case)
function normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Deduplicar updates: sumar deltas del mismo producto */
function deduplicateUpdates(updates) {
    const map = new Map();
    for (const u of updates) {
        // [FIX M6] Usar nombre normalizado como key
        const key = normalizeName(u.nombre);
        if (!key) continue;
        if (map.has(key)) {
            const existing = map.get(key);
            existing.delta += u.delta;
            existing.timestamp = Math.max(existing.timestamp, u.timestamp);
        } else {
            map.set(key, { ...u });
        }
    }
    return Array.from(map.values());
}

// [FIX C1] 🔑 Construir headers con auth token
function getAuthHeaders(extraHeaders = {}) {
    const headers = { ...extraHeaders };
    if (_lanToken) {
        headers['Authorization'] = `Bearer ${_lanToken}`;
    }
    return headers;
}

// ═══════════════════════════════════════════════════════════
// 🌐 CONEXIÓN
// ═══════════════════════════════════════════════════════════

export function configureLanSync(serverIP, onStatusChange) {
    _serverIP = serverIP;
    _onStatusChange = onStatusChange;
    restoreQueue(); // Restaurar updates pendientes del reinicio anterior
    restoreToken(); // [FIX C1] Restaurar auth token
}

export async function pingServer(ip) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`http://${ip || _serverIP}:${LAN_PORT}/api/ping`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
            const data = await res.json();
            // [FIX C1] Capturar token del Master durante el handshake
            if (data.lanToken) {
                _lanToken = data.lanToken;
                try { localStorage.setItem(TOKEN_KEY, data.lanToken); } catch { /* ignore */ }
                console.log(`🔑 [LAN SYNC] Token de auth recibido del Master`);
            }
            return data;
        }
        return null;
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// 🔄 FULL SYNC (con protección de stock + auth)
// ═══════════════════════════════════════════════════════════

export async function fullSync() {
    if (!_serverIP) return false;

    try {
        setStatus('connecting');
        const res = await fetch(`http://${_serverIP}:${LAN_PORT}/api/products`, {
            signal: AbortSignal.timeout(10000),
            headers: getAuthHeaders(), // [FIX C1]
        });

        // [FIX C1] Si el servidor nos rechaza por auth, reintentar handshake
        if (res.status === 401) {
            console.warn('🔑 [LAN SYNC] Token inválido. Reintentando handshake...');
            const pingResult = await pingServer(_serverIP);
            if (pingResult) {
                // Reintentar con nuevo token
                return fullSync();
            }
            setStatus('error');
            return false;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        if (data.productos && Array.isArray(data.productos)) {

            // 🛡️ PROTECCIÓN: Calcular decrementos locales pendientes ANTES de sobrescribir
            const pendingByName = new Map();
            for (const u of _pendingStockUpdates) {
                // [FIX M6] Usar nombre normalizado
                const key = normalizeName(u.nombre);
                if (key) {
                    pendingByName.set(key, (pendingByName.get(key) || 0) + u.delta);
                }
            }

            await db.transaction('rw', db.productos, async () => {
                const existentes = await db.productos.toArray();
                const mapExistentes = new Map(existentes.map(p => [normalizeName(p.nombre), p]));

                for (const prod of data.productos) {
                    const key = normalizeName(prod.nombre);
                    if (!key) continue;

                    const existing = mapExistentes.get(key);

                    // 🛡️ STOCK INTELIGENTE: Si hay decrementos pendientes que no se enviaron,
                    // aplicarlos sobre el stock que viene del servidor
                    let stockFinal = Number(prod.stock) || 0;
                    const pendingDelta = pendingByName.get(key);
                    if (pendingDelta && pendingDelta < 0) {
                        stockFinal = Math.max(0, stockFinal + pendingDelta);
                    }

                    if (existing) {
                        await db.productos.update(existing.id, {
                            precio: prod.precio,
                            costo: prod.costo,
                            stock: stockFinal,
                            categoria: prod.categoria,
                            codigoBarras: prod.codigoBarras,
                            unidad: prod.unidad,
                            impuesto: prod.impuesto,
                            stockMinimo: prod.stockMinimo,
                            descripcion: prod.descripcion,
                            activo: prod.activo,
                            imagen: prod.imagen,
                        });
                    } else {
                        await db.productos.add({
                            nombre: prod.nombre.trim(),
                            precio: Number(prod.precio) || 0,
                            costo: Number(prod.costo) || 0,
                            stock: stockFinal,
                            categoria: prod.categoria || 'General',
                            codigoBarras: prod.codigoBarras || '',
                            unidad: prod.unidad || 'unidad',
                            impuesto: Number(prod.impuesto) || 0,
                            stockMinimo: Number(prod.stockMinimo) || 0,
                            descripcion: prod.descripcion || '',
                            activo: prod.activo !== false,
                            imagen: prod.imagen || '',
                        });
                    }
                }

                // Eliminar productos que ya no existen en el servidor
                const serverNames = new Set(data.productos.map(p => normalizeName(p.nombre)));
                for (const [name, prod] of mapExistentes) {
                    if (!serverNames.has(name)) {
                        await db.productos.delete(prod.id);
                    }
                }
            });

            _lastTimestamp = data.timestamp || Date.now();
            _lastFullSyncSuccess = Date.now();
            _consecutiveFailures = 0; // Reset backoff
            setStatus('connected');
            console.log(`📡 [LAN SYNC] Full sync: ${data.productos.length} productos sincronizados`);

            // Enviar updates pendientes (ahora que sabemos que el server está vivo)
            await flushPendingUpdates();
            return true;
        }
        return false;
    } catch (error) {
        _consecutiveFailures++;
        console.error(`❌ [LAN SYNC] Error en full sync (intento ${_consecutiveFailures}):`, error.message);
        setStatus(_consecutiveFailures >= 3 ? 'error' : 'disconnected');
        return false;
    }
}

// ═══════════════════════════════════════════════════════════
// 📊 DELTA SYNC (con backoff + auth)
// ═══════════════════════════════════════════════════════════

async function deltaSync() {
    if (!_serverIP) return;

    try {
        const res = await fetch(
            `http://${_serverIP}:${LAN_PORT}/api/products/since?t=${_lastTimestamp}`,
            {
                signal: AbortSignal.timeout(5000),
                headers: getAuthHeaders(), // [FIX C1]
            }
        );

        // [FIX C1] Manejar 401 gracefully
        if (res.status === 401) {
            console.warn('🔑 [LAN SYNC] Token rechazado en delta. Reintentando handshake...');
            await pingServer(_serverIP);
            return; // Próximo poll usará el nuevo token
        }

        if (!res.ok) return;

        const data = await res.json();
        _consecutiveFailures = 0; // Se pudo conectar

        if (data.hasChanges && data.productos) {
            await fullSync();
        } else if (_status !== 'connected') {
            setStatus('connected');
        }

        // Siempre intentar flush en cada ciclo
        await flushPendingUpdates();
    } catch {
        _consecutiveFailures++;
        if (_status === 'connected') setStatus('disconnected');
    }
}

// ═══════════════════════════════════════════════════════════
// ⏱️ POLLING (con adaptive interval)
// ═══════════════════════════════════════════════════════════

export function startPolling() {
    if (_polling) return;
    _polling = true;

    fullSync(); // Sync inicial inmediato

    // Poll con intervalo adaptativo (normal cuando conectado, backoff cuando desconectado)
    function schedulePoll() {
        if (!_polling) return;
        const delay = _consecutiveFailures > 0 ? getBackoffDelay() : POLL_INTERVAL;
        _pollTimer = setTimeout(() => {
            if (_serverIP) deltaSync();
            schedulePoll(); // Re-programar
        }, delay);
    }
    schedulePoll();

    console.log(`📡 [LAN SYNC] Polling iniciado (cada ${POLL_INTERVAL / 1000}s, backoff adaptativo)`);
}

export function stopPolling() {
    _polling = false;
    if (_pollTimer) {
        clearTimeout(_pollTimer);
        _pollTimer = null;
    }
    if (_eventSource) {
        _eventSource.close();
        _eventSource = null;
    }
    setStatus('disconnected');
}

// ═══════════════════════════════════════════════════════════
// 📦 STOCK UPDATES (con persistencia, dedup y auth)
// ═══════════════════════════════════════════════════════════

export function sendStockUpdate(nombre, delta) {
    const update = { nombre, delta, timestamp: Date.now() };
    _pendingStockUpdates.push(update);
    persistQueue(); // 🛡️ Guardar en localStorage (sobrevive crash)
    flushPendingUpdates(); // Intentar enviar inmediatamente
}

async function flushPendingUpdates() {
    if (_pendingStockUpdates.length === 0 || !_serverIP) return;

    // 🛡️ Deduplicar antes de enviar (16 ventas de "Coca-Cola" = 1 update con delta -16)
    const deduped = deduplicateUpdates(_pendingStockUpdates);

    try {
        const res = await fetch(`http://${_serverIP}:${LAN_PORT}/api/stock-update`, {
            method: 'POST',
            headers: getAuthHeaders({ 'Content-Type': 'application/json' }), // [FIX C1]
            body: JSON.stringify({ updates: deduped, cajaId: 'secundaria' }),
            signal: AbortSignal.timeout(5000),
        });

        // [FIX C1] Si auth falla, reintentar handshake pero no perder datos
        if (res.status === 401) {
            console.warn('🔑 [LAN SYNC] Token rechazado en stock-update. Reintentando handshake...');
            await pingServer(_serverIP);
            return; // La cola persiste, se reintentará
        }

        if (res.ok) {
            const result = await res.json();
            if (result.ok) {
                _pendingStockUpdates = [];
                persistQueue(); // Limpiar localStorage
                console.log(`📡 [LAN SYNC] ✅ ${deduped.length} updates enviados al servidor`);
            }
        }
    } catch {
        console.warn(`📡 [LAN SYNC] ⏳ ${_pendingStockUpdates.length} updates pendientes (se reintentará)`);
        // Se reintentará en el próximo poll cycle — no se pierde nada gracias a localStorage
    }
}

// ═══════════════════════════════════════════════════════════
// 📊 STATUS
// ═══════════════════════════════════════════════════════════

export function getSyncStatus() {
    return {
        status: _status,
        serverIP: _serverIP,
        lastSync: _lastTimestamp,
        lastFullSync: _lastFullSyncSuccess,
        pendingUpdates: _pendingStockUpdates.length,
        consecutiveFailures: _consecutiveFailures,
        hasToken: !!_lanToken, // [FIX C1] Para debug
    };
}
