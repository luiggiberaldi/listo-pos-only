// ✅ SYSTEM IMPLEMENTATION - V. 4.0 (LAN SYNC SERVER — FULL MULTI-CAJA)
// Archivo: electron/lanServer.js
// V4.0: Full sync — clientes, ventas, cortes, gastos + PIN auth + ID-based stock

import http from 'http';
import crypto from 'crypto';
import { networkInterfaces } from 'os';

// [FIX C2] Salt para licencias V1 (SHA-256).
// Leer de variable de entorno → fallback a hardcoded (SOLO por compatibilidad).
// TODO: Migrar a JWT/RS256 cuando la clave privada esté disponible en el proceso Electron.
const LICENSE_SALT = process.env.LISTO_LICENSE_SALT || "LISTO_POS_V1_SECURE_SALT_998877";

const LAN_PORT = 3847;
const SYNC_VERSION = '4.0';
const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB máximo
const SSE_TIMEOUT = 60000; // Ping cada 60s para detectar clientes muertos
const DEDUP_TTL = 5 * 60 * 1000; // 5 min TTL for dedup entries
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 60000; // 1 minute lockout after max attempts

// --- ESTADO EN MEMORIA ---
let productCache = [];
let categoriesCache = [];
let configCache = {};
let clientsCache = [];       // [V4] Cache de clientes para sync bidireccional
let lastUpdateTimestamp = Date.now();
let connectedClients = []; // SSE streams activos
let mainWindowRef = null;
let _processedUpdates = new Map(); // Deduplicación con TTL: key → timestamp

// [FIX C1] 🔑 LAN SHARED TOKEN — Se genera al iniciar el servidor.
let _lanSharedToken = null;

// [V4] 🔐 PIN de emparejamiento — se configura desde el UI del principal
let _pairingPIN = null;

// 🛡️ PIN rate limiting per IP
const _pinAttempts = new Map(); // ip → { count, lastAttempt }

// ═══════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════

export function getLocalIP() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

/** Obtener el token actual (para que el renderer lo pase a la caja secundaria) */
export function getLanToken() {
    return _lanSharedToken;
}

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end(JSON.stringify(data));
}

/** Parsear body con límite de tamaño */
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        let size = 0;
        req.on('data', chunk => {
            size += chunk.length;
            if (size > MAX_BODY_SIZE) {
                req.destroy();
                reject(new Error('Body too large'));
                return;
            }
            body += chunk;
        });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

// [FIX C1] 🛡️ AUTH MIDDLEWARE — Verificar token en rutas protegidas
function verifyLanAuth(req) {
    if (!_lanSharedToken) return true; // Token no generado aún (improbable pero safe)
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    // Formato esperado: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return false;
    return parts[1] === _lanSharedToken;
}

// [FIX M6] 🔤 NORMALIZAR NOMBRE — Remueve acentos/tildes para comparación segura
function normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Safe IPC send — wraps try-catch to avoid crashing on destroyed window */
function safeSend(channel, data) {
    try {
        if (mainWindowRef && !mainWindowRef.isDestroyed()) {
            mainWindowRef.webContents.send(channel, data);
        }
    } catch (e) {
        console.warn(`⚠️ [LAN SERVER] Error sending IPC '${channel}':`, e.message);
    }
}

/** Check PIN rate limiting for an IP */
function checkPinRateLimit(ip) {
    const entry = _pinAttempts.get(ip);
    if (!entry) return true;
    if (Date.now() - entry.lastAttempt > PIN_LOCKOUT_MS) {
        _pinAttempts.delete(ip);
        return true;
    }
    return entry.count < PIN_MAX_ATTEMPTS;
}

function recordPinAttempt(ip, success) {
    if (success) {
        _pinAttempts.delete(ip);
        return;
    }
    const entry = _pinAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    entry.count++;
    entry.lastAttempt = Date.now();
    _pinAttempts.set(ip, entry);
}

// ═══════════════════════════════════════════════════════════
// 📦 CACHE & BROADCAST
// ═══════════════════════════════════════════════════════════

export function updateProductCache(products, categories, config) {
    productCache = products || [];
    categoriesCache = categories || [];
    configCache = config || {};
    lastUpdateTimestamp = Date.now();

    broadcastToClients({
        type: 'PRODUCTS_UPDATED',
        timestamp: lastUpdateTimestamp,
        count: productCache.length,
    });
}

// [V4] Actualizar cache de clientes (llamado desde renderer via IPC)
export function updateClientsCache(clients) {
    clientsCache = clients || [];
}

// [V4] Configurar PIN de emparejamiento
export function setPairingPIN(pin) {
    _pairingPIN = pin;
    console.log(`🔐 [LAN SERVER] PIN de emparejamiento ${pin ? 'configurado' : 'removido'}`);
}

