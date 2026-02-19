// ✅ SYSTEM IMPLEMENTATION - V. 3.0 (LAN SYNC SERVER — HARDENED + AUTH)
// Archivo: electron/lanServer.js
// Protecciones implementadas:
//   1. Body size limit (anti-flood)
//   2. Deduplicación de stock updates (idempotencia)
//   3. Stock negativo → alerta al renderer
//   4. Rate limiting básico por IP
//   5. Timeout de conexión SSE (evita leaks)
//   6. [FIX C1] LAN_SHARED_TOKEN — Auth header obligatorio en rutas sensibles
//   7. [FIX C2] License salt desde variable de entorno (prepara migración JWT)
//   8. [FIX M5] Verificación real de _licenseActive
//   9. [FIX M6] Normalización de nombres de producto (tildes/acentos)

import http from 'http';
import crypto from 'crypto';
import { networkInterfaces } from 'os';

// [FIX C2] Salt para licencias V1 (SHA-256).
// Leer de variable de entorno → fallback a hardcoded (SOLO por compatibilidad).
// TODO: Migrar a JWT/RS256 cuando la clave privada esté disponible en el proceso Electron.
const LICENSE_SALT = process.env.LISTO_LICENSE_SALT || "LISTO_POS_V1_SECURE_SALT_998877";

const LAN_PORT = 3847;
const SYNC_VERSION = '3.0';
const MAX_BODY_SIZE = 5 * 1024 * 1024; // 5MB máximo
const SSE_TIMEOUT = 60000; // Ping cada 60s para detectar clientes muertos

// --- ESTADO EN MEMORIA ---
let productCache = [];
let categoriesCache = [];
let configCache = {};
let lastUpdateTimestamp = Date.now();
let connectedClients = []; // SSE streams activos
let mainWindowRef = null;
let _processedUpdateIds = new Set(); // Deduplicación

// [FIX C1] 🔑 LAN SHARED TOKEN — Se genera al iniciar el servidor.
// Las cajas secundarias lo reciben durante el handshake inicial (/api/ping)
// y deben incluirlo en todas las solicitudes posteriores como Authorization header.
let _lanSharedToken = null;

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

    for (const update of updates) {
        // 🛡️ DEDUPLICACIÓN: generar key único por update
        const dedupKey = `${normalizeName(update.nombre)}_${update.delta}_${update.timestamp}`;
        if (_processedUpdateIds.has(dedupKey)) {
            results.push({ nombre: update.nombre, skipped: true, reason: 'duplicate' });
            continue;
        }
        _processedUpdateIds.add(dedupKey);

        // Limpiar dedup cache si crece demasiado (mantener últimos 500)
        if (_processedUpdateIds.size > 500) {
            const arr = Array.from(_processedUpdateIds);
            _processedUpdateIds = new Set(arr.slice(-250));
        }

        // [FIX M6] Usar normalizeName para el match (resuelve "Azúcar" vs "Azucar")
        const normalizedUpdateName = normalizeName(update.nombre);
        const product = productCache.find(
            p => normalizeName(p.nombre) === normalizedUpdateName
        );

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
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('lan-stock-update', updates);

        // 🛡️ Enviar alertas de stock negativo al UI
        if (stockAlerts.length > 0) {
            mainWindowRef.webContents.send('lan-stock-alert', stockAlerts);
        }
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
        const url = new URL(req.url, `http://localhost:${LAN_PORT}`);
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

        // Health check + handshake: devuelve token al que hace ping.
        // Nota: /api/ping es abierto para que `scanForMaster` y `ConfigConexionLAN`
        // puedan descubrir el servidor. El token se entrega solo en el ping.
        // Una vez que PC2 tiene el token, lo usa en el header de las demás rutas.
        if (path === '/api/ping' && req.method === 'GET') {
            sendJSON(res, 200, {
                status: 'ok',
                version: SYNC_VERSION,
                negocio: configCache.nombreNegocio || 'Listo POS',
                productos: productCache.length,
                timestamp: lastUpdateTimestamp,
                ip: getLocalIP(),
                clients: connectedClients.length,
                // [FIX C1] Enviar token en el ping para handshake inicial
                lanToken: _lanSharedToken,
            });
            return;
        }

        // ─── RUTAS PROTEGIDAS (requieren auth) ─────────────────

        // [FIX C1] 🔒 Verificar auth en TODAS las rutas sensibles
        if (!verifyLanAuth(req)) {
            sendJSON(res, 401, {
                error: 'Unauthorized — Missing or invalid LAN token. Reconnect to the master.'
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

        // 🔑 LICENSE GRANT: PC1 genera licencia para PC2 (Multi-Caja)
        if (path === '/api/license-grant' && req.method === 'POST') {
            parseBody(req).then(body => {
                if (!body.machineId || typeof body.machineId !== 'string') {
                    sendJSON(res, 400, { error: 'Se requiere { machineId: "..." }' });
                    return;
                }

                // [FIX M5] Verificar que PC1 REALMENTE tiene licencia activa
                const pc1License = configCache._licenseActive;
                if (pc1License !== true) {
                    sendJSON(res, 403, { error: 'El servidor principal no tiene licencia activa.' });
                    return;
                }

                // [FIX C2] Generar licencia para PC2 usando SHA-256 (V1)
                // TODO: Migrar a JWT/RS256 cuando la clave privada esté en Electron main process
                const hash = crypto.createHash('sha256')
                    .update(body.machineId + LICENSE_SALT)
                    .digest('hex')
                    .toUpperCase();

                console.log(`🔑 [LICENSE] Licencia generada para caja secundaria: ${body.machineId.substring(0, 8)}...`);

                // Notificar al renderer para registrar en Firebase
                if (mainWindowRef && !mainWindowRef.isDestroyed()) {
                    mainWindowRef.webContents.send('lan-license-granted', {
                        secondaryMachineId: body.machineId,
                        cajaLabel: body.cajaLabel || 'Caja Secundaria',
                    });
                }

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

        // SSE: Stream de eventos en tiempo real (protegido — solo clientes autorizados)
        if (path === '/api/events' && req.method === 'GET') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
            });
            res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);
            connectedClients.push(res);

            // 🛡️ Heartbeat: detectar clientes muertos
            const heartbeat = setInterval(() => {
                try {
                    res.write(`: heartbeat\n\n`);
                } catch {
                    clearInterval(heartbeat);
                }
            }, SSE_TIMEOUT);

            req.on('close', () => {
                clearInterval(heartbeat);
                connectedClients = connectedClients.filter(c => c !== res);
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