function broadcastToClients(data) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    connectedClients = connectedClients.filter(res => {
        try {
            res.write(message);
            return true;
        } catch {
            return false;
        }
    });
}

// ═══════════════════════════════════════════════════════════
// 🛡️ STOCK UPDATE (con dedup + alerta stock negativo + normalización)
// ═══════════════════════════════════════════════════════════

export function processStockUpdate(updates, cajaId = 'unknown') {
    const results = [];
    const stockAlerts = [];

    // 🛡️ TTL cleanup: purge entries older than DEDUP_TTL
    const now = Date.now();
    if (_processedUpdates.size > 100) {
        for (const [k, ts] of _processedUpdates) {
            if (now - ts > DEDUP_TTL) _processedUpdates.delete(k);
        }
    }

    for (const update of updates) {
        // 🛡️ DEDUPLICACIÓN: key por producto+delta (sin timestamp para capturar reintentos)
        const productKey = update.id || normalizeName(update.nombre);
        const dedupKey = `${productKey}_${update.delta}`;
        if (_processedUpdates.has(dedupKey) && (now - _processedUpdates.get(dedupKey)) < DEDUP_TTL) {
            results.push({ nombre: update.nombre, skipped: true, reason: 'duplicate' });
            continue;
        }
        _processedUpdates.set(dedupKey, now);

        // [V4] ID-BASED MATCH: Intentar por ID primero, fallback a nombre normalizado
        let product = null;
        if (update.id) {
            product = productCache.find(p => p.id === update.id);
            if (!product) {
                console.warn(`⚠️ [LAN] ID ${update.id} no encontrado en cache, fallback a nombre: "${update.nombre}"`);
            }
        }
        if (!product) {
            const normalizedUpdateName = normalizeName(update.nombre);
            product = productCache.find(p => normalizeName(p.nombre) === normalizedUpdateName);
        }

        if (product) {
            const oldStock = product.stock || 0;
            // 🛡️ OPERACIÓN COMMUTATIVA: aplicar delta, NO valor absoluto
            product.stock = (oldStock) + (update.delta || 0);

            results.push({
                nombre: product.nombre,
                oldStock,
                newStock: product.stock,
                delta: update.delta,
            });

            // 🛡️ ALERTA STOCK NEGATIVO
            if (product.stock < 0) {
                stockAlerts.push({
                    nombre: product.nombre,
                    stock: product.stock,
                    caja: cajaId,
                });
            }
        } else {
            results.push({ nombre: update.nombre, skipped: true, reason: 'not_found' });
        }
    }

    lastUpdateTimestamp = Date.now();

    // Notificar al renderer (actualizar Dexie del PC1)
    safeSend('lan-stock-update', updates);
    if (stockAlerts.length > 0) {
        safeSend('lan-stock-alert', stockAlerts);
    }

    // Notificar a otros clientes SSE
    broadcastToClients({
        type: 'STOCK_UPDATED',
        timestamp: lastUpdateTimestamp,
        updates: results,
        caja: cajaId,
    });

    return results;
}

// ═══════════════════════════════════════════════════════════
// 🌐 SERVIDOR HTTP
// ═══════════════════════════════════════════════════════════

export function startLanServer(mainWindow) {
    mainWindowRef = mainWindow;

    // [FIX C1] Generar token de autenticación al iniciar el servidor
    _lanSharedToken = crypto.randomBytes(32).toString('hex');
    console.log(`🔑 [LAN SERVER] Token de autenticación generado (primeros 8 chars): ${_lanSharedToken.substring(0, 8)}...`);

    const server = http.createServer((req, res) => {
        let url;
        try {
            url = new URL(req.url, `http://localhost:${LAN_PORT}`);
        } catch {
            sendJSON(res, 400, { error: 'Malformed URL' });
            return;
        }
        const path = url.pathname;

        // CORS preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            });
            res.end();
            return;
        }

        // ─── RUTAS PÚBLICAS (sin auth) ─────────────────────────

        // Health check: descubrir servidor. [V4] Ya NO envía token — requiere PIN
        if (path === '/api/ping' && req.method === 'GET') {
            sendJSON(res, 200, {
                status: 'ok',
                version: SYNC_VERSION,
                negocio: configCache.nombreNegocio || 'Listo POS',
                productos: productCache.length,
                timestamp: lastUpdateTimestamp,
                ip: getLocalIP(),
                clients: connectedClients.length,
                requiresPIN: !!_pairingPIN, // [V4] Indica si necesita PIN
            });
            return;
        }

        // [V4] 🔐 PIN PAIRING: Secundaria envía PIN → recibe token
        if (path === '/api/pair' && req.method === 'POST') {
            const clientIP = req.socket.remoteAddress || 'unknown';
            if (!checkPinRateLimit(clientIP)) {
                sendJSON(res, 429, { error: 'Demasiados intentos. Espere 1 minuto.' });
                return;
            }
            parseBody(req).then(body => {
                if (!_pairingPIN) {
                    // Sin PIN configurado: entregar token directamente (backward compat)
                    sendJSON(res, 200, {
                        ok: true,
                        lanToken: _lanSharedToken,
                        negocio: configCache.nombreNegocio || 'Listo POS',
                    });
                    return;
                }
                if (!body.pin || body.pin !== _pairingPIN) {
                    recordPinAttempt(clientIP, false);
                    sendJSON(res, 403, { error: 'PIN incorrecto' });
                    return;
                }
                recordPinAttempt(clientIP, true);
                sendJSON(res, 200, {
                    ok: true,
                    lanToken: _lanSharedToken,
                    negocio: configCache.nombreNegocio || 'Listo POS',
                });
            }).catch(err => {
                sendJSON(res, 400, { error: err.message });
            });
            return;
        }

        // ─── RUTAS PROTEGIDAS (requieren auth) ─────────────────

        // [V4] SSE acepta token via query param (EventSource no puede setear headers)
        if (path === '/api/events' && req.method === 'GET') {
            const qToken = url.searchParams.get('token');
            const headerOk = verifyLanAuth(req);
            const queryOk = qToken && qToken === _lanSharedToken;
            if (!headerOk && !queryOk) {
                sendJSON(res, 401, { error: 'Unauthorized' });
                return;
            }

            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
            });
            res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);
            connectedClients.push(res);

            const heartbeat = setInterval(() => {
                try { res.write(`: heartbeat\n\n`); }
                catch { clearInterval(heartbeat); }
            }, SSE_TIMEOUT);

            req.on('close', () => {
                clearInterval(heartbeat);
                connectedClients = connectedClients.filter(c => c !== res);
            });
            return;
        }

        // 🔒 Verificar auth en TODAS las demás rutas
        if (!verifyLanAuth(req)) {
            sendJSON(res, 401, {
                error: 'Unauthorized — Missing or invalid LAN token. Use /api/pair to authenticate.'
            });
            return;
        }

        // Catálogo completo
        if (path === '/api/products' && req.method === 'GET') {
            sendJSON(res, 200, {
                productos: productCache,
                categorias: categoriesCache,
                config: {
                    nombreNegocio: configCache.nombreNegocio,
                    moneda: configCache.moneda,
                    tasa: configCache.tasa,
                },
                timestamp: lastUpdateTimestamp,
                total: productCache.length,
            });
            return;
        }

        // Delta sync
        if (path === '/api/products/since' && req.method === 'GET') {
            const since = parseInt(url.searchParams.get('t') || '0');
            if (lastUpdateTimestamp > since) {
                sendJSON(res, 200, {
                    hasChanges: true,
                    productos: productCache,
                    categorias: categoriesCache,
                    timestamp: lastUpdateTimestamp,
                });
            } else {
                sendJSON(res, 200, { hasChanges: false, timestamp: lastUpdateTimestamp });
            }
            return;
        }

        // Stock update desde PC2
        if (path === '/api/stock-update' && req.method === 'POST') {
            parseBody(req).then(body => {
                if (!body.updates || !Array.isArray(body.updates)) {
                    sendJSON(res, 400, { error: 'Se requiere { updates: [...] }' });
                    return;
                }
                const results = processStockUpdate(body.updates, body.cajaId || 'secundaria');
                sendJSON(res, 200, { ok: true, processed: results.length, results });
            }).catch(err => {
                const code = err.message === 'Body too large' ? 413 : 400;
                sendJSON(res, code, { error: err.message });
            });
            return;
        }

        // [V4] 📋 CLIENTS: Devolver lista de clientes al secundario
        if (path === '/api/clients' && req.method === 'GET') {
            sendJSON(res, 200, {
                clientes: clientsCache,
                timestamp: Date.now(),
            });
            return;
        }

        // [V4] 📋 CLIENT-SYNC: Recibir cambios de clientes desde secundario
        if (path === '/api/client-sync' && req.method === 'POST') {
            parseBody(req).then(body => {
                if (!body.clientes || !Array.isArray(body.clientes)) {
                    sendJSON(res, 400, { error: 'Se requiere { clientes: [...] }' });
                    return;
                }

                // Forward to renderer for LWW merge
                safeSend('lan-client-sync', {
                    clientes: body.clientes,
                    cajaId: body.cajaId || 'secundaria',
                });

                // Broadcast SSE event
                broadcastToClients({ type: 'CLIENTS_UPDATED', timestamp: Date.now() });

                sendJSON(res, 200, { ok: true, received: body.clientes.length });
            }).catch(err => {
                const code = err.message === 'Body too large' ? 413 : 400;
                sendJSON(res, code, { error: err.message });
            });
            return;
        }

        // [V4] 💰 SALE-SYNC: Recibir ventas completadas desde secundario
        if (path === '/api/sale-sync' && req.method === 'POST') {
            parseBody(req).then(body => {
                if (!body.ventas || !Array.isArray(body.ventas)) {
                    sendJSON(res, 400, { error: 'Se requiere { ventas: [...] }' });
                    return;
                }

                safeSend('lan-sale-received', {
                    ventas: body.ventas,
                    cajaId: body.cajaId || 'secundaria',
                });

                sendJSON(res, 200, { ok: true, received: body.ventas.length });
            }).catch(err => {
                const code = err.message === 'Body too large' ? 413 : 400;
                sendJSON(res, code, { error: err.message });
            });
            return;
        }

        // [V4] 🧾 CORTE-SYNC: Recibir cierres de caja desde secundario
        if (path === '/api/corte-sync' && req.method === 'POST') {
            parseBody(req).then(body => {
                if (!body.corte) {
                    sendJSON(res, 400, { error: 'Se requiere { corte: {...} }' });
                    return;
                }

                safeSend('lan-corte-received', {
                    corte: body.corte,
                    cajaId: body.cajaId || 'secundaria',
                });

                sendJSON(res, 200, { ok: true });
            }).catch(err => {
                const code = err.message === 'Body too large' ? 413 : 400;
                sendJSON(res, code, { error: err.message });
            });
            return;
        }

        // [V4] 💸 EXPENSE-SYNC: Recibir gastos desde secundario
        if (path === '/api/expense-sync' && req.method === 'POST') {
            parseBody(req).then(body => {
                if (!body.gastos || !Array.isArray(body.gastos)) {
                    sendJSON(res, 400, { error: 'Se requiere { gastos: [...] }' });
                    return;
                }

                safeSend('lan-expense-received', {
                    gastos: body.gastos,
                    cajaId: body.cajaId || 'secundaria',
                });

                sendJSON(res, 200, { ok: true, received: body.gastos.length });
            }).catch(err => {
                const code = err.message === 'Body too large' ? 413 : 400;
                sendJSON(res, code, { error: err.message });
            });
            return;
        }

        // 🔑 LICENSE GRANT: PC1 genera licencia para PC2 (Multi-Caja)
        if (path === '/api/license-grant' && req.method === 'POST') {
            parseBody(req).then(body => {
                if (!body.machineId || typeof body.machineId !== 'string') {
                    sendJSON(res, 400, { error: 'Se requiere { machineId: "..." }' });
                    return;
                }

                const pc1License = configCache._licenseActive;
                if (pc1License !== true) {
                    sendJSON(res, 403, { error: 'El servidor principal no tiene licencia activa.' });
                    return;
                }

                const hash = crypto.createHash('sha256')
                    .update(body.machineId + LICENSE_SALT)
                    .digest('hex')
                    .toUpperCase();

                console.log(`🔑 [LICENSE] Licencia generada para caja secundaria: ${body.machineId.substring(0, 8)}...`);

                safeSend('lan-license-granted', {
                    secondaryMachineId: body.machineId,
                    cajaLabel: body.cajaLabel || 'Caja Secundaria',
                });

                sendJSON(res, 200, {
                    ok: true,
                    licenseKey: hash,
                    negocio: configCache.nombreNegocio || 'Listo POS',
                    serverMachineId: configCache._machineId || 'unknown',
                    plan: configCache._plan || 'bodega',
                });
            }).catch(err => {
                const code = err.message === 'Body too large' ? 413 : 400;
                sendJSON(res, code, { error: err.message });
            });
            return;
        }

        // 404
        sendJSON(res, 404, { error: 'Ruta no encontrada' });
    });

    // 🛡️ Timeout de conexión para evitar conexiones colgadas
    server.timeout = 120000; // 2 minutos

    server.listen(LAN_PORT, '0.0.0.0', () => {
        console.log(`📡 [LAN SERVER v${SYNC_VERSION}] Activo en ${getLocalIP()}:${LAN_PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ [LAN SERVER] Puerto ${LAN_PORT} en uso. Servidor no iniciado.`);
        } else {
            console.error('❌ [LAN SERVER] Error:', err.message);
        }
    });

    return server;
}
